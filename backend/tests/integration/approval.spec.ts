import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buatApp } from '../../src/app.js'
import { prisma } from '../../src/lib/prisma.js'
import { nomorReferensiUji } from './bantuan.js'

/**
 * AC-10 — approval berurutan: Rp 120.000.000 butuh KCP lalu KC; KC tidak dapat
 * memutuskan sebelum KCP (422 BR-02).
 * AC-11 — pembuat pengajuan tidak dapat menyetujuinya sendiri (403 BR-09), meski
 * perannya memungkinkan.
 *
 * State approval dibangun langsung lewat Prisma (pengajuan + anggota +
 * hasil_skoring + status MENUNGGU_APPROVAL_L1) supaya test ini menembak layanan
 * approval milik Dani tanpa bergantung pada jalur skoring milik Alfian.
 */
describe('AC-10 / AC-11 — approval berjenjang', () => {
  let app: FastifyInstance
  const token: Record<string, string> = {}
  const idPengguna: Record<string, string> = {}

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
    for (const u of ['ao', 'anl', 'kcp', 'kc', 'kom', 'kcp2']) token[u] = await login(u)
    const akun = await prisma.pengguna.findMany({
      where: { username: { in: ['ao', 'kcp', 'kcp2'] } },
    })
    for (const a of akun) idPengguna[a.username] = a.id
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  async function pengajuanMenungguL1(opsi: { dibuatOleh: string; plafon: bigint }) {
    const nik = `3404${Date.now().toString().slice(-11)}${Math.floor(Math.random() * 10)}`
    const nasabah = await prisma.nasabah.upsert({
      where: { nik },
      create: { nik, nama: 'Uji Approval', alamat: 'Jl. Uji', jenisUsaha: 'Warung' },
      update: {},
    })
    // Memakai generator bersama: salinan inline sebelumnya hanya punya 8.999
    // nilai dan bertabrakan dengan baris uji yang menumpuk di schema test.
    const nomor = nomorReferensiUji()
    const pengajuan = await prisma.pengajuan.create({
      data: {
        nomorReferensi: nomor,
        jenisNasabah: 'PERORANGAN',
        akad: 'MURABAHAH',
        tenorBulan: 12,
        status: 'MENUNGGU_APPROVAL_L1',
        dibuatOleh: opsi.dibuatOleh,
        anggota: {
          create: { nasabahId: nasabah.id, plafonDiajukan: opsi.plafon, urutan: 1 },
        },
        skoring: {
          create: {
            skorAkhir: 80,
            gradeSistem: 2,
            gradeFinal: 2,
            snapshotParameter: {},
            dihitungOleh: opsi.dibuatOleh,
          },
        },
      },
    })
    return pengajuan.id
  }

  it('AC-10: KC ditolak 422 BR-02 sebelum KCP menyetujui (plafon 120jt)', async () => {
    const id = await pengajuanMenungguL1({ dibuatOleh: idPengguna.ao, plafon: 120_000_000n })

    const kc = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${id}/approval`,
      headers: { authorization: `Bearer ${token.kc}` },
      payload: { keputusan: 'APPROVE' },
    })
    expect(kc.statusCode).toBe(422)
    expect(kc.json().rule).toBe('BR-02')

    // KCP menyetujui → naik ke L2.
    const kcp = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${id}/approval`,
      headers: { authorization: `Bearer ${token.kcp}` },
      payload: { keputusan: 'APPROVE' },
    })
    expect(kcp.statusCode).toBe(200)
    expect(kcp.json().status).toBe('MENUNGGU_APPROVAL_L2')

    // Sekarang KC boleh memutuskan → APPROVED (level terakhir).
    const kc2 = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${id}/approval`,
      headers: { authorization: `Bearer ${token.kc}` },
      payload: { keputusan: 'APPROVE' },
    })
    expect(kc2.statusCode).toBe(200)
    expect(kc2.json().status).toBe('APPROVED')
  })

  it('AC-10: plafon 30jt hanya butuh KCP → APPROVE langsung APPROVED', async () => {
    const id = await pengajuanMenungguL1({ dibuatOleh: idPengguna.ao, plafon: 30_000_000n })
    const kcp = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${id}/approval`,
      headers: { authorization: `Bearer ${token.kcp}` },
      payload: { keputusan: 'APPROVE' },
    })
    expect(kcp.statusCode).toBe(200)
    expect(kcp.json().status).toBe('APPROVED')
  })

  it('AC-11: pembuat (kcp2) tidak dapat menyetujui pengajuannya sendiri → 403 BR-09', async () => {
    const id = await pengajuanMenungguL1({ dibuatOleh: idPengguna.kcp2, plafon: 30_000_000n })
    const res = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${id}/approval`,
      headers: { authorization: `Bearer ${token.kcp2}` },
      payload: { keputusan: 'APPROVE' },
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('AKSES_DITOLAK')
  })

  it('REJECT tanpa alasan ditolak; dengan alasan → REJECTED terminal', async () => {
    const id = await pengajuanMenungguL1({ dibuatOleh: idPengguna.ao, plafon: 30_000_000n })

    const tanpaAlasan = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${id}/approval`,
      headers: { authorization: `Bearer ${token.kcp}` },
      payload: { keputusan: 'REJECT' },
    })
    expect(tanpaAlasan.statusCode).toBe(422)

    const dengan = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${id}/approval`,
      headers: { authorization: `Bearer ${token.kcp}` },
      payload: { keputusan: 'REJECT', alasan: 'Dokumen usaha tidak meyakinkan' },
    })
    expect(dengan.statusCode).toBe(200)
    expect(dengan.json().status).toBe('REJECTED')
  })

  it('antrian approval KCP hanya memuat pengajuan pada level KCP', async () => {
    const id = await pengajuanMenungguL1({ dibuatOleh: idPengguna.ao, plafon: 120_000_000n })
    const res = await app.inject({
      method: 'GET',
      url: '/api/approval/antrian',
      headers: { authorization: `Bearer ${token.kcp}` },
    })
    expect(res.statusCode).toBe(200)
    const antrian = res.json() as { id: string; level: number }[]
    expect(antrian.some((a) => a.id === id)).toBe(true)

    // KC tidak melihatnya karena level berjalan masih 1 (KCP).
    const resKc = await app.inject({
      method: 'GET',
      url: '/api/approval/antrian',
      headers: { authorization: `Bearer ${token.kc}` },
    })
    const antrianKc = resKc.json() as { id: string }[]
    expect(antrianKc.some((a) => a.id === id)).toBe(false)
  })
})
