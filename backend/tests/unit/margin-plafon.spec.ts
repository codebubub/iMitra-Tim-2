import { describe, it, expect } from 'vitest'
import { validasiMargin, rentangUntuk, type BarisRentangMargin } from '../../src/domain/margin.js'
import {
  batasDariAmbang,
  validasiBatasPlafon,
  validasiJumlahAnggota,
} from '../../src/domain/plafon.js'
import { rakitNomorReferensi, nomorReferensiValid, kunciTanggal } from '../../src/domain/nomor-referensi.js'
import { PelanggaranAturan } from '../../src/lib/errors.js'

const RENTANG: BarisRentangMargin[] = [
  { grade: 1, marginMin: 11.0, marginMaks: 13.0, nisbahMin: 20.0, nisbahMaks: 25.0, dibiayai: true },
  { grade: 2, marginMin: 13.0, marginMaks: 15.5, nisbahMin: 25.0, nisbahMaks: 30.0, dibiayai: true },
  { grade: 5, marginMin: null, marginMaks: null, nisbahMin: null, nisbahMaks: null, dibiayai: false },
]

describe('AC-09 / BR-06 — margin di luar rentang grade diblokir', () => {
  it('margin 10,0% untuk grade 1 DIBLOKIR, bukan diperingatkan', () => {
    // Ini AC-09 secara harfiah. Yang diuji bukan hanya bahwa ia menolak, tetapi
    // bahwa ia MELEMPAR — tidak ada nilai kembalian yang bisa diabaikan pemanggil.
    expect(() => validasiMargin(10.0, 1, 'MURABAHAH', RENTANG)).toThrowError(PelanggaranAturan)
  })

  it('pesan penolakan menyebut kode BR-06', () => {
    try {
      validasiMargin(10.0, 1, 'MURABAHAH', RENTANG)
      throw new Error('seharusnya melempar')
    } catch (e) {
      const err = e as PelanggaranAturan
      expect(err.rule).toBe('BR-06')
      expect(err.status).toBe(422)
      expect(err.message).toContain('grade 1')
    }
  })

  // Batas bersifat INKLUSIF. Empat titik ini yang membedakan implementasi benar
  // dari implementasi yang "kira-kira benar".
  it.each([
    [10.99, false],
    [11.0, true],
    [12.0, true],
    [13.0, true],
    [13.01, false],
  ])('margin %s pada grade 1 diterima=%s', (nilai, diterima) => {
    if (diterima) {
      expect(validasiMargin(nilai as number, 1, 'MURABAHAH', RENTANG)).toBe(nilai)
    } else {
      expect(() => validasiMargin(nilai as number, 1, 'MURABAHAH', RENTANG)).toThrow()
    }
  })

  it('musyarakah memakai kolom nisbah, bukan margin', () => {
    expect(validasiMargin(22.5, 1, 'MUSYARAKAH', RENTANG)).toBe(22.5)
    // 12,0 sah sebagai margin murabahah grade 1, tetapi di bawah nisbah minimum 20,0.
    expect(() => validasiMargin(12.0, 1, 'MUSYARAKAH', RENTANG)).toThrow()
  })

  it('BR-05 — grade 5 tidak punya rentang sama sekali', () => {
    expect(() => rentangUntuk(5, 'MURABAHAH', RENTANG)).toThrowError(PelanggaranAturan)
  })

  it('grade yang belum diatur di parameter melempar KesalahanKonfigurasi, bukan memakai nilai tebakan', () => {
    expect(() => rentangUntuk(3, 'MURABAHAH', RENTANG)).toThrow(/belum diatur/)
  })
})

describe('BR-01 — batas plafon diturunkan dari tabel ambang', () => {
  const AMBANG = [
    { plafonMin: 5_000_000, plafonMaks: 50_000_000 },
    { plafonMin: 50_000_001, plafonMaks: 200_000_000 },
    { plafonMin: 200_000_001, plafonMaks: 500_000_000 },
  ]

  it('batas diambil dari baris pertama dan terakhir, bukan dari konstanta', () => {
    expect(batasDariAmbang(AMBANG)).toEqual({ minimum: 5_000_000, maksimum: 500_000_000 })
  })

  it.each([
    [4_999_999, false],
    [5_000_000, true],
    [30_000_000, true],
    [500_000_000, true],
    [500_000_001, false],
    [600_000_000, false],
  ])('plafon %i diterima=%s', (total, diterima) => {
    const batas = batasDariAmbang(AMBANG)
    if (diterima) {
      expect(() => validasiBatasPlafon(total as number, batas)).not.toThrow()
    } else {
      expect(() => validasiBatasPlafon(total as number, batas)).toThrowError(PelanggaranAturan)
    }
  })

  it('pesan penolakan menyebut KEDUA batas, bukan hanya menyatakan penolakan', () => {
    try {
      validasiBatasPlafon(4_000_000, batasDariAmbang(AMBANG))
      throw new Error('seharusnya melempar')
    } catch (e) {
      const err = e as PelanggaranAturan
      expect(err.rule).toBe('BR-01')
      expect(err.message).toContain('5.000.000')
      expect(err.message).toContain('500.000.000')
    }
  })
})

describe('FR-10 — jumlah anggota majelis', () => {
  it('perorangan harus tepat satu anggota', () => {
    expect(() => validasiJumlahAnggota('PERORANGAN', 1)).not.toThrow()
    expect(() => validasiJumlahAnggota('PERORANGAN', 2)).toThrow()
  })

  it.each([
    [2, false],
    [3, true],
    [10, true],
    [11, false],
  ])('kelompok dengan %i anggota aktif diterima=%s', (jumlah, diterima) => {
    if (diterima) {
      expect(() => validasiJumlahAnggota('KELOMPOK', jumlah as number)).not.toThrow()
    } else {
      expect(() => validasiJumlahAnggota('KELOMPOK', jumlah as number)).toThrow()
    }
  })
})

describe('BR-12 / AC-01 — nomor referensi IMT-YYYYMMDD-NNNN', () => {
  it('merakit nomor dengan urutan empat digit berpadding', () => {
    expect(rakitNomorReferensi('20260820', 7)).toBe('IMT-20260820-0007')
    expect(rakitNomorReferensi('20260820', 1234)).toBe('IMT-20260820-1234')
  })

  it('nomor hasil rakitan lolos pola yang diperiksa AC-01', () => {
    expect(nomorReferensiValid(rakitNomorReferensi('20260820', 1))).toBe(true)
    expect(nomorReferensiValid('IMT-2026820-0001')).toBe(false)
    expect(nomorReferensiValid('IMT-20260820-1')).toBe(false)
  })

  it('gagal keras di atas 9999 — menggulung ke 0001 berarti memakai ulang nomor (BR-12)', () => {
    expect(() => rakitNomorReferensi('20260820', 10000)).toThrow()
  })

  it('kunci tanggal memakai zona Asia/Jakarta (asumsi A-7)', () => {
    // 2026-08-20 22:00 UTC = 2026-08-21 05:00 WIB. Nomor referensi harus
    // memakai tanggal WIB, bukan UTC — kalau tidak, ia bergeser di mesin penilai.
    expect(kunciTanggal(new Date('2026-08-20T22:00:00Z'))).toBe('20260821')
    expect(kunciTanggal(new Date('2026-08-20T02:00:00Z'))).toBe('20260820')
  })
})
