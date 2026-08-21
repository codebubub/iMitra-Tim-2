import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buatApp } from '../../src/app.js'
import { prisma } from '../../src/lib/prisma.js'
import { buatPengajuanUji, idPengguna, login, simpanSlikOk } from './bantuan.js'

/**
 * AC-07 — skoring menampilkan rincian keempat komponen beserta bobot dan skor
 * komponennya, dan rincian itu TERSIMPAN (BR-08).
 * AC-06 — kolektibilitas 2 tidak pernah menghasilkan grade lebih baik dari 3.
 * AC-04 / BR-03 — prasyarat yang kurang ditolak 422 dengan menyebut BR-03.
 * BR-04 — hasil SLIK kedaluwarsa ditolak, dan pesannya menyebut BR-04.
 *
 * Sebelumnya jalur ini menghitung dengan `kolektibilitas: 1` yang dipaku dan
 * prasyarat yang diisi sendiri dengan `true`. Semua aturan di bawah ini "lolos"
 * bukan karena benar, melainkan karena tidak pernah dievaluasi.
 */
describe('AC-06 / AC-07 — skoring kelayakan', () => {
  let app: FastifyInstance
  let tokenAnl: string
  let anlId: string

  beforeAll(async () => {
    app = await buatApp()
    tokenAnl = await login(app, 'anl')
    anlId = await idPengguna('anl')
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  const skor = (pengajuanId: string, payload: Record<string, unknown> = {}) =>
    app.inject({
      method: 'POST',
      url: `/api/pengajuan/${pengajuanId}/skoring`,
      headers: { authorization: `Bearer ${tokenAnl}` },
      payload,
    })

  /** Pengajuan siap skor: dokumen VERIFIED, survei VALID, SLIK OK tersimpan. */
  async function siapSkor(kolektibilitas = 1, tanggalData = new Date()) {
    const uji = await buatPengajuanUji({ status: 'SLIK_OK' })
    await simpanSlikOk(uji.anggotaId, kolektibilitas, anlId, tanggalData)
    return uji
  }

  it('AC-07: empat rincian komponen tersimpan dan terbaca kembali sebagai angka', async () => {
    const { pengajuanId } = await siapSkor(1)

    const res = await skor(pengajuanId)
    expect(res.statusCode, res.body).toBe(200)
    const hasil = res.json()

    expect(hasil.rincian).toHaveLength(4)
    expect(hasil.rincian.map((r: { kodeKomponen: string }) => r.kodeKomponen).sort()).toEqual([
      'HASIL_SURVEI',
      'KAPASITAS_BAYAR',
      'LAMA_USAHA',
      'RIWAYAT_SLIK',
    ])

    // BR-08 — benar-benar tersimpan, bukan hanya dikembalikan sekali.
    const tersimpan = await prisma.rincianKomponenSkor.count({
      where: { hasilSkoringId: hasil.id },
    })
    expect(tersimpan).toBe(4)

    // Bobot dan kontribusi harus sampai sebagai NUMBER. Decimal Prisma menjadi
    // string di JSON, dan "35" + "25" akan digabung sebagai teks di layar.
    const baca = await app.inject({
      method: 'GET',
      url: `/api/pengajuan/${pengajuanId}/skoring`,
      headers: { authorization: `Bearer ${tokenAnl}` },
    })
    const dibaca = baca.json()
    for (const r of dibaca.rincian) {
      expect(typeof r.bobot).toBe('number')
      expect(typeof r.kontribusi).toBe('number')
    }

    // Snapshot parameter ikut tersimpan (ADR-0003).
    expect(dibaca.snapshotParameter).toBeTruthy()
    expect(dibaca.snapshotParameter.bobot).toBeTruthy()

    // Status berpindah SLIK_OK -> SKORED, dengan jejak audit.
    const pengajuan = await prisma.pengajuan.findUniqueOrThrow({ where: { id: pengajuanId } })
    expect(pengajuan.status).toBe('SKORED')
  })

  it('AC-06: kolektibilitas 2 tidak pernah menghasilkan grade lebih baik dari 3', async () => {
    const { pengajuanId } = await siapSkor(2)

    const res = await skor(pengajuanId, {
      catatanAnalis: 'Nasabah kolektibilitas 2; angsuran tertunggak 45 hari, sudah dilunasi.',
    })
    expect(res.statusCode, res.body).toBe(200)
    const hasil = res.json()

    expect(hasil.gradeFinal).toBeGreaterThanOrEqual(3)
    // Grade sistem tetap tersimpan berdampingan supaya lantai itu terlihat.
    expect(hasil.gradeSistem).toBeLessThanOrEqual(hasil.gradeFinal)
  })

  it('kolektibilitas 2 tanpa catatan analis ditolak 422 (FR-05, Tabel 4.2)', async () => {
    const { pengajuanId } = await siapSkor(2)

    const res = await skor(pengajuanId)
    expect(res.statusCode, res.body).toBe(422)
    expect(res.body).toContain('Catatan analis')

    // Tidak ada hasil setengah jadi yang tersimpan.
    expect(await prisma.hasilSkoring.count({ where: { pengajuanId } })).toBe(0)
  })

  it('AC-04 / BR-03: dokumen wajib belum VERIFIED ditolak 422 dan pesannya menyebut BR-03', async () => {
    const uji = await buatPengajuanUji({ status: 'SLIK_OK', dokumenVerified: false })
    await simpanSlikOk(uji.anggotaId, 1, anlId)

    const res = await skor(uji.pengajuanId)
    expect(res.statusCode, res.body).toBe(422)
    expect(res.body).toContain('BR-03')
    expect(res.body).toContain('VERIFIED')
  })

  it('AC-04 / BR-03: tanpa survei VALID ditolak 422 dengan menyebut BR-03', async () => {
    const uji = await buatPengajuanUji({ status: 'SLIK_OK', surveiValid: false })
    await simpanSlikOk(uji.anggotaId, 1, anlId)

    const res = await skor(uji.pengajuanId)
    expect(res.statusCode, res.body).toBe(422)
    expect(res.body).toContain('BR-03')
  })

  it('BR-03: SLIK belum dijalankan ditolak, walau status pengajuan dipaksa SLIK_OK', async () => {
    const uji = await buatPengajuanUji({ status: 'SLIK_OK' })
    // Sengaja TIDAK menyimpan hasil SLIK.
    const res = await skor(uji.pengajuanId)
    expect(res.statusCode, res.body).toBe(422)
    expect(res.body).toContain('BR-03')
  })

  it('BR-04: hasil SLIK lebih tua dari masa berlaku ditolak dengan menyebut BR-04', async () => {
    const masaBerlaku = await prisma.parameterSkoring.findUniqueOrThrow({
      where: { kode: 'SLIK_MASA_BERLAKU_HARI' },
    })
    const hari = Number(masaBerlaku.nilai)
    const kedaluwarsa = new Date(Date.now() - (hari + 5) * 24 * 60 * 60 * 1000)

    const { pengajuanId } = await siapSkor(1, kedaluwarsa)

    const res = await skor(pengajuanId)
    expect(res.statusCode, res.body).toBe(422)
    expect(res.body).toContain('BR-04')
    expect(res.body).toContain('kedaluwarsa')
  })

  it('skoring ditolak selama pengajuan belum melewati SLIK', async () => {
    const uji = await buatPengajuanUji({ status: 'VERIFIKASI_DOKUMEN' })
    await simpanSlikOk(uji.anggotaId, 1, anlId)

    const res = await skor(uji.pengajuanId)
    expect(res.statusCode, res.body).toBe(422)
  })
})
