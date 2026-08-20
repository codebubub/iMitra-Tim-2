import type { FastifyReply, FastifyRequest } from 'fastify';
import { ImitraError } from '#lib/error.js';

export async function errorHandler(err: any, _req: FastifyRequest, reply: FastifyReply) {
  const imitraError = err instanceof ImitraError ? err : new ImitraError('GALAT_TAK_TERDUGA', 'Terjadi kesalahan yang tidak diharapkan', 500);
  reply.status(imitraError.statusCode).send(imitraError.toJSON());
}
