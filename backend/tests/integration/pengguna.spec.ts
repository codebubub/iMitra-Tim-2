import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buatApp } from '../../src/app.js'
import { prisma } from '../../src/lib/prisma.js'

/**
 * FR-01 — kelola pengguna, dan otorisasinya ditegakkan DI SERVER.
 *
 * Layar S-14 hanya ditampilkan kepada ADM, tetapi menyembunyikan menu bukan
 * otorisasi (AGENTS.md bagian 1). Karena itu setiap kasus di bawah menembak
 * endpoint dengan token AO, persis seperti yang akan dilakukan penilai.
 *
 * Butuh database yang sudah dimigrasi dan di-seed.
 */

/** Username unik per jalannya test — test tidak boleh bergantung pada urutan. */
function usernameUji(awalan: string): string {
  return `${awalan}${String(Date.now()).slice(-9)}`
}

describe('FR-01 — kelola pengguna hanya untuk ADM', () => {
  let app: FastifyInstance
  const token: Record<string, string> = {}
  const password = process.env.SEED_DEFAULT_PASSWORD ?? 'Demo1234!'

  beforeAll(async () => {
    app = await buatApp()
    for (const username of ['ao', 'adm']) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username, password },
      })
      expect(res.statusCode, `login ${username} gagal — sudah menjalankan seed?`).toBe(200)
      token[username] = res.json().token
    }
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  it('AO ditolak 403 pada daftar, buat, dan ubah pengguna', async () => {
    const daftar = await app.inject({
      method: 'GET',
      url: '/api/pengguna',
      headers: { authorization: `Bearer ${token.ao}` },
    })
    expect(daftar.statusCode).toBe(403)

    const buat = await app.inject({
      method: 'POST',
      url: '/api/pengguna',
      headers: { authorization: `Bearer ${token.ao}` },
      payload: {
        username: usernameUji('curang'),
        nama: 'Curang',
        peran: 'ADM',
        password: 'Rahasia123!',
      },
    })
    expect(buat.statusCode).toBe(403)
    expect(buat.json().error).toBe('AKSES_DITOLAK')

    const ubah = await app.inject({
      method: 'PATCH',
      url: '/api/pengguna/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${token.ao}` },
      payload: { nama: 'Curang' },
    })
    expect(ubah.statusCode).toBe(403)
  })

  it('tanpa token dijawab 401, bukan 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pengguna' })
    expect(res.statusCode).toBe(401)
  })

  it('ADM membuat pengguna, dan pengguna itu bisa login dengan sandi yang diberikan', async () => {
    const username = usernameUji('ao_baru_')
    const sandiBaru = 'SandiUji123!'

    const buat = await app.inject({
      method: 'POST',
      url: '/api/pengguna',
      headers: { authorization: `Bearer ${token.adm}` },
      payload: { username, nama: 'AO Tambahan', peran: 'AO', password: sandiBaru },
    })
    expect(buat.statusCode, buat.body).toBe(201)

    const dibuat = buat.json()
    expect(dibuat.username).toBe(username)
    expect(dibuat.peran).toBe('AO')
    expect(dibuat.aktif).toBe(true)

    // Hash kata sandi tidak boleh keluar dari server, dalam bentuk apa pun.
    expect(buat.body).not.toContain('passwordHash')
    expect(buat.body).not.toContain('password_hash')
    expect(buat.body).not.toContain(sandiBaru)

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username, password: sandiBaru },
    })
    expect(login.statusCode, 'pengguna baru tidak bisa login').toBe(200)
    expect(login.json().pengguna.peran).toBe('AO')
  })

  it('menolak username yang sudah dipakai dengan 400 dan menyebut fieldnya', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/pengguna',
      headers: { authorization: `Bearer ${token.adm}` },
      payload: { username: 'ao', nama: 'Bentrok', peran: 'AO', password: 'SandiUji123!' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('VALIDASI_GAGAL')
    expect(res.json().message).toMatch(/username/i)
  })

  it('menolak kata sandi yang terlalu pendek dengan 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/pengguna',
      headers: { authorization: `Bearer ${token.adm}` },
      payload: {
        username: usernameUji('pendek_'),
        nama: 'Sandi Pendek',
        peran: 'AO',
        password: 'abc',
      },
    })
    expect(res.statusCode).toBe(400)
  })

  it('menonaktifkan pengguna, dan pengguna itu tidak bisa login lagi', async () => {
    const username = usernameUji('nonaktif_')
    const sandiBaru = 'SandiUji123!'

    const buat = await app.inject({
      method: 'POST',
      url: '/api/pengguna',
      headers: { authorization: `Bearer ${token.adm}` },
      payload: { username, nama: 'Akan Dinonaktifkan', peran: 'ANL', password: sandiBaru },
    })
    expect(buat.statusCode).toBe(201)

    const ubah = await app.inject({
      method: 'PATCH',
      url: `/api/pengguna/${buat.json().id}`,
      headers: { authorization: `Bearer ${token.adm}` },
      payload: { aktif: false },
    })
    expect(ubah.statusCode, ubah.body).toBe(200)
    expect(ubah.json().aktif).toBe(false)

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username, password: sandiBaru },
    })
    expect(login.statusCode, 'pengguna nonaktif masih bisa login').toBe(401)
  })

  it('menolak field yang tidak dikenal, bukan mengabaikannya diam-diam', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/pengguna/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${token.adm}` },
      payload: { peranBaru: 'ADM' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('ADM tidak dapat menonaktifkan akunnya sendiri', async () => {
    const saya = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token.adm}` },
    })
    const idSaya = saya.json().id

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/pengguna/${idSaya}`,
      headers: { authorization: `Bearer ${token.adm}` },
      payload: { aktif: false },
    })
    expect(res.statusCode).toBe(422)
    expect(res.json().rule).toBe('FR-01')
  })

  it('menjawab 404 untuk pengguna yang tidak ada', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/pengguna/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${token.adm}` },
      payload: { nama: 'Tidak Ada' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('mencatat pembuatan pengguna di audit trail TANPA kata sandi (FR-09, BR-11)', async () => {
    const username = usernameUji('audit_')
    const sandiBaru = 'SandiUji123!'

    const buat = await app.inject({
      method: 'POST',
      url: '/api/pengguna',
      headers: { authorization: `Bearer ${token.adm}` },
      payload: { username, nama: 'Untuk Audit', peran: 'AO', password: sandiBaru },
    })
    expect(buat.statusCode).toBe(201)

    const audit = await app.inject({
      method: 'GET',
      url: '/api/audit?aksi=BUAT_PENGGUNA&batas=200',
      headers: { authorization: `Bearer ${token.adm}` },
    })
    expect(audit.statusCode).toBe(200)
    expect(audit.body).toContain(username)
    expect(audit.body).not.toContain(sandiBaru)
  })
})
