import pino from 'pino'
import { env } from '../config/env.js'

/**
 * Logger dengan REDAKSI WAJIB (BR-11).
 *
 * Redaksi diterapkan di serializer, bukan di pemanggil. Itu keputusan yang
 * disengaja: kalau redaksi bergantung pada setiap orang yang ingat menyensor
 * sebelum memanggil log, suatu saat ada yang lupa — dan yang bocor adalah NIK
 * nasabah. Di sini, lupa pun tetap tersensor.
 *
 * NFR-03 memverifikasi ini: test menjalankan alur AC-01..AC-05 dengan logger
 * diarahkan ke buffer, lalu memastikan tidak ada NIK dari fixtures yang muncul.
 *
 * Kalau menambah field baru yang memuat data pribadi, TAMBAHKAN ke daftar ini
 * pada PR yang sama.
 */
const FIELD_DIREDAKSI = [
  'nik',
  '*.nik',
  '*.*.nik',
  'nama',
  '*.nama',
  '*.*.nama',
  'pathBerkas',
  '*.pathBerkas',
  'path_berkas',
  'fotoPath',
  '*.fotoPath',
  'foto_path',
  'password',
  '*.password',
  'passwordHash',
  '*.passwordHash',
  'authorization',
  'req.headers.authorization',
  'alamat',
  '*.alamat',
]

export const logger = pino({
  level: env.logLevel,
  redact: {
    paths: FIELD_DIREDAKSI,
    censor: '[DIREDAKSI]',
  },
  // Fastify mencatat body request pada level debug secara bawaan. Body pengajuan
  // memuat NIK, jadi pencatatan otomatis itu dimatikan di app.ts, dan korelasi
  // dilakukan lewat id pengajuan.
  base: { layanan: 'imitra-backend' },
})

export type Logger = typeof logger
