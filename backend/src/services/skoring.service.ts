import { prisma } from '../lib/prisma.js'
import { PelanggaranAturan, TidakDitemukan } from '../lib/errors.js'
import {
  bacaBobotKomponen,
  bacaMasaBerlakuSlikHari,
  bacaParameterSkalar,
  bacaRentangGrade,
  ambilSnapshotParameter,
} from './parameter.service.js'
import { hitungSkorKelayakan } from '../domain/skoring.js'
import { gradeDariSkor, terapkanLantaiKolektibilitas } from '../domain/grade.js'
import { JENIS_DOKUMEN_WAJIB } from '../domain/dokumen.js'
import {
  pastikanPrasyaratTerpenuhi,
  slikMasihBerlaku,
  type StatusPrasyarat,
} from '../domain/prasyarat-skoring.js'
import { tulisAudit, AKSI } from './audit.service.js'
import { ubahStatus } from './status.service.js'
import type { PenggunaToken } from '../middleware/rbac.js'

/**
 * Skoring kelayakan (FR-06, BR-03, BR-04, BR-07, BR-08, AC-04, AC-06, AC-07).
 *
 * VERSI SEBELUMNYA MENGHITUNG DARI ANGKA YANG DIPAKU. Dua baris membuat seluruh
 * lapisan aturan di bawahnya tidak pernah berjalan:
 *
 *   kolektibilitas: 1                       // hasil SLIK tidak pernah dibaca
 *   { semuaDokumenTerverifikasi: true, ... } // prasyarat diisi sendiri, lalu
 *                                            // "diperiksa" terhadap isian itu
 *
 * Akibatnya lantai grade kol-2 (AC-06) tidak pernah aktif, BR-04 tidak pernah
 * dievaluasi, dan BR-03 hanya memeriksa survei. Kelas kesalahan ini sulit
 * terlihat karena fungsinya BENAR dan bertest — yang salah adalah masukannya.
 *
 * Di berkas ini setiap masukan dibaca dari database:
 *   - dokumen wajib per anggota aktif, versi TERBARU tiap jenis, harus VERIFIED
 *   - survei VALID terbaru
 *   - hasil SLIK OK terbaru per anggota aktif, dan masa berlakunya (BR-04)
 *   - kolektibilitas TERBURUK di antara anggota — majelis dinilai sebagai satu
 *     kesatuan risiko, dan satu anggota kol-2 mengangkat lantai seluruh kelompok
 */

export type MasukanSkoring = {
  pengajuanId: string
  aktor: PenggunaToken
  /** Wajib bila ada anggota berkolektibilitas 2 (FR-05, Tabel 4.2). */
  catatanAnalis?: string | null
}

/** Status pengajuan yang boleh diskor (SRS 3.2). `SKORED` diizinkan untuk hitung ulang. */
const STATUS_BOLEH_SKORING = ['SLIK_OK', 'SKORED'] as const

const PANJANG_MINIMUM_CATATAN = 10

export type PrasyaratTerbaca = StatusPrasyarat & {
  kolektibilitasTerburuk: number | null
  masaBerlakuHari: number
  dokumenKurang: string[]
}

/**
 * Membaca keadaan prasyarat APA ADANYA dari database.
 *
 * Dipisah dari perhitungan supaya bisa dipanggil layar S-09 untuk menampilkan
 * "apa yang masih kurang" tanpa menjalankan skoring, dan supaya test dapat
 * memeriksa pembacaannya tanpa menembak seluruh jalur.
 */
export async function bacaPrasyaratSkoring(pengajuanId: string): Promise<PrasyaratTerbaca> {
  const pengajuan = await prisma.pengajuan.findUnique({
    where: { id: pengajuanId },
    include: {
      anggota: {
        where: { statusAnggota: 'AKTIF' },
        include: {
          dokumen: { orderBy: { versi: 'desc' } },
          hasilSlik: { orderBy: { diperiksaPada: 'desc' } },
        },
      },
      survei: { where: { status: 'VALID' }, orderBy: { direkamPada: 'desc' }, take: 1 },
    },
  })
  if (!pengajuan) throw new TidakDitemukan('Pengajuan tidak ditemukan')

  const masaBerlakuHari = await bacaMasaBerlakuSlikHari()
  const sekarang = new Date()

  const dokumenKurang: string[] = []
  let semuaDokumenTerverifikasi = pengajuan.anggota.length > 0
  let slikSudahDijalankan = pengajuan.anggota.length > 0
  let slikMasihBerlakuSemua = true
  const kolektibilitas: number[] = []

  for (const anggota of pengajuan.anggota) {
    for (const jenis of JENIS_DOKUMEN_WAJIB) {
      // Versi TERBARU jenis itu yang menentukan. Unggah ulang membuat versi baru
      // (AC-03); versi lama yang pernah VERIFIED tidak boleh menutupi versi baru
      // yang masih menunggu verifikasi.
      const terbaru = anggota.dokumen.find((d) => d.jenis === jenis)
      if (!terbaru || terbaru.status !== 'VERIFIED') {
        semuaDokumenTerverifikasi = false
        dokumenKurang.push(`${jenis} anggota ke-${anggota.urutan}`)
      }
    }

    const slikTerbaru = anggota.hasilSlik[0]
    if (!slikTerbaru || slikTerbaru.statusPanggilan !== 'OK') {
      slikSudahDijalankan = false
      continue
    }
    if (slikTerbaru.kolektibilitas !== null) kolektibilitas.push(slikTerbaru.kolektibilitas)
    if (
      slikTerbaru.tanggalData === null ||
      !slikMasihBerlaku(slikTerbaru.tanggalData, masaBerlakuHari, sekarang)
    ) {
      slikMasihBerlakuSemua = false
    }
  }

  return {
    semuaDokumenTerverifikasi,
    adaSurveiValid: pengajuan.survei.length > 0,
    slikSudahDijalankan,
    // Masa berlaku hanya bermakna kalau SLIK memang sudah dijalankan; kalau
    // belum, yang kurang adalah SLIK-nya (BR-03), bukan kedaluwarsanya (BR-04).
    slikMasihBerlaku: slikSudahDijalankan ? slikMasihBerlakuSemua : true,
    kolektibilitasTerburuk: kolektibilitas.length > 0 ? Math.max(...kolektibilitas) : null,
    masaBerlakuHari,
    dokumenKurang,
  }
}

export type HasilSkoringDTO = {
  id: string
  pengajuanId: string
  skorAkhir: number
  gradeSistem: number
  gradeFinal: number
  diOverride: boolean
  alasanOverride: string | null
  snapshotParameter: unknown
  dihitungOleh: string
  dihitungPada: Date
  statusPengajuan: string
  catatanAnalis: string | null
  rincian: {
    id: string
    kodeKomponen: string
    bobot: number
    nilaiMentah: number
    skorKomponen: number
    kontribusi: number
  }[]
}

export async function hitungDanSimpanSkoring(masukan: MasukanSkoring): Promise<HasilSkoringDTO> {
  const { pengajuanId, aktor } = masukan

  const pengajuan = await prisma.pengajuan.findUnique({
    where: { id: pengajuanId },
    include: {
      anggota: { where: { statusAnggota: 'AKTIF' } },
      survei: { where: { status: 'VALID' }, orderBy: { direkamPada: 'desc' }, take: 1 },
    },
  })
  if (!pengajuan) throw new TidakDitemukan('Pengajuan tidak ditemukan')

  if (!STATUS_BOLEH_SKORING.includes(pengajuan.status as (typeof STATUS_BOLEH_SKORING)[number])) {
    throw new PelanggaranAturan(
      'BR-03',
      `Skoring belum dapat dijalankan (BR-03). Pengajuan berstatus ${pengajuan.status}; ` +
        `SLIK check harus selesai dengan hasil bersih lebih dulu.`,
    )
  }

  const prasyarat = await bacaPrasyaratSkoring(pengajuanId)
  // Melempar 422 dengan pesan yang menyebut BR-03 (AC-04) atau BR-04.
  pastikanPrasyaratTerpenuhi(prasyarat)

  const kolektibilitas = prasyarat.kolektibilitasTerburuk ?? 1
  if (kolektibilitas >= 3) {
    // Tidak seharusnya terjadi — Tabel 4.2 sudah menolak pengajuan ini di SLIK.
    // Diperiksa lagi di sini karena skoring adalah gerbang terakhir sebelum
    // approval, dan diam-diam menghitung lebih buruk daripada gagal keras.
    throw new PelanggaranAturan(
      'FR-05',
      `Kolektibilitas ${kolektibilitas} tidak dapat diskor; pengajuan seharusnya sudah ditolak (Tabel 4.2)`,
    )
  }

  /**
   * FR-05: kolektibilitas 2 boleh lanjut, TETAPI catatan analis wajib.
   * Diperiksa sebelum satu pun angka disimpan — catatan yang diminta setelah
   * hasil tersimpan hanya akan menjadi formalitas yang dilewati.
   */
  const catatanBersih = (masukan.catatanAnalis ?? pengajuan.catatanAnalis ?? '').trim()
  if (kolektibilitas === 2 && catatanBersih.length < PANJANG_MINIMUM_CATATAN) {
    throw new PelanggaranAturan(
      'FR-05',
      `Ada anggota berkolektibilitas 2. Catatan analis wajib diisi, minimal ${PANJANG_MINIMUM_CATATAN} karakter (Tabel 4.2).`,
    )
  }

  const surveiValid = pengajuan.survei[0]!
  const [bobot, skalar, rentangGrade] = await Promise.all([
    bacaBobotKomponen(),
    bacaParameterSkalar(),
    bacaRentangGrade(),
  ])

  const totalPlafon = pengajuan.anggota.reduce((sum, a) => sum + Number(a.plafonDiajukan), 0)

  const hasilSkor = hitungSkorKelayakan(
    {
      totalPlafon,
      tenorBulan: pengajuan.tenorBulan,
      omzetHarian: Number(surveiValid.omzetHarian),
      lamaUsahaBulan: surveiValid.lamaUsahaBulan,
      kondisiUsahaSkala: surveiValid.kondisiUsahaSkala ?? 3,
      kolektibilitas,
    },
    bobot,
    skalar,
  )

  const gradeSistem = gradeDariSkor(hasilSkor.skorAkhir, rentangGrade)
  // Lantai kol-2 diterapkan SETELAH grade sistem dan SEBELUM override (A-4, AC-06).
  const gradeFinal = terapkanLantaiKolektibilitas(gradeSistem, kolektibilitas)
  const barisGrade = rentangGrade.find((r) => r.grade === gradeFinal)
  const dapatDibiayai = barisGrade?.dibiayai ?? false

  const snapshot = await ambilSnapshotParameter()

  const tersimpan = await prisma.$transaction(async (tx) => {
    if (catatanBersih.length > 0 && catatanBersih !== (pengajuan.catatanAnalis ?? '')) {
      await tx.pengajuan.update({
        where: { id: pengajuanId },
        data: { catatanAnalis: catatanBersih },
      })
    }

    const hasil = await tx.hasilSkoring.create({
      data: {
        pengajuanId,
        skorAkhir: hasilSkor.skorAkhir,
        gradeSistem,
        gradeFinal,
        snapshotParameter: snapshot,
        dihitungOleh: aktor.id,
      },
    })

    // BR-08 — keempat rincian disimpan dalam transaksi yang sama dengan hasilnya.
    // Hasil tanpa rincian tidak dapat dipertanggungjawabkan ke auditor, jadi
    // keduanya harus berhasil atau dua-duanya batal.
    await tx.rincianKomponenSkor.createMany({
      data: hasilSkor.rincian.map((r) => ({
        hasilSkoringId: hasil.id,
        kodeKomponen: r.kodeKomponen,
        bobot: r.bobot,
        nilaiMentah: r.nilaiMentah,
        skorKomponen: r.skorKomponen,
        kontribusi: r.kontribusi,
      })),
    })

    await tulisAudit(tx, {
      pengajuanId,
      aktorId: aktor.id,
      aktorPeran: aktor.peran,
      aksi: AKSI.SKORING,
      metadata: {
        hasilSkoringId: hasil.id,
        skorAkhir: hasilSkor.skorAkhir,
        gradeSistem,
        gradeFinal,
        kolektibilitasTerburuk: kolektibilitas,
        lantaiKol2Diterapkan: kolektibilitas === 2 && gradeFinal !== gradeSistem,
      },
    })

    // SLIK_OK -> SKORED, atau SKORED -> SKORED saat dihitung ulang (SRS 3.2).
    await ubahStatus(tx, {
      pengajuanId,
      dari: pengajuan.status,
      ke: 'SKORED',
      aktor,
      sebab: `Skoring dijalankan; skor ${hasilSkor.skorAkhir}, grade final ${gradeFinal}`,
      metadata: { skorAkhir: hasilSkor.skorAkhir, gradeFinal },
    })

    /**
     * BR-05 — grade yang tidak dibiayai berakhir di REJECTED_SCORING.
     *
     * Sengaja BUKAN dilempar sebagai galat: perhitungannya berhasil, dan
     * hasilnya adalah penolakan. Melemparnya akan membuang skor beserta
     * rinciannya, dan analis kehilangan dasar untuk menjelaskan penolakan itu
     * kepada nasabah.
     */
    if (!dapatDibiayai) {
      await ubahStatus(tx, {
        pengajuanId,
        dari: 'SKORED',
        ke: 'REJECTED_SCORING',
        aktor,
        sebab: `Grade final ${gradeFinal} tidak dibiayai (BR-05)`,
        metadata: { gradeFinal },
      })
    }

    return tx.hasilSkoring.findUniqueOrThrow({
      where: { id: hasil.id },
      include: { rincian: true },
    })
  })

  return {
    id: tersimpan.id,
    pengajuanId: tersimpan.pengajuanId,
    skorAkhir: tersimpan.skorAkhir,
    gradeSistem: tersimpan.gradeSistem,
    gradeFinal: tersimpan.gradeFinal,
    diOverride: tersimpan.diOverride,
    alasanOverride: tersimpan.alasanOverride,
    snapshotParameter: tersimpan.snapshotParameter,
    dihitungOleh: tersimpan.dihitungOleh,
    dihitungPada: tersimpan.dihitungPada,
    statusPengajuan: dapatDibiayai ? 'SKORED' : 'REJECTED_SCORING',
    catatanAnalis: catatanBersih.length > 0 ? catatanBersih : null,
    // Decimal Prisma menjadi STRING saat diserialisasi JSON; "35" + "25" akan
    // menggabungkan teks di frontend. Dikonversi di sini, sekali.
    rincian: tersimpan.rincian.map((r) => ({
      id: r.id,
      kodeKomponen: r.kodeKomponen,
      bobot: Number(r.bobot),
      nilaiMentah: Number(r.nilaiMentah),
      skorKomponen: Number(r.skorKomponen),
      kontribusi: Number(r.kontribusi),
    })),
  }
}
