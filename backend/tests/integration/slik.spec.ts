import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buatApp } from '../../src/app.js'
import { prisma } from '../../src/lib/prisma.js'
import { buatPengajuanUji, lepasMockSlik, login, pasangMockSlik } from './bantuan.js'

/**
 * AC-05 — nasabah dengan SLIK kolektibilitas 4 otomatis berstatus
 * `REJECTED_SLIK` tanpa melalui approval.
 * AC-06 — kolektibilitas 2 boleh lanjut, tetapi menandai lantai grade dan
 * mewajibkan catatan analis.
 *
 * KENAPA BERKAS INI PENTING. Endpoint SLIK sebelumnya menulis id PENGAJUAN ke
 * kolom `pengajuan_anggota_id`, sehingga setiap panggilan berakhir 500 karena
 * foreign key — dan tidak satu pun test menembaknya. Tabel 4.2 juga tidak
 * pernah diterapkan: kolektibilitas 4 berjalan seolah-olah SLIK bersih.
 *
 * Layanan mock SLIK sungguhan TIDAK dipanggil di sini (lihat `bantuan.ts`);
 * kontraknya diuji terpisah di `mock-slik/tests/kontrak.spec.ts`.
 */
describe('AC-05 / AC-06 — SLIK check dan Tabel 4.2', () => {
  let app: FastifyInstance
  let tokenAnl: string
  let tokenAo: string

  beforeAll(async () => {
    app = await buatApp()
    tokenAnl = await login(app, 'anl')
    tokenAo = await login(app, 'ao')
  })

  afterEach(() => lepasMockSlik())

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  const jalankan = (pengajuanId: string, nik?: string, token = tokenAnl) =>
    app.inject({
      method: 'POST',
      url: `/api/pengajuan/${pengajuanId}/slik-check`,
      headers: { authorization: `Bearer ${token}` },
      payload: nik ? { nik } : {},
    })

  const statusPengajuan = async (id: string) =>
    (await prisma.pengajuan.findUniqueOrThrow({ where: { id } })).status

  it('AC-05: kolektibilitas 4 membuat pengajuan REJECTED_SLIK tanpa melalui approval', async () => {
    const { pengajuanId, nik } = await buatPengajuanUji()
    pasangMockSlik({ [nik]: { httpStatus: 200, kolektibilitas: 4 } })

    const res = await jalankan(pengajuanId)
    expect(res.statusCode, res.body).toBe(201)

    const body = res.json()
    expect(body.keluaran).toBe('DITOLAK_OTOMATIS')
    expect(body.statusPengajuan).toBe('REJECTED_SLIK')
    expect(await statusPengajuan(pengajuanId)).toBe('REJECTED_SLIK')

    // Tidak ada satu pun baris keputusan approval — penolakan ini terjadi
    // sebelum jenjang approval, bukan di dalamnya.
    const keputusan = await prisma.keputusanApprovalRow.count({ where: { pengajuanId } })
    expect(keputusan).toBe(0)

    // Jejaknya ada di audit trail, dengan kolektibilitas sebagai sebab.
    const audit = await prisma.auditTrail.findMany({ where: { pengajuanId } })
    expect(audit.some((a) => a.statusSesudah === 'REJECTED_SLIK')).toBe(true)
  })

  it('AC-06: kolektibilitas 2 tetap lanjut ke SLIK_OK dan menandai catatan analis wajib', async () => {
    const { pengajuanId, nik } = await buatPengajuanUji()
    pasangMockSlik({ [nik]: { httpStatus: 200, kolektibilitas: 2 } })

    const res = await jalankan(pengajuanId)
    expect(res.statusCode, res.body).toBe(201)

    const body = res.json()
    expect(body.keluaran).toBe('LANTAI_GRADE_3')
    expect(body.statusPengajuan).toBe('SLIK_OK')
    expect(body.ringkasan.catatanAnalisWajib).toBe(true)
    expect(body.ringkasan.kolektibilitasTerburuk).toBe(2)
  })

  it('kolektibilitas 1 menghasilkan SLIK_OK dengan keluaran LANJUT', async () => {
    const { pengajuanId, nik } = await buatPengajuanUji()
    pasangMockSlik({ [nik]: { httpStatus: 200, kolektibilitas: 1 } })

    const body = (await jalankan(pengajuanId)).json()
    expect(body.keluaran).toBe('LANJUT')
    expect(body.statusPengajuan).toBe('SLIK_OK')
    expect(body.ringkasan.catatanAnalisWajib).toBe(false)
  })

  it('503 dari SLIK menjadi SLIK_GAGAL, dan kolektibilitas TIDAK pernah ditebak', async () => {
    const { pengajuanId, anggotaId, nik } = await buatPengajuanUji()
    pasangMockSlik({ [nik]: { httpStatus: 503 } })

    const body = (await jalankan(pengajuanId)).json()
    expect(body.keluaran).toBe('GAGAL')
    expect(body.statusPengajuan).toBe('SLIK_GAGAL')
    expect(await statusPengajuan(pengajuanId)).toBe('SLIK_GAGAL')

    // Baris tetap ditulis — kegagalan adalah jejak, bukan sesuatu yang dibuang.
    const baris = await prisma.hasilSlik.findFirst({
      where: { pengajuanAnggotaId: anggotaId },
      orderBy: { diperiksaPada: 'desc' },
    })
    expect(baris?.statusPanggilan).toBe('UNAVAILABLE')
    expect(baris?.kolektibilitas).toBeNull()
  })

  it('404 dari SLIK menjadi SLIK_GAGAL dengan alasan NIK_TIDAK_DITEMUKAN', async () => {
    const { pengajuanId, nik } = await buatPengajuanUji()
    pasangMockSlik({ [nik]: { httpStatus: 404 } })

    const body = (await jalankan(pengajuanId)).json()
    expect(body.statusPengajuan).toBe('SLIK_GAGAL')
    expect(body.anggota[0].alasanGagal).toBe('NIK_TIDAK_DITEMUKAN')
  })

  it('SLIK dapat diulang setelah gagal, dan hasil kedua yang menentukan', async () => {
    const { pengajuanId, nik } = await buatPengajuanUji()

    pasangMockSlik({ [nik]: { httpStatus: 503 } })
    expect((await jalankan(pengajuanId)).json().statusPengajuan).toBe('SLIK_GAGAL')

    lepasMockSlik()
    pasangMockSlik({ [nik]: { httpStatus: 200, kolektibilitas: 1 } })
    expect((await jalankan(pengajuanId)).json().statusPengajuan).toBe('SLIK_OK')

    // Riwayat menyimpan KEDUA percobaan (bukti jalur error saat demo).
    const riwayat = await app.inject({
      method: 'GET',
      url: `/api/pengajuan/${pengajuanId}/slik`,
      headers: { authorization: `Bearer ${tokenAnl}` },
    })
    expect(riwayat.json()).toHaveLength(2)
  })

  it('BR-11: NIK tidak pernah muncul di audit trail maupun badan respons', async () => {
    const { pengajuanId, nik } = await buatPengajuanUji()
    pasangMockSlik({ [nik]: { httpStatus: 200, kolektibilitas: 1 } })

    const res = await jalankan(pengajuanId, nik)
    expect(res.body).not.toContain(nik)

    const audit = await prisma.auditTrail.findMany({ where: { pengajuanId } })
    // Replacer BigInt: sebagian metadata audit memuat nilai rupiah bertipe
    // BigInt, dan JSON.stringify MELEMPAR pada BigInt — bukan mengubahnya.
    const teksAudit = JSON.stringify(audit, (_k, v) =>
      typeof v === 'bigint' ? v.toString() : v,
    )
    expect(teksAudit).not.toContain(nik)
  })

  it('NIK yang bukan milik anggota pengajuan ini ditolak 422, bukan diperiksa diam-diam', async () => {
    const { pengajuanId, nik } = await buatPengajuanUji()
    const nikOrangLain = '9999999999999999'
    pasangMockSlik({ [nik]: { httpStatus: 200, kolektibilitas: 1 } })

    const res = await jalankan(pengajuanId, nikOrangLain)
    expect(res.statusCode, res.body).toBe(422)
    expect(res.body).not.toContain(nikOrangLain)
  })

  it('SLIK check hanya boleh dijalankan setelah tahap verifikasi dokumen', async () => {
    const { pengajuanId, nik } = await buatPengajuanUji({ status: 'DRAFT' })
    pasangMockSlik({ [nik]: { httpStatus: 200, kolektibilitas: 1 } })

    const res = await jalankan(pengajuanId)
    expect(res.statusCode, res.body).toBe(422)
    expect(await statusPengajuan(pengajuanId)).toBe('DRAFT')
  })

  it('AC-02: AO tidak dapat menjalankan SLIK check — 403 dari server', async () => {
    const { pengajuanId, nik } = await buatPengajuanUji()
    pasangMockSlik({ [nik]: { httpStatus: 200, kolektibilitas: 1 } })

    const res = await jalankan(pengajuanId, undefined, tokenAo)
    expect(res.statusCode).toBe(403)
  })
})
