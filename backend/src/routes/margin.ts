import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { bacaMargin, tetapkanMargin } from '../services/margin.service.js'

/**
 * Route margin / nisbah (FR-07, BR-06, AC-09).
 *
 * Berkas ini adalah yang hilang selama ini: seluruh logika sudah ada di
 * `services/margin.service.ts` dan `domain/margin.ts` beserta unit test-nya,
 * tetapi tidak pernah terdaftar. Layar S-10 memanggil endpoint yang tidak ada,
 * dan karena penjaga peran bersifat fail-closed, jawabannya 403 — terlihat
 * seperti masalah izin, padahal fiturnya memang belum tersambung.
 *
 * TIDAK ADA parameter `paksa` di skema di bawah, dan tidak boleh ditambahkan:
 * BR-06 memblokir, bukan memperingatkan.
 */
const skemaMargin = z
  .object({
    marginPersen: z.number().optional(),
    nisbahBankPersen: z.number().optional(),
  })
  .refine((v) => v.marginPersen !== undefined || v.nisbahBankPersen !== undefined, {
    message: 'Isi marginPersen (murabahah) atau nisbahBankPersen (musyarakah)',
  })

export async function marginRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/pengajuan/:id/margin', { config: { peran: ['ANL'] } }, async (req) => {
    const { id } = req.params as { id: string }
    const body = skemaMargin.parse(req.body)
    return tetapkanMargin(req.pengguna!, id, body)
  })

  // Approver perlu melihat angka yang akan disetujuinya, beserta rentang yang
  // berlaku untuk grade final — bukan hanya nilainya.
  app.get(
    '/api/pengajuan/:id/margin',
    { config: { peran: ['ANL', 'KCP', 'KC', 'KOM', 'ADM'] } },
    async (req) => {
      const { id } = req.params as { id: string }
      return bacaMargin(id)
    },
  )
}
