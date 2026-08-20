import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import { env } from './config/env.js'
import { opsiLogger } from './lib/logger.js'
import { penanganGalat } from './middleware/error.js'
import { daftarRoute, pastikanSemuaRouteBerperan, penjagaPeran } from './middleware/rbac.js'
import { daftarkanRoute } from './routes/index.js'

/**
 * Perakitan aplikasi. Dipisahkan dari server.ts supaya test integrasi bisa
 * memakai `app.inject()` tanpa membuka port — itu membuat test cepat dan bisa
 * berjalan paralel di CI.
 */
export async function buatApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opsiLogger,
    /**
     * Fastify mencatat body request pada level debug secara bawaan, dan body
     * pengajuan memuat NIK. Pencatatan otomatis dimatikan (BR-11); korelasi
     * antar baris log memakai id pengajuan, bukan data nasabah.
     */
    disableRequestLogging: true,
    bodyLimit: env.uploadMaxBytes,
  })

  // Kumpulkan seluruh route yang didaftarkan. Dipakai dua hal:
  //   1. pastikanSemuaRouteBerperan() — fail-closed saat start
  //   2. GET /api/_routes — bukti AC-13
  app.addHook('onRoute', (opsi) => {
    const methods = Array.isArray(opsi.method) ? opsi.method : [opsi.method]
    for (const m of methods) {
      if (m === 'HEAD' || m === 'OPTIONS') continue
      daftarRoute.push({ method: m, url: opsi.url, peran: opsi.config?.peran })
    }
  })

  await app.register(cors, {
    origin: env.corsAllowedOrigins,
    credentials: true,
  })

  app.addHook('onRequest', penjagaPeran)
  app.setErrorHandler(penanganGalat)

  await app.register(daftarkanRoute)
  await app.ready()

  // Gagal cepat: satu route tanpa deklarasi peran menghentikan proses.
  // Lebih baik container tidak hidup daripada hidup dengan endpoint terbuka.
  pastikanSemuaRouteBerperan(app)

  return app
}
