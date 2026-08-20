import { KesalahanKonfigurasi, PelanggaranAturan } from '../lib/errors.js'

/**
 * Validasi margin murabahah / nisbah musyarakah terhadap rentang grade (FR-07, BR-06).
 *
 * BR-06 menyatakan nilai di luar rentang DIBLOKIR, bukan diberi peringatan.
 * Karena itu berkas ini tidak punya fungsi bernama `peringatkan*`, tidak punya
 * parameter `paksa`, dan tidak punya jalur yang mengembalikan
 * `{ ok: true, peringatan: ... }`. Tidak ada jalur "lanjutkan saja" — kalau
 * seseorang menambahkannya, AC-09 akan lolos di layar dan gagal maknanya.
 */

export type Akad = 'MURABAHAH' | 'MUSYARAKAH'

export type BarisRentangMargin = {
  grade: number
  marginMin: number | null
  marginMaks: number | null
  nisbahMin: number | null
  nisbahMaks: number | null
  dibiayai: boolean
}

export type RentangBerlaku = { min: number; maks: number }

/** Mengembalikan rentang yang berlaku untuk satu grade dan satu akad. */
export function rentangUntuk(
  grade: number,
  akad: Akad,
  rentang: BarisRentangMargin[],
): RentangBerlaku {
  const baris = rentang.find((r) => r.grade === grade)
  if (!baris) {
    throw new KesalahanKonfigurasi(
      `Rentang untuk grade ${grade} belum diatur di tabel rentang_margin`,
    )
  }
  if (!baris.dibiayai) {
    throw new PelanggaranAturan('BR-05', `Grade ${grade} tidak dibiayai`)
  }

  const min = akad === 'MURABAHAH' ? baris.marginMin : baris.nisbahMin
  const maks = akad === 'MURABAHAH' ? baris.marginMaks : baris.nisbahMaks

  if (min === null || maks === null) {
    throw new KesalahanKonfigurasi(
      `Rentang ${akad === 'MURABAHAH' ? 'margin' : 'nisbah'} grade ${grade} belum diisi`,
    )
  }
  return { min, maks }
}

const format = (n: number) => n.toFixed(2).replace('.', ',')

/**
 * Memblokir nilai di luar rentang. Batas bersifat INKLUSIF: 11,00 % pada grade 1
 * diterima, 10,99 % ditolak.
 *
 * Pesannya menyebut kode BR karena AC-09 memeriksa itu, dan tidak memuat data
 * pribadi apa pun (BR-11).
 */
export function validasiMargin(
  nilaiPersen: number,
  grade: number,
  akad: Akad,
  rentang: BarisRentangMargin[],
): number {
  if (!Number.isFinite(nilaiPersen)) {
    throw new PelanggaranAturan('BR-06', 'Nilai margin/nisbah tidak valid')
  }

  const { min, maks } = rentangUntuk(grade, akad, rentang)
  const label = akad === 'MURABAHAH' ? 'Margin' : 'Nisbah bank'

  if (nilaiPersen < min) {
    throw new PelanggaranAturan(
      'BR-06',
      `${label} ${format(nilaiPersen)}% di bawah batas bawah grade ${grade} (${format(min)}%)`,
    )
  }
  if (nilaiPersen > maks) {
    throw new PelanggaranAturan(
      'BR-06',
      `${label} ${format(nilaiPersen)}% di atas batas atas grade ${grade} (${format(maks)}%)`,
    )
  }

  return nilaiPersen
}
