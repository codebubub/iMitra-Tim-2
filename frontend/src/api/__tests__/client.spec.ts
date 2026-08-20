/**
 * Test api/client.ts — inti kontrak galat yang diandalkan seluruh layar.
 *
 * Fokus utama AC-04 dan AC-09: field `rule` diteruskan APA ADANYA ke pemanggil,
 * supaya PanelGalat dapat menampilkan kode BR (BR-03 / BR-06) di samping pesan.
 * Kalau `rule` hilang di jalan, kedua AC itu gagal secara diam.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pasangFetch, pasangLocalStorage } from './bantuan-uji'
import { api, ambilToken, hapusToken, simpanToken } from '../client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api/client', () => {
  it('menyertakan header Authorization saat token ada', async () => {
    pasangLocalStorage({ 'imitra.token': 'tok-123' })
    const panggilan = pasangFetch({ json: { ok: true } })

    await api('/api/apa-saja')
    // Header memakai lowercase karena itulah bentuk yang diset klien.
    expect(panggilan[0].headers.authorization).toBe('Bearer tok-123')
    expect(panggilan[0].headers['content-type']).toBe('application/json')
  })

  it('TIDAK menyertakan Authorization saat token kosong', async () => {
    pasangLocalStorage()
    const panggilan = pasangFetch({ json: {} })

    await api('/api/apa-saja')
    expect(panggilan[0].headers.authorization).toBeUndefined()
  })

  it('AC-04/AC-09: galat 422 meneruskan field `rule` apa adanya', async () => {
    pasangLocalStorage()
    pasangFetch({
      status: 422,
      json: { error: 'PELANGGARAN_ATURAN', message: 'Belum ada survei berstatus VALID', rule: 'BR-03' },
    })

    await expect(api('/api/pengajuan/p1/skoring', { method: 'POST' })).rejects.toMatchObject({
      status: 422,
      error: 'PELANGGARAN_ATURAN',
      rule: 'BR-03',
    })
  })

  it('galat 422 BR-06 (margin di luar rentang) meneruskan rule', async () => {
    pasangLocalStorage()
    pasangFetch({
      status: 422,
      json: { error: 'PELANGGARAN_ATURAN', message: 'Margin 10,00% di bawah batas bawah grade 1', rule: 'BR-06' },
    })

    await expect(api('/api/pengajuan/p1/margin', { method: 'POST' })).rejects.toMatchObject({
      status: 422,
      rule: 'BR-06',
    })
  })

  it('401: token dihapus otomatis (fail-closed)', async () => {
    pasangLocalStorage({ 'imitra.token': 'basi' })
    pasangFetch({ status: 401, json: { error: 'TIDAK_TERAUTENTIKASI' } })

    await expect(api('/api/auth/me')).rejects.toMatchObject({ status: 401 })
    // Token yang menyebabkan 401 harus sudah dibersihkan.
    expect(ambilToken()).toBeNull()
  })

  it('simpan/ambil/hapus token bekerja end-to-end', () => {
    pasangLocalStorage()
    expect(ambilToken()).toBeNull()
    simpanToken('abc')
    expect(ambilToken()).toBe('abc')
    hapusToken()
    expect(ambilToken()).toBeNull()
  })

  it('galat tanpa body JSON tetap menghasilkan objek galat berbentuk seragam', async () => {
    pasangLocalStorage()
    // Simulasi respons non-JSON: bantuan-uji selalu punya .json(), jadi kita
    // stub fetch langsung agar .json() lempar.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ({ ok: false, status: 500, json: async () => { throw new Error('bukan json') } }) as unknown as Response,
      ),
    )

    await expect(api('/x')).rejects.toMatchObject({
      status: 500,
      error: 'GALAT_TIDAK_DIKENAL',
      message: 'Terjadi kesalahan',
    })
  })
})
