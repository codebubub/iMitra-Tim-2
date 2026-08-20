/**
 * Test lapisan api/margin.ts (FR-07, layar S-10).
 *
 * Fokus BR-06: TIDAK ADA jalur "paksa"/"lanjutkan saja". Test ini menjaga agar
 * tidak ada yang menambahkan parameter yang membuka jalur simpan di luar
 * rentang. Ini pengujian struktural — memeriksa bentuk fungsi, bukan runtime.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pasangFetch, pasangLocalStorage } from './bantuan-uji'
import { ambilMargin, tetapkanMargin } from '../margin'

afterEach(() => {
  vi.unstubAllGlobals()
})

const HASIL_MARGIN = {
  pengajuanId: 'p1',
  grade: 1,
  akad: 'MURABAHAH',
  marginPersen: 12.5,
  nisbahBankPersen: null,
  rentang: { grade: 1, akad: 'MURABAHAH', min: 11, maks: 13, dibiayai: true },
}

describe('api/margin', () => {
  it('MURABAHAH: mengirim marginPersen, bukan nisbah', async () => {
    pasangLocalStorage()
    const panggilan = pasangFetch({ json: HASIL_MARGIN })

    await tetapkanMargin('p1', { marginPersen: 12.5 })
    expect(panggilan[0].method).toBe('POST')
    expect(panggilan[0].url).toContain('/api/pengajuan/p1/margin')
    expect(panggilan[0].body).toEqual({ marginPersen: 12.5 })
  })

  it('MUSYARAKAH: mengirim nisbahBankPersen', async () => {
    pasangLocalStorage()
    const panggilan = pasangFetch({ json: { ...HASIL_MARGIN, akad: 'MUSYARAKAH' } })

    await tetapkanMargin('p1', { nisbahBankPersen: 22 })
    expect(panggilan[0].body).toEqual({ nisbahBankPersen: 22 })
  })

  it('BR-06: body tetapkanMargin TIDAK memuat field paksa/abaikan/pengecualian', async () => {
    pasangLocalStorage()
    const panggilan = pasangFetch({ json: HASIL_MARGIN })

    await tetapkanMargin('p1', { marginPersen: 12.5 })
    const kunci = Object.keys(panggilan[0].body as object)
    // Hanya field akad yang sah. Tidak ada jalur "lanjutkan saja".
    for (const dilarang of ['paksa', 'force', 'abaikanPeringatan', 'simpanSebagaiPengecualian', 'override']) {
      expect(kunci).not.toContain(dilarang)
    }
    expect(kunci.every((k) => k === 'marginPersen' || k === 'nisbahBankPersen')).toBe(true)
  })

  it('GET margin meneruskan rentang dari server (bukan dari kode)', async () => {
    pasangLocalStorage()
    pasangFetch({ json: HASIL_MARGIN })

    const hasil = await ambilMargin('p1')
    // Rentang harus datang dari respons, bukan konstanta frontend (R-8).
    expect(hasil.rentang.min).toBe(11)
    expect(hasil.rentang.maks).toBe(13)
    expect(hasil.rentang.dibiayai).toBe(true)
  })

  it('grade tidak dibiayai: rentang null diteruskan (BR-05)', async () => {
    pasangLocalStorage()
    pasangFetch({
      json: {
        ...HASIL_MARGIN,
        grade: 5,
        marginPersen: null,
        rentang: { grade: 5, akad: 'MURABAHAH', min: null, maks: null, dibiayai: false },
      },
    })

    const hasil = await ambilMargin('p1')
    expect(hasil.rentang.dibiayai).toBe(false)
    expect(hasil.rentang.min).toBeNull()
  })
})
