import type { FastifyReply, FastifyRequest } from 'fastify';
import { ImitraError } from '#lib/error.js';

const ALLOWED_ROLES = ['AO', 'ANL', 'KCP', 'KC', 'KOM', 'ADM'];

export function rbac(allowedRoles: string[]) {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    const user = (req as any).user as { peran: string } | undefined;
    if (!user) {
      throw new ImitraError('TIDAK_TERAUTENTIKASI', 'Header Authorization tidak valid', 401);
    }
    if (!allowedRoles.includes(user.peran)) {
      throw new ImitraError('AKSES_DITOLAK', `Peran ${user.peran} tidak berwenang`, 403);
    }
  };
}

export function requireRole(allowedRoles: string[]) {
  return rbac(allowedRoles);
}

export function requireAnyRole() {
  return rbac(ALLOWED_ROLES);
}

export function requireAdmin() {
  return rbac(['ADM']);
}
