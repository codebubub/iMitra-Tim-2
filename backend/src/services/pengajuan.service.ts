import type { Akad, JenisNasabah } from '@prisma/client'
import { prisma, rupiahKeNumber } from '../lib/prisma.js'
import { AksesDitolak, PelanggaranAturan, TidakDitemukan } from '../lib/errors.js'
import { kunciTanggal, rakitNomorReferensi } from '../domain/nomor-referensi.js'
import { batasDariAmbang, validasiBatasPlafon, validasiJumlahAnggota } from '../domain/plafon.js'
import { hitungTotalPlafon, urutanApprovalUntuk } from '../domain/approval.js'
import { bacaAmbangApproval } from './parameter.service.js'
import { ubahStatus, statusTerminal } from './status.service.js'
import type { PenggunaToken } from '../middleware/rbac.js'

/**
 * Siklus hidup pengajuan (FR-02, FR-10).
 *
 * Dua hal yang membedakan modul ini dari CRUD biasa:
 *
 * 1. TOTAL PLAFON DAN LEVEL APPROVAL TIDAK PERNAH DISIMPAN. Keduanya dihitung
 *    setiap kali dibaca dari anggota AKTIF (ADR-0002). Itulah yang membuat AC-14
 *    bekerja tanpa kode "evaluasi ulang level" yang harus diingat siapa pun.
 *
 * 2. NOMOR REFERENSI dibangkitkan di dalam transaksi yang sama dengan penyimpanan
 *    pengajuan, memakai baris terkunci di `urutan_referensi` (BR-12).
 */

export type MasukanAnggota = {
  nama: string
  nik: string
  alamat: string
  jenisUsaha: string
  plafonDiajukan: number
}

export type MasukanBuatPengajuan = {
  jenisNasabah: JenisNasabah
  akad: Akad
  tenorBulan: number
  anggota: MasukanAnggota[]
}

/**
 * Membangkitkan nomor referensi berikutnya. WAJIB dipanggil di dalam transaksi.
 *
 * `upsert` diikuti `update` atomik: PostgreSQL mengunci barisnya, sehingga dua AO
 * yang submit pada detik yang sama tidak pernah mendapat nomor yang sama.
 * Penghitung hanya naik — nomor pengajuan yang kelak ditolak tidak dipakai ulang.
 */
async function nomorReferensiBerikutnya(tx: typeof prisma, sekarang: Date): Promise<string> {
  const kunci = kunciTanggal(sekarang)
  await tx.urutanReferensi.upsert({
    where: { tanggal: kunci },
    create: { tanggal: kunci, urutanTerakhir: 0 },
    update: {},
  })
  const baris = await tx.urutanReferensi.update({
    where: { tanggal: kunci },
    data: { urutanTerakhir: { increment: 1 } },
  })
  return rakitNomorReferensi(kunci, baris.urutanTerakhir)
}

export async function buatPengajuan(aktor: PenggunaToken, masukan: MasukanBuatPengajuan) {
  validasiJumlahAnggota(masukan.jenisNasabah, masukan.anggota.length)

  if (masukan.tenorBulan < 3 || masukan.tenorBulan > 36) {
    throw new PelanggaranAturan('FR-02', 'Tenor harus antara 3 dan 36 bulan')
  }
  for (const a of masukan.anggota) {
    if (!/^\d{16}$/.test(a.nik)) {
      // Pesan sengaja TIDAK memuat NIK-nya (BR-11).
      throw new PelanggaranAturan('FR-02', 'NIK harus 16 digit angka')
    }
  }

  return prisma.$transaction(async (tx) => {
    const nomorReferensi = await nomorReferensiBerikutnya(tx as typeof prisma, new Date())

    const pengajuan = await tx.pengajuan.create({
      data: {
        nomorReferensi,
        jenisNasabah: masukan.jenisNasabah,
        akad: masukan.akad,
        tenorBulan: masukan.tenorBulan,
        status: 'DRAFT',
        dibuatOleh: aktor.id,
      },
    })

    for (const [i, a] of masukan.anggota.entries()) {
      const nasabah = await tx.nasabah.upsert({
        where: { nik: a.nik },
        create: { nik: a.nik, nama: a.nama, alamat: a.alamat, jenisUsaha: a.jenisUsaha },
        update: { nama: a.nama, alamat: a.alamat, jenisUsaha: a.jenisUsaha },
      })

      // Asumsi A-6: satu NIK hanya boleh punya satu pengajuan aktif.
      const aktifLain = await tx.pengajuanAnggota.findFirst({
        where: {
          nasabahId: nasabah.id,
          pengajuanId: { not: pengajuan.id },
          pengajuan: {
            status: { notIn: ['REJECTED_SLIK', 'REJECTED_SCORING', 'APPROVED', 'REJECTED'] },
          },
        },
        include: { pengajuan: { select: { nomorReferensi: true } } },
      })
      if (aktifLain) {
        throw new PelanggaranAturan(
          'A-6',
          `Nasabah ini sudah memiliki pengajuan aktif ${aktifLain.pengajuan.nomorReferensi}`,
        )
      }

      await tx.pengajuanAnggota.create({
        data: {
          pengajuanId: pengajuan.id,
          nasabahId: nasabah.id,
          plafonDiajukan: BigInt(a.plafonDiajukan),
          urutan: i + 1,
        },
      })
    }

    return { id: pengajuan.id, nomorReferensi, status: pengajuan.status }
  })
}

/**
 * Submit (AC-01). BR-01 divalidasi DI SINI, bukan saat DRAFT disimpan: AO boleh
 * menyimpan draf setengah jadi di lapangan; yang tidak boleh adalah mengirimnya.
 */
export async function submitPengajuan(aktor: PenggunaToken, pengajuanId: string) {
  const pengajuan = await prisma.pengajuan.findUnique({
    where: { id: pengajuanId },
    include: { anggota: true },
  })
  if (!pengajuan) throw new TidakDitemukan('Pengajuan tidak ditemukan')

  // Otorisasi LAPIS 2: peran sudah dicek middleware, kepemilikan dicek di sini.
  if (pengajuan.dibuatOleh !== aktor.id) {
    throw new AksesDitolak('Anda hanya dapat mengirim pengajuan milik Anda sendiri')
  }
  if (pengajuan.status !== 'DRAFT' && pengajuan.status !== 'DIKEMBALIKAN') {
    throw new PelanggaranAturan('FR-02', `Pengajuan berstatus ${pengajuan.status} tidak dapat dikirim`)
  }

  const anggota = pengajuan.anggota.map((a) => ({
    plafonDiajukan: rupiahKeNumber(a.plafonDiajukan),
    statusAnggota: a.statusAnggota,
  }))
  const aktif = anggota.filter((a) => a.statusAnggota === 'AKTIF').length
  validasiJumlahAnggota(pengajuan.jenisNasabah, aktif)

  const ambang = await bacaAmbangApproval()
  const totalPlafon = hitungTotalPlafon(anggota)
  validasiBatasPlafon(totalPlafon, batasDariAmbang(ambang))

  await prisma.$transaction(async (tx) => {
    await ubahStatus(tx, {
      pengajuanId,
      dari: pengajuan.status,
      ke: 'SUBMITTED',
      aktor,
      sebab: 'Dikirim oleh AO setelah validasi batas plafon (BR-01)',
      metadata: { totalPlafon, jumlahAnggotaAktif: aktif },
    })
  })

  return { id: pengajuanId, nomorReferensi: pengajuan.nomorReferensi, status: 'SUBMITTED' }
}

/**
 * Ringkasan satu pengajuan, LENGKAP dengan nilai turunan yang dihitung saat
 * dibaca. Inilah satu-satunya tempat total plafon dan level approval dihitung —
 * kalau muncul perhitungan kedua di berkas lain, ADR-0002 sudah dilanggar.
 */
export async function ringkasanPengajuan(pengajuanId: string) {
  const p = await prisma.pengajuan.findUnique({
    where: { id: pengajuanId },
    include: { anggota: { include: { nasabah: true } }, pembuat: true },
  })
  if (!p) throw new TidakDitemukan('Pengajuan tidak ditemukan')

  const anggota = p.anggota.map((a) => ({
    plafonDiajukan: rupiahKeNumber(a.plafonDiajukan),
    statusAnggota: a.statusAnggota,
  }))
  const totalPlafon = hitungTotalPlafon(anggota)
  const ambang = await bacaAmbangApproval()
  const urutanPeran = urutanApprovalUntuk(totalPlafon, ambang)

  return {
    id: p.id,
    nomorReferensi: p.nomorReferensi,
    jenisNasabah: p.jenisNasabah,
    akad: p.akad,
    tenorBulan: p.tenorBulan,
    status: p.status,
    terminal: statusTerminal(p.status),
    totalPlafon,
    urutanApproval: urutanPeran,
    jumlahLevel: urutanPeran.length,
    dibuatOleh: { id: p.pembuat.id, nama: p.pembuat.nama },
    anggota: p.anggota.map((a) => ({
      id: a.id,
      urutan: a.urutan,
      nama: a.nasabah.nama,
      // NIK disamarkan sebelum meninggalkan server (BR-11).
      nikTersamar: `${a.nasabah.nik.slice(0, 4)}********${a.nasabah.nik.slice(-4)}`,
      jenisUsaha: a.nasabah.jenisUsaha,
      plafonDiajukan: rupiahKeNumber(a.plafonDiajukan),
      statusAnggota: a.statusAnggota,
    })),
  }
}

/** Daftar pengajuan, DIFILTER PERAN DI QUERY SERVER — bukan di frontend (FR-12). */
export async function daftarPengajuan(aktor: PenggunaToken, filterStatus?: string) {
  const where: Record<string, unknown> = {}
  if (filterStatus) where.status = filterStatus
  if (aktor.peran === 'AO') where.dibuatOleh = aktor.id

  const baris = await prisma.pengajuan.findMany({
    where,
    include: { anggota: true },
    orderBy: { diubahPada: 'desc' },
    take: 100,
  })

  return baris.map((p) => ({
    id: p.id,
    nomorReferensi: p.nomorReferensi,
    jenisNasabah: p.jenisNasabah,
    akad: p.akad,
    status: p.status,
    jumlahAnggota: p.anggota.filter((a) => a.statusAnggota === 'AKTIF').length,
    totalPlafon: hitungTotalPlafon(
      p.anggota.map((a) => ({
        plafonDiajukan: rupiahKeNumber(a.plafonDiajukan),
        statusAnggota: a.statusAnggota,
      })),
    ),
    diubahPada: p.diubahPada,
  }))
}
