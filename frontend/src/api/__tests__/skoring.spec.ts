/**
 * Test lapisan api/skoring.ts (FR-06, layar S-09).
 *
 * Fokus: kontrak endpoint, tipe rincian, dan override dengan alasan.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pasangFetch, pasangLocalStorage } from './bantuan-uji'
import { ambilHasilSkoring, jalankanSkoring, overrideGrade } from '../skoring'

afterEach(() => {
  vi.unstubAllGlobals()
})

const HASIL_CONTOH = {
  id: 'hs1',
  pengajuanId: 'p1',
  skorAkhir: 85,
  gradeSistem: 1,
  gradeFinal: 1,
  diOverride: false,
  alasanOverride: null,
  snapshotParameter: {},
  rincian: [
    { kodeKomponen: 'KAPASITAS_BAYAR', bobot: 35, nilaiMentah: 39.81, skorKomponen: 67.3, kontribusi: 2355.5 },
    { kodeKomponen: 'RIWAYAT_SLIK', bobot: 25, nilaiMentah: 1, skorKomponen: 100, kontribusi: 2500 },
    { kodeKomponen: 'LAMA_USAHA', bobot: 20, nilaiMentah: 60, skorKomponen: 100, kontribusi: 2000 },
    { kodeKomponen: 'HASIL_SURVEI', bobot: 20, nilaiMentah: 4, skorKomponen: 80, kontribusi: 1600 },
  ],
  dihitungPada: '2026-08-20T10:30:00Z',
}

describe('api/skoring', () => {
  it('GET /skoring meneruskan empat rincian komponen (BR-08)', async () => {
    pasangLocalStorage()
    pasangFetch({ json: HASIL_CONTOH })

    const hasil = await ambilHasilSkoring('p1')
    expect(hasil?.rincian).toHaveLength(4)
    expect(hasil?.rincian[0].kodeKomponen).toBe('KAPASITAS_BAYAR')
  })

  it('POST /skoring memakai method POST ke URL yang benar', async () => {
    pasangLocalStorage()
    const panggilan = pasangFetch({ json: HASIL_CONTOH })

    await jalankanSkoring('p1')
    expect(panggilan[0].method).toBe('POST')
    expect(panggilan[0].url).toContain('/api/pengajuan/p1/skoring')
    // Tidak ada body — endpoint memakai pengajuanId dari path.
    expect(panggilan[0].body).toBeUndefined()
  })

  it('override mengirim gradeFinal dan alasan (AC-08)', async () => {
    pasangLocalStorage()
    const panggilan = pasangFetch({ json: HASIL_CONTOH })

    await overrideGrade('p1', { gradeFinal: 3, alasan: 'kondisi pasar turun di sektor peternakan' })
    expect(panggilan[0].method).toBe('POST')
    expect(panggilan[0].url).toContain('/api/pengajuan/p1/skoring/override')
    expect(panggilan[0].body).toEqual({
      gradeFinal: 3,
      alasan: 'kondisi pasar turun di sektor peternakan',
    })
  })

  it('skorKomponen dan kontribusi tidak dibulatkan di lapisan api (BR-07)', async () => {
    pasangLocalStorage()
    // Server mengirim desimal. Lapisan API meneruskan apa adanya, BUKAN
    // membulatkan. Pembulatan terjadi SEKALI, di backend.
    const hasilDesimal = {
      ...HASIL_CONTOH,
      rincian: [
        { kodeKomponen: 'KAPASITAS_BAYAR', bobot: 35, nilaiMentah: 39.81, skorKomponen: 67.317, kontribusi: 2356.095 },
      ],
    }
    pasangFetch({ json: hasilDesimal })

    const hasil = await ambilHasilSkoring('p1')
    // Angka desimal harus sampai apa adanya, tidak dibulatkan ke integer.
    expect(hasil?.rincian[0].skorKomponen).toBe(67.317)
    expect(hasil?.rincian[0].kontribusi).toBe(2356.095)
  })
})
