import { buatApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'
import { prisma } from './lib/prisma.js'

async function jalankan(): Promise<void> {
  const app = await buatApp()

  await app.listen({ port: env.port, host: '0.0.0.0' })
  logger.info({ port: env.port, appEnv: env.appEnv, tz: env.tz }, 'backend iMitra siap')

  // Matikan dengan rapi supaya koneksi database tidak menggantung saat
  // `docker compose down` — kalau tidak, restart berikutnya bisa kehabisan slot.
  for (const sinyal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sinyal, () => {
      logger.info({ sinyal }, 'mematikan backend')
      void app
        .close()
        .then(() => prisma.$disconnect())
        .then(() => process.exit(0))
    })
  }
}

jalankan().catch((err) => {
  logger.error({ err: err instanceof Error ? err.message : String(err) }, 'gagal start')
  process.exit(1)
})
