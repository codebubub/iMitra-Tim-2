import { ValidasiGagal } from '../lib/errors.js'

/**
 * Nomor referensi pengajuan: IMT-YYYYMMDD-NNNN (BR-12, AC-01).
 *
 * Tiga aturan yang tidak boleh dilanggar:
 *   1. Formatnya tidak boleh diubah.
 *   2. Nomor tidak pernah dipakai ulang — TERMASUK oleh pengajuan yang berakhir
 *      REJECTED_SLIK, REJECTED_SCORING, atau REJECTED. Penghitung hanya naik.
 *   3. Dibangkitkan di SERVER, tidak pernah di frontend.
 *
 * Bagian YYYYMMDD memakai zona waktu Asia/Jakarta (asumsi A-7), dipaksa lewat
 * env TZ di seluruh container. Kalau TZ berbeda di mesin penilai, nomor bergeser
 * satu hari dan AC-01 memeriksa formatnya.
 */

export const POLA_NOMOR_REFERENSI = /^IMT-\d{8}-\d{4}$/

export const ZONA_WAKTU = 'Asia/Jakarta'

/** Mengubah tanggal menjadi kunci YYYYMMDD pada zona waktu Asia/Jakarta. */
export function kunciTanggal(sekarang: Date): string {
  // en-CA menghasilkan YYYY-MM-DD, sehingga tinggal membuang tanda hubungnya.
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_WAKTU,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(sekarang)
  return iso.replaceAll('-', '')
}

/**
 * Merakit nomor dari kunci tanggal dan urutan. Urutan datang dari baris
 * `urutan_referensi` yang dikunci di dalam transaksi (SELECT ... FOR UPDATE) —
 * itulah yang mencegah dua AO yang submit bersamaan mendapat nomor yang sama.
 */
export function rakitNomorReferensi(kunci: string, urutan: number): string {
  if (!/^\d{8}$/.test(kunci)) {
    throw new ValidasiGagal(`Kunci tanggal tidak valid: ${kunci}`)
  }
  if (!Number.isInteger(urutan) || urutan < 1) {
    throw new ValidasiGagal(`Urutan nomor referensi harus bilangan bulat positif`)
  }
  if (urutan > 9999) {
    // Sengaja gagal keras. Menggulung ke 0001 akan memakai ulang nomor,
    // dan BR-12 melarangnya secara eksplisit.
    throw new ValidasiGagal(
      `Urutan harian melebihi 9999 untuk tanggal ${kunci}. Format nomor referensi perlu diperluas.`,
    )
  }
  return `IMT-${kunci}-${String(urutan).padStart(4, '0')}`
}

export function nomorReferensiValid(nomor: string): boolean {
  return POLA_NOMOR_REFERENSI.test(nomor)
}
