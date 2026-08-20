import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buatApp } from '../../src/app.js'
import { prisma } from '../../src/lib/prisma.js'

/**
 * AC-03 — ANL menolak dokumen KTP dengan kode alasan; AO mengunggah ulang HANYA
 * KTP; versi lama disimpan dan data pengajuan lain tidak hilang.
 *
 * Test ditembakkan ke endpoint langsung, seperti yang dilakukan penilai. Butuh
 * database yang sudah dimigrasi dan di-seed.
 */
describe('AC-03 — verifikasi & re-upload dokumen', () => {
  let app: FastifyInstance
  const token: Record<string, string> = {}
  const berkas = Buffer.from('konten-berkas-uji').toString('base64')

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

  async function buatPengajuanUji() {
    const nik = `3404${Date.now().toString().slice(-12)}`
    const res = await app.inject({
      method: 'POST',
      url: '/api/pengajuan',
      headers: { authorization: `Bearer ${token.ao}` },
      payload: {
        jenisNasabah: 'PERORANGAN',
        akad: 'MURABAHAH',
        tenorBulan: 12,
        anggota: [
          { nama: 'Uji Dokumen', nik, alamat: 'Jl. Uji', jenisUsaha: 'Warung', plafonDiajukan: 30_000_000 },
        ],
      },
    })
    expect(res.statusCode).toBe(201)
    const pengajuanId = res.json().id as string
    const detail = await app.inject({
      method: 'GET',
      url: `/api/pengajuan/${pengajuanId}`,
      headers: { authorization: `Bearer ${token.ao}` },
    })
    const anggotaId = detail.json().anggota[0].id as string
    return { pengajuanId, anggotaId }
  }

  it('AC-02: AO yang menembak verifikasi dokumen ditolak 403', async () => {
    const { pengajuanId, anggotaId } = await buatPengajuanUji()
    const unggah = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${pengajuanId}/dokumen`,
      headers: { authorization: `Bearer ${token.ao}` },
      payload: { pengajuanAnggotaId: anggotaId, jenis: 'KTP', mime: 'image/png', kontenBase64: berkas },
    })
    expect(unggah.statusCode).toBe(201)
    const dokumenId = unggah.json().id as string

    const res = await app.inject({
      method: 'POST',
      url: `/api/dokumen/${dokumenId}/verifikasi`,
      headers: { authorization: `Bearer ${token.ao}` },
      payload: { keputusan: 'VERIFIED' },
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('AKSES_DITOLAK')
  })

  it('penolakan tanpa kode alasan ditolak; re-upload hanya menaikkan versi KTP', async () => {
    const { pengajuanId, anggotaId } = await buatPengajuanUji()

    // Unggah KTP dan KK.
    const ktp = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${pengajuanId}/dokumen`,
      headers: { authorization: `Bearer ${token.ao}` },
      payload: { pengajuanAnggotaId: anggotaId, jenis: 'KTP', mime: 'image/png', kontenBase64: berkas },
    })
    const ktpId = ktp.json().id as string
    await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${pengajuanId}/dokumen`,
      headers: { authorization: `Bearer ${token.ao}` },
      payload: { pengajuanAnggotaId: anggotaId, jenis: 'KK', mime: 'image/png', kontenBase64: berkas },
    })

    // REJECTED tanpa kode alasan → ditolak (bukan 200).
    const tanpaAlasan = await app.inject({
      method: 'POST',
      url: `/api/dokumen/${ktpId}/verifikasi`,
      headers: { authorization: `Bearer ${token.anl}` },
      payload: { keputusan: 'REJECTED' },
    })
    expect(tanpaAlasan.statusCode).toBe(422)

    // ANL menolak KTP dengan kode alasan.
    const tolak = await app.inject({
      method: 'POST',
      url: `/api/dokumen/${ktpId}/verifikasi`,
      headers: { authorization: `Bearer ${token.anl}` },
      payload: { keputusan: 'REJECTED', kodeAlasan: 'BURAM' },
    })
    expect(tolak.statusCode).toBe(200)
    expect(tolak.json().status).toBe('REJECTED')

    // AO mengunggah ulang HANYA KTP → versi 2, versi 1 tetap ada.
    const ulang = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${pengajuanId}/dokumen`,
      headers: { authorization: `Bearer ${token.ao}` },
      payload: { pengajuanAnggotaId: anggotaId, jenis: 'KTP', mime: 'image/png', kontenBase64: berkas },
    })
    expect(ulang.statusCode).toBe(201)
    expect(ulang.json().versi).toBe(2)

    const daftar = await app.inject({
      method: 'GET',
      url: `/api/pengajuan/${pengajuanId}/dokumen`,
      headers: { authorization: `Bearer ${token.anl}` },
    })
    const dokumen = daftar.json() as { jenis: string; versi: number; status: string }[]
    const ktpSemua = dokumen.filter((d) => d.jenis === 'KTP').sort((a, b) => a.versi - b.versi)

    // Versi lama disimpan (bukan ditimpa): dua baris KTP.
    expect(ktpSemua).toHaveLength(2)
    expect(ktpSemua[0].versi).toBe(1)
    expect(ktpSemua[0].status).toBe('REJECTED')
    expect(ktpSemua[1].versi).toBe(2)

    // Data pengajuan lain tidak hilang: KK tetap ada.
    expect(dokumen.some((d) => d.jenis === 'KK')).toBe(true)
  })
})
