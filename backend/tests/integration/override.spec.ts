import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buatApp } from '../../src/app.js'
import { prisma } from '../../src/lib/prisma.js'
import { buatPengajuanUji, idPengguna, login, simpanSlikOk } from './bantuan.js'

/**
 * AC-08 — ANL meng-override grade; sistem menolak bila alasan kosong; setelah
 * diisi, override tercatat di audit trail dengan identitas ANL (FR-06.1, FR-09).
 *
 * Endpoint ini sempat menjawab 200 tanpa menyimpan apa pun. Tidak ada test yang
 * membaca kembali hasilnya, jadi tidak ada yang tahu — dan layar menampilkan
 * "tersimpan". Berkas ini menutup celah itu: setiap pemeriksaan di bawah membaca
 * ULANG dari database, bukan hanya memeriksa badan respons.
 */
describe('AC-08 — override grade oleh ANL', () => {
  let app: FastifyInstance
  let tokenAnl: string
  let tokenAo: string
  let anlId: string

  beforeAll(async () => {
    app = await buatApp()
    tokenAnl = await login(app, 'anl')
    tokenAo = await login(app, 'ao')
    anlId = await idPengguna('anl')
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  const override = (pengajuanId: string, payload: Record<string, unknown>, token = tokenAnl) =>
    app.inject({
      method: 'POST',
      url: `/api/pengajuan/${pengajuanId}/skoring/override`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    })

  /** Pengajuan yang sudah punya hasil skoring nyata. */
  async function sudahDiskor(kolektibilitas = 1) {
    const uji = await buatPengajuanUji({ status: 'SLIK_OK' })
    await simpanSlikOk(uji.anggotaId, kolektibilitas, anlId)
    const res = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${uji.pengajuanId}/skoring`,
      headers: { authorization: `Bearer ${tokenAnl}` },
      payload:
        kolektibilitas === 2
          ? { catatanAnalis: 'Kolektibilitas 2, tunggakan sudah dilunasi tiga bulan lalu.' }
          : {},
    })
    if (res.statusCode !== 200) throw new Error(`fixture skoring gagal: ${res.body}`)
    return { ...uji, skoring: res.json() }
  }

  it('menolak override tanpa alasan', async () => {
    const { pengajuanId } = await sudahDiskor()

    const res = await override(pengajuanId, { gradeFinal: 3, alasan: '' })
    expect(res.statusCode, res.body).toBeGreaterThanOrEqual(400)

    const hasil = await prisma.hasilSkoring.findFirstOrThrow({
      where: { pengajuanId },
      orderBy: { dihitungPada: 'desc' },
    })
    expect(hasil.diOverride).toBe(false)
  })

  it('menolak alasan yang lebih pendek dari 10 karakter', async () => {
    const { pengajuanId } = await sudahDiskor()

    const res = await override(pengajuanId, { gradeFinal: 3, alasan: 'pendek' })
    expect(res.statusCode, res.body).toBeGreaterThanOrEqual(400)
  })

  it('AC-08: setelah alasan diisi, grade tersimpan dan tercatat di audit dengan identitas ANL', async () => {
    const { pengajuanId, skoring } = await sudahDiskor()
    const gradeBaru = Math.min(5, skoring.gradeFinal + 1)
    const alasan = 'Kondisi pasar sedang lesu; risiko usaha dinilai lebih tinggi dari skor.'

    const res = await override(pengajuanId, { gradeFinal: gradeBaru, alasan })
    expect(res.statusCode, res.body).toBe(200)
    expect(res.json().gradeFinal).toBe(gradeBaru)
    expect(res.json().diOverride).toBe(true)

    // Dibaca ULANG dari database — inti dari test ini.
    const tersimpan = await prisma.hasilSkoring.findFirstOrThrow({
      where: { pengajuanId },
      orderBy: { dihitungPada: 'desc' },
    })
    expect(tersimpan.gradeFinal).toBe(gradeBaru)
    expect(tersimpan.diOverride).toBe(true)
    expect(tersimpan.alasanOverride).toBe(alasan)
    // Grade sistem TETAP tersimpan berdampingan (FR-06.1).
    expect(tersimpan.gradeSistem).toBe(skoring.gradeSistem)

    const audit = await prisma.auditTrail.findMany({
      where: { pengajuanId, aksi: 'OVERRIDE_GRADE' },
    })
    expect(audit).toHaveLength(1)
    expect(audit[0]!.aktorId).toBe(anlId)
    expect(audit[0]!.aktorPeran).toBe('ANL')
    const metadata = audit[0]!.metadata as Record<string, unknown>
    expect(metadata.gradeSebelum).toBe(skoring.gradeFinal)
    expect(metadata.gradeSesudah).toBe(gradeBaru)
  })

  it('AC-06: override tidak boleh menembus lantai grade 3 pada kolektibilitas 2', async () => {
    const { pengajuanId } = await sudahDiskor(2)

    const res = await override(pengajuanId, {
      gradeFinal: 2,
      alasan: 'Nasabah lama dengan rekam jejak baik menurut penilaian analis.',
    })
    expect(res.statusCode, res.body).toBe(422)
    expect(res.body).toContain('AC-06')
  })

  it('AC-02: AO tidak dapat meng-override grade — 403 dari server', async () => {
    const { pengajuanId } = await sudahDiskor()

    const res = await override(
      pengajuanId,
      { gradeFinal: 4, alasan: 'Mencoba mengubah grade dari peran yang tidak berwenang.' },
      tokenAo,
    )
    expect(res.statusCode).toBe(403)
  })
})
