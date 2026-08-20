import { PelanggaranAturan, ValidasiGagal } from '../lib/errors.js'

/**
 * Aturan dokumen (FR-03, AC-03).
 *
 * Fungsi murni: tidak menyentuh Prisma, HTTP, atau berkas. Ia hanya memutuskan
 * apakah sebuah unggahan sah dan apakah sebuah keputusan verifikasi lengkap.
 *
 * Tiga aturan yang tidak boleh dilanggar:
 *   1. Unggah ulang membuat VERSI BARU jenis itu saja — versi lama disimpan,
 *      tidak ditimpa (AC-03). Versi berikutnya dihitung di sini.
 *   2. REJECTED wajib disertai kode alasan dari daftar tertutup.
 *   3. Batas MIME dan ukuran ditegakkan sebelum berkas ditulis.
 */

export type JenisDokumen = 'KTP' | 'KK' | 'SKU'
export type StatusDokumen = 'MENUNGGU' | 'VERIFIED' | 'REJECTED'
export type KodeAlasanDokumen =
  | 'BURAM'
  | 'TIDAK_TERBACA'
  | 'KADALUARSA'
  | 'TIDAK_SESUAI_PEMOHON'
  | 'BUKAN_JENIS_DOKUMEN'

/** Jenis dokumen wajib per anggota. Skoring memeriksa ketiganya VERIFIED (BR-03). */
export const JENIS_DOKUMEN_WAJIB: JenisDokumen[] = ['KTP', 'KK', 'SKU']

export const KODE_ALASAN_DOKUMEN: KodeAlasanDokumen[] = [
  'BURAM',
  'TIDAK_TERBACA',
  'KADALUARSA',
  'TIDAK_SESUAI_PEMOHON',
  'BUKAN_JENIS_DOKUMEN',
]

/**
 * Versi berikutnya untuk satu jenis dokumen = versi tertinggi yang ada + 1.
 * Anggota baru yang belum punya dokumen jenis itu mulai dari versi 1.
 */
export function versiBerikutnya(versiYangAda: number[]): number {
  if (versiYangAda.length === 0) return 1
  return Math.max(...versiYangAda) + 1
}

/**
 * Validasi berkas sebelum ditulis. MIME dan batas ukuran datang sebagai argumen
 * (dibaca service dari config), bukan konstanta di sini — supaya batasnya bisa
 * diuji tanpa menyalakan server dan tidak tersebar.
 */
export function validasiBerkas(
  mime: string,
  ukuranByte: number,
  mimeDiizinkan: string[],
  ukuranMaksByte: number,
): void {
  if (!mimeDiizinkan.includes(mime)) {
    throw new ValidasiGagal(
      `Jenis berkas ${mime} tidak diizinkan. Yang diterima: ${mimeDiizinkan.join(', ')}.`,
      'berkas',
    )
  }
  if (ukuranByte <= 0) {
    throw new ValidasiGagal('Berkas kosong', 'berkas')
  }
  if (ukuranByte > ukuranMaksByte) {
    throw new ValidasiGagal(
      `Ukuran berkas melebihi batas ${Math.floor(ukuranMaksByte / (1024 * 1024))} MB`,
      'berkas',
    )
  }
}

/**
 * BR-03 (bagian dokumen) — seluruh jenis dokumen wajib tiap anggota AKTIF harus
 * punya versi TERBARU berstatus VERIFIED. Versi lama yang REJECTED tidak
 * menggugurkan asalkan ada versi lebih baru yang VERIFIED.
 *
 * `terbaruPerJenis` adalah status dokumen versi tertinggi per (anggota, jenis).
 */
export function semuaDokumenTerverifikasi(
  terbaruPerJenis: { jenis: JenisDokumen; status: StatusDokumen }[],
  jumlahAnggotaAktif: number,
): boolean {
  if (jumlahAnggotaAktif <= 0) return false
  const verified = terbaruPerJenis.filter((d) => d.status === 'VERIFIED')
  // Setiap anggota aktif menyumbang 3 dokumen wajib; semuanya harus VERIFIED.
  const wajibTotal = jumlahAnggotaAktif * JENIS_DOKUMEN_WAJIB.length
  return verified.length === wajibTotal
}

/**
 * Keputusan verifikasi ANL. VERIFIED tidak boleh membawa kode alasan; REJECTED
 * wajib membawanya dari daftar tertutup.
 */
export function validasiKeputusanVerifikasi(
  keputusan: 'VERIFIED' | 'REJECTED',
  kodeAlasan: string | null | undefined,
): void {
  if (keputusan === 'VERIFIED') {
    if (kodeAlasan) {
      throw new ValidasiGagal('Kode alasan hanya untuk dokumen yang ditolak', 'kodeAlasan')
    }
    return
  }

  if (!kodeAlasan) {
    throw new PelanggaranAturan(
      'FR-03',
      'Penolakan dokumen wajib menyertakan kode alasan',
    )
  }
  if (!KODE_ALASAN_DOKUMEN.includes(kodeAlasan as KodeAlasanDokumen)) {
    throw new ValidasiGagal(
      `Kode alasan tidak dikenal. Pilih salah satu: ${KODE_ALASAN_DOKUMEN.join(', ')}.`,
      'kodeAlasan',
    )
  }
}
