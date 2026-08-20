import type { Akad, JenisNasabah } from '@prisma/client'
import { prisma, rupiahKeNumber } from '../lib/prisma.js'
import { AksesDitolak, PelanggaranAturan, TidakDitemukan } from '../lib/errors.js'
import { kunciTanggal, rakitNomorReferensi } from '../domain/nomor-referensi.js'
import {
  MAKS_ANGGOTA_MAJELIS,
  batasDariAmbang,
  validasiBatasPlafon,
  validasiJumlahAnggota,
} from '../domain/plafon.js'
import { hitungTotalPlafon, urutanApprovalUntuk } from '../domain/approval.js'
import { bacaAmbangApproval } from './parameter.service.js'
import { tulisAudit, AKSI } from './audit.service.js'
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
  // Upsert-increment atomik dalam satu pernyataan: INSERT ... ON CONFLICT DO
  // UPDATE. Dua AO (atau dua test paralel) yang membuat pengajuan pada tanggal
  // yang sama tidak lagi bertabrakan pada create terpisah — nomor tetap unik dan
  // hanya naik (BR-12).
  const baris = await tx.$queryRaw<{ urutan_terakhir: number }[]>`
    INSERT INTO "urutan_referensi" ("tanggal", "urutan_terakhir")
    VALUES (${kunci}, 1)
    ON CONFLICT ("tanggal")
    DO UPDATE SET "urutan_terakhir" = "urutan_referensi"."urutan_terakhir" + 1
    RETURNING "urutan_terakhir"
  `
  return rakitNomorReferensi(kunci, baris[0].urutan_terakhir)
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

// ---------------------------------------------------------------------------
//  Anggota majelis (FR-10, AC-14)
// ---------------------------------------------------------------------------

const STATUS_BOLEH_UBAH_ANGGOTA = ['DRAFT', 'DIKEMBALIKAN']

/** Tambah satu anggota ke pengajuan KELOMPOK selama masih DRAFT/DIKEMBALIKAN. */
export async function tambahAnggota(
  aktor: PenggunaToken,
  pengajuanId: string,
  masukan: MasukanAnggota,
) {
  const pengajuan = await prisma.pengajuan.findUnique({
    where: { id: pengajuanId },
    include: { anggota: true },
  })
  if (!pengajuan) throw new TidakDitemukan('Pengajuan tidak ditemukan')
  if (pengajuan.dibuatOleh !== aktor.id) {
    throw new AksesDitolak('Anda hanya dapat mengubah pengajuan milik Anda sendiri')
  }
  if (!STATUS_BOLEH_UBAH_ANGGOTA.includes(pengajuan.status)) {
    throw new PelanggaranAturan('FR-10', `Anggota hanya dapat diubah saat DRAFT atau DIKEMBALIKAN`)
  }
  if (pengajuan.jenisNasabah !== 'KELOMPOK') {
    throw new PelanggaranAturan('FR-10', 'Anggota tambahan hanya untuk pengajuan kelompok')
  }
  if (!/^\d{16}$/.test(masukan.nik)) {
    throw new PelanggaranAturan('FR-02', 'NIK harus 16 digit angka')
  }
  const aktif = pengajuan.anggota.filter((a) => a.statusAnggota === 'AKTIF').length
  if (aktif >= MAKS_ANGGOTA_MAJELIS) {
    throw new PelanggaranAturan('FR-10', `Pembiayaan kelompok maksimal ${MAKS_ANGGOTA_MAJELIS} anggota`)
  }

  return prisma.$transaction(async (tx) => {
    const nasabah = await tx.nasabah.upsert({
      where: { nik: masukan.nik },
      create: {
        nik: masukan.nik,
        nama: masukan.nama,
        alamat: masukan.alamat,
        jenisUsaha: masukan.jenisUsaha,
      },
      update: { nama: masukan.nama, alamat: masukan.alamat, jenisUsaha: masukan.jenisUsaha },
    })

    const duplikat = pengajuan.anggota.find((a) => a.nasabahId === nasabah.id)
    if (duplikat) {
      throw new PelanggaranAturan('FR-10', 'Nasabah ini sudah menjadi anggota pengajuan ini')
    }

    const urutanBaru = pengajuan.anggota.length + 1
    const anggota = await tx.pengajuanAnggota.create({
      data: {
        pengajuanId,
        nasabahId: nasabah.id,
        plafonDiajukan: BigInt(masukan.plafonDiajukan),
        urutan: urutanBaru,
      },
    })

    await tulisAudit(tx, {
      pengajuanId,
      aktorId: aktor.id,
      aktorPeran: aktor.peran,
      aksi: AKSI.UBAH_STATUS,
      metadata: { sebab: 'Tambah anggota majelis', anggotaId: anggota.id, urutan: urutanBaru },
    })

    return { id: anggota.id, urutan: urutanBaru, statusAnggota: anggota.statusAnggota }
  })
}

/** Ubah plafon satu anggota selama pengajuan masih DRAFT/DIKEMBALIKAN. */
export async function ubahAnggota(
  aktor: PenggunaToken,
  pengajuanId: string,
  anggotaId: string,
  plafonDiajukan: number,
) {
  const pengajuan = await prisma.pengajuan.findUnique({
    where: { id: pengajuanId },
    include: { anggota: true },
  })
  if (!pengajuan) throw new TidakDitemukan('Pengajuan tidak ditemukan')
  if (pengajuan.dibuatOleh !== aktor.id) {
    throw new AksesDitolak('Anda hanya dapat mengubah pengajuan milik Anda sendiri')
  }
  if (!STATUS_BOLEH_UBAH_ANGGOTA.includes(pengajuan.status)) {
    throw new PelanggaranAturan('FR-10', 'Anggota hanya dapat diubah saat DRAFT atau DIKEMBALIKAN')
  }
  const anggota = pengajuan.anggota.find((a) => a.id === anggotaId)
  if (!anggota) throw new TidakDitemukan('Anggota tidak ditemukan pada pengajuan ini')
  if (!Number.isInteger(plafonDiajukan) || plafonDiajukan <= 0) {
    throw new PelanggaranAturan('FR-02', 'Plafon harus bilangan bulat positif')
  }

  await prisma.$transaction(async (tx) => {
    await tx.pengajuanAnggota.update({
      where: { id: anggotaId },
      data: { plafonDiajukan: BigInt(plafonDiajukan) },
    })
    await tulisAudit(tx, {
      pengajuanId,
      aktorId: aktor.id,
      aktorPeran: aktor.peran,
      aksi: AKSI.UBAH_STATUS,
      metadata: { sebab: 'Ubah plafon anggota', anggotaId },
    })
  })

  return { id: anggotaId, plafonDiajukan }
}

/**
 * ANL menolak satu anggota (AC-14). Statusnya menjadi DITOLAK, dan total plafon
 * serta level approval otomatis dihitung ulang saat berikutnya dibaca — tidak
 * ada kode "evaluasi ulang level" (ADR-0002).
 *
 * Kelompok yang menyusut di bawah 3 anggota aktif ditolak: kelompok harus
 * dibubarkan, bukan dibiarkan menjadi tidak sah (FR-10).
 */
export async function tolakAnggota(aktor: PenggunaToken, pengajuanId: string, anggotaId: string) {
  const pengajuan = await prisma.pengajuan.findUnique({
    where: { id: pengajuanId },
    include: { anggota: true },
  })
  if (!pengajuan) throw new TidakDitemukan('Pengajuan tidak ditemukan')
  if (statusTerminal(pengajuan.status)) {
    throw new PelanggaranAturan('FR-10', `Pengajuan berstatus ${pengajuan.status} sudah final`)
  }

  const anggota = pengajuan.anggota.find((a) => a.id === anggotaId)
  if (!anggota) throw new TidakDitemukan('Anggota tidak ditemukan pada pengajuan ini')
  if (anggota.statusAnggota === 'DITOLAK') {
    throw new PelanggaranAturan('FR-10', 'Anggota ini sudah ditolak')
  }

  const aktifSetelahnya = pengajuan.anggota.filter(
    (a) => a.statusAnggota === 'AKTIF' && a.id !== anggotaId,
  ).length

  // Melempar bila jumlah aktif tersisa menjadi tidak sah untuk jenis nasabahnya.
  validasiJumlahAnggota(pengajuan.jenisNasabah, aktifSetelahnya)

  await prisma.$transaction(async (tx) => {
    await tx.pengajuanAnggota.update({
      where: { id: anggotaId },
      data: { statusAnggota: 'DITOLAK' },
    })
    await tulisAudit(tx, {
      pengajuanId,
      aktorId: aktor.id,
      aktorPeran: aktor.peran,
      aksi: AKSI.TOLAK_ANGGOTA,
      metadata: { anggotaId, sisaAnggotaAktif: aktifSetelahnya },
    })
  })

  const anggotaBaru = pengajuan.anggota
    .filter((a) => a.id !== anggotaId)
    .map((a) => ({
      plafonDiajukan: rupiahKeNumber(a.plafonDiajukan),
      statusAnggota: a.statusAnggota,
    }))
  const totalPlafonBaru = hitungTotalPlafon(anggotaBaru)
  const ambang = await bacaAmbangApproval()
  const urutanBaru = urutanApprovalUntuk(totalPlafonBaru, ambang)

  return {
    id: anggotaId,
    statusAnggota: 'DITOLAK',
    totalPlafon: totalPlafonBaru,
    jumlahLevel: urutanBaru.length,
    urutanApproval: urutanBaru,
  }
}
