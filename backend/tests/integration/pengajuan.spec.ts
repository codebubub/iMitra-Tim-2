import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buatApp } from '../../src/app.js'
import { prisma } from '../../src/lib/prisma.js'
import { login, nikAcak } from './bantuan.js'

/**
 * AC-01 — AO login, membuat pengajuan Rp 30.000.000 murabahah, dan mendapat
 * nomor referensi berformat `IMT-YYYYMMDD-NNNN` (FR-01, FR-02, BR-12).
 *
 * Berkas ini disebut namanya di SRS BAB 7 sebagai bukti AC-01, tetapi belum
 * pernah ada. Yang diuji di sini adalah jalur LEWAT HTTP dari ujung ke ujung —
 * bukan fungsi domain-nya, yang sudah punya unit test sendiri.
 *
 * Ikut diuji: `PATCH /api/pengajuan/{id}` (FR-02, SDD BAB 5), yang juga belum
 * pernah terdaftar. Tanpa endpoint itu, pengajuan yang dikembalikan approver
 * tidak dapat diperbaiki AO dan alur SRS 3.2 buntu di `DIKEMBALIKAN`.
 */
describe('AC-01 — pengajuan mikro dari AO sampai nomor referensi', () => {
  let app: FastifyInstance
  let tokenAo: string
  let tokenAnl: string

  beforeAll(async () => {
    app = await buatApp()
    tokenAo = await login(app, 'ao')
    tokenAnl = await login(app, 'anl')
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  async function buat(payload: Record<string, unknown>) {
    return app.inject({
      method: 'POST',
      url: '/api/pengajuan',
      headers: { authorization: `Bearer ${tokenAo}` },
      payload,
    })
  }

  const anggotaValid = (nik: string) => ({
    nama: 'Siti Uji',
    nik,
    alamat: 'Jl. Uji No. 1',
    jenisUsaha: 'Warung Kelontong',
    plafonDiajukan: 30_000_000,
  })

  it('AC-01: membuat lalu mengirim pengajuan Rp 30 juta menghasilkan nomor IMT-YYYYMMDD-NNNN', async () => {
    const res = await buat({
      jenisNasabah: 'PERORANGAN',
      akad: 'MURABAHAH',
      tenorBulan: 12,
      anggota: [anggotaValid(nikAcak())],
    })
    expect(res.statusCode, res.body).toBe(201)
    const { id, nomorReferensi, status } = res.json()
    expect(status).toBe('DRAFT')

    // Format persis dari BR-12: prefiks, tanggal 8 digit, urutan 4 digit.
    expect(nomorReferensi).toMatch(/^IMT-\d{8}-\d{4}$/)
    const tanggalHariIni = new Date()
    const kunci =
      `${tanggalHariIni.getFullYear()}` +
      `${String(tanggalHariIni.getMonth() + 1).padStart(2, '0')}` +
      `${String(tanggalHariIni.getDate()).padStart(2, '0')}`
    expect(nomorReferensi.slice(4, 12)).toBe(kunci)

    const submit = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${id}/submit`,
      headers: { authorization: `Bearer ${tokenAo}` },
    })
    expect(submit.statusCode, submit.body).toBe(200)
    expect(submit.json().status).toBe('SUBMITTED')

    // Nomor referensi TIDAK berubah saat submit — ia dibangkitkan sekali.
    const detail = await app.inject({
      method: 'GET',
      url: `/api/pengajuan/${id}`,
      headers: { authorization: `Bearer ${tokenAo}` },
    })
    expect(detail.json().nomorReferensi).toBe(nomorReferensi)
    expect(detail.json().totalPlafon).toBe(30_000_000)
  })

  it('BR-12: dua pengajuan berurutan tidak pernah memakai nomor yang sama', async () => {
    const a = await buat({
      jenisNasabah: 'PERORANGAN',
      akad: 'MURABAHAH',
      tenorBulan: 12,
      anggota: [anggotaValid(nikAcak())],
    })
    const b = await buat({
      jenisNasabah: 'PERORANGAN',
      akad: 'MURABAHAH',
      tenorBulan: 12,
      anggota: [anggotaValid(nikAcak())],
    })
    expect(a.json().nomorReferensi).not.toBe(b.json().nomorReferensi)
  })

  it('BR-01: plafon di bawah Rp 5 juta ditolak 422 saat submit, dengan kedua batas disebut', async () => {
    const res = await buat({
      jenisNasabah: 'PERORANGAN',
      akad: 'MURABAHAH',
      tenorBulan: 12,
      anggota: [{ ...anggotaValid(nikAcak()), plafonDiajukan: 4_000_000 }],
    })
    expect(res.statusCode).toBe(201)

    const submit = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${res.json().id}/submit`,
      headers: { authorization: `Bearer ${tokenAo}` },
    })
    expect(submit.statusCode, submit.body).toBe(422)
    // Pesannya harus menyebut kedua batas supaya AO tahu rentang yang berlaku.
    expect(submit.body).toContain('5.000.000')
    expect(submit.body).toContain('500.000.000')
  })

  it('FR-02: NIK bukan 16 digit ditolak, dan pesannya tidak memuat NIK itu (BR-11)', async () => {
    const nikSalah = '12345'
    const res = await buat({
      jenisNasabah: 'PERORANGAN',
      akad: 'MURABAHAH',
      tenorBulan: 12,
      anggota: [{ ...anggotaValid(nikSalah), nik: nikSalah }],
    })
    expect(res.statusCode).toBeGreaterThanOrEqual(400)
    expect(res.body).not.toContain(nikSalah)
  })

  describe('PATCH /api/pengajuan/{id} — FR-02', () => {
    it('mengubah tenor saat DRAFT dan mencatatnya di audit trail', async () => {
      const res = await buat({
        jenisNasabah: 'PERORANGAN',
        akad: 'MURABAHAH',
        tenorBulan: 12,
        anggota: [anggotaValid(nikAcak())],
      })
      const id = res.json().id as string

      const patch = await app.inject({
        method: 'PATCH',
        url: `/api/pengajuan/${id}`,
        headers: { authorization: `Bearer ${tokenAo}` },
        payload: { tenorBulan: 24 },
      })
      expect(patch.statusCode, patch.body).toBe(200)
      expect(patch.json().tenorBulan).toBe(24)

      const audit = await app.inject({
        method: 'GET',
        url: `/api/pengajuan/${id}/audit`,
        headers: { authorization: `Bearer ${tokenAo}` },
      })
      expect(audit.body).toContain('Perubahan data pengajuan oleh AO')
    })

    it('menolak tenor di luar 3–36 bulan dengan 422', async () => {
      const res = await buat({
        jenisNasabah: 'PERORANGAN',
        akad: 'MURABAHAH',
        tenorBulan: 12,
        anggota: [anggotaValid(nikAcak())],
      })
      const patch = await app.inject({
        method: 'PATCH',
        url: `/api/pengajuan/${res.json().id}`,
        headers: { authorization: `Bearer ${tokenAo}` },
        payload: { tenorBulan: 48 },
      })
      expect(patch.statusCode, patch.body).toBe(422)
    })

    it('menolak perubahan setelah pengajuan dikirim (bukan lagi DRAFT/DIKEMBALIKAN)', async () => {
      const res = await buat({
        jenisNasabah: 'PERORANGAN',
        akad: 'MURABAHAH',
        tenorBulan: 12,
        anggota: [anggotaValid(nikAcak())],
      })
      const id = res.json().id as string
      await app.inject({
        method: 'POST',
        url: `/api/pengajuan/${id}/submit`,
        headers: { authorization: `Bearer ${tokenAo}` },
      })

      const patch = await app.inject({
        method: 'PATCH',
        url: `/api/pengajuan/${id}`,
        headers: { authorization: `Bearer ${tokenAo}` },
        payload: { tenorBulan: 24 },
      })
      expect(patch.statusCode, patch.body).toBe(422)
    })

    it('AC-02: ANL tidak dapat mengubah pengajuan milik AO — 403 dari server', async () => {
      const res = await buat({
        jenisNasabah: 'PERORANGAN',
        akad: 'MURABAHAH',
        tenorBulan: 12,
        anggota: [anggotaValid(nikAcak())],
      })
      const patch = await app.inject({
        method: 'PATCH',
        url: `/api/pengajuan/${res.json().id}`,
        headers: { authorization: `Bearer ${tokenAnl}` },
        payload: { tenorBulan: 24 },
      })
      expect(patch.statusCode).toBe(403)
    })
  })
})
