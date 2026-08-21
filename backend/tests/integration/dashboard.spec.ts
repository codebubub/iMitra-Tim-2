import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buatApp } from '../../src/app.js'
import { prisma } from '../../src/lib/prisma.js'
import { buatPengajuanUji, idPengguna, login } from './bantuan.js'

/**
 * FR-12 — Dashboard pipeline: daftar dan jumlah per tahap DIBATASI PERAN di
 * server, bukan disaring frontend.
 *
 * Kriteria verifikasi yang ditulis tim sendiri di SRS FR-12 berbunyi: "KC yang
 * membuka dashboard tidak melihat satu pun pengajuan yang masih menunggu KCP".
 * Sebelumnya kriteria itu gagal — hanya AO yang difilter, sementara approver
 * menerima seluruh isi tabel pengajuan, termasuk yang masih di meja level
 * bawahnya. Endpoint `/api/dashboard/pipeline` sendiri belum pernah ada.
 *
 * Semua pemeriksaan di bawah menembak pengajuan yang DIBUAT OLEH test ini,
 * bukan jumlah global — supaya hasilnya tidak bergantung pada isi database.
 */
describe('FR-12 — cakupan dashboard per peran', () => {
  let app: FastifyInstance
  const token: Record<string, string> = {}
  let aoId: string
  let aoLainId: string

  /** 120 juta: butuh KCP lalu KC (Tabel 4.1), jadi levelnya jelas berbeda. */
  const PLAFON_DUA_LEVEL = 120_000_000n

  beforeAll(async () => {
    app = await buatApp()
    for (const u of ['ao', 'anl', 'kcp', 'kc', 'kom', 'adm']) token[u] = await login(app, u)
    aoId = await idPengguna('ao')
    aoLainId = await idPengguna('kcp2')
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  const daftar = async (peran: string): Promise<{ id: string; status: string }[]> => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/pengajuan',
      headers: { authorization: `Bearer ${token[peran]}` },
    })
    expect(res.statusCode, res.body).toBe(200)
    return res.json()
  }

  const pipeline = async (peran: string) => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/dashboard/pipeline',
      headers: { authorization: `Bearer ${token[peran]}` },
    })
    expect(res.statusCode, res.body).toBe(200)
    return res.json()
  }

  it('FR-12: KC tidak melihat pengajuan yang masih menunggu KCP; KCP melihatnya', async () => {
    const { pengajuanId } = await buatPengajuanUji({
      status: 'MENUNGGU_APPROVAL_L1',
      plafon: PLAFON_DUA_LEVEL,
    })

    const punyaKcp = (await daftar('kcp')).some((p) => p.id === pengajuanId)
    const punyaKc = (await daftar('kc')).some((p) => p.id === pengajuanId)

    expect(punyaKcp, 'KCP harus melihat antriannya sendiri').toBe(true)
    expect(punyaKc, 'KC tidak boleh melihat pengajuan yang masih menunggu KCP').toBe(false)
  })

  it('setelah naik ke level 2, KC melihatnya dan KCP tidak lagi melihatnya di antrian', async () => {
    const { pengajuanId } = await buatPengajuanUji({
      status: 'MENUNGGU_APPROVAL_L2',
      plafon: PLAFON_DUA_LEVEL,
    })

    expect((await daftar('kc')).some((p) => p.id === pengajuanId)).toBe(true)
    // KCP belum pernah memutuskan pengajuan uji ini, jadi ia tidak melihatnya.
    expect((await daftar('kcp')).some((p) => p.id === pengajuanId)).toBe(false)
  })

  it('approver tetap melihat pengajuan yang PERNAH ia putuskan', async () => {
    const kcpId = await idPengguna('kcp')
    const { pengajuanId } = await buatPengajuanUji({
      status: 'MENUNGGU_APPROVAL_L2',
      plafon: PLAFON_DUA_LEVEL,
    })
    await prisma.keputusanApprovalRow.create({
      data: {
        pengajuanId,
        level: 1,
        peranWajib: 'KCP',
        keputusan: 'APPROVE',
        diputuskanOleh: kcpId,
      },
    })

    expect((await daftar('kcp')).some((p) => p.id === pengajuanId)).toBe(true)
  })

  it('AO hanya melihat pengajuan miliknya sendiri', async () => {
    const milikSaya = await buatPengajuanUji({ status: 'SUBMITTED', dibuatOleh: aoId })
    const milikOrangLain = await buatPengajuanUji({ status: 'SUBMITTED', dibuatOleh: aoLainId })

    const daftarAo = await daftar('ao')
    expect(daftarAo.some((p) => p.id === milikSaya.pengajuanId)).toBe(true)
    expect(daftarAo.some((p) => p.id === milikOrangLain.pengajuanId)).toBe(false)
  })

  it('ANL melihat pengajuan di tahap kerjanya, tetapi tidak yang sedang di meja approval', async () => {
    const diMejaAnl = await buatPengajuanUji({ status: 'VERIFIKASI_DOKUMEN' })
    const diMejaApprover = await buatPengajuanUji({
      status: 'MENUNGGU_APPROVAL_L1',
      plafon: PLAFON_DUA_LEVEL,
    })

    const daftarAnl = await daftar('anl')
    expect(daftarAnl.some((p) => p.id === diMejaAnl.pengajuanId)).toBe(true)
    expect(daftarAnl.some((p) => p.id === diMejaApprover.pengajuanId)).toBe(false)
  })

  it('pipeline memakai cakupan yang SAMA dengan daftar', async () => {
    for (const peran of ['ao', 'anl', 'kcp', 'kc']) {
      const baris = await daftar(peran)
      const ringkas = await pipeline(peran)

      // Daftar dipaginasi (SDD BAB 5 menyebut `page`), pipeline menghitung
      // SELURUH cakupan peran itu — jadi total tidak pernah lebih kecil dari
      // satu halaman, dan setiap baris yang terlihat harus ikut terhitung.
      expect(ringkas.total, `total pipeline ${peran}`).toBeGreaterThanOrEqual(baris.length)

      const jumlahTahap = ringkas.tahap.reduce(
        (n: number, t: { jumlah: number }) => n + t.jumlah,
        0,
      )
      expect(jumlahTahap, `jumlah seluruh tahap ${peran}`).toBe(ringkas.total)

      // Setiap status yang muncul di halaman pertama harus punya penghitungnya.
      for (const p of baris) {
        expect(ringkas.perStatus[p.status], `status ${p.status} pada ${peran}`).toBeGreaterThan(0)
      }
    }
  })

  it('paginasi: halaman kedua berisi baris yang berbeda dari halaman pertama', async () => {
    const ambil = async (page: number) => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/pengajuan?page=${page}`,
        headers: { authorization: `Bearer ${token.adm}` },
      })
      expect(res.statusCode, res.body).toBe(200)
      return (res.json() as { id: string }[]).map((p) => p.id)
    }

    const satu = await ambil(1)
    const dua = await ambil(2)
    expect(satu.some((id) => dua.includes(id))).toBe(false)
  })

  it('pencarian q menyaring berdasarkan nomor referensi', async () => {
    const { pengajuanId } = await buatPengajuanUji({ status: 'SUBMITTED', dibuatOleh: aoId })
    const nomor = (
      await prisma.pengajuan.findUniqueOrThrow({ where: { id: pengajuanId } })
    ).nomorReferensi

    const res = await app.inject({
      method: 'GET',
      url: `/api/pengajuan?q=${encodeURIComponent(nomor)}`,
      headers: { authorization: `Bearer ${token.ao}` },
    })
    expect(res.statusCode, res.body).toBe(200)
    const hasil = res.json() as { id: string }[]
    expect(hasil).toHaveLength(1)
    expect(hasil[0]!.id).toBe(pengajuanId)
  })

  it('pipeline mengembalikan tahap yang sama untuk setiap peran, hanya angkanya berbeda', async () => {
    const ao = await pipeline('ao')
    const adm = await pipeline('adm')

    expect(ao.tahap.map((t: { kode: string }) => t.kode)).toEqual(
      adm.tahap.map((t: { kode: string }) => t.kode),
    )
    // ADM mengawasi seluruh sistem, jadi jumlahnya tidak pernah lebih kecil.
    expect(adm.total).toBeGreaterThanOrEqual(ao.total)
  })

  it('pipeline menolak permintaan tanpa token (fail-closed)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/dashboard/pipeline' })
    expect(res.statusCode).toBe(401)
  })
})
