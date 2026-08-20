import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { hitungDanSimpanSkoring } from '../services/skoring.service.js'

const skemaOverride = z.object({
  gradeFinal: z.number().int().min(1).max(5),
  alasan: z.string().min(10),
})

export async function skoringRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/api/pengajuan/:id/skoring',
    { config: { peran: ['ANL'] } },
    async (req) => {
      const { id } = req.params as { id: string }
      const hasil = await hitungDanSimpanSkoring({ pengajuanId: id, diperiksaOleh: (req as { pengguna?: { id: string } }).pengguna!.id })
      return hasil
    },
  )

  app.get(
    '/api/pengajuan/:id/skoring',
    { config: { peran: ['ANL'] } },
    async (req) => {
      const { id } = req.params as { id: string }
      const hasil = await prisma.hasilSkoring.findFirst({
        where: { pengajuanId: id },
        orderBy: { dihitungPada: 'desc' },
        include: { rincian: true },
      })
      return hasil
    },
  )

  app.post(
    '/api/pengajuan/:id/skoring/override',
    { config: { peran: ['ANL'] } },
    async (req) => {
      const { gradeFinal, alasan } = skemaOverride.parse(req.body)
      // TODO: implement override logic
      return { gradeFinal, alasan }
    },
  )
}
