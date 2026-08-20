import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buatApp } from '../../src/app.js'
import { prisma } from '../../src/lib/prisma.js'

/**
 * AC-14 — pengajuan kelompok 4 anggota × Rp 60.000.000 (total Rp 240.000.000)
 * membutuhkan 3 level. Setelah satu anggota Rp 60.000.000 ditolak, total menjadi
 * Rp 180.000.000 dan level yang diperlukan turun menjadi 2.
 *
 * Nilai harapan (3 level → 2 level, 240jt → 180jt) dihitung dari brief §4.1 dan
 * AC-14, bukan dari kode. Level tidak pernah disimpan: penurunannya terjadi
 * otomatis saat detail dibaca ulang (ADR-0002).
 */
describe('AC-14 — pembiayaan kelompok, tolak anggota menurunkan level', () => {
  let app: FastifyInstance
  const token: Record<string, string> = {}

  async function login(username: string) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username, password: process.env.SEED_DEFAULT_PASSWORD ?? 'Demo1234!' },
    })
    expect(res.statusCode, `login ${username}`).toBe(200)
    return res.json().token as string
  }

  beforeAll(async () => {
    app = await buatApp()
    token.ao = await login('ao')
    token.anl = await login('anl')
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  it('240jt butuh 3 level; tolak satu 60jt → 180jt butuh 2 level', async () => {
    const stempel = Date.now().toString().slice(-9)
    const anggota = [0, 1, 2, 3].map((i) => ({
      nama: `Anggota Majelis ${i + 1}`,
      nik: `340488${stempel}${i}`,
      alamat: 'Jl. Majelis',
      jenisUsaha: 'Warung',
      plafonDiajukan: 60_000_000,
    }))

    const buat = await app.inject({
      method: 'POST',
      url: '/api/pengajuan',
      headers: { authorization: `Bearer ${token.ao}` },
      payload: { jenisNasabah: 'KELOMPOK', akad: 'MURABAHAH', tenorBulan: 12, anggota },
    })
    expect(buat.statusCode).toBe(201)
    const pengajuanId = buat.json().id as string

    const sebelum = await app.inject({
      method: 'GET',
      url: `/api/pengajuan/${pengajuanId}`,
      headers: { authorization: `Bearer ${token.anl}` },
    })
    expect(sebelum.json().totalPlafon).toBe(240_000_000)
    expect(sebelum.json().jumlahLevel).toBe(3)

    // ANL menolak satu anggota.
    const anggotaId = sebelum.json().anggota[0].id as string
    const tolak = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${pengajuanId}/anggota/${anggotaId}/tolak`,
      headers: { authorization: `Bearer ${token.anl}` },
    })
    expect(tolak.statusCode).toBe(200)
    expect(tolak.json().totalPlafon).toBe(180_000_000)
    expect(tolak.json().jumlahLevel).toBe(2)

    // Level dihitung ulang saat dibaca — bukan disimpan.
    const sesudah = await app.inject({
      method: 'GET',
      url: `/api/pengajuan/${pengajuanId}`,
      headers: { authorization: `Bearer ${token.anl}` },
    })
    expect(sesudah.json().totalPlafon).toBe(180_000_000)
    expect(sesudah.json().jumlahLevel).toBe(2)
  })

  it('menolak anggota hingga tersisa < 3 aktif ditolak (kelompok harus dibubarkan)', async () => {
    const stempel = Date.now().toString().slice(-9)
    const anggota = [0, 1, 2].map((i) => ({
      nama: `Anggota Kecil ${i + 1}`,
      nik: `340477${stempel}${i}`,
      alamat: 'Jl. Kecil',
      jenisUsaha: 'Warung',
      plafonDiajukan: 20_000_000,
    }))

    const buat = await app.inject({
      method: 'POST',
      url: '/api/pengajuan',
      headers: { authorization: `Bearer ${token.ao}` },
      payload: { jenisNasabah: 'KELOMPOK', akad: 'MURABAHAH', tenorBulan: 12, anggota },
    })
    const pengajuanId = buat.json().id as string
    const detail = await app.inject({
      method: 'GET',
      url: `/api/pengajuan/${pengajuanId}`,
      headers: { authorization: `Bearer ${token.anl}` },
    })
    const anggotaId = detail.json().anggota[0].id as string

    const tolak = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${pengajuanId}/anggota/${anggotaId}/tolak`,
      headers: { authorization: `Bearer ${token.anl}` },
    })
    expect(tolak.statusCode).toBe(422)
    expect(tolak.json().rule).toBe('FR-10')
  })
})
