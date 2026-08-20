import { KesalahanKonfigurasi } from '../lib/errors.js'

/**
 * Perhitungan skor kelayakan mikro (FR-06, BR-07, BR-08).
 *
 * MODUL INI ADALAH FUNGSI MURNI. Ia tidak mengimpor Prisma, tidak membaca
 * process.env, dan tidak memanggil Date.now(). Seluruh parameter datang sebagai
 * argumen — service yang membacanya dari database pada setiap pemanggilan
 * (ADR-0003). Konsekuensinya: unit test bisa memberi bobot apa pun tanpa
 * database, dan test integrasi bisa mengubah baris parameter untuk membuktikan
 * nilainya benar-benar berasal dari data.
 *
 * DUA HAL YANG PALING MUDAH SALAH DI SINI — periksa keduanya di review:
 *
 * 1. PEMBULATAN. BR-07 mensyaratkan pembulatan HANYA pada skor akhir. Skor tiap
 *    komponen tetap desimal sampai akhir. Membulatkan nilai antara menggeser
 *    hasil 0-1 poin, dan itu tidak terlihat KECUALI tepat di batas grade
 *    (85, 70, 55, 40) — di mana ia mengubah rentang margin yang divalidasi.
 *
 * 2. NILAI DEFAULT. Tidak ada satu pun parameter yang punya nilai cadangan di
 *    berkas ini. Parameter yang hilang melempar KesalahanKonfigurasi, bukan
 *    diam-diam memakai angka dari brief.
 */

export const KODE_KOMPONEN = {
  KAPASITAS_BAYAR: 'KAPASITAS_BAYAR',
  RIWAYAT_SLIK: 'RIWAYAT_SLIK',
  LAMA_USAHA: 'LAMA_USAHA',
  HASIL_SURVEI: 'HASIL_SURVEI',
} as const

export type KodeKomponen = (typeof KODE_KOMPONEN)[keyof typeof KODE_KOMPONEN]

/** Bobot per komponen, dibaca dari tabel `parameter_skoring`. */
export type BobotKomponen = Record<KodeKomponen, number>

/** Parameter skalar, juga dari `parameter_skoring` (asumsi A-1 dan A-2). */
export type ParameterSkalar = {
  /** % p.a. Dipakai menghitung angsuran karena margin belum ditetapkan (A-1). */
  marginReferensiSkoring: number
  /** Hari kerja per bulan, §4.4 (A-2). */
  hariKerjaPerBulan: number
  /** % margin usaha terhadap omzet, §4.4 (A-2). */
  marginUsahaPersen: number
  /** Titik linear kapasitas bayar: rasio <= penuh -> 100, >= nol -> 0. */
  rasioPenuh: number
  rasioNol: number
  /** Titik linear lama usaha, dalam bulan. */
  lamaUsahaPenuhBulan: number
  lamaUsahaNolBulan: number
}

export type MasukanSkoring = {
  /** Total plafon anggota AKTIF. Rupiah. */
  totalPlafon: number
  tenorBulan: number
  /** Dari survei VALID terbaru. Rupiah per hari. */
  omzetHarian: number
  /** Dari survei VALID terbaru. */
  lamaUsahaBulan: number
  /** Penilaian ANL 1-5 atas kondisi usaha (asumsi A-10). */
  kondisiUsahaSkala: number
  /** 1 atau 2. Kol 3/4/5 tidak pernah sampai ke tahap ini (Tabel 4.2). */
  kolektibilitas: number
}

export type RincianKomponen = {
  kodeKomponen: KodeKomponen
  bobot: number
  nilaiMentah: number
  /** Desimal penuh — TIDAK dibulatkan (BR-07). */
  skorKomponen: number
  kontribusi: number
}

export type HasilPerhitunganSkor = {
  /** Sudah dibulatkan, sekali, di sini. */
  skorAkhir: number
  /** Sebelum pembulatan — disimpan untuk penelusuran, bukan untuk grade. */
  skorMentah: number
  rincian: RincianKomponen[]
}

/** Interpolasi linear menurun: nilai <= penuh -> 100, >= nol -> 0. */
function skorLinearMenurun(nilai: number, penuh: number, nol: number): number {
  if (nilai <= penuh) return 100
  if (nilai >= nol) return 0
  return (100 * (nol - nilai)) / (nol - penuh)
}

/** Interpolasi linear menaik: nilai >= penuh -> 100, <= nol -> 0. */
function skorLinearMenaik(nilai: number, penuh: number, nol: number): number {
  if (nilai >= penuh) return 100
  if (nilai <= nol) return 0
  return (100 * (nilai - nol)) / (penuh - nol)
}

/**
 * Angsuran bulanan dengan skema flat, memakai margin referensi (asumsi A-1).
 *
 * FR-07 baru menetapkan margin SETELAH FR-06, jadi margin sebenarnya belum
 * diketahui saat komponen kapasitas bayar dihitung. Memakai margin referensi
 * yang tersimpan sebagai parameter membuat asumsinya bisa dikoreksi lewat satu
 * baris data, bukan lewat satu PR.
 */
export function hitungAngsuranBulanan(
  plafon: number,
  tenorBulan: number,
  marginReferensiPersen: number,
): number {
  if (tenorBulan <= 0) throw new KesalahanKonfigurasi('Tenor harus lebih besar dari 0')
  const totalMargin = plafon * (marginReferensiPersen / 100) * (tenorBulan / 12)
  return (plafon + totalMargin) / tenorBulan
}

/** Skor komponen "Riwayat SLIK" (§4.4). Kol 3-5 tidak pernah sampai ke sini. */
export function skorRiwayatSlik(kolektibilitas: number): number {
  if (kolektibilitas === 1) return 100
  if (kolektibilitas === 2) return 40
  throw new KesalahanKonfigurasi(
    `Kolektibilitas ${kolektibilitas} seharusnya sudah dihentikan sebelum skoring (Tabel 4.2)`,
  )
}

export function hitungSkorKelayakan(
  masukan: MasukanSkoring,
  bobot: BobotKomponen,
  p: ParameterSkalar,
): HasilPerhitunganSkor {
  for (const kode of Object.values(KODE_KOMPONEN)) {
    if (typeof bobot[kode] !== 'number') {
      throw new KesalahanKonfigurasi(`Bobot komponen ${kode} belum diatur di parameter_skoring`)
    }
  }

  // --- Komponen 1: kapasitas bayar -----------------------------------------
  const angsuran = hitungAngsuranBulanan(
    masukan.totalPlafon,
    masukan.tenorBulan,
    p.marginReferensiSkoring,
  )
  const kapasitasBulanan =
    masukan.omzetHarian * p.hariKerjaPerBulan * (p.marginUsahaPersen / 100)
  if (kapasitasBulanan <= 0) {
    throw new KesalahanKonfigurasi('Omzet harian pada survei harus lebih besar dari 0')
  }
  const rasioPersen = (angsuran / kapasitasBulanan) * 100
  const skorKapasitas = skorLinearMenurun(rasioPersen, p.rasioPenuh, p.rasioNol)

  // --- Komponen 2: riwayat SLIK --------------------------------------------
  const skorSlik = skorRiwayatSlik(masukan.kolektibilitas)

  // --- Komponen 3: lama usaha ----------------------------------------------
  const skorLamaUsaha = skorLinearMenaik(
    masukan.lamaUsahaBulan,
    p.lamaUsahaPenuhBulan,
    p.lamaUsahaNolBulan,
  )

  // --- Komponen 4: hasil survei lapangan -----------------------------------
  if (masukan.kondisiUsahaSkala < 1 || masukan.kondisiUsahaSkala > 5) {
    throw new KesalahanKonfigurasi('Penilaian kondisi usaha harus berada pada skala 1-5')
  }
  const skorSurvei = masukan.kondisiUsahaSkala * 20

  const rincian: RincianKomponen[] = [
    {
      kodeKomponen: KODE_KOMPONEN.KAPASITAS_BAYAR,
      bobot: bobot.KAPASITAS_BAYAR,
      nilaiMentah: rasioPersen,
      skorKomponen: skorKapasitas,
      kontribusi: skorKapasitas * bobot.KAPASITAS_BAYAR,
    },
    {
      kodeKomponen: KODE_KOMPONEN.RIWAYAT_SLIK,
      bobot: bobot.RIWAYAT_SLIK,
      nilaiMentah: masukan.kolektibilitas,
      skorKomponen: skorSlik,
      kontribusi: skorSlik * bobot.RIWAYAT_SLIK,
    },
    {
      kodeKomponen: KODE_KOMPONEN.LAMA_USAHA,
      bobot: bobot.LAMA_USAHA,
      nilaiMentah: masukan.lamaUsahaBulan,
      skorKomponen: skorLamaUsaha,
      kontribusi: skorLamaUsaha * bobot.LAMA_USAHA,
    },
    {
      kodeKomponen: KODE_KOMPONEN.HASIL_SURVEI,
      bobot: bobot.HASIL_SURVEI,
      nilaiMentah: masukan.kondisiUsahaSkala,
      skorKomponen: skorSurvei,
      kontribusi: skorSurvei * bobot.HASIL_SURVEI,
    },
  ]

  const totalBobot = rincian.reduce((s, r) => s + r.bobot, 0)
  if (totalBobot <= 0) {
    throw new KesalahanKonfigurasi('Total bobot komponen skor harus lebih besar dari 0')
  }

  const totalKontribusi = rincian.reduce((s, r) => s + r.kontribusi, 0)
  const skorMentah = totalKontribusi / totalBobot

  // BR-07: pembulatan HANYA di sini, satu kali, di akhir.
  return { skorAkhir: Math.round(skorMentah), skorMentah, rincian }
}
