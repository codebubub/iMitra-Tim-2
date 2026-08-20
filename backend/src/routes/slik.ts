import type { FastifyInstance } from 'fastify';
import { ImitraError } from '#lib/error.js';
import { authMiddleware } from '#middleware/auth.js';

export async function slikRoutes(fastify: FastifyInstance) {
  fastify.post('/api/pengajuan/:id/slik-check', { preHandler: authMiddleware }, async (_req, _reply) => {
    throw new ImitraError('BELUM_DIIMPLEMENTASI', 'SLIK check akan diimplementasikan di PR berikutnya', 501);
  });

  fastify.get('/api/pengajuan/:id/slik', { preHandler: authMiddleware }, async (_req, _reply) => {
    throw new ImitraError('BELUM_DIIMPLEMENTASI', 'Riwayat SLIK akan diimplementasikan di PR berikutnya', 501);
  });
}
