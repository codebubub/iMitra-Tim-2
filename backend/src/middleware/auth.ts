import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { ImitraError } from '#lib/error.js';
import { loadEnv } from '#config/env.js';

export async function authMiddleware(req: FastifyRequest, _reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new ImitraError('TIDAK_TERAUTENTIKASI', 'Token tidak ditemukan', 401);
  }
  const token = header.slice(7);
  try {
    const env = loadEnv();
    const payload = jwt.verify(token, env.JWT_SECRET) as { id: string; peran: string; username: string };
    (req as any).user = payload;
  } catch {
    throw new ImitraError('TIDAK_TERAUTENTIKASI', 'Token tidak valid atau kedaluwarsa', 401);
  }
}
