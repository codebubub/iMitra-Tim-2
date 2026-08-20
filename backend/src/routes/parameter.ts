import type { FastifyInstance } from 'fastify';
import { ImitraError } from '#lib/error.js';
import { authMiddleware } from '#middleware/auth.js';
import { requireAdmin } from '#middleware/rbac.js';

export async function parameterRoutes(fastify: FastifyInstance) {
  fastify.get('/api/parameter/skoring', { preHandler: [authMiddleware, requireAdmin] }, async (_req, _reply) => {
    throw new ImitraError('BELUM_DIIMPLEMENTASI', 'Parameter skoring akan diimplementasikan di PR berikutnya', 501);
  });

  fastify.put('/api/parameter/skoring', { preHandler: [authMiddleware, requireAdmin] }, async (_req, _reply) => {
    throw new ImitraError('BELUM_DIIMPLEMENTASI', 'Update parameter skoring akan diimplementasikan di PR berikutnya', 501);
  });

  fastify.get('/api/parameter/ambang-approval', { preHandler: [authMiddleware, requireAdmin] }, async (_req, _reply) => {
    throw new ImitraError('BELUM_DIIMPLEMENTASI', 'Ambang approval akan diimplementasikan di PR berikutnya', 501);
  });

  fastify.put('/api/parameter/ambang-approval', { preHandler: [authMiddleware, requireAdmin] }, async (_req, _reply) => {
    throw new ImitraError('BELUM_DIIMPLEMENTASI', 'Update ambang approval akan diimplementasikan di PR berikutnya', 501);
  });

  fastify.get('/api/parameter/rentang-margin', { preHandler: [authMiddleware, requireAdmin] }, async (_req, _reply) => {
    throw new ImitraError('BELUM_DIIMPLEMENTASI', 'Rentang margin akan diimplementasikan di PR berikutnya', 501);
  });

  fastify.put('/api/parameter/rentang-margin', { preHandler: [authMiddleware, requireAdmin] }, async (_req, _reply) => {
    throw new ImitraError('BELUM_DIIMPLEMENTASI', 'Update rentang margin akan diimplementasikan di PR berikutnya', 501);
  });
}
