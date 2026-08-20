import { describe, it, expect } from 'vitest'
import {
  hitungSkorKelayakan,
  hitungAngsuranBulanan,
  skorRiwayatSlik,
  type BobotKomponen,
  type ParameterSkalar,
} from '../../src/domain/skoring.js'
import {
  gradeDariSkor,
  terapkanLantaiKolektibilitas,
  validasiOverrideGrade,
  type BarisRentangGrade,
} from '../../src/domain/grade.js'
import { PelanggaranAturan } from '../../src/lib/errors.js'

/**
 * Test skoring diturunkan dari brief 4.3, 4.4, BR-07, dan AC-06/AC-07.
 *
 * SELURUH parameter di bawah adalah ARGUMEN. Kalau suatu saat fungsi skoring
 * mulai membaca angkanya sendiri (dari konstanta atau dari database), test ini
 * tetap hijau — karena itu ADA JUGA test integrasi yang MENGUBAH BARIS DATABASE
 * lebih dulu lalu memastikan hasilnya berubah. Unit test saja tidak cukup
 * membuktikan parameter benar-benar berasal dari data.
 */
const BOBOT: BobotKomponen = {
  KAPASITAS_BAYAR: 35,
  RIWAYAT_SLIK: 25,
  LAMA_USAHA: 20,
  HASIL_SURVEI: 20,
}

const SKALAR: ParameterSkalar = {
  marginReferensiSkoring: 15.5,
  hariKerjaPerBulan: 25,
  marginUsahaPersen: 30,
  rasioPenuh: 30,
  rasioNol: 60,
  lamaUsahaPenuhBulan: 36,
  lamaUsahaNolBulan: 6,
}

const RENTANG: BarisRentangGrade[] = [
  { grade: 1, skorMin: 85, skorMaks: 100, dibiayai: true },
  { grade: 2, skorMin: 70, skorMaks: 84, dibiayai: true },
  { grade: 3, skorMin: 55, skorMaks: 69, dibiayai: true },
  { grade: 4, skorMin: 40, skorMaks: 54, dibiayai: true },
  { grade: 5, skorMin: 0, skorMaks: 39, dibiayai: false },
]

describe('angsuran bulanan (asumsi A-1)', () => {
  it('skema flat: pokok + margin referensi selama tenor, dibagi tenor', () => {
    // Rp 12.000.000, tenor 12 bulan, margin referensi 15,5% p.a.
    // total margin = 12.000.000 x 0,155 x 1 = 1.860.000
    // angsuran      = (12.000.000 + 1.860.000) / 12 = 1.155.000
    expect(hitungAngsuranBulanan(12_000_000, 12, 15.5)).toBeCloseTo(1_155_000, 2)
  })
})

describe('komponen riwayat SLIK (brief 4.2 dan 4.4)', () => {
  it('kol-1 bernilai 100 dan kol-2 bernilai 40', () => {
    expect(skorRiwayatSlik(1)).toBe(100)
    expect(skorRiwayatSlik(2)).toBe(40)
  })

  it('kol-3 sampai kol-5 melempar: keduanya seharusnya sudah dihentikan sebelum skoring', () => {
    for (const kol of [3, 4, 5]) {
      expect(() => skorRiwayatSlik(kol)).toThrow()
    }
  })
})

describe('BR-07 — pembulatan hanya sekali, di akhir', () => {
  /**
   * Ini kegagalan halus yang paling mahal di sistem ini, dan sudah pernah
   * terjadi pada tim lain (lihat CONTOH-B di docs/AI-DEVLOG.md).
   *
   * Membulatkan skor komponen sebelum dikalikan bobot menggeser hasil 0-1 poin.
   * Selisih itu tidak terlihat KECUALI tepat di batas grade — di mana ia
   * mengubah rentang margin yang divalidasi, sehingga nasabah mendapat margin
   * yang lebih mahal daripada haknya.
   */
  it('skor komponen tetap desimal, tidak dibulatkan', () => {
    const hasil = hitungSkorKelayakan(
      {
        totalPlafon: 30_000_000,
        tenorBulan: 24,
        omzetHarian: 800_000,
        lamaUsahaBulan: 20,
        kondisiUsahaSkala: 4,
        kolektibilitas: 1,
      },
      BOBOT,
      SKALAR,
    )

    const kapasitas = hasil.rincian.find((r) => r.kodeKomponen === 'KAPASITAS_BAYAR')!
    const lamaUsaha = hasil.rincian.find((r) => r.kodeKomponen === 'LAMA_USAHA')!

    // lama usaha 20 bulan -> 100 x (20-6)/(36-6) = 46,666... Nilai desimal ini
    // WAJIB bertahan; kalau ia bulat, pembulatan antara sudah terjadi.
    expect(lamaUsaha.skorKomponen).toBeCloseTo(46.6667, 3)
    expect(Number.isInteger(lamaUsaha.skorKomponen)).toBe(false)
    expect(kapasitas.skorKomponen).toBeGreaterThan(0)
  })

  it('skor akhir = sigma(skor x bobot) / sigma(bobot), dibulatkan sekali', () => {
    const hasil = hitungSkorKelayakan(
      {
        totalPlafon: 25_000_000,
        tenorBulan: 24,
        omzetHarian: 1_200_000,
        lamaUsahaBulan: 60,
        kondisiUsahaSkala: 4,
        kolektibilitas: 1,
      },
      BOBOT,
      SKALAR,
    )

    // Dihitung ulang dari rincian, bukan disalin dari keluaran fungsi.
    const totalKontribusi = hasil.rincian.reduce((s, r) => s + r.skorKomponen * r.bobot, 0)
    const totalBobot = hasil.rincian.reduce((s, r) => s + r.bobot, 0)
    expect(hasil.skorAkhir).toBe(Math.round(totalKontribusi / totalBobot))
    expect(hasil.skorMentah).toBeCloseTo(totalKontribusi / totalBobot, 6)
  })

  it('menghasilkan tepat empat rincian komponen (BR-08, AC-07)', () => {
    const hasil = hitungSkorKelayakan(
      {
        totalPlafon: 30_000_000,
        tenorBulan: 12,
        omzetHarian: 900_000,
        lamaUsahaBulan: 48,
        kondisiUsahaSkala: 5,
        kolektibilitas: 1,
      },
      BOBOT,
      SKALAR,
    )
    expect(hasil.rincian).toHaveLength(4)
    expect(hasil.rincian.map((r) => r.kodeKomponen).sort()).toEqual([
      'HASIL_SURVEI',
      'KAPASITAS_BAYAR',
      'LAMA_USAHA',
      'RIWAYAT_SLIK',
    ])
    for (const r of hasil.rincian) {
      expect(r.kontribusi).toBeCloseTo(r.skorKomponen * r.bobot, 6)
    }
  })
})

describe('grade dari skor — batas atas dan batas bawah setiap grade', () => {
  // Delapan titik batas. Satu nilai di tengah rentang tidak membuktikan apa pun.
  it.each([
    [100, 1],
    [85, 1],
    [84, 2],
    [70, 2],
    [69, 3],
    [55, 3],
    [54, 4],
    [40, 4],
    [39, 5],
    [0, 5],
  ])('skor %i menghasilkan grade %i', (skor, grade) => {
    expect(gradeDariSkor(skor as number, RENTANG)).toBe(grade)
  })
})

describe('AC-06 — kolektibilitas 2 tidak pernah lebih baik dari grade 3', () => {
  it('grade sistem 1 dan 2 dipaksa menjadi 3', () => {
    expect(terapkanLantaiKolektibilitas(1, 2)).toBe(3)
    expect(terapkanLantaiKolektibilitas(2, 2)).toBe(3)
  })

  it('grade yang sudah lebih berisiko tidak diperbaiki', () => {
    expect(terapkanLantaiKolektibilitas(4, 2)).toBe(4)
    expect(terapkanLantaiKolektibilitas(5, 2)).toBe(5)
  })

  it('kolektibilitas 1 tidak terpengaruh', () => {
    expect(terapkanLantaiKolektibilitas(1, 1)).toBe(1)
  })
})

describe('AC-08 — override grade wajib beralasan', () => {
  it('menolak alasan kosong', () => {
    expect(() => validasiOverrideGrade(3, '', 1)).toThrowError(PelanggaranAturan)
    expect(() => validasiOverrideGrade(3, '   ', 1)).toThrowError(PelanggaranAturan)
    expect(() => validasiOverrideGrade(3, null, 1)).toThrowError(PelanggaranAturan)
  })

  it('menolak alasan yang terlalu pendek untuk bisa dipertanggungjawabkan', () => {
    expect(() => validasiOverrideGrade(3, 'ok', 1)).toThrowError(PelanggaranAturan)
  })

  it('menerima alasan yang memadai', () => {
    expect(() =>
      validasiOverrideGrade(3, 'kondisi pasar sektor peternakan sedang turun', 1),
    ).not.toThrow()
  })

  it('override tidak boleh menembus lantai kolektibilitas 2', () => {
    expect(() =>
      validasiOverrideGrade(2, 'analis menilai usaha sangat prospektif', 2),
    ).toThrowError(PelanggaranAturan)
  })
})
