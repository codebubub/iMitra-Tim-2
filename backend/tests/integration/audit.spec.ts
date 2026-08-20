import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buatApp } from '../../src/app.js'
import { prisma } from '../../src/lib/prisma.js'

/**
 * AC-12 — riwayat audit satu pengajuan, urut waktu, dengan AKTOR di setiap baris.
 *
 * Test ini diturunkan dari AC-12 ("penilai membuka satu pengajuan dan melihat
 * siapa melakukan apa dan kapan"), bukan dari bentuk fungsi yang kebetulan sudah
 * ditulis. Karena itu ia menembak endpoint, memeriksa urutan waktu, dan
 * memeriksa bahwa NIK tidak ikut terbawa (BR-11) — tiga hal yang diminta AC,
 * bukan tiga hal yang mudah diuji.
 *
 * Butuh database yang sudah dimigrasi dan di-seed.
 */

/** NIK unik per jalannya test: asumsi A-6 melarang satu NIK punya dua pengajuan aktif. */
function nikUji(): string {
  return '3404' + String(Date.now()).slice(-12)
}

describe('AC-12 — audit trail satu pengajuan', () => {
  let app: FastifyInstance
  const token: Record<string, string> = {}
  let pengajuanId = ''
  let nomorReferensi = ''
  const nik = nikUji()

  beforeAll(async () => {
    app = await buatApp()
    const password = process.env.SEED_DEFAULT_PASSWORD ?? 'Demo1234!'

    for (const username of ['ao', 'anl', 'adm']) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username, password },
      })
      expect(res.statusCode, `login ${username} gagal — sudah menjalankan seed?`).toBe(200)
      token[username] = res.json().token
    }

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
            nama: 'Nasabah Uji Audit',
            nik,
            alamat: 'Jl. Uji Audit No. 1',
            jenisUsaha: 'Warung kelontong',
            plafonDiajukan: 30_000_000,
          },
        ],
      },
    })
    expect(dibuat.statusCode, dibuat.body).toBe(201)
    pengajuanId = dibuat.json().id
    nomorReferensi = dibuat.json().nomorReferensi

    const submit = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${pengajuanId}/submit`,
      headers: { authorization: `Bearer ${token.ao}` },
    })
    expect(submit.statusCode, submit.body).toBe(200)
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  it('mencatat perubahan status DRAFT -> SUBMITTED dengan aktor dan waktu (BR-10)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/pengajuan/${pengajuanId}/audit`,
      headers: { authorization: `Bearer ${token.ao}` },
    })
    expect(res.statusCode).toBe(200)

    const baris = res.json() as {
      aksi: string
      aktor: string
      aktorPeran: string
      waktu: string
      statusSebelum: string | null
      statusSesudah: string | null
    }[]

    const submit = baris.find((b) => b.aksi === 'UBAH_STATUS' && b.statusSesudah === 'SUBMITTED')
    expect(submit, 'tidak ada baris audit untuk submit').toBeDefined()
    expect(submit!.statusSebelum).toBe('DRAFT')
    // BR-10: tidak ada perubahan status "oleh sistem" tanpa aktor.
    expect(submit!.aktorPeran).toBe('AO')
    expect(submit!.aktor).not.toBe('-')
    expect(Number.isNaN(Date.parse(submit!.waktu))).toBe(false)
  })

  it('mengembalikan baris urut naik menurut waktu', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/pengajuan/${pengajuanId}/audit`,
      headers: { authorization: `Bearer ${token.ao}` },
    })
    const waktu = (res.json() as { waktu: string }[]).map((b) => Date.parse(b.waktu))
    const terurut = [...waktu].sort((a, b) => a - b)
    expect(waktu).toEqual(terurut)
  })

  it('TIDAK membocorkan NIK di riwayat audit (BR-11)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/pengajuan/${pengajuanId}/audit`,
      headers: { authorization: `Bearer ${token.ao}` },
    })
    expect(res.body).not.toContain(nik)
    // Nomor referensi memang boleh muncul — ia dibuat justru untuk korelasi.
    expect(nomorReferensi).toMatch(/^IMT-\d{8}-\d{4}$/)
  })
})

describe('GET /api/audit — hanya ADM', () => {
  let app: FastifyInstance
  const token: Record<string, string> = {}

  beforeAll(async () => {
    app = await buatApp()
    const password = process.env.SEED_DEFAULT_PASSWORD ?? 'Demo1234!'
    for (const username of ['ao', 'adm']) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username, password },
      })
      token[username] = res.json().token
    }
  })

  afterAll(async () => {
    await app.close()
  })

  it('menolak AO dengan 403, bukan 200 dan bukan 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/audit',
      headers: { authorization: `Bearer ${token.ao}` },
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('AKSES_DITOLAK')
  })

  it('mengembalikan baris beserta total untuk ADM', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/audit?batas=5',
      headers: { authorization: `Bearer ${token.adm}` },
    })
    expect(res.statusCode).toBe(200)
    const isi = res.json()
    expect(isi.baris.length).toBeLessThanOrEqual(5)
    expect(isi.total).toBeGreaterThanOrEqual(isi.baris.length)
  })

  it('menyaring menurut aksi', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/audit?aksi=LOGIN',
      headers: { authorization: `Bearer ${token.adm}` },
    })
    expect(res.statusCode).toBe(200)
    const baris = res.json().baris as { aksi: string }[]
    expect(baris.length).toBeGreaterThan(0)
    expect(baris.every((b) => b.aksi === 'LOGIN')).toBe(true)
  })

  it('MENERIMA rentang tanggal yang berformat benar', async () => {
    // Test ini ada karena kebalikannya pernah lolos: pola tanggal sempat kehilangan
    // escape-nya (\\d menjadi d), sehingga SELURUH tanggal yang sah ditolak dan
    // hanya test "tanggal salah ditolak" yang hijau. Menguji jalur yang gagal
    // saja tidak membuktikan jalur yang berhasil masih hidup.
    const res = await app.inject({
      method: 'GET',
      url: '/api/audit?dari=2026-01-01&sampai=2026-12-31&batas=5',
      headers: { authorization: `Bearer ${token.adm}` },
    })
    expect(res.statusCode, res.body).toBe(200)
    expect(res.json().baris.length).toBeGreaterThan(0)
  })

  it('menolak tanggal yang bukan YYYY-MM-DD dengan 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/audit?dari=20-08-2026',
      headers: { authorization: `Bearer ${token.adm}` },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('VALIDASI_GAGAL')
  })
})
