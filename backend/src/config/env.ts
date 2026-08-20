/**
 * SATU-SATUNYA tempat process.env dibaca di seluruh backend.
 *
 * Kenapa terpusat: variabel yang dibaca tersebar di banyak berkas adalah
 * penyebab paling umum "jalan di laptop saya". Di sini semuanya divalidasi saat
 * start, dan proses GAGAL CEPAT kalau ada yang kurang — lebih baik container
 * tidak hidup daripada hidup dengan JWT_SECRET kosong.
 *
 * Setiap variabel baru WAJIB ditambahkan ke .env.example pada PR yang sama.
 *
 * Yang SENGAJA tidak ada di sini: masa berlaku SLIK 30 hari (BR-04). Ia parameter
 * BISNIS yang boleh diubah ADM, jadi tempatnya di tabel parameter_skoring
 * (asumsi A-8), bukan di env yang memerlukan restart.
 */

class VariabelKurang extends Error {
  constructor(nama: string[]) {
    super(
      `Variabel lingkungan wajib belum diisi: ${nama.join(', ')}. ` +
        `Salin .env.example menjadi .env dan lengkapi nilainya.`,
    )
    this.name = 'VariabelKurang'
  }
}

function wajib(nama: string, kurang: string[]): string {
  const nilai = process.env[nama]
  if (nilai === undefined || nilai.trim() === '') {
    kurang.push(nama)
    return ''
  }
  return nilai
}

function angka(nama: string, bawaan: number): number {
  const mentah = process.env[nama]
  if (mentah === undefined || mentah.trim() === '') return bawaan
  const n = Number(mentah)
  if (!Number.isFinite(n)) {
    throw new Error(`Variabel ${nama} harus berupa angka, diterima: ${mentah}`)
  }
  return n
}

function muat() {
  const kurang: string[] = []

  const konfig = {
    appEnv: process.env.APP_ENV ?? 'development',
    tz: process.env.TZ ?? 'Asia/Jakarta',
    logLevel: process.env.LOG_LEVEL ?? 'info',
    port: angka('PORT', 8080),

    databaseUrl: wajib('DATABASE_URL', kurang),

    jwtSecret: wajib('JWT_SECRET', kurang),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
    passwordHashCost: angka('PASSWORD_HASH_COST', 10),

    slikBaseUrl: process.env.SLIK_BASE_URL ?? 'http://mock-slik:9090',
    slikInquiryPath: process.env.SLIK_INQUIRY_PATH ?? '/slik/inquiry',
    slikTimeoutMs: angka('SLIK_TIMEOUT_MS', 3000),
    slikRetry: angka('SLIK_RETRY', 0),

    uploadDir: process.env.UPLOAD_DIR ?? './uploads',
    uploadMaxBytes: angka('UPLOAD_MAX_BYTES', 5_242_880),
    uploadAllowedMime: (process.env.UPLOAD_ALLOWED_MIME ?? 'image/jpeg,image/png,application/pdf')
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean),

    corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  } as const

  if (kurang.length > 0) throw new VariabelKurang(kurang)

  if (konfig.slikRetry > 0 && konfig.appEnv !== 'test') {
    // Bukan galat, tetapi layak diteriakkan: retry yang tidak dicatat
    // menyembunyikan kegagalan SLIK, dan ANL berhak tahu panggilan gagal.
    // eslint-disable-next-line no-console
    console.warn(
      `[config] SLIK_RETRY=${konfig.slikRetry}. Pastikan setiap percobaan tercatat di hasil_slik (SDD BAB 2.4).`,
    )
  }

  return konfig
}

export const env = muat()
export type Env = typeof env

/** Endpoint diagnostik seperti /api/_routes hanya hidup di luar produksi. */
export const bolehDiagnostik = env.appEnv !== 'production'

/**
 * LAPISAN KOMPATIBILITAS — jangan dipakai untuk kode baru.
 *
 * Modul yang ditulis Alfian memanggil `loadEnv()` dan membaca variabel dalam
 * bentuk UPPER_CASE. Fungsi ini memetakan objek `env` di atas ke bentuk itu,
 * supaya berkasnya jalan tanpa ditulis ulang.
 *
 * KODE BARU mengimpor `env` langsung: `import { env } from '../config/env.js'`.
 * Alasannya: `env` sudah divalidasi saat start dan bertipe, sedangkan fungsi
 * yang mengembalikan objek baru mengundang orang memanggilnya di jalur panas.
 *
 * Berkas SLIK_RESULT_VALID_DAYS SENGAJA TIDAK ADA di sini. Masa berlaku hasil
 * SLIK (BR-04) adalah parameter BISNIS yang boleh diubah ADM tanpa restart, jadi
 * ia hidup di tabel parameter_skoring dengan kode SLIK_MASA_BERLAKU_HARI
 * (asumsi A-8 di docs/SRS-iMitra.md). Menaruhnya di env berarti mengubahnya
 * memerlukan restart — pelanggaran langsung terhadap FR-13.
 */
export function loadEnv() {
  return {
    APP_ENV: env.appEnv,
    TZ: env.tz,
    LOG_LEVEL: env.logLevel,
    PORT: env.port,
    DATABASE_URL: env.databaseUrl,
    JWT_SECRET: env.jwtSecret,
    JWT_EXPIRES_IN: env.jwtExpiresIn,
    PASSWORD_HASH_COST: env.passwordHashCost,
    SLIK_BASE_URL: env.slikBaseUrl,
    SLIK_INQUIRY_PATH: env.slikInquiryPath,
    SLIK_TIMEOUT_MS: env.slikTimeoutMs,
    SLIK_RETRY: env.slikRetry,
    UPLOAD_DIR: env.uploadDir,
    UPLOAD_MAX_BYTES: env.uploadMaxBytes,
    UPLOAD_ALLOWED_MIME: env.uploadAllowedMime.join(','),
    CORS_ALLOWED_ORIGINS: env.corsAllowedOrigins.join(','),
  } as const
}
