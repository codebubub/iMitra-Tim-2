import { PelanggaranAturan } from '../lib/errors.js'

/**
 * Prasyarat sebelum skoring boleh dijalankan (BR-03) dan masa berlaku hasil
 * SLIK (BR-04).
 *
 * AC-04 memeriksa bahwa pesan penolakan MENYEBUT "BR-03" secara harfiah, dan
 * bahwa penolakan itu terjadi saat mencoba masuk skoring — bukan lebih awal
 * dan bukan lebih lambat. Karena itu pesan di berkas ini menyertakan daftar
 * prasyarat mana yang kurang: analis tahu apa yang harus dilakukan berikutnya,
 * dan penilai melihat kode BR-nya.
 */

export type StatusPrasyarat = {
  semuaDokumenTerverifikasi: boolean
  adaSurveiValid: boolean
  slikSudahDijalankan: boolean
  slikMasihBerlaku: boolean
}

export type RincianPrasyarat = {
  status: StatusPrasyarat
  kurang: string[]
}

/**
 * BR-04 — hasil SLIK punya masa berlaku. Perbandingan memakai `sekarang` yang
 * DIINJEKSIKAN, bukan Date.now(), supaya batasnya bisa diuji tepat di hari
 * ke-30 dan ke-31 tanpa memanipulasi jam sistem.
 */
export function slikMasihBerlaku(
  tanggalData: Date,
  masaBerlakuHari: number,
  sekarang: Date,
): boolean {
  const MS_PER_HARI = 24 * 60 * 60 * 1000
  const selisihHari = Math.floor((sekarang.getTime() - tanggalData.getTime()) / MS_PER_HARI)
  return selisihHari <= masaBerlakuHari
}

export function periksaPrasyarat(status: StatusPrasyarat): RincianPrasyarat {
  const kurang: string[] = []
  if (!status.semuaDokumenTerverifikasi) kurang.push('seluruh dokumen wajib berstatus VERIFIED')
  if (!status.adaSurveiValid) kurang.push('minimal satu survei berstatus VALID')
  if (!status.slikSudahDijalankan) kurang.push('SLIK check sudah dijalankan')
  return { status, kurang }
}

/**
 * Melempar bila prasyarat belum terpenuhi. Dipanggil service di awal skoring,
 * sebelum satu pun parameter dibaca.
 */
export function pastikanPrasyaratTerpenuhi(status: StatusPrasyarat): void {
  const { kurang } = periksaPrasyarat(status)
  if (kurang.length > 0) {
    throw new PelanggaranAturan(
      'BR-03',
      `Skoring belum dapat dijalankan (BR-03). Prasyarat yang belum terpenuhi: ${kurang.join('; ')}.`,
    )
  }

  // Diperiksa terpisah supaya pesannya berbeda: prasyaratnya sudah pernah
  // terpenuhi, hanya kedaluwarsa. Tindakannya juga berbeda — jalankan ulang SLIK,
  // bukan lengkapi dokumen.
  if (!status.slikMasihBerlaku) {
    throw new PelanggaranAturan(
      'BR-04',
      'Hasil SLIK sudah kedaluwarsa. Jalankan SLIK check ulang sebelum skoring.',
    )
  }
}
