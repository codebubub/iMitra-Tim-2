import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buatApp } from '../../src/app.js'
import { prisma } from '../../src/lib/prisma.js'

/**
 * FR-11 — notifikasi perubahan status, SISI BACA.
 *
 * Dua hal yang diuji di sini dan tidak bisa diuji dari unit test:
 *
 *   1. Notifikasi milik orang lain tidak bisa dibaca maupun ditandai dibaca,
 *      walaupun id-nya diketahui. Id pengguna diambil dari token, tidak pernah
 *      dari permintaan — dan itu hanya terbukti kalau ditembak dari luar.
 *   2. Aktor TIDAK diberi tahu atas aksinya sendiri. Kalau aturan itu hilang,
 *      daftar notifikasi AO akan penuh oleh gemanya sendiri.
 *
 * Butuh database yang sudah dimigrasi dan di-seed.
 */

/** NIK unik per jalannya test: asumsi A-6 melarang satu NIK punya dua pengajuan aktif. */
function nikUji(): string {
  return '3405' + String(Date.now()).slice(-12)
}

describe('FR-11 — notifikasi milik pengguna sendiri', () => {
  let app: FastifyInstance
  const token: Record<string, string> = {}
  const id: Record<string, string> = {}
  const password = process.env.SEED_DEFAULT_PASSWORD ?? 'Demo1234!'

  beforeAll(async () => {
    app = await buatApp()

    for (const username of ['ao', 'anl']) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username, password },
      })
      expect(res.statusCode, `login ${username} gagal — sudah menjalankan seed?`).toBe(200)
      token[username] = res.json().token
      id[username] = res.json().pengguna.id
    }
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  it('menolak permintaan tanpa token dengan 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/notifikasi' })
    expect(res.statusCode).toBe(401)
  })

  it('mengembalikan daftar milik pemanggil beserta jumlah yang belum dibaca', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/notifikasi',
      headers: { authorization: `Bearer ${token.ao}` },
    })
    expect(res.statusCode).toBe(200)

    const isi = res.json()
    expect(Array.isArray(isi.baris)).toBe(true)
    expect(typeof isi.belumDibaca).toBe('number')
  })

  it('TIDAK memberi tahu aktor atas perubahan status yang ia lakukan sendiri', async () => {
    const sebelum = await prisma.notifikasi.count({ where: { penggunaId: id.ao } })

    const dibuat = await app.inject({
      method: 'POST',
      url: '/api/pengajuan',
      headers: { authorization: `Bearer ${token.ao}` },
      payload: {
        jenisNasabah: 'PERORANGAN',
        akad: 'MURABAHAH',
        tenorBulan: 12,
        anggota: [
          {
            nama: 'Nasabah Uji Notifikasi',
            nik: nikUji(),
            alamat: 'Jl. Uji Notifikasi No. 1',
            jenisUsaha: 'Warung kelontong',
            plafonDiajukan: 25_000_000,
          },
        ],
      },
    })
    expect(dibuat.statusCode, dibuat.body).toBe(201)

    // AO men-submit pengajuannya SENDIRI: ia aktor sekaligus pembuat.
    const submit = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${dibuat.json().id}/submit`,
      headers: { authorization: `Bearer ${token.ao}` },
    })
    expect(submit.statusCode, submit.body).toBe(200)

    const sesudah = await prisma.notifikasi.count({ where: { penggunaId: id.ao } })
    expect(sesudah, 'aktor diberi tahu atas aksinya sendiri').toBe(sebelum)
  })

  it('menandai notifikasi sendiri sebagai dibaca', async () => {
    const milikSaya = await prisma.notifikasi.create({
      data: { penggunaId: id.ao, pesan: 'Notifikasi uji milik AO', dibaca: false },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/api/notifikasi/${milikSaya.id}/baca`,
      headers: { authorization: `Bearer ${token.ao}` },
    })
    expect(res.statusCode, res.body).toBe(200)

    const sesudah = await prisma.notifikasi.findUnique({ where: { id: milikSaya.id } })
    expect(sesudah?.dibaca).toBe(true)
  })

  it('TIDAK dapat menandai notifikasi milik orang lain, walaupun id-nya diketahui', async () => {
    const milikOrangLain = await prisma.notifikasi.create({
      data: { penggunaId: id.anl, pesan: 'Notifikasi uji milik ANL', dibaca: false },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/api/notifikasi/${milikOrangLain.id}/baca`,
      headers: { authorization: `Bearer ${token.ao}` },
    })
    // 404, bukan 403: bedanya jawaban tidak boleh dipakai menebak id orang lain.
    expect(res.statusCode).toBe(404)

    const sesudah = await prisma.notifikasi.findUnique({ where: { id: milikOrangLain.id } })
    expect(sesudah?.dibaca, 'notifikasi orang lain ikut berubah').toBe(false)
  })

  it('tidak menampilkan notifikasi milik orang lain di daftar', async () => {
    await prisma.notifikasi.create({
      data: { penggunaId: id.anl, pesan: 'Rahasia milik ANL', dibaca: false },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/notifikasi?batas=200',
      headers: { authorization: `Bearer ${token.ao}` },
    })
    expect(res.body).not.toContain('Rahasia milik ANL')
  })

  it('menjawab 404 untuk notifikasi yang tidak ada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/notifikasi/00000000-0000-0000-0000-000000000000/baca',
      headers: { authorization: `Bearer ${token.ao}` },
    })
    expect(res.statusCode).toBe(404)
  })
})
