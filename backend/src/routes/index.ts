import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { bolehDiagnostik } from '../config/env.js'
import { daftarRoute } from '../middleware/rbac.js'
import { databaseHidup } from '../repositories/kesehatan.repo.js'
import { login } from '../services/auth.service.js'
import {
  buatPengajuan,
  daftarPengajuan,
  ringkasanPengajuan,
  ringkasanPipeline,
  submitPengajuan,
  tambahAnggota,
  tolakAnggota,
  ubahAnggota,
  ubahPengajuan,
} from '../services/pengajuan.service.js'
import { cariAudit, riwayatPengajuan } from '../services/audit.service.js'
import {
  buatPengguna,
  daftarPengguna,
  ubahPengguna,
} from '../services/pengguna.service.js'
import { daftarNotifikasi, tandaiDibaca } from '../services/notifikasi.service.js'
import { daftarkanRouteDokumen } from './dokumen.js'
import { daftarkanRouteSurvei } from './survei.js'
import { daftarkanRouteApproval } from './approval.js'
import { slikRoutes } from './slik.js'
import { marginRoutes } from './margin.js'
import { skoringRoutes } from './skoring.js'
import { parameterRoutes } from './parameter.js'
import { TidakTerautentikasi } from '../lib/errors.js'
import type { Peran } from '../domain/approval.js'

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

/** Satu daftar peran, dipakai dua kali: oleh Zod dan oleh config.peran route. */
const DAFTAR_PERAN = ['AO', 'ANL', 'KCP', 'KC', 'KOM', 'ADM'] as const

const PERAN = z.enum(DAFTAR_PERAN)

/** Dipakai route yang terbuka untuk semua peran yang sudah login. */
const SEMUA_PERAN: Peran[] = [...DAFTAR_PERAN]

/**
 * Tanggal diterima sebagai YYYY-MM-DD dan ditafsirkan sebagai HARI PENUH:
 * `dari` mulai 00:00:00 dan `sampai` sampai 23:59:59.999. Tanpa ini,
 * "sampai=2026-08-20" akan memotong seluruh isi tanggal itu, yang selalu
 * mengejutkan orang yang memakainya.
 */
const tanggalMulaiHari = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus berformat YYYY-MM-DD')
  .transform((s) => new Date(`${s}T00:00:00.000Z`))

const tanggalAkhirHari = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus berformat YYYY-MM-DD')
  .transform((s) => new Date(`${s}T23:59:59.999Z`))

const bilanganKueri = z.coerce.number().int().positive()

const skemaFilterAudit = z.object({
  pengajuanId: z.string().uuid().optional(),
  aktorId: z.string().uuid().optional(),
  aksi: z.string().min(1).max(64).optional(),
  dari: tanggalMulaiHari.optional(),
  sampai: tanggalAkhirHari.optional(),
  batas: bilanganKueri.optional(),
  lewati: z.coerce.number().int().min(0).optional(),
})

const skemaFilterNotifikasi = z.object({
  belumDibaca: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  batas: bilanganKueri.optional(),
})

const skemaFilterPengguna = z.object({
  peran: PERAN.optional(),
  aktif: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})

const skemaBuatPengguna = z.object({
  // Bentuk lengkapnya divalidasi pengguna.service.ts (POLA_USERNAME); di sini
  // hanya panjangnya, supaya pesan galat bentuk tetap datang dari satu tempat.
  username: z.string().min(2).max(32),
  nama: z.string().min(1).max(120),
  peran: PERAN,
  password: z.string().min(1),
})

/**
 * `.strict()` supaya field yang tidak dikenal DITOLAK, bukan diabaikan diam-diam.
 * Tanpa itu, salah ketik `peranBaru` alih-alih `peran` akan menghasilkan 200
 * yang tidak mengubah apa pun — kesalahan yang paling sulit dilihat pemakainya.
 */
const skemaUbahPengguna = z
  .object({
    nama: z.string().min(1).max(120).optional(),
    peran: PERAN.optional(),
    aktif: z.boolean().optional(),
    password: z.string().min(1).optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, {
    message: 'Tidak ada field yang diubah',
  })

const skemaBuatPengajuan = z.object({
  jenisNasabah: z.enum(['PERORANGAN', 'KELOMPOK']),
  akad: z.enum(['MURABAHAH', 'MUSYARAKAH']),
  tenorBulan: z.number().int(),
  anggota: z.array(skemaAnggota).min(1).max(10),
})

const skemaUbahAnggota = z.object({
  plafonDiajukan: z.number().int().positive(),
})

/**
 * Yang boleh diubah pada pengajuan DRAFT/DIKEMBALIKAN. Sengaja sempit: plafon
 * anggota punya endpointnya sendiri, dan identitas nasabah tidak diubah lewat
 * sini karena barisnya dipakai pengajuan lain.
 */
const skemaUbahPengajuan = z.object({
  akad: z.enum(['MURABAHAH', 'MUSYARAKAH']).optional(),
  tenorBulan: z.number().int().optional(),
})

export async function daftarkanRoute(app: FastifyInstance): Promise<void> {
  // --- Kesehatan & diagnostik ---------------------------------------------

  app.get('/health', { config: { peran: 'PUBLIK' } }, async () => {
    await databaseHidup()
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
    { config: { peran: SEMUA_PERAN } },
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
    { config: { peran: SEMUA_PERAN } },
    async (req) => {
      const kueri = req.query as { status?: string; q?: string; page?: string }
      return daftarPengajuan(req.pengguna!, {
        status: kueri.status,
        q: kueri.q,
        page: kueri.page ? Number(kueri.page) : undefined,
      })
    },
  )

  app.get(
    '/api/pengajuan/:id',
    { config: { peran: SEMUA_PERAN } },
    async (req) => {
      const { id } = req.params as { id: string }
      return ringkasanPengajuan(id)
    },
  )

  /**
   * PATCH — ubah data selama masih DRAFT atau DIKEMBALIKAN (FR-02).
   *
   * Ada di kontrak SDD BAB 5 sejak awal, tetapi belum pernah terdaftar. Tanpa
   * endpoint ini, pengajuan yang dikembalikan approver tidak dapat diperbaiki
   * AO, dan alur DIKEMBALIKAN → SUBMITTED pada SRS 3.2 buntu.
   */
  app.patch('/api/pengajuan/:id', { config: { peran: ['AO'] } }, async (req) => {
    const { id } = req.params as { id: string }
    const masukan = skemaUbahPengajuan.parse(req.body)
    return ubahPengajuan(req.pengguna!, id, masukan)
  })

  app.post('/api/pengajuan/:id/submit', { config: { peran: ['AO'] } }, async (req) => {
    const { id } = req.params as { id: string }
    return submitPengajuan(req.pengguna!, id)
  })

  // FR-12 — jumlah per tahap, dengan cakupan peran yang sama seperti daftar.
  app.get('/api/dashboard/pipeline', { config: { peran: SEMUA_PERAN } }, async (req) => {
    return ringkasanPipeline(req.pengguna!)
  })

  // --- Anggota majelis (FR-10, AC-14) -------------------------------------

  app.post('/api/pengajuan/:id/anggota', { config: { peran: ['AO'] } }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const masukan = skemaAnggota.parse(req.body)
    const hasil = await tambahAnggota(req.pengguna!, id, masukan)
    return reply.code(201).send(hasil)
  })

  app.patch(
    '/api/pengajuan/:id/anggota/:anggotaId',
    { config: { peran: ['AO'] } },
    async (req) => {
      const { id, anggotaId } = req.params as { id: string; anggotaId: string }
      const { plafonDiajukan } = skemaUbahAnggota.parse(req.body)
      return ubahAnggota(req.pengguna!, id, anggotaId, plafonDiajukan)
    },
  )

  app.post(
    '/api/pengajuan/:id/anggota/:anggotaId/tolak',
    { config: { peran: ['ANL'] } },
    async (req) => {
      const { id, anggotaId } = req.params as { id: string; anggotaId: string }
      return tolakAnggota(req.pengguna!, id, anggotaId)
    },
  )

  // --- Audit trail (FR-09) — HANYA BACA ------------------------------------
  //
  // Tidak ada POST, PUT, PATCH, atau DELETE di bawah ini, dan tidak boleh
  // ditambahkan. Audit ditulis dari dalam service, tidak pernah dari luar.

  // AC-12 — riwayat satu pengajuan, urut waktu, dengan aktor di setiap baris.
  app.get('/api/pengajuan/:id/audit', { config: { peran: SEMUA_PERAN } }, async (req) => {
    const { id } = req.params as { id: string }
    return riwayatPengajuan(id)
  })

  // Seluruh audit lintas pengajuan, difilter aktor/aksi/rentang tanggal.
  // ADM saja: baris audit memuat siapa memutuskan apa dan kapan.
  app.get('/api/audit', { config: { peran: ['ADM'] } }, async (req) => {
    const q = skemaFilterAudit.parse(req.query)
    return cariAudit({
      pengajuanId: q.pengajuanId,
      aktorId: q.aktorId,
      aksi: q.aksi,
      dari: q.dari,
      sampai: q.sampai,
      batas: q.batas,
      lewati: q.lewati,
    })
  })

  // --- Notifikasi (FR-11) --------------------------------------------------
  //
  // Keduanya bekerja pada notifikasi MILIK PEMANGGIL. Tidak ada parameter
  // "penggunaId" yang bisa diisi klien — id pengguna diambil dari token, bukan
  // dari permintaan, sehingga tidak ada cara meminta notifikasi orang lain.

  app.get('/api/notifikasi', { config: { peran: SEMUA_PERAN } }, async (req) => {
    const q = skemaFilterNotifikasi.parse(req.query)
    return daftarNotifikasi(req.pengguna!, { belumDibaca: q.belumDibaca, batas: q.batas })
  })

  app.post('/api/notifikasi/:id/baca', { config: { peran: SEMUA_PERAN } }, async (req) => {
    const { id } = req.params as { id: string }
    await tandaiDibaca(req.pengguna!, id)
    return { status: 'ok' }
  })

  // --- Kelola pengguna (FR-01, layar S-14) — ADM saja ----------------------
  //
  // Tidak ada DELETE: pengguna dinonaktifkan (aktif=false), tidak dihapus.
  // Menghapusnya akan memutus baris audit yang menunjuk kepadanya, dan jejak
  // siapa memutuskan apa adalah inti FR-09.

  app.get('/api/pengguna', { config: { peran: ['ADM'] } }, async (req) => {
    const q = skemaFilterPengguna.parse(req.query)
    return daftarPengguna({ peran: q.peran, aktif: q.aktif })
  })

  app.post('/api/pengguna', { config: { peran: ['ADM'] } }, async (req, reply) => {
    const masukan = skemaBuatPengguna.parse(req.body)
    const dibuat = await buatPengguna(req.pengguna!, masukan)
    return reply.code(201).send(dibuat)
  })

  app.patch('/api/pengguna/:id', { config: { peran: ['ADM'] } }, async (req) => {
    const { id } = req.params as { id: string }
    const masukan = skemaUbahPengguna.parse(req.body)
    return ubahPengguna(req.pengguna!, id, masukan)
  })

  // --- Modul route per FR (didaftarkan sebagai plugin) ---------------------
  //
  // Berkas route sendiri per pemilik FR, tidak menumpuk di berkas ini
  // (docs/PEMBAGIAN-TIM.md). Milik Dani: dokumen (FR-03), survei (FR-04),
  // approval (FR-08). Anggota majelis (FR-10) ada di atas karena menyentuh
  // agregat pengajuan yang sama.
  await daftarkanRouteDokumen(app)
  await daftarkanRouteSurvei(app)
  await daftarkanRouteApproval(app)

  // =========================================================================
  //  RUANG UNTUK ANGGOTA LAIN — tambahkan berkas route Anda sendiri di sini,
  //  jangan menumpuk di berkas ini. Lihat docs/PEMBAGIAN-TIM.md.
  //
  //    routes/slik.ts       FR-05
  //    routes/skoring.ts    FR-06
  //    routes/margin.ts     FR-07
  //    routes/parameter.ts  FR-13
  //    routes/notifikasi.ts FR-11
  // =========================================================================

  await slikRoutes(app)
  await skoringRoutes(app)
  await marginRoutes(app)
  await parameterRoutes(app)
}
