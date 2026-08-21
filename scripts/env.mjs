/**
 * Pembacaan .env root untuk skrip-skrip di direktori ini.
 *
 * Backend SENGAJA tidak memakai dotenv (lihat backend/src/config/env.ts): di
 * mode container, variabel datang dari docker compose. Untuk mode native,
 * berkas inilah yang mengambil peran itu — .env dibaca sekali lalu disuntikkan
 * ke proses anak, tanpa menambah dependensi ke backend.
 */

import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Parser .env minimal. Menangani BOM UTF-16/UTF-8 (Notepad di Windows menulis
 * BOM, dan BOM yang tidak dibuang membuat kunci pertama bernama "﻿APP_ENV" —
 * kesalahan yang sulit dilihat karena tampilannya identik).
 */
export function bacaEnvFile(path) {
  if (!existsSync(path)) return {}
  const buf = readFileSync(path)
  let teks
  if (buf[0] === 0xff && buf[1] === 0xfe) teks = buf.subarray(2).toString('utf16le')
  else if (buf[0] === 0xfe && buf[1] === 0xff) teks = buf.subarray(2).swap16().toString('utf16le')
  else teks = buf.toString('utf8').replace(/^﻿/, '')

  const hasil = {}
  for (const barisMentah of teks.split(/\r?\n/)) {
    const baris = barisMentah.trim()
    if (baris === '' || baris.startsWith('#')) continue
    const pisah = baris.replace(/^export\s+/, '').match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!pisah) continue
    let nilai = pisah[2].trim()
    if (
      (nilai.startsWith('"') && nilai.endsWith('"') && nilai.length > 1) ||
      (nilai.startsWith("'") && nilai.endsWith("'") && nilai.length > 1)
    ) {
      nilai = nilai.slice(1, -1)
    }
    hasil[pisah[1]] = nilai
  }
  return hasil
}

/**
 * Membaca .env root; menyalin dari .env.example kalau belum ada.
 *
 * VARIABEL LINGKUNGAN NYATA MENANG atas isi .env — sama seperti dotenv. Itu yang
 * membuat `BACKEND_PORT=8180 npm run dev` bisa dipakai saat port bawaan sedang
 * ditahan sesuatu (mis. lapisan port Docker Desktop yang belum melepas), tanpa
 * perlu menyunting .env yang dipakai bersama.
 */
export function muatEnvRoot({ onSalin } = {}) {
  const envPath = join(ROOT, '.env')
  const contohPath = join(ROOT, '.env.example')
  if (!existsSync(envPath)) {
    if (!existsSync(contohPath)) {
      throw new Error('.env dan .env.example dua-duanya tidak ada di root repo.')
    }
    copyFileSync(contohPath, envPath)
    onSalin?.()
  }

  const berkas = bacaEnvFile(envPath)
  for (const kunci of Object.keys(berkas)) {
    const dariLingkungan = process.env[kunci]
    if (dariLingkungan !== undefined && dariLingkungan !== '') berkas[kunci] = dariLingkungan
  }
  return berkas
}

/**
 * Nilai turunan untuk mode NATIVE (tanpa Docker).
 *
 * Nama host docker (`mock-slik`, `db`) tidak resolve di host, jadi diterjemahkan
 * ke localhost — DI MEMORI SAJA. .env tidak pernah ditulis ulang, supaya
 * `docker compose up` tetap bekerja dengan berkas yang sama.
 */
export function turunkanEnv(berkasEnv) {
  const portBackend = berkasEnv.BACKEND_PORT || '8080'
  const portFrontend = berkasEnv.FRONTEND_PORT || '3000'
  const portSlik = berkasEnv.MOCK_SLIK_PORT || '9090'

  const slikBaseUrl = (berkasEnv.SLIK_BASE_URL ?? '').includes('mock-slik')
    ? `http://localhost:${portSlik}`
    : berkasEnv.SLIK_BASE_URL || `http://localhost:${portSlik}`

  const databaseUrl = (berkasEnv.DATABASE_URL ?? '').replace(
    /@db:\d+/,
    `@localhost:${berkasEnv.DB_PORT || '5432'}`,
  )

  const asalCors = new Set(
    (berkasEnv.CORS_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
  asalCors.add(`http://localhost:${portFrontend}`)
  asalCors.add(`http://127.0.0.1:${portFrontend}`)

  return {
    portBackend,
    portFrontend,
    portSlik,
    slikBaseUrl,
    databaseUrl,
    corsAllowedOrigins: [...asalCors].join(','),
    fixturesPath: join(ROOT, 'fixtures', 'nasabah-uji.csv'),
  }
}
