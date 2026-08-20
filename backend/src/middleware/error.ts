import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { GalatAplikasi } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { bolehDiagnostik } from '../config/env.js'

/**
 * SATU-SATUNYA tempat galat dipetakan ke respons HTTP.
 *
 * Bentuk respons seragam untuk seluruh API (AGENTS.md bagian 4.3, SDD BAB 5.1):
 *   { "error": "KODE_KONSTAN", "message": "...", "rule": "BR-xx" }
 *
 * Field `rule` WAJIB terisi untuk pelanggaran aturan bisnis — AC-04 memeriksa
 * "BR-03" dan AC-09 memeriksa "BR-06".
 *
 * Galat tak terduga SELALU memakai pesan generik. Meneruskan `err.message` apa
 * adanya berisiko membocorkan isi database atau nama kolom ke klien, dan pada
 * jalur SLIK bisa membocorkan NIK yang ada di pesan galat pustaka (BR-11).
 */
export function penanganGalat(
  err: FastifyError | Error,
  req: FastifyRequest,
  reply: FastifyReply,
): void {
  // --- Galat yang memang kami buat sendiri ---------------------------------
  if (err instanceof GalatAplikasi) {
    if (err.status >= 500) {
      logger.error({ kode: err.kode, url: req.url, err: err.message }, 'galat aplikasi')
    } else {
      logger.info({ kode: err.kode, rule: err.rule, url: req.url }, 'permintaan ditolak')
    }

    reply.code(err.status).send({
      error: err.kode,
      message: err.message,
      ...(err.rule ? { rule: err.rule } : {}),
    })
    return
  }

  // --- Validasi bentuk input (Zod) -----------------------------------------
  if (err instanceof ZodError) {
    reply.code(400).send({
      error: 'VALIDASI_GAGAL',
      message: 'Input tidak valid',
      field: err.issues.map((i) => ({ path: i.path.join('.'), pesan: i.message })),
    })
    return
  }

  // --- Validasi skema bawaan Fastify ---------------------------------------
  const fastifyErr = err as FastifyError
  if (fastifyErr.validation) {
    reply.code(400).send({
      error: 'VALIDASI_GAGAL',
      message: fastifyErr.message,
    })
    return
  }

  // --- Segala yang lain ----------------------------------------------------
  logger.error(
    { url: req.url, method: req.method, err: err.message, stack: err.stack },
    'galat tak terduga',
  )

  reply.code(500).send({
    error: 'GALAT_INTERNAL',
    message: 'Terjadi kesalahan pada server',
    // Stack trace tidak pernah dikirim ke klien. Di lingkungan non-produksi kami
    // hanya menyertakan penanda supaya baris log yang benar mudah ditemukan.
    ...(bolehDiagnostik ? { petunjuk: 'Lihat log backend untuk rincian' } : {}),
  })
}
