import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  ambilBerkas,
  daftarDokumen,
  unggahDokumen,
  verifikasiDokumen,
} from '../services/dokumen.service.js'

/**
 * Route dokumen (FR-03). Tanpa keputusan bisnis: parsing, panggil service,
 * petakan hasil ke HTTP. Aturan versi/verifikasi ada di domain + service.
 *
 * AC-02 menembak POST /api/dokumen/{id}/verifikasi sebagai AO dan menuntut 403 —
 * itu ditegakkan oleh `config.peran: ['ANL']` di sini, bukan di frontend.
 */

const skemaUnggah = z.object({
  pengajuanAnggotaId: z.string().uuid(),
  jenis: z.enum(['KTP', 'KK', 'SKU']),
  mime: z.string().min(1),
  kontenBase64: z.string().min(1),
})

const skemaVerifikasi = z.object({
  keputusan: z.enum(['VERIFIED', 'REJECTED']),
  kodeAlasan: z
    .enum(['BURAM', 'TIDAK_TERBACA', 'KADALUARSA', 'TIDAK_SESUAI_PEMOHON', 'BUKAN_JENIS_DOKUMEN'])
    .optional(),
  catatan: z.string().optional(),
})

const SEMUA = ['AO', 'ANL', 'KCP', 'KC', 'KOM', 'ADM'] as const

export async function daftarkanRouteDokumen(app: FastifyInstance): Promise<void> {
  app.post(
    '/api/pengajuan/:id/dokumen',
    { config: { peran: ['AO'] } },
    async (req, reply) => {
      const { id } = req.params as { id: string }
      const masukan = skemaUnggah.parse(req.body)
      const hasil = await unggahDokumen(req.pengguna!, id, masukan)
      return reply.code(201).send(hasil)
    },
  )

  app.get(
    '/api/pengajuan/:id/dokumen',
    { config: { peran: [...SEMUA] } },
    async (req) => {
      const { id } = req.params as { id: string }
      return daftarDokumen(id)
    },
  )

  app.post(
    '/api/dokumen/:dokumenId/verifikasi',
    { config: { peran: ['ANL'] } },
    async (req) => {
      const { dokumenId } = req.params as { dokumenId: string }
      const { keputusan, kodeAlasan, catatan } = skemaVerifikasi.parse(req.body)
      return verifikasiDokumen(req.pengguna!, dokumenId, keputusan, kodeAlasan, catatan)
    },
  )

  app.get(
    '/api/dokumen/:dokumenId/berkas',
    { config: { peran: ['AO', 'ANL', 'KCP', 'KC', 'KOM'] } },
    async (req, reply) => {
      const { dokumenId } = req.params as { dokumenId: string }
      const berkas = await ambilBerkas(req.pengguna!, dokumenId)
      return reply.header('content-type', berkas.mime).send(berkas.isi)
    },
  )
}
