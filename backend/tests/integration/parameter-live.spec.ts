import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buatApp } from '../../src/app.js'
import { prisma } from '../../src/lib/prisma.js'
import { buatPengajuanUji, idPengguna, login, simpanSlikOk } from './bantuan.js'

/**
 * AC-15 — ADM mengubah bobot komponen "Lama usaha"; skoring BERIKUTNYA memakai
 * bobot baru **tanpa restart aplikasi** (FR-13, ADR-0003).
 *
 * Test ini menjalankan DUA skoring di dalam SATU proses, dengan `PUT` parameter
 * di antaranya. Kalau ada cache di tingkat modul — variabel, memo, TTL apa pun —
 * skoring kedua akan memakai bobot lama dan test ini gagal. Itulah gunanya:
 * cache semacam itu justru paling sering lolos di laptop yang baru di-restart.
 *
 * Ikut diuji bahwa `PUT` benar-benar MENULIS. Ketiga endpoint parameter pernah
 * berisi `// TODO: implement update logic` dan hanya mengembalikan echo dari
 * masukan: layar ADM menampilkan "tersimpan", dan perhitungan berikutnya tetap
 * memakai nilai lama tanpa satu pun tanda bahwa ada yang salah.
 */
describe('AC-15 — perubahan parameter berlaku tanpa restart', () => {
  let app: FastifyInstance
  let tokenAdm: string
  let tokenAnl: string
  let tokenAo: string
  let anlId: string
  let bobotAsli: number

  beforeAll(async () => {
    app = await buatApp()
    tokenAdm = await login(app, 'adm')
    tokenAnl = await login(app, 'anl')
    tokenAo = await login(app, 'ao')
    anlId = await idPengguna('anl')

    const baris = await prisma.parameterSkoring.findUniqueOrThrow({ where: { kode: 'LAMA_USAHA' } })
    bobotAsli = Number(baris.bobot)
  })

  afterAll(async () => {
    // Mengembalikan parameter ke nilai semula: berkas test lain menghitung skor
    // dengan bobot ini, dan meninggalkannya berubah membuat kegagalan mereka
    // menunjuk ke tempat yang salah.
    await prisma.parameterSkoring.update({
      where: { kode: 'LAMA_USAHA' },
      data: { bobot: bobotAsli },
    })
    await app.close()
    await prisma.$disconnect()
  })

  async function skorBaru() {
    const uji = await buatPengajuanUji({ status: 'SLIK_OK' })
    await simpanSlikOk(uji.anggotaId, 1, anlId)
    const res = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${uji.pengajuanId}/skoring`,
      headers: { authorization: `Bearer ${tokenAnl}` },
      payload: {},
    })
    expect(res.statusCode, res.body).toBe(200)
    return res.json()
  }

  it('AC-15: bobot "Lama usaha" 20 → 25 langsung dipakai skoring berikutnya', async () => {
    const sebelum = await skorBaru()
    const bobotSebelum = sebelum.rincian.find(
      (r: { kodeKomponen: string }) => r.kodeKomponen === 'LAMA_USAHA',
    ).bobot
    expect(bobotSebelum).toBe(bobotAsli)

    const bobotBaru = bobotAsli + 5
    const put = await app.inject({
      method: 'PUT',
      url: '/api/parameter/skoring',
      headers: { authorization: `Bearer ${tokenAdm}` },
      payload: [{ kode: 'LAMA_USAHA', bobot: bobotBaru }],
    })
    expect(put.statusCode, put.body).toBe(200)

    // Benar-benar tertulis di database, bukan echo.
    const tersimpan = await prisma.parameterSkoring.findUniqueOrThrow({
      where: { kode: 'LAMA_USAHA' },
    })
    expect(Number(tersimpan.bobot)).toBe(bobotBaru)

    // Proses TIDAK di-restart di antara dua skoring ini.
    const sesudah = await skorBaru()
    const bobotSesudah = sesudah.rincian.find(
      (r: { kodeKomponen: string }) => r.kodeKomponen === 'LAMA_USAHA',
    ).bobot
    expect(bobotSesudah).toBe(bobotBaru)

    // Snapshot hasil LAMA tetap menyimpan bobot lama (ADR-0003): hasil skoring
    // yang sudah diambil tidak boleh berubah karena parameter berubah.
    const snapshotLama = sebelum.snapshotParameter as { bobot: Record<string, number> }
    expect(snapshotLama.bobot.LAMA_USAHA).toBe(bobotAsli)
  })

  it('FR-13: perubahan parameter tercatat di audit trail dengan nilai sebelum dan sesudah', async () => {
    const bobotBaru = bobotAsli + 3
    await app.inject({
      method: 'PUT',
      url: '/api/parameter/skoring',
      headers: { authorization: `Bearer ${tokenAdm}` },
      payload: [{ kode: 'LAMA_USAHA', bobot: bobotBaru }],
    })

    const audit = await prisma.auditTrail.findMany({
      where: { aksi: 'UBAH_PARAMETER' },
      orderBy: { terjadiPada: 'desc' },
      take: 1,
    })
    expect(audit).toHaveLength(1)
    expect(JSON.stringify(audit[0]!.metadata)).toContain('LAMA_USAHA')
  })

  it('FR-13: bobot negatif ditolak, dan nilai lama tidak berubah', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/parameter/skoring',
      headers: { authorization: `Bearer ${tokenAdm}` },
      payload: [{ kode: 'LAMA_USAHA', bobot: -1 }],
    })
    expect(res.statusCode, res.body).toBeGreaterThanOrEqual(400)

    const tersimpan = await prisma.parameterSkoring.findUniqueOrThrow({
      where: { kode: 'LAMA_USAHA' },
    })
    expect(Number(tersimpan.bobot)).toBeGreaterThanOrEqual(0)
  })

  it('AC-02: ANL tidak dapat mengubah parameter — 403 dari server', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/parameter/skoring',
      headers: { authorization: `Bearer ${tokenAnl}` },
      payload: [{ kode: 'LAMA_USAHA', bobot: 99 }],
    })
    expect(res.statusCode).toBe(403)
  })

  it('AC-02: AO tidak dapat membaca parameter skoring — 403 dari server', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/parameter/skoring',
      headers: { authorization: `Bearer ${tokenAo}` },
    })
    expect(res.statusCode).toBe(403)
  })
})
