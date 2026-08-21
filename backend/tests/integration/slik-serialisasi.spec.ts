import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buatApp } from '../../src/app.js'
import { prisma } from '../../src/lib/prisma.js'

/**
 * FR-05 — GET /api/pengajuan/:id/slik harus BISA DISERIALISASI.
 *
 * KENAPA TEST INI ADA, dan kenapa ia terlihat sepele.
 *
 * Endpoint ini pernah mengembalikan baris Prisma apa adanya. Kolom
 * `total_baki_debet` bertipe BIGINT, dan `JSON.stringify` MELEMPAR pada nilai
 * BigInt — ia tidak mengubahnya menjadi string, melainkan menggagalkan seluruh
 * respons. Hasilnya: HTTP 500 setiap kali ada satu saja hasil SLIK tersimpan,
 * dan layar S-08 tidak pernah menampilkan apa pun.
 *
 * Seluruh test yang ada tetap hijau. Test SLIK yang sudah ada memeriksa
 * PEMANGGILAN SLIK (POST), yang mengembalikan objek biasa dari klien HTTP —
 * bukan baris database. Tidak satu pun test membaca kembali apa yang tersimpan
 * MELALUI HTTP, jadi tidak ada yang pernah memanggil serializer-nya.
 *
 * Karena itu test ini menegaskan dua hal sekaligus:
 *   1. statusnya 200, bukan 500 — inti bug-nya
 *   2. `totalBakiDebet` sampai sebagai NUMBER, bukan string atau objek —
 *      supaya frontend bisa menjumlahkannya tanpa menggabungkan teks
 *
 * Butuh database yang sudah dimigrasi dan di-seed (ada data demo SLIK).
 */
describe('FR-05 — riwayat SLIK dapat diserialisasi ke JSON', () => {
  let app: FastifyInstance
  let token: string
  const password = process.env.SEED_DEFAULT_PASSWORD ?? 'Demo1234!'

  beforeAll(async () => {
    app = await buatApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'anl', password },
    })
    expect(res.statusCode, 'login anl gagal — sudah menjalankan seed?').toBe(200)
    token = res.json().token
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  it('mengembalikan 200 dan totalBakiDebet berupa number', async () => {
    // Cari pengajuan yang BENAR-BENAR punya hasil SLIK tersimpan. Kalau
    // dicari lewat pengajuan mana pun, test bisa lolos karena daftarnya kosong
    // — dan array kosong memang selalu bisa diserialisasi.
    const hasil = await prisma.hasilSlik.findFirst({
      where: { totalBakiDebet: { not: null } },
      select: { anggota: { select: { pengajuanId: true } }, totalBakiDebet: true },
    })
    expect(
      hasil,
      'tidak ada hasil SLIK dengan baki debet di database — jalankan `npm run seed`',
    ).not.toBeNull()

    const res = await app.inject({
      method: 'GET',
      url: `/api/pengajuan/${hasil!.anggota.pengajuanId}/slik`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode, res.body).toBe(200)

    const baris = res.json()
    expect(Array.isArray(baris)).toBe(true)
    expect(baris.length).toBeGreaterThan(0)

    const denganBaki = baris.find((b: { totalBakiDebet: unknown }) => b.totalBakiDebet !== null)
    expect(denganBaki).toBeDefined()
    expect(typeof denganBaki.totalBakiDebet).toBe('number')
    expect(denganBaki.totalBakiDebet).toBe(Number(hasil!.totalBakiDebet))
  })

  it('tidak membocorkan identitas pemeriksa ke klien', async () => {
    // `diperiksaOleh` adalah id pegawai. Layar tidak memakainya, jadi ia tidak
    // perlu meninggalkan server (BR-11 soal data yang tidak perlu dikirim).
    const hasil = await prisma.hasilSlik.findFirst({
      select: { anggota: { select: { pengajuanId: true } } },
    })
    if (!hasil) return

    const res = await app.inject({
      method: 'GET',
      url: `/api/pengajuan/${hasil.anggota.pengajuanId}/slik`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    for (const baris of res.json()) {
      expect(baris).not.toHaveProperty('diperiksaOleh')
    }
  })
})
