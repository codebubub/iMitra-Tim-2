import { KesalahanKonfigurasi, PelanggaranAturan } from '../lib/errors.js'

/**
 * Penurunan grade risiko dari skor, dan penerapan lantai kolektibilitas-2.
 *
 * Fungsi murni. Rentang skor datang dari tabel `rentang_margin` — SATU sumber
 * untuk dua keperluan: menurunkan grade dari skor, dan memvalidasi margin.
 * Menyimpannya di dua tempat berarti suatu saat keduanya akan berbeda.
 */

export type BarisRentangGrade = {
  grade: number
  skorMin: number
  skorMaks: number
  dibiayai: boolean
}

/** Grade minimum yang dipaksakan ketika kolektibilitas 2 (Tabel 4.2). */
export const LANTAI_GRADE_KOL2 = 3

/**
 * Grade 5 di brief didefinisikan sebagai "< 40", jadi baris grade 5 di database
 * memakai skorMin 0. Fungsi ini tidak mengasumsikan itu — ia mencari baris yang
 * mencakup skor, apa pun batasnya.
 */
export function gradeDariSkor(skor: number, rentang: BarisRentangGrade[]): number {
  const cocok = rentang.find((r) => skor >= r.skorMin && skor <= r.skorMaks)
  if (!cocok) {
    throw new KesalahanKonfigurasi(
      `Tidak ada baris rentang_margin yang mencakup skor ${skor}. Periksa parameter: rentang antar grade tidak boleh berlubang.`,
    )
  }
  return cocok.grade
}

/**
 * Grade final = grade sistem, kecuali kolektibilitas 2 yang dilantai di 3 (AC-06).
 *
 * URUTANNYA PENTING (asumsi A-4): lantai diterapkan SETELAH grade sistem dihitung
 * dan SEBELUM override ANL. Kalau dibalik, nasabah kol-2 bisa berakhir di grade 2
 * dan AC-06 gagal.
 *
 * Grade adalah skala risiko: angka LEBIH BESAR berarti LEBIH BERISIKO. Karena itu
 * "tidak pernah lebih baik dari 3" berarti Math.max, bukan Math.min.
 */
export function terapkanLantaiKolektibilitas(gradeSistem: number, kolektibilitas: number): number {
  if (kolektibilitas === 2) return Math.max(gradeSistem, LANTAI_GRADE_KOL2)
  return gradeSistem
}

/**
 * Validasi override grade oleh ANL (FR-06.1, AC-08).
 * Dua hal yang ditolak: alasan kosong, dan override yang menembus lantai kol-2.
 */
export function validasiOverrideGrade(
  gradeBaru: number,
  alasan: string | undefined | null,
  kolektibilitas: number,
): void {
  if (!Number.isInteger(gradeBaru) || gradeBaru < 1 || gradeBaru > 5) {
    throw new PelanggaranAturan('FR-06.1', 'Grade harus berupa bilangan bulat 1 sampai 5')
  }
  const bersih = (alasan ?? '').trim()
  if (bersih.length < 10) {
    throw new PelanggaranAturan(
      'FR-06.1',
      'Alasan override wajib diisi, minimal 10 karakter',
    )
  }
  if (kolektibilitas === 2 && gradeBaru < LANTAI_GRADE_KOL2) {
    throw new PelanggaranAturan(
      'AC-06',
      `Kolektibilitas 2 tidak dapat memiliki grade lebih baik dari ${LANTAI_GRADE_KOL2}`,
    )
  }
}

/**
 * BR-05 — grade 5 tidak dapat diajukan ke approval. Dipanggil service SEBELUM
 * status berubah, sehingga pengajuan berhenti di REJECTED_SCORING.
 */
export function pastikanDapatDiajukan(gradeFinal: number, rentang: BarisRentangGrade[]): void {
  const baris = rentang.find((r) => r.grade === gradeFinal)
  if (!baris) {
    throw new KesalahanKonfigurasi(`Baris rentang_margin untuk grade ${gradeFinal} tidak ada`)
  }
  if (!baris.dibiayai) {
    throw new PelanggaranAturan(
      'BR-05',
      `Grade ${gradeFinal} tidak dapat dibiayai dan tidak dapat diajukan ke approval`,
    )
  }
}
