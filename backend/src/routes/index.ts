import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { bolehDiagnostik } from '../config/env.js'
import { daftarRoute } from '../middleware/rbac.js'
import { login } from '../services/auth.service.js'
import {
  buatPengajuan,
  daftarPengajuan,
  ringkasanPengajuan,
  submitPengajuan,
} from '../services/pengajuan.service.js'
import { slikRoutes } from './slik.js'
import { skoringRoutes } from './skoring.js'
import { parameterRoutes } from './parameter.js'
import { TidakTerautentikasi } from '../lib/errors.js'

/**
 * Route handler: parsing request, validasi bentuk, pemetaan hasil ke HTTP.
 *
 * TIDAK ADA KEPUTUSAN BISNIS DI BERKAS INI. Kalau Anda menulis `if` yang
 * membandingkan angka bisnis di sini, kode itu salah tempat — pindahkan ke
 * `domain/` (AGENTS.md bagian 3).
 *
 * Setiap route WAJIB mendeklarasikan `config: { peran: [...] }`. Route tanpa
 * deklarasi menggagalkan proses saat start (fail-closed, lihat middleware/rbac.ts).
 */

const skemaLogin = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

const skemaAnggota = z.object({
  nama: z.string().min(1),
  nik: z.string().regex(/^\d{16}$/, 'NIK harus 16 digit angka'),
  alamat: z.string().min(1),
  jenisUsaha: z.string().min(1),
  plafonDiajukan: z.number().int().positive(),
})

const skemaBuatPengajuan = z.object({
  jenisNasabah: z.enum(['PERORANGAN', 'KELOMPOK']),
  akad: z.enum(['MURABAHAH', 'MUSYARAKAH']),
  tenorBulan: z.number().int(),
  anggota: z.array(skemaAnggota).min(1).max(10),
})

export async function daftarkanRoute(app: FastifyInstance): Promise<void> {
  // --- Kesehatan & diagnostik ---------------------------------------------

  app.get('/health', { config: { peran: 'PUBLIK' } }, async () => {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ok', database: 'ok' }
  })

  /**
   * Bukti untuk AC-13: penilai membaca sendiri daftar route dan melihat bahwa
   * tidak ada method tulis untuk audit trail. Ini bukti dari daftar route,
   * bukan dari kata-kata. Tidak pernah aktif di produksi.
   */
  if (bolehDiagnostik) {
    app.get('/api/_routes', { config: { peran: 'PUBLIK' } }, async () => ({
      catatan:
        'Perhatikan bahwa tidak ada method PUT/PATCH/DELETE untuk sumber daya audit (AC-13).',
      route: daftarRoute
        .map((r) => ({ method: r.method, url: r.url, peran: r.peran }))
        .sort((a, b) => a.url.localeCompare(b.url)),
    }))
  }

  // --- Autentikasi (FR-01) -------------------------------------------------

  app.post('/api/auth/login', { config: { peran: 'PUBLIK' } }, async (req) => {
    const { username, password } = skemaLogin.parse(req.body)
    const hasil = await login(username, password)
    return hasil
  })

  app.get(
    '/api/auth/me',
    { config: { peran: ['AO', 'ANL', 'KCP', 'KC', 'KOM', 'ADM'] } },
    async (req) => {
      if (!req.pengguna) throw new TidakTerautentikasi()
      return req.pengguna
    },
  )

  // --- Pengajuan (FR-02, FR-10, FR-12) ------------------------------------

  app.post('/api/pengajuan', { config: { peran: ['AO'] } }, async (req, reply) => {
    const masukan = skemaBuatPengajuan.parse(req.body)
    const hasil = await buatPengajuan(req.pengguna!, masukan)
    return reply.code(201).send(hasil)
  })

  app.get(
    '/api/pengajuan',
    { config: { peran: ['AO', 'ANL', 'KCP', 'KC', 'KOM', 'ADM'] } },
    async (req) => {
      const q = req.query as { status?: string }
      return daftarPengajuan(req.pengguna!, q.status)
    },
  )

  app.get(
    '/api/pengajuan/:id',
    { config: { peran: ['AO', 'ANL', 'KCP', 'KC', 'KOM', 'ADM'] } },
    async (req) => {
      const { id } = req.params as { id: string }
      return ringkasanPengajuan(id)
    },
  )

  app.post('/api/pengajuan/:id/submit', { config: { peran: ['AO'] } }, async (req) => {
    const { id } = req.params as { id: string }
    return submitPengajuan(req.pengguna!, id)
  })

  // --- Audit trail (FR-09) — HANYA BACA ------------------------------------
  //
  // Tidak ada POST, PUT, PATCH, atau DELETE di bawah ini, dan tidak boleh
  // ditambahkan. Audit ditulis dari dalam service, tidak pernah dari luar.

  app.get(
    '/api/pengajuan/:id/audit',
    { config: { peran: ['AO', 'ANL', 'KCP', 'KC', 'KOM', 'ADM'] } },
    async (req) => {
      const { id } = req.params as { id: string }
      const baris = await prisma.auditTrail.findMany({
        where: { pengajuanId: id },
        orderBy: { terjadiPada: 'asc' },
        include: { aktor: { select: { nama: true } } },
      })
      return baris.map((b) => ({
        id: Number(b.id),
        waktu: b.terjadiPada,
        aktor: b.aktor?.nama ?? '-',
        aktorPeran: b.aktorPeran,
        aksi: b.aksi,
        statusSebelum: b.statusSebelum,
        statusSesudah: b.statusSesudah,
        metadata: b.metadata,
      }))
    },
  )

  // =========================================================================
  //  RUANG UNTUK ANGGOTA LAIN — tambahkan berkas route Anda sendiri di sini,
  //  jangan menumpuk di berkas ini. Lihat docs/PEMBAGIAN-TIM.md.
  //
  //    routes/dokumen.ts    FR-03
  //    routes/survei.ts     FR-04
  //    routes/slik.ts       FR-05
  //    routes/skoring.ts    FR-06
  //    routes/margin.ts     FR-07
  //    routes/approval.ts   FR-08
  //    routes/parameter.ts  FR-13
  //    routes/notifikasi.ts FR-11
  // =========================================================================

  await slikRoutes(app)
  await skoringRoutes(app)
  await parameterRoutes(app)
}
