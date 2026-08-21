import { describe, it, expect } from 'vitest'
import { rentangUntuk, validasiMargin, type BarisRentangMargin } from '../../src/domain/margin.js'
import { PelanggaranAturan, KesalahanKonfigurasi } from '../../src/lib/errors.js'

/**
 * AC-09 — batas margin per grade, diuji tepat di tepinya: 10,9 / 11,0 / 13,0 / 13,1.
 *
 * SRS BAB 7 menyebut berkas ini sebagai bukti AC-09, dan sampai sekarang ia
 * belum ada. Batasnya INKLUSIF di kedua ujung; nilai satu langkah di luarnya
 * harus ditolak, bukan diperingatkan (BR-06).
 *
 * Rentang di bawah adalah angka brief §4.5 yang sama dengan seed, ditulis
 * sebagai fixture supaya unit test ini tetap murni — tidak menyentuh database.
 */
const RENTANG: BarisRentangMargin[] = [
  { grade: 1, marginMin: 11.0, marginMaks: 13.0, nisbahMin: 30, nisbahMaks: 40, dibiayai: true },
  { grade: 2, marginMin: 13.0, marginMaks: 15.0, nisbahMin: 35, nisbahMaks: 45, dibiayai: true },
  { grade: 3, marginMin: 15.0, marginMaks: 18.0, nisbahMin: 40, nisbahMaks: 50, dibiayai: true },
  { grade: 4, marginMin: 18.0, marginMaks: 22.0, nisbahMin: 45, nisbahMaks: 55, dibiayai: true },
  { grade: 5, marginMin: null, marginMaks: null, nisbahMin: null, nisbahMaks: null, dibiayai: false },
]

describe('AC-09 / BR-06 — batas margin murabahah', () => {
  it('menolak 10,9 % untuk grade 1 (di bawah batas bawah)', () => {
    expect(() => validasiMargin(10.9, 1, 'MURABAHAH', RENTANG)).toThrow(PelanggaranAturan)
  })

  it('AC-09: menolak 10,0 % untuk grade 1 — nilai yang disebut brief', () => {
    try {
      validasiMargin(10.0, 1, 'MURABAHAH', RENTANG)
      throw new Error('seharusnya ditolak')
    } catch (e) {
      expect(e).toBeInstanceOf(PelanggaranAturan)
      const err = e as PelanggaranAturan
      expect(err.rule).toBe('BR-06')
      // Pesannya menyebut batas yang berlaku supaya ANL tahu angka yang sah.
      expect(err.message).toContain('11,00')
    }
  })

  it('menerima 11,0 % — batas bawah bersifat inklusif', () => {
    expect(validasiMargin(11.0, 1, 'MURABAHAH', RENTANG)).toBe(11.0)
  })

  it('menerima 13,0 % — batas atas bersifat inklusif', () => {
    expect(validasiMargin(13.0, 1, 'MURABAHAH', RENTANG)).toBe(13.0)
  })

  it('menolak 13,1 % untuk grade 1 (di atas batas atas)', () => {
    expect(() => validasiMargin(13.1, 1, 'MURABAHAH', RENTANG)).toThrow(PelanggaranAturan)
  })

  it('rentang mengikuti GRADE: 13,1 % sah untuk grade 2', () => {
    expect(validasiMargin(13.1, 2, 'MURABAHAH', RENTANG)).toBe(13.1)
  })

  it('menolak nilai yang bukan angka berhingga', () => {
    expect(() => validasiMargin(Number.NaN, 1, 'MURABAHAH', RENTANG)).toThrow(PelanggaranAturan)
    expect(() => validasiMargin(Number.POSITIVE_INFINITY, 1, 'MURABAHAH', RENTANG)).toThrow(
      PelanggaranAturan,
    )
  })
})

describe('BR-06 — batas nisbah musyarakah memakai kolom yang berbeda', () => {
  it('menerima nisbah 30 % untuk grade 1 dan menolak 29 %', () => {
    expect(validasiMargin(30, 1, 'MUSYARAKAH', RENTANG)).toBe(30)
    expect(() => validasiMargin(29, 1, 'MUSYARAKAH', RENTANG)).toThrow(PelanggaranAturan)
  })

  it('nilai margin yang sah TIDAK otomatis sah sebagai nisbah', () => {
    // 12 % adalah margin sah untuk grade 1, tetapi jauh di bawah nisbah minimum.
    expect(validasiMargin(12, 1, 'MURABAHAH', RENTANG)).toBe(12)
    expect(() => validasiMargin(12, 1, 'MUSYARAKAH', RENTANG)).toThrow(PelanggaranAturan)
  })
})

describe('BR-05 — grade yang tidak dibiayai tidak punya rentang', () => {
  it('grade 5 ditolak dengan kode BR-05, bukan BR-06', () => {
    try {
      rentangUntuk(5, 'MURABAHAH', RENTANG)
      throw new Error('seharusnya ditolak')
    } catch (e) {
      expect(e).toBeInstanceOf(PelanggaranAturan)
      expect((e as PelanggaranAturan).rule).toBe('BR-05')
    }
  })

  it('grade yang tidak ada di tabel adalah kesalahan konfigurasi, bukan pelanggaran aturan', () => {
    expect(() => rentangUntuk(9, 'MURABAHAH', RENTANG)).toThrow(KesalahanKonfigurasi)
  })
})
