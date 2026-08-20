import type { FastifyInstance } from 'fastify';
import { ImitraError } from '#lib/error.js';
import { authMiddleware } from '#middleware/auth.js';

export async function skoringRoutes(fastify: FastifyInstance) {
  fastify.post('/api/pengajuan/:id/skoring', { preHandler: authMiddleware }, async (_req, _reply) => {
    throw new ImitraError('BELUM_DIIMPLEMENTASI', 'Skoring akan diimplementasikan di PR berikutnya', 501);
  });

  fastify.get('/api/pengajuan/:id/skoring', { preHandler: authMiddleware }, async (_req, _reply) => {
    throw new ImitraError('BELUM_DIIMPLEMENTASI', 'Hasil skoring akan diimplementasikan di PR berikutnya', 501);
  });

  fastify.post('/api/pengajuan/:id/skoring/override', { preHandler: authMiddleware }, async (_req, _reply) => {
    throw new ImitraError('BELUM_DIIMPLEMENTASI', 'Override skoring akan diimplementasikan di PR berikutnya', 501);
  });
}
