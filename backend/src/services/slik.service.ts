import { SlikClient, type SlikResult, type SlikStatusPanggilan } from '../clients/slik.client.js'
import { env } from '../config/env.js'
import { prisma } from '../lib/prisma.js'
import { PelanggaranAturan, TidakDitemukan } from '../lib/errors.js'
import { tulisAudit, AKSI } from './audit.service.js'
import { ubahStatus } from './status.service.js'
import type { PenggunaToken } from '../middleware/rbac.js'

/**
 * Orkestrasi SLIK check (FR-05, Tabel 4.2, AC-05, AC-06).
 *
 * SEBELUMNYA modul ini hanya memanggil mock dan menyimpan satu baris. Tiga hal
 * yang membuatnya tidak memenuhi FR-05, dan semuanya diperbaiki di sini:
 *
 *   1. NIK diambil dari BODY permintaan dan id pengajuan ditulis ke kolom
 *      `pengajuan_anggota_id`. Setiap panggilan berakhir 500 karena foreign
 *      key — endpointnya tidak pernah berhasil satu kali pun.
 *   2. Hanya satu nasabah yang diperiksa. FR-05 mensyaratkan SETIAP anggota
 *      aktif diperiksa; pada majelis, satu anggota bermasalah menentukan nasib
 *      seluruh pengajuan.
 *   3. Tabel 4.2 tidak diterapkan sama sekali: kolektibilitas 4 tetap membuat
 *      pengajuan berjalan seolah-olah bersih. Itu kegagalan paling mahal di
 *      sistem ini — nasabah yang seharusnya ditolak otomatis justru sampai ke
 *      meja approval.
 *
 * ATURAN YANG DITEGAKKAN DI SINI (Tabel 4.2):
 *
 *   | Kolektibilitas | Keluaran                                              |
 *   |----------------|-------------------------------------------------------|
 *   | 1              | lanjut                                                |
 *   | 2              | lanjut, grade final dilantai di 3, catatan analis wajib|
 *   | 3 / 4 / 5      | REJECTED_SLIK — terminal, tidak melalui approval (AC-05)|
 *   | 404            | SLIK_GAGAL, alasan NIK_TIDAK_DITEMUKAN                 |
 *   | 503 / timeout  | SLIK_GAGAL, alasan LAYANAN_TIDAK_TERSEDIA             |
 *
 * KEGAGALAN TIDAK PERNAH MENJADI SLIK BERSIH. Baris `hasil_slik` tetap ditulis
 * untuk panggilan yang gagal, dengan `kolektibilitas` NULL — bukan 0, bukan 1.
 * Alur berhenti di `SLIK_GAGAL` sampai ANL mengulang.
 *
 * BR-11: NIK tidak pernah masuk log, audit, pesan galat, maupun URL. Yang keluar
 * dari modul ini hanya id internal dan NIK tersamar.
 */

export type KeluaranSlik = 'LANJUT' | 'LANTAI_GRADE_3' | 'DITOLAK_OTOMATIS' | 'GAGAL' | 'BELUM_LENGKAP'

/** Alasan kegagalan yang dilihat ANL. Dipetakan dari status klien, bukan dari HTTP mentah. */
const ALASAN_GAGAL: Record<Exclude<SlikStatusPanggilan, 'OK'>, string> = {
  NOT_FOUND: 'NIK_TIDAK_DITEMUKAN',
  UNAVAILABLE: 'LAYANAN_TIDAK_TERSEDIA',
  TIMEOUT: 'LAYANAN_TIDAK_TERSEDIA',
}

/** Status pengajuan yang boleh menjalankan SLIK check (SRS 3.2). */
const STATUS_BOLEH_SLIK = ['VERIFIKASI_DOKUMEN', 'SLIK_GAGAL'] as const

export type HasilAnggotaSlik = {
  anggotaId: string
  nikTersamar: string
  nama: string
  statusPanggilan: SlikStatusPanggilan
  kolektibilitas: number | null
  alasanGagal: string | null
  keluaran: KeluaranSlik
  diperiksaPada: Date
}

export type HasilSlikCheck = {
  /** Kompatibel dengan layar S-08: status panggilan yang baru saja dijalankan. */
  status: SlikStatusPanggilan
  data?: {
    nama: string
    kolektibilitas: number
    jumlahFasilitasAktif: number
    totalBakiDebet: number
    tanggalData: string
    referenceId: string
  }
  error?: string
  /** Keluaran Tabel 4.2 untuk SELURUH pengajuan setelah panggilan ini. */
  keluaran: KeluaranSlik
  statusPengajuan: string
  ringkasan: {
    anggotaAktif: number
    anggotaSudahDiperiksa: number
    kolektibilitasTerburuk: number | null
    adaKegagalan: boolean
    catatanAnalisWajib: boolean
  }
  anggota: HasilAnggotaSlik[]
}

function samarkan(nik: string): string {
  return `${nik.slice(0, 4)}********${nik.slice(-4)}`
}

/**
 * Klien dibuat per pemanggilan, bukan sekali di tingkat modul.
 *
 * Alasannya bukan gaya: konstruksi di tingkat modul membaca konfigurasi saat
 * berkas di-import, sehingga test yang mengganti alamat SLIK harus mengatur
 * urutan import — dan urutan import adalah hal terakhir yang boleh menentukan
 * apakah aturan bisnis diuji atau tidak.
 */
function buatKlien(): SlikClient {
  return new SlikClient(env.slikBaseUrl, env.slikInquiryPath, env.slikTimeoutMs)
}

/**
 * Menjalankan SLIK untuk satu atau seluruh anggota aktif.
 *
 * `nikTerpilih` bersifat opsional dan datang dari BODY (tidak pernah dari URL,
 * BR-11). Layar S-08 memakainya karena ANL mengetik ulang NIK per anggota
 * sebagai konfirmasi identitas — server tetap yang memutuskan NIK itu memang
 * milik anggota pengajuan ini. Tanpa `nikTerpilih`, seluruh anggota aktif
 * diperiksa sekaligus, persis seperti FR-05.
 */
export async function jalankanSlikCheck(
  aktor: PenggunaToken,
  pengajuanId: string,
  nikTerpilih?: string,
): Promise<HasilSlikCheck> {
  const pengajuan = await prisma.pengajuan.findUnique({
    where: { id: pengajuanId },
    include: {
      anggota: {
        where: { statusAnggota: 'AKTIF' },
        include: { nasabah: true },
        orderBy: { urutan: 'asc' },
      },
    },
  })
  if (!pengajuan) throw new TidakDitemukan('Pengajuan tidak ditemukan')

  if (!STATUS_BOLEH_SLIK.includes(pengajuan.status as (typeof STATUS_BOLEH_SLIK)[number])) {
    throw new PelanggaranAturan(
      'FR-05',
      `SLIK check hanya dapat dijalankan saat verifikasi dokumen selesai atau setelah SLIK gagal. ` +
        `Status pengajuan saat ini ${pengajuan.status}.`,
    )
  }
  if (pengajuan.anggota.length === 0) {
    throw new PelanggaranAturan('FR-05', 'Pengajuan tidak memiliki anggota aktif')
  }

  // Anggota yang diperiksa pada pemanggilan ini.
  const sasaran = nikTerpilih
    ? pengajuan.anggota.filter((a) => a.nasabah.nik === nikTerpilih)
    : pengajuan.anggota

  if (sasaran.length === 0) {
    // Pesan sengaja TIDAK menyebut NIK-nya (BR-11), dan sengaja tidak
    // membocorkan apakah NIK itu ada di sistem — hanya bahwa ia bukan anggota
    // pengajuan ini.
    throw new PelanggaranAturan(
      'FR-05',
      'NIK yang dikirim bukan milik anggota aktif pengajuan ini',
    )
  }

  const klien = buatKlien()
  let terakhir: SlikResult | undefined

  for (const anggota of sasaran) {
    const hasil = await klien.inquiry(anggota.nasabah.nik)
    terakhir = hasil

    // Panggilan HTTP sengaja DI LUAR transaksi: transaksi database yang
    // menunggu jaringan menahan koneksi dari kuota bersama (docs/DATABASE.md).
    await prisma.$transaction(async (tx) => {
      await tx.hasilSlik.create({
        data: {
          pengajuanAnggotaId: anggota.id,
          statusPanggilan: hasil.status,
          kolektibilitas: hasil.data?.kolektibilitas ?? null,
          jumlahFasilitasAktif: hasil.data?.jumlahFasilitasAktif ?? null,
          totalBakiDebet: hasil.data?.totalBakiDebet ?? null,
          tanggalData: hasil.data ? new Date(hasil.data.tanggalData) : null,
          referenceId: hasil.data?.referenceId ?? null,
          diperiksaOleh: aktor.id,
          diperiksaPada: new Date(),
        },
      })

      await tulisAudit(tx, {
        pengajuanId,
        aktorId: aktor.id,
        aktorPeran: aktor.peran,
        aksi: hasil.status === 'OK' ? AKSI.SLIK_OK : AKSI.SLIK_GAGAL,
        // Tanpa NIK dan tanpa nama (BR-11) — id anggota cukup untuk korelasi.
        metadata: {
          anggotaId: anggota.id,
          statusPanggilan: hasil.status,
          kolektibilitas: hasil.data?.kolektibilitas ?? null,
          referenceId: hasil.data?.referenceId ?? null,
          ...(hasil.status === 'OK'
            ? {}
            : { alasan: ALASAN_GAGAL[hasil.status as Exclude<SlikStatusPanggilan, 'OK'>] }),
        },
      })
    })
  }

  const ringkas = await ringkasSlikPengajuan(pengajuanId)
  const statusBaru = await terapkanTabel42(aktor, pengajuanId, pengajuan.status, ringkas)

  return {
    status: terakhir?.status ?? 'OK',
    data: terakhir?.data
      ? {
          nama: terakhir.data.nama,
          kolektibilitas: terakhir.data.kolektibilitas,
          jumlahFasilitasAktif: terakhir.data.jumlahFasilitasAktif,
          // BigInt tidak dapat diserialisasi JSON — ia MELEMPAR, bukan menjadi
          // string. Lihat tests/integration/slik-serialisasi.spec.ts.
          totalBakiDebet: Number(terakhir.data.totalBakiDebet),
          tanggalData: terakhir.data.tanggalData,
          referenceId: terakhir.data.referenceId,
        }
      : undefined,
    error: terakhir?.error,
    keluaran: ringkas.keluaran,
    statusPengajuan: statusBaru,
    ringkasan: {
      anggotaAktif: ringkas.anggota.length,
      anggotaSudahDiperiksa: ringkas.anggota.filter((a) => a.statusPanggilan !== null).length,
      kolektibilitasTerburuk: ringkas.kolektibilitasTerburuk,
      adaKegagalan: ringkas.adaKegagalan,
      catatanAnalisWajib: ringkas.kolektibilitasTerburuk === 2,
    },
    anggota: ringkas.anggota.map((a) => ({
      anggotaId: a.anggotaId,
      nikTersamar: a.nikTersamar,
      nama: a.nama,
      statusPanggilan: (a.statusPanggilan ?? 'UNAVAILABLE') as SlikStatusPanggilan,
      kolektibilitas: a.kolektibilitas,
      alasanGagal: a.alasanGagal,
      keluaran: a.keluaran,
      diperiksaPada: a.diperiksaPada ?? new Date(),
    })),
  }
}

export type RingkasanSlik = {
  anggota: {
    anggotaId: string
    nikTersamar: string
    nama: string
    statusPanggilan: SlikStatusPanggilan | null
    kolektibilitas: number | null
    alasanGagal: string | null
    keluaran: KeluaranSlik
    tanggalData: Date | null
    diperiksaPada: Date | null
  }[]
  /** Kolektibilitas TERBURUK di antara anggota aktif; null bila belum ada satu pun hasil OK. */
  kolektibilitasTerburuk: number | null
  adaKegagalan: boolean
  semuaSudahDiperiksa: boolean
  keluaran: KeluaranSlik
}

/**
 * Membaca hasil SLIK TERBARU per anggota aktif dan menyimpulkannya.
 *
 * Dibaca dari database, bukan dari hasil panggilan barusan: pada majelis, ANL
 * memeriksa anggota satu per satu, dan kesimpulan pengajuan harus memakai
 * seluruh anggota — termasuk yang diperiksa sepuluh menit lalu.
 */
export async function ringkasSlikPengajuan(pengajuanId: string): Promise<RingkasanSlik> {
  const anggota = await prisma.pengajuanAnggota.findMany({
    where: { pengajuanId, statusAnggota: 'AKTIF' },
    include: {
      nasabah: true,
      hasilSlik: { orderBy: { diperiksaPada: 'desc' }, take: 1 },
    },
    orderBy: { urutan: 'asc' },
  })

  const baris = anggota.map((a) => {
    const terbaru = a.hasilSlik[0]
    const status = (terbaru?.statusPanggilan ?? null) as SlikStatusPanggilan | null
    const kol = terbaru?.kolektibilitas ?? null

    let keluaran: KeluaranSlik = 'BELUM_LENGKAP'
    if (status !== null && status !== 'OK') keluaran = 'GAGAL'
    else if (kol !== null && kol >= 3) keluaran = 'DITOLAK_OTOMATIS'
    else if (kol === 2) keluaran = 'LANTAI_GRADE_3'
    else if (kol === 1) keluaran = 'LANJUT'

    return {
      anggotaId: a.id,
      nikTersamar: samarkan(a.nasabah.nik),
      nama: a.nasabah.nama,
      statusPanggilan: status,
      kolektibilitas: kol,
      alasanGagal:
        status !== null && status !== 'OK'
          ? ALASAN_GAGAL[status as Exclude<SlikStatusPanggilan, 'OK'>]
          : null,
      keluaran,
      tanggalData: terbaru?.tanggalData ?? null,
      diperiksaPada: terbaru?.diperiksaPada ?? null,
    }
  })

  const nilaiKol = baris.map((b) => b.kolektibilitas).filter((k): k is number => k !== null)
  const kolektibilitasTerburuk = nilaiKol.length > 0 ? Math.max(...nilaiKol) : null
  const adaKegagalan = baris.some((b) => b.statusPanggilan !== null && b.statusPanggilan !== 'OK')
  const semuaSudahDiperiksa = baris.length > 0 && baris.every((b) => b.statusPanggilan !== null)

  /**
   * URUTAN KEPUTUSAN, dan alasannya.
   *
   * Penolakan otomatis (kol-3/4/5) diperiksa LEBIH DULU daripada kegagalan.
   * Alasannya: penolakan itu didasarkan pada data yang benar-benar diterima,
   * dan ia terminal. Mendahulukan kegagalan berarti satu anggota yang timeout
   * bisa menunda penolakan nasabah macet — persis arah kesalahan yang paling
   * berbahaya di sistem pembiayaan.
   */
  let keluaran: KeluaranSlik
  if (kolektibilitasTerburuk !== null && kolektibilitasTerburuk >= 3) keluaran = 'DITOLAK_OTOMATIS'
  else if (adaKegagalan) keluaran = 'GAGAL'
  else if (!semuaSudahDiperiksa) keluaran = 'BELUM_LENGKAP'
  else if (kolektibilitasTerburuk === 2) keluaran = 'LANTAI_GRADE_3'
  else keluaran = 'LANJUT'

  return { anggota: baris, kolektibilitasTerburuk, adaKegagalan, semuaSudahDiperiksa, keluaran }
}

/**
 * Menerapkan keluaran Tabel 4.2 ke status pengajuan.
 *
 * `BELUM_LENGKAP` sengaja TIDAK mengubah status: pada majelis, memeriksa satu
 * anggota tidak boleh menyatakan seluruh kelompok bersih.
 */
async function terapkanTabel42(
  aktor: PenggunaToken,
  pengajuanId: string,
  statusSekarang: string,
  ringkas: RingkasanSlik,
): Promise<string> {
  const tujuan =
    ringkas.keluaran === 'DITOLAK_OTOMATIS'
      ? 'REJECTED_SLIK'
      : ringkas.keluaran === 'GAGAL'
        ? 'SLIK_GAGAL'
        : ringkas.keluaran === 'LANJUT' || ringkas.keluaran === 'LANTAI_GRADE_3'
          ? 'SLIK_OK'
          : null

  if (tujuan === null || tujuan === statusSekarang) return statusSekarang

  await prisma.$transaction(async (tx) => {
    await ubahStatus(tx, {
      pengajuanId,
      dari: statusSekarang as never,
      ke: tujuan as never,
      aktor,
      sebab:
        tujuan === 'REJECTED_SLIK'
          ? `Kolektibilitas ${ringkas.kolektibilitasTerburuk} pada minimal satu anggota (Tabel 4.2, AC-05)`
          : tujuan === 'SLIK_GAGAL'
            ? 'Panggilan SLIK gagal untuk minimal satu anggota; alur dihentikan sampai SLIK diulang'
            : `SLIK bersih untuk seluruh anggota aktif (kolektibilitas terburuk ${ringkas.kolektibilitasTerburuk})`,
      metadata: {
        kolektibilitasTerburuk: ringkas.kolektibilitasTerburuk,
        adaKegagalan: ringkas.adaKegagalan,
        keluaran: ringkas.keluaran,
      },
    })
  })

  return tujuan
}

/** Riwayat panggilan SLIK satu pengajuan, termasuk yang gagal (S-08). */
export async function riwayatSlikPengajuan(pengajuanId: string) {
  const anggota = await prisma.pengajuanAnggota.findMany({
    where: { pengajuanId },
    select: { id: true },
  })
  const ids = anggota.map((a) => a.id)

  const riwayat = await prisma.hasilSlik.findMany({
    where: { pengajuanAnggotaId: { in: ids } },
    orderBy: { diperiksaPada: 'desc' },
  })

  /**
   * DTO, bukan baris Prisma mentah.
   *
   * `total_baki_debet` bertipe BIGINT, dan `JSON.stringify` MELEMPAR pada
   * BigInt — ia tidak mengubahnya menjadi string, melainkan menggagalkan
   * seluruh respons. Endpoint ini pernah menjawab 500 setiap kali ada satu saja
   * hasil SLIK tersimpan, dan layar S-08 tidak pernah menampilkan apa pun.
   * Dijaga oleh tests/integration/slik-serialisasi.spec.ts.
   *
   * `diperiksaOleh` sengaja tidak ikut: layar tidak memakainya, dan itu
   * identitas pegawai yang tidak perlu meninggalkan server.
   */
  return riwayat.map((r) => ({
    id: r.id,
    pengajuanAnggotaId: r.pengajuanAnggotaId,
    statusPanggilan: r.statusPanggilan,
    kolektibilitas: r.kolektibilitas,
    jumlahFasilitasAktif: r.jumlahFasilitasAktif,
    totalBakiDebet: r.totalBakiDebet === null ? null : Number(r.totalBakiDebet),
    tanggalData: r.tanggalData,
    referenceId: r.referenceId,
    diperiksaPada: r.diperiksaPada,
  }))
}
