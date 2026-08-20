import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buatServer } from '../src/server.js'
import { muatFixtures } from '../src/fixtures.js'

/**
 * Test ini menguji KONTRAK dari brief 6.1, bukan implementasi kami.
 * Kalau kontraknya berubah, brief-lah yang berubah — bukan test ini.
 */
describe('kontrak mock SLIK (brief 6.1)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    const data = muatFixtures('../fixtures/nasabah-uji.csv')
    app = buatServer(data)
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  const inquiry = (nik: string) =>
    app.inject({ method: 'POST', url: '/slik/inquiry', payload: { nik } })

  it('memuat 10 nasabah berdata dari fixtures, bukan 12', async () => {
    // Dua baris terakhir fixtures adalah pemicu 404 dan 503 — keduanya memang
    // tidak boleh mengembalikan 200.
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.json().nasabahDimuat).toBe(10)
  })

  it('200 dengan seluruh field kontrak untuk NIK kolektibilitas 1', async () => {
    const res = await inquiry('3404110985000001')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toMatchObject({
      nik: '3404110985000001',
      nama: 'Siti Aminah',
      kolektibilitas: 1,
      jumlahFasilitasAktif: 1,
      totalBakiDebet: 8000000,
    })
    expect(body.tanggalData).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(body.referenceId).toMatch(/^SLIK-\d{5}$/)
  })

  it('mengembalikan kolektibilitas apa adanya untuk kol-2 dan kol-4', async () => {
    expect((await inquiry('3404150688000003')).json().kolektibilitas).toBe(2)
    expect((await inquiry('3404031292000004')).json().kolektibilitas).toBe(4)
  })

  it('404 NIK_NOT_FOUND untuk NIK pemicu', async () => {
    const res = await inquiry('3404999999999999')
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'NIK_NOT_FOUND' })
  })

  it('404 NIK_NOT_FOUND untuk NIK di luar daftar', async () => {
    const res = await inquiry('1234567890123456')
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'NIK_NOT_FOUND' })
  })

  it('503 SERVICE_UNAVAILABLE untuk NIK pemicu 503', async () => {
    const res = await inquiry('3404000000000503')
    expect(res.statusCode).toBe(503)
    expect(res.json()).toEqual({ error: 'SERVICE_UNAVAILABLE' })
  })

  it('endpoint kontrol memaksa 503 untuk NIK yang biasanya berhasil', async () => {
    await app.inject({ method: 'POST', url: '/slik/_control/mode', payload: { mode: '503' } })
    const res = await inquiry('3404110985000001')
    expect(res.statusCode).toBe(503)

    await app.inject({ method: 'POST', url: '/slik/_control/mode', payload: { mode: 'ok' } })
    expect((await inquiry('3404110985000001')).statusCode).toBe(200)
  })

  it('400 untuk NIK yang bukan 16 digit', async () => {
    expect((await inquiry('123')).statusCode).toBe(400)
  })
})
