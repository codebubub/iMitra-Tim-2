import { describe, it, expect } from 'vitest'
import {
  hitungTotalPlafon,
  urutanApprovalUntuk,
  levelBerjalan,
  pastikanBukanMaker,
  pastikanBolehMemutuskan,
  type BarisAmbangApproval,
} from '../../src/domain/approval.js'
import { AksesDitolak, PelanggaranAturan } from '../../src/lib/errors.js'

/**
 * Test diturunkan dari AC-10, AC-11, dan AC-14 — BUKAN dari kode yang baru
 * ditulis. Nilai harapan dihitung dari angka di brief 4.1, bukan disalin dari
 * keluaran fungsi.
 *
 * Ambang di sini adalah ARGUMEN, bukan konstanta yang diimpor. Itu memang
 * intinya: kalau fungsinya diam-diam memakai angka sendiri, test ini akan gagal.
 */
const AMBANG: BarisAmbangApproval[] = [
  { plafonMin: 5_000_000, plafonMaks: 50_000_000, urutanPeran: ['KCP'] },
  { plafonMin: 50_000_001, plafonMaks: 200_000_000, urutanPeran: ['KCP', 'KC'] },
  { plafonMin: 200_000_001, plafonMaks: 500_000_000, urutanPeran: ['KCP', 'KC', 'KOM'] },
]

describe('total plafon (ADR-0002)', () => {
  it('hanya menjumlahkan anggota AKTIF', () => {
    const anggota = [
      { plafonDiajukan: 60_000_000, statusAnggota: 'AKTIF' as const },
      { plafonDiajukan: 60_000_000, statusAnggota: 'AKTIF' as const },
      { plafonDiajukan: 60_000_000, statusAnggota: 'AKTIF' as const },
      { plafonDiajukan: 60_000_000, statusAnggota: 'AKTIF' as const },
    ]
    expect(hitungTotalPlafon(anggota)).toBe(240_000_000)
  })

  it('perorangan memakai jalur kode yang sama (asumsi A-5)', () => {
    expect(hitungTotalPlafon([{ plafonDiajukan: 30_000_000, statusAnggota: 'AKTIF' }])).toBe(
      30_000_000,
    )
  })
})

describe('AC-10 — level approval dari total plafon', () => {
  it('Rp 30.000.000 hanya butuh KCP', () => {
    expect(urutanApprovalUntuk(30_000_000, AMBANG)).toEqual(['KCP'])
  })

  it('Rp 120.000.000 butuh KCP lalu KC', () => {
    expect(urutanApprovalUntuk(120_000_000, AMBANG)).toEqual(['KCP', 'KC'])
  })

  // Batas adalah tempat aturan paling sering salah. Empat titik ini diuji
  // secara eksplisit, bukan diwakili satu nilai di tengah rentang.
  it.each([
    [50_000_000, ['KCP']],
    [50_000_001, ['KCP', 'KC']],
    [200_000_000, ['KCP', 'KC']],
    [200_000_001, ['KCP', 'KC', 'KOM']],
    [5_000_000, ['KCP']],
    [500_000_000, ['KCP', 'KC', 'KOM']],
  ])('total %i menghasilkan jalur %j', (total, harapan) => {
    expect(urutanApprovalUntuk(total as number, AMBANG)).toEqual(harapan)
  })
})

describe('AC-14 — menolak satu anggota menurunkan level yang diperlukan', () => {
  it('240jt butuh 3 level; setelah satu anggota 60jt ditolak, 180jt butuh 2 level', () => {
    const anggota = [
      { plafonDiajukan: 60_000_000, statusAnggota: 'AKTIF' as const },
      { plafonDiajukan: 60_000_000, statusAnggota: 'AKTIF' as const },
      { plafonDiajukan: 60_000_000, statusAnggota: 'AKTIF' as const },
      { plafonDiajukan: 60_000_000, statusAnggota: 'AKTIF' as const },
    ]

    const sebelum = hitungTotalPlafon(anggota)
    expect(sebelum).toBe(240_000_000)
    expect(urutanApprovalUntuk(sebelum, AMBANG)).toHaveLength(3)

    // Satu-satunya perubahan: status satu anggota. Tidak ada pemanggilan
    // "hitung ulang level" — itulah inti ADR-0002.
    anggota[3] = { plafonDiajukan: 60_000_000, statusAnggota: 'DITOLAK' as never }

    const sesudah = hitungTotalPlafon(anggota)
    expect(sesudah).toBe(180_000_000)
    expect(urutanApprovalUntuk(sesudah, AMBANG)).toHaveLength(2)
  })
})

describe('BR-02 — approval berurutan', () => {
  it('level berjalan adalah 1 ketika belum ada keputusan', () => {
    expect(levelBerjalan([], 2)).toBe(1)
  })

  it('naik ke level 2 setelah level 1 APPROVE', () => {
    expect(levelBerjalan([{ level: 1, keputusan: 'APPROVE' }], 2)).toBe(2)
  })

  it('null setelah seluruh level menyetujui', () => {
    expect(
      levelBerjalan(
        [
          { level: 1, keputusan: 'APPROVE' },
          { level: 2, keputusan: 'APPROVE' },
        ],
        2,
      ),
    ).toBeNull()
  })

  it('AC-10: KC ditolak 422 BR-02 selama KCP belum menyetujui', () => {
    expect(() => pastikanBolehMemutuskan('KC', ['KCP', 'KC'], [])).toThrowError(PelanggaranAturan)
    try {
      pastikanBolehMemutuskan('KC', ['KCP', 'KC'], [])
    } catch (e) {
      expect((e as PelanggaranAturan).rule).toBe('BR-02')
      expect((e as PelanggaranAturan).status).toBe(422)
    }
  })

  it('KC boleh memutuskan setelah KCP APPROVE', () => {
    expect(
      pastikanBolehMemutuskan('KC', ['KCP', 'KC'], [{ level: 1, keputusan: 'APPROVE' }]),
    ).toBe(2)
  })

  it('peran di luar jalur ditolak 403, bukan 422 — sebabnya berbeda', () => {
    try {
      pastikanBolehMemutuskan('KOM', ['KCP', 'KC'], [])
      throw new Error('seharusnya melempar')
    } catch (e) {
      expect(e).toBeInstanceOf(AksesDitolak)
      expect((e as AksesDitolak).status).toBe(403)
    }
  })
})

describe('AC-11 / BR-09 — maker tidak boleh menjadi approver', () => {
  it('menolak ketika pembuat dan penyetuju adalah orang yang sama', () => {
    expect(() => pastikanBukanMaker('pengguna-1', 'pengguna-1')).toThrowError(AksesDitolak)
  })

  it('mengizinkan ketika keduanya berbeda', () => {
    expect(() => pastikanBukanMaker('pengguna-1', 'pengguna-2')).not.toThrow()
  })
})
