import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { daftarSurvei, nilaiSurvei, rekamSurvei } from '../services/survei.service.js'

/**
 * Route survei lapangan (FR-04). AO merekam fakta; ANL menilai skala 1-5 dan
 * menetapkan VALID/TIDAK_VALID (asumsi A-10). Tanpa keputusan bisnis di sini.
 */

const skemaRekam = z.object({
  latitude: z.number(),
  longitude: z.number(),
  fotoBase64: z.string().min(1),
  fotoMime: z.string().min(1),
  omzetHarian: z.number().int().positive(),
  lamaUsahaBulan: z.number().int().min(0),
  catatan: z.string().min(1),
})

const skemaNilai = z.object({
  kondisiUsahaSkala: z.number().int().min(1).max(5),
  status: z.enum(['VALID', 'TIDAK_VALID']),
})

const SEMUA = ['AO', 'ANL', 'KCP', 'KC', 'KOM', 'ADM'] as const

export async function daftarkanRouteSurvei(app: FastifyInstance): Promise<void> {
  app.post('/api/pengajuan/:id/survei', { config: { peran: ['AO'] } }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const masukan = skemaRekam.parse(req.body)
    const hasil = await rekamSurvei(req.pengguna!, id, masukan)
    return reply.code(201).send(hasil)
  })

  app.get('/api/pengajuan/:id/survei', { config: { peran: [...SEMUA] } }, async (req) => {
    const { id } = req.params as { id: string }
    return daftarSurvei(id)
  })

  app.post('/api/survei/:surveiId/nilai', { config: { peran: ['ANL'] } }, async (req) => {
    const { surveiId } = req.params as { surveiId: string }
    const { kondisiUsahaSkala, status } = skemaNilai.parse(req.body)
    return nilaiSurvei(req.pengguna!, surveiId, kondisiUsahaSkala, status)
  })
}
