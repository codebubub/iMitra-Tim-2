/**
 * Test lapisan api/parameter.ts (FR-13, layar S-13 & S-14).
 *
 * Fokus: bentuk GET /parameter/skoring adalah OBJEK { bobot, skalar } (bukan
 * array — kesalahan yang pernah membuat tabel kosong), dan bahwa modul pengguna
 * TIDAK menyediakan fungsi hapus (S-14: pengguna dinonaktifkan, bukan dihapus).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pasangFetch, pasangLocalStorage } from './bantuan-uji'
import * as parameterApi from '../parameter'
import {
  ambilAmbangApproval,
  ambilParameterSkoring,
  ambilRentangMargin,
  simpanBobotKomponen,
  ubahPengguna,
} from '../parameter'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api/parameter', () => {
  it('GET /parameter/skoring membaca objek { bobot, skalar }', async () => {
    pasangLocalStorage()
    pasangFetch({
      json: {
        bobot: { KAPASITAS_BAYAR: 35, RIWAYAT_SLIK: 25, LAMA_USAHA: 20, HASIL_SURVEI: 20 },
        skalar: {
          marginReferensiSkoring: 15.5,
          hariKerjaPerBulan: 25,
          marginUsahaPersen: 30,
          rasioPenuh: 30,
          rasioNol: 60,
          lamaUsahaPenuhBulan: 36,
          lamaUsahaNolBulan: 6,
        },
      },
    })

    const hasil = await ambilParameterSkoring()
    // Bentuk objek, bukan array. Bobot dibaca dari data, bukan konstanta.
    expect(hasil.bobot.KAPASITAS_BAYAR).toBe(35)
    expect(hasil.skalar.hariKerjaPerBulan).toBe(25)
  })

  it('PUT bobot mengirim array {kode, bobot}', async () => {
    pasangLocalStorage()
    const panggilan = pasangFetch({ json: [] })

    await simpanBobotKomponen([{ kode: 'LAMA_USAHA', bobot: 25 }])
    expect(panggilan[0].method).toBe('PUT')
    expect(panggilan[0].body).toEqual([{ kode: 'LAMA_USAHA', bobot: 25 }])
  })

  it('ambang & rentang dibaca sebagai array', async () => {
    pasangLocalStorage()
    pasangFetch({ json: [{ plafonMin: 5000000, plafonMaks: 50000000, urutanPeran: ['KCP'] }] })
    const ambang = await ambilAmbangApproval()
    expect(ambang[0].urutanPeran).toEqual(['KCP'])

    vi.unstubAllGlobals()
    pasangLocalStorage()
    pasangFetch({ json: [{ grade: 5, skorMin: 0, skorMaks: 39, marginMin: null, marginMaks: null, nisbahMin: null, nisbahMaks: null, dibiayai: false }] })
    const rentang = await ambilRentangMargin()
    expect(rentang[0].dibiayai).toBe(false)
  })

  it('S-14: modul TIDAK mengekspor fungsi hapus pengguna', () => {
    // Pengguna dinonaktifkan, tidak dihapus (FR-09: audit menunjuk kepadanya).
    const namaEkspor = Object.keys(parameterApi)
    for (const n of namaEkspor) {
      expect(n.toLowerCase()).not.toContain('hapus')
      expect(n.toLowerCase()).not.toContain('delete')
    }
  })

  it('nonaktifkan pengguna = PATCH aktif:false, bukan DELETE', async () => {
    pasangLocalStorage()
    const panggilan = pasangFetch({
      json: { id: 'u1', username: 'ao1', nama: 'Andi', peran: 'AO', aktif: false, dibuatPada: '2026-08-20' },
    })

    await ubahPengguna('u1', { aktif: false })
    expect(panggilan[0].method).toBe('PATCH')
    expect(panggilan[0].method).not.toBe('DELETE')
    expect(panggilan[0].body).toEqual({ aktif: false })
  })
})
