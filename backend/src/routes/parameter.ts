import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { bacaBobotKomponen, bacaParameterSkalar, bacaRentangMargin, bacaAmbangApproval } from '../services/parameter.service.js'
import {
  ubahBobotKomponen,
  ubahAmbangApproval,
  ubahRentangMargin,
} from '../services/parameter-tulis.service.js'

const skemaUpdateBobot = z.array(
  z.object({ kode: z.string(), bobot: z.number() }),
)

const skemaUpdateRentang = z.array(
  z.object({
    grade: z.number(),
    skorMin: z.number(),
    skorMaks: z.number(),
    marginMin: z.number().nullable(),
    marginMaks: z.number().nullable(),
    nisbahMin: z.number().nullable(),
    nisbahMaks: z.number().nullable(),
    dibiayai: z.boolean(),
  }),
)

export async function parameterRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/parameter/skoring',
    { config: { peran: ['ADM'] } },
    async () => {
      const [bobot, skalar] = await Promise.all([bacaBobotKomponen(), bacaParameterSkalar()])
      return { bobot, skalar }
    },
  )

  app.put(
    '/api/parameter/skoring',
    { config: { peran: ['ADM'] } },
    async (req) => {
      const data = skemaUpdateBobot.parse(req.body)
      return ubahBobotKomponen(req.pengguna!, data)
    },
  )

  app.get(
    '/api/parameter/ambang-approval',
    { config: { peran: ['ADM'] } },
    async () => {
      return bacaAmbangApproval()
    },
  )

  app.put(
    '/api/parameter/ambang-approval',
    { config: { peran: ['ADM'] } },
    async (req) => {
      const data = z.array(
        z.object({
          plafonMin: z.number(),
          plafonMaks: z.number(),
          urutanPeran: z.array(z.string()),
        }),
      ).parse(req.body)
      return ubahAmbangApproval(req.pengguna!, data)
    },
  )

  app.get(
    '/api/parameter/rentang-margin',
    { config: { peran: ['ADM'] } },
    async () => {
      return bacaRentangMargin()
    },
  )

  app.put(
    '/api/parameter/rentang-margin',
    { config: { peran: ['ADM'] } },
    async (req) => {
      const data = skemaUpdateRentang.parse(req.body)
      return ubahRentangMargin(req.pengguna!, data)
    },
  )
}
