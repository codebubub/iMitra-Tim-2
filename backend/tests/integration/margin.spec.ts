import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buatApp } from '../../src/app.js'
import { prisma } from '../../src/lib/prisma.js'
import { buatPengajuanUji, idPengguna, login, simpanSlikOk } from './bantuan.js'

/**
 * AC-09 — margin 10,0 % untuk grade 1 (di bawah batas 11,0 %) DIBLOKIR sistem.
 *
 * Berkas ini menembak `POST /api/pengajuan/{id}/margin`, endpoint yang ada di
 * kontrak SDD BAB 5 tetapi tidak pernah terdaftar: seluruh logikanya sudah ada
 * di `domain/margin.ts` beserta unit test-nya, namun tidak ada route yang
 * memanggilnya, sehingga BR-06 tidak pernah ditegakkan pada satu pun permintaan
 * nyata.
 *
 * Bagian kedua AC-09 diuji juga: baris `rentang_margin` DIUBAH lebih dulu, lalu
 * dipastikan hasilnya ikut berubah tanpa restart (ADR-0003 — parameter dibaca
 * setiap pemanggilan, tidak pernah di-cache).
 *
 * Nilai batas TIDAK ditulis di sini; ia dibaca dari database. Menyalin 11,0 ke
 * dalam test berarti test tetap hijau setelah ADM mengubah parameternya.
 */
describe('AC-09 — margin / nisbah terhadap rentang grade', () => {
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

  /*
   * `async` + `payload: object`, bukan Record<string, unknown>.
   *
   * Tanpa keduanya, tsc menyimpulkan tipe kembalian sebagai
   * `void & Promise<Response> & Chain` — bentuk rantai milik light-my-request —
   * sehingga `res.statusCode` dan `res.json()` tidak dikenali. Test-nya tetap
   * LULUS saat dijalankan, karena vitest tidak memeriksa tipe; yang gagal hanya
   * `tsc --noEmit`, yaitu job lint di CI. Kegagalan seperti ini tidak terlihat
   * sama sekali dari hasil test.
   */
  const tetapkan = async (pengajuanId: string, payload: object, token = tokenAnl) =>
    app.inject({
      method: 'POST',
      url: `/api/pengajuan/${pengajuanId}/margin`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    })

  /**
   * Pengajuan berstatus SKORED dengan grade final yang DIPASTIKAN, supaya
   * rentang yang diuji tidak bergantung pada hasil perhitungan skor.
   */
  async function siapMargin(grade = 1, akad: 'MURABAHAH' | 'MUSYARAKAH' = 'MURABAHAH') {
    const uji = await buatPengajuanUji({ status: 'SLIK_OK', akad })
    await simpanSlikOk(uji.anggotaId, 1, anlId)

    const skor = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${uji.pengajuanId}/skoring`,
      headers: { authorization: `Bearer ${tokenAnl}` },
      payload: {},
    })
    if (skor.statusCode !== 200) throw new Error(`fixture skoring gagal: ${skor.body}`)

    await prisma.hasilSkoring.updateMany({
      where: { pengajuanId: uji.pengajuanId },
      data: { gradeFinal: grade },
    })
    return uji
  }

  async function rentangGrade(grade: number) {
    const baris = await prisma.rentangMargin.findFirstOrThrow({ where: { grade } })
    return { min: Number(baris.marginMin), maks: Number(baris.marginMaks) }
  }

  it('AC-09: margin di bawah batas bawah grade 1 diblokir 422 dengan menyebut BR-06', async () => {
    const { pengajuanId } = await siapMargin(1)
    const { min } = await rentangGrade(1)

    const res = await tetapkan(pengajuanId, { marginPersen: min - 1 })
    expect(res.statusCode, res.body).toBe(422)
    expect(res.json().rule).toBe('BR-06')
    // Pesannya menyebut batas yang berlaku, supaya ANL tahu angka yang sah.
    expect(res.body).toContain(min.toFixed(2).replace('.', ','))

    // Tidak ada yang tersimpan — diblokir, bukan diperingatkan.
    const pengajuan = await prisma.pengajuan.findUniqueOrThrow({ where: { id: pengajuanId } })
    expect(pengajuan.marginPersen).toBeNull()
  })

  it('margin di atas batas atas juga diblokir', async () => {
    const { pengajuanId } = await siapMargin(1)
    const { maks } = await rentangGrade(1)

    const res = await tetapkan(pengajuanId, { marginPersen: maks + 0.1 })
    expect(res.statusCode, res.body).toBe(422)
    expect(res.json().rule).toBe('BR-06')
  })

  it('margin tepat di batas diterima dan tersimpan', async () => {
    const { pengajuanId } = await siapMargin(1)
    const { min } = await rentangGrade(1)

    const res = await tetapkan(pengajuanId, { marginPersen: min })
    expect(res.statusCode, res.body).toBe(200)
    expect(res.json().marginPersen).toBe(min)
    expect(res.json().rentang.min).toBe(min)

    const pengajuan = await prisma.pengajuan.findUniqueOrThrow({ where: { id: pengajuanId } })
    expect(Number(pengajuan.marginPersen)).toBe(min)

    // FR-09 — penetapan margin berjejak.
    const audit = await prisma.auditTrail.findMany({ where: { pengajuanId, aksi: 'SET_MARGIN' } })
    expect(audit).toHaveLength(1)
    expect(audit[0]!.aktorId).toBe(anlId)
  })

  it('AC-09 bagian dua: mengubah baris rentang_margin langsung mengubah hasilnya, tanpa restart', async () => {
    const { pengajuanId } = await siapMargin(1)
    const asli = await prisma.rentangMargin.findFirstOrThrow({ where: { grade: 1 } })
    const minAsli = Number(asli.marginMin)

    // Nilai ini SAH menurut parameter awal.
    const pertama = await tetapkan(pengajuanId, { marginPersen: minAsli })
    expect(pertama.statusCode, pertama.body).toBe(200)

    try {
      // ADM menaikkan batas bawah grade 1.
      await prisma.rentangMargin.update({
        where: { id: asli.id },
        data: { marginMin: minAsli + 1 },
      })

      const kedua = await tetapkan(pengajuanId, { marginPersen: minAsli })
      expect(kedua.statusCode, kedua.body).toBe(422)
      expect(kedua.json().rule).toBe('BR-06')
    } finally {
      await prisma.rentangMargin.update({
        where: { id: asli.id },
        data: { marginMin: asli.marginMin },
      })
    }
  })

  it('GET margin mengembalikan nilai tersimpan beserta rentang yang berlaku', async () => {
    const { pengajuanId } = await siapMargin(1)
    const { min } = await rentangGrade(1)
    await tetapkan(pengajuanId, { marginPersen: min })

    const res = await app.inject({
      method: 'GET',
      url: `/api/pengajuan/${pengajuanId}/margin`,
      headers: { authorization: `Bearer ${tokenAnl}` },
    })
    expect(res.statusCode, res.body).toBe(200)
    const body = res.json()
    expect(body.akad).toBe('MURABAHAH')
    expect(body.grade).toBe(1)
    expect(body.marginPersen).toBe(min)
    expect(body.rentang.dibiayai).toBe(true)
    expect(typeof body.rentang.maks).toBe('number')
  })

  it('BR-05: grade yang tidak dibiayai tidak punya rentang dan margin ditolak', async () => {
    const gradeTakDibiayai = await prisma.rentangMargin.findFirst({ where: { dibiayai: false } })
    expect(gradeTakDibiayai, 'seed harus punya minimal satu grade tidak dibiayai').not.toBeNull()

    const { pengajuanId } = await siapMargin(gradeTakDibiayai!.grade)

    const baca = await app.inject({
      method: 'GET',
      url: `/api/pengajuan/${pengajuanId}/margin`,
      headers: { authorization: `Bearer ${tokenAnl}` },
    })
    expect(baca.json().rentang.dibiayai).toBe(false)
    expect(baca.json().rentang.min).toBeNull()

    const res = await tetapkan(pengajuanId, { marginPersen: 12 })
    expect(res.statusCode, res.body).toBe(422)
    expect(res.json().rule).toBe('BR-05')
  })

  it('akad diambil dari pengajuan, bukan dari klien: musyarakah memakai rentang nisbah', async () => {
    const { pengajuanId } = await siapMargin(1, 'MUSYARAKAH')
    const baris = await prisma.rentangMargin.findFirstOrThrow({ where: { grade: 1 } })

    // Mengirim marginPersen pada pengajuan musyarakah tidak menetapkan apa pun.
    const salahField = await tetapkan(pengajuanId, { marginPersen: Number(baris.marginMin) })
    expect(salahField.statusCode, salahField.body).toBe(422)

    const benar = await tetapkan(pengajuanId, { nisbahBankPersen: Number(baris.nisbahMin) })
    expect(benar.statusCode, benar.body).toBe(200)
    expect(benar.json().nisbahBankPersen).toBe(Number(baris.nisbahMin))
    expect(benar.json().marginPersen).toBeNull()
  })

  it('AC-02: AO tidak dapat menetapkan margin — 403 dari server', async () => {
    const { pengajuanId } = await siapMargin(1)
    const res = await tetapkan(pengajuanId, { marginPersen: 12 }, tokenAo)
    expect(res.statusCode).toBe(403)
  })

  it('BR-06: pengajuan tidak dapat naik ke approval sebelum margin ditetapkan', async () => {
    const { pengajuanId } = await siapMargin(1)

    const tanpaMargin = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${pengajuanId}/ajukan-approval`,
      headers: { authorization: `Bearer ${tokenAnl}` },
    })
    expect(tanpaMargin.statusCode, tanpaMargin.body).toBe(422)
    expect(tanpaMargin.json().rule).toBe('BR-06')

    const { min } = await rentangGrade(1)
    await tetapkan(pengajuanId, { marginPersen: min })

    const setelahMargin = await app.inject({
      method: 'POST',
      url: `/api/pengajuan/${pengajuanId}/ajukan-approval`,
      headers: { authorization: `Bearer ${tokenAnl}` },
    })
    expect(setelahMargin.statusCode, setelahMargin.body).toBe(200)
    expect(setelahMargin.json().status).toBe('MENUNGGU_APPROVAL_L1')
  })
})
