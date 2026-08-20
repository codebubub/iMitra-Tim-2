import { prisma } from '../lib/prisma.js'

/**
 * Satu query paling murah yang membuktikan koneksi database benar-benar hidup,
 * bukan sekadar prosesnya yang hidup. Dipakai `GET /health`, yang dipakai
 * healthcheck docker compose untuk mengurutkan startup.
 *
 * Ada di repositories/ karena ia menyentuh Prisma, dan route tidak boleh
 * menyentuh Prisma (AGENTS.md bagian 3).
 */
export async function databaseHidup(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`
}
