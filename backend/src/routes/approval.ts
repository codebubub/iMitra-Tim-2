import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  ajukanApproval,
  antrianApproval,
  putuskanApproval,
} from '../services/approval.service.js'

/**
 * Route approval berjenjang (FR-08). BR-02, BR-05, dan BR-09 ditegakkan di
 * domain + service; route hanya memvalidasi bentuk dan memetakan hasil.
 *
 * Antrian hanya mengembalikan pengajuan pada level peran pemanggil — pemfilteran
 * di server (FR-12), bukan disembunyikan di UI.
 */

const skemaKeputusan = z.object({
  keputusan: z.enum(['APPROVE', 'REJECT', 'RETURN']),
  alasan: z.string().optional(),
})

export async function daftarkanRouteApproval(app: FastifyInstance): Promise<void> {
  app.post('/api/pengajuan/:id/ajukan-approval', { config: { peran: ['ANL'] } }, async (req) => {
    const { id } = req.params as { id: string }
    return ajukanApproval(req.pengguna!, id)
  })

  app.get('/api/approval/antrian', { config: { peran: ['KCP', 'KC', 'KOM'] } }, async (req) => {
    return antrianApproval(req.pengguna!)
  })

  app.post('/api/pengajuan/:id/approval', { config: { peran: ['KCP', 'KC', 'KOM'] } }, async (req) => {
    const { id } = req.params as { id: string }
    const { keputusan, alasan } = skemaKeputusan.parse(req.body)
    return putuskanApproval(req.pengguna!, id, keputusan, alasan)
  })
}
