import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { slikService } from '../services/slik.service.js'

const skemaInquiry = z.object({ nik: z.string().length(16) })

export async function slikRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/api/pengajuan/:id/slik-check',
    { config: { peran: ['ANL'] } },
    async (req, reply) => {
      const { id } = req.params as { id: string }
      const { nik } = skemaInquiry.parse(req.body)
      const hasil = await slikService.cekSlik(id, nik, (req as { pengguna?: { id: string } }).pengguna!.id)
      return reply.code(201).send(hasil)
    },
  )

  app.get(
    '/api/pengajuan/:id/slik',
    { config: { peran: ['ANL'] } },
    async (req) => {
      const { id } = req.params as { id: string }
      const anggota = await prisma.pengajuanAnggota.findMany({
        where: { pengajuanId: id },
        select: { id: true },
      })
      const ids = anggota.map((a) => a.id)
      const riwayat = await prisma.hasilSlik.findMany({
        where: { pengajuanAnggotaId: { in: ids } },
        orderBy: { diperiksaPada: 'desc' },
      })
      return riwayat
    },
  )
}
