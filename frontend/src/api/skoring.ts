/**
 * Klien API skoring kelayakan (FR-06, layar S-09).
 *
 * PEMILIK: Eka. Kontrak: docs/SDD-iMitra.md BAB 5 + tabel hasil_skoring dan
 * rincian_komponen_skor (BAB 4.1). Backend: Alfian.
 *
 * KENAPA ANGKA DESIMAL BERTIPE `number` DAN BUKAN DIBULATKAN DI SINI:
 * BR-07 menetapkan pembulatan terjadi SEKALI, di backend. Layar menampilkan
 * `skorKomponen` dan `kontribusi` dengan 3 desimal (AC-07) supaya auditor bisa
 * menjumlahkan sendiri dan mendapatkan `skorAkhir`. Kalau frontend membulatkan
 * lagi, aritmetika di layar tidak akan menutup dan layar itu justru menjadi
 * bukti bahwa perhitungannya tidak dapat dipertanggungjawabkan.
 *
 * Tidak ada bobot, ambang, atau rentang yang ditulis sebagai konstanta di
 * berkas ini maupun di layar yang memakainya (larangan agent nomor 3).
 */
import { api } from './client'

export type KodeKomponen = 'KAPASITAS_BAYAR' | 'RIWAYAT_SLIK' | 'LAMA_USAHA' | 'HASIL_SURVEI'

/** Label Indonesia untuk kode komponen. Label saja — bukan bobot, bukan aturan. */
export const LABEL_KOMPONEN: Record<KodeKomponen, string> = {
  KAPASITAS_BAYAR: 'Kapasitas bayar',
  RIWAYAT_SLIK: 'Riwayat SLIK',
  LAMA_USAHA: 'Lama usaha',
  HASIL_SURVEI: 'Hasil survei lapangan',
}

/**
 * Satu dari empat baris rincian (BR-08). Keempatnya WAJIB ditampilkan dan
 * WAJIB tersimpan — bukan hanya skor akhirnya.
 */
export type RincianKomponen = {
  kodeKomponen: KodeKomponen
  /** Bobot SAAT perhitungan dijalankan, bukan bobot sekarang. */
  bobot: number
  nilaiMentah: number
  /** Desimal penuh, tidak dibulatkan (BR-07). */
  skorKomponen: number
  /** skorKomponen x bobot. */
  kontribusi: number
}

export type HasilSkoring = {
  id: string
  pengajuanId: string
  /** Sudah dibulatkan, sekali, di backend (BR-07). */
  skorAkhir: number
  gradeSistem: number
  /** Setelah lantai kolektibilitas-2 dan/atau override. */
  gradeFinal: number
  diOverride: boolean
  alasanOverride: string | null
  /**
   * Salinan parameter yang dipakai eksekusi ini. Ditampilkan agar terlihat
   * bahwa perubahan parameter SETELAH ini tidak mengubah angka di atas.
   */
  snapshotParameter: unknown
  rincian: RincianKomponen[]
  dihitungPada: string
}

/** Status tiga prasyarat BR-03, dipakai varian terblokir layar S-09. */
export type RincianPrasyarat = {
  semuaDokumenTerverifikasi: boolean
  adaSurveiValid: boolean
  slikSudahDijalankan: boolean
  slikMasihBerlaku: boolean
}

/**
 * GET /api/pengajuan/{id}/skoring — hasil terakhir + rincian.
 * Mengembalikan null bila skoring belum pernah dijalankan.
 */
export function ambilHasilSkoring(pengajuanId: string): Promise<HasilSkoring | null> {
  return api<HasilSkoring | null>(`/api/pengajuan/${pengajuanId}/skoring`)
}

/**
 * POST /api/pengajuan/{id}/skoring — jalankan skoring.
 * BR-03 diperiksa di server; pelanggaran datang sebagai 422 dengan rule BR-03.
 *
 * `catatanAnalis` WAJIB bila ada anggota berkolektibilitas 2 (Tabel 4.2): SLIK
 * kol-2 boleh lanjut, tetapi keputusannya harus punya alasan tertulis. Server
 * yang menegakkannya — layar hanya menampilkan bidangnya lebih awal supaya ANL
 * tidak menabrak 422 tanpa tahu sebabnya.
 */
export function jalankanSkoring(
  pengajuanId: string,
  input?: { catatanAnalis?: string },
): Promise<HasilSkoring> {
  // Tanpa catatan, permintaan dikirim TANPA body — seluruh masukan skoring
  // memang berasal dari data yang sudah tersimpan, dan pengajuanId ada di path.
  const catatan = input?.catatanAnalis?.trim()
  return api<HasilSkoring>(`/api/pengajuan/${pengajuanId}/skoring`, {
    method: 'POST',
    ...(catatan ? { body: JSON.stringify({ catatanAnalis: catatan }) } : {}),
  })
}

/**
 * POST /api/pengajuan/{id}/skoring/override — ANL menimpa grade (AC-08).
 *
 * `alasan` wajib dan minimal 10 karakter. Batas itu ditegakkan server (zod);
 * layar hanya menonaktifkan tombolnya lebih awal supaya umpan baliknya cepat.
 * Override TANPA alasan adalah keputusan tanpa jejak sebab — dilarang BR-10.
 */
export function overrideGrade(
  pengajuanId: string,
  input: { gradeFinal: number; alasan: string },
): Promise<HasilSkoring> {
  return api<HasilSkoring>(`/api/pengajuan/${pengajuanId}/skoring/override`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
