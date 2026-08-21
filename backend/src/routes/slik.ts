import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { jalankanSlikCheck, riwayatSlikPengajuan } from '../services/slik.service.js'

/**
 * Route SLIK (FR-05).
 *
 * `nik` OPSIONAL dan hanya boleh di BODY, tidak pernah di URL (BR-11): URL
 * masuk ke access log server dan riwayat browser.
 *
 *   - tanpa `nik` → seluruh anggota aktif diperiksa (bentuk yang diminta FR-05)
 *   - dengan `nik` → hanya anggota dengan NIK itu, dan server memastikan NIK
 *     tersebut memang milik anggota aktif pengajuan ini (layar S-08)
 *
 * Keputusan Tabel 4.2 TIDAK diambil di sini. Route hanya menerima permintaan;
 * aturan bisnisnya ada di service, dan itu satu-satunya tempat status pengajuan
 * boleh berubah.
 */
const skemaInquiry = z
  .object({ nik: z.string().regex(/^\d{16}$/, 'NIK harus 16 digit angka').optional() })
  .optional()

export async function slikRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/pengajuan/:id/slik-check', { config: { peran: ['ANL'] } }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = skemaInquiry.parse(req.body ?? undefined)
    const hasil = await jalankanSlikCheck(req.pengguna!, id, body?.nik)
    return reply.code(201).send(hasil)
  })

  // Approver ikut membaca riwayat SLIK: keputusan approval dipertanggungjawabkan
  // dengan dasar yang sama seperti yang dilihat analis (SDD BAB 5).
  app.get(
    '/api/pengajuan/:id/slik',
    { config: { peran: ['ANL', 'KCP', 'KC', 'KOM', 'ADM'] } },
    async (req) => {
      const { id } = req.params as { id: string }
      return riwayatSlikPengajuan(id)
    },
  )
}
