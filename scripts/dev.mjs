#!/usr/bin/env node
/**
 * Orkestrator dev satu perintah untuk iMitra.
 *
 *   npm run dev   (atau: npm start)
 *
 * Yang dikerjakan berkas ini, berurutan:
 *   1. Membaca .env di root (kalau belum ada, disalin dari .env.example).
 *   2. Membebaskan port 9090 / 8080 / 3000 — proses yang masih menempel DIBUNUH.
 *   3. Memastikan node_modules & Prisma Client tiap workspace sudah ada.
 *   4. Menjalankan mock-slik, backend, dan frontend sekaligus dengan log berlabel.
 *   5. Ctrl+C sekali mematikan ketiganya (termasuk cucu proses di Windows).
 *
 * SENGAJA tanpa dependensi (tidak pakai concurrently/kill-port): root repo ini
 * tidak punya node_modules, dan menambahkannya berarti `npm install` wajib lebih
 * dulu — itu membatalkan janji "satu perintah".
 *
 * CATATAN MODE: ini mode NATIVE (tanpa Docker). Nama host docker seperti
 * `mock-slik` dan `db` tidak resolve di host, jadi nilainya ditimpa ke localhost
 * di memori proses saja — .env tidak pernah ditulis ulang.
 * Mode container tetap seperti semula: `docker compose up`.
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import net from 'node:net'
import { join } from 'node:path'

import { muatEnvRoot, ROOT, turunkanEnv } from './env.mjs'

const WIN = process.platform === 'win32'
const HANYA_BUNUH_PORT = process.argv.includes('--kill-only')
const LEWATI_INSTALL = process.argv.includes('--skip-install')

const C = {
  reset: '\x1b[0m',
  abu: '\x1b[90m',
  merah: '\x1b[31m',
  hijau: '\x1b[32m',
  kuning: '\x1b[33m',
  biru: '\x1b[36m',
  ungu: '\x1b[35m',
  tebal: '\x1b[1m',
}

function info(pesan) {
  console.log(`${C.abu}[dev]${C.reset} ${pesan}`)
}
function peringatan(pesan) {
  console.log(`${C.kuning}[dev]${C.reset} ${pesan}`)
}
function galat(pesan) {
  console.log(`${C.merah}[dev]${C.reset} ${pesan}`)
}

// ---------------------------------------------------------------------------
// 1. Port
// ---------------------------------------------------------------------------

/** PID yang sedang LISTEN di sebuah port TCP. */
function pidDiPort(port) {
  const pids = new Set()

  if (WIN) {
    const out = spawnSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' }).stdout ?? ''
    for (const baris of out.split(/\r?\n/)) {
      const k = baris.trim().split(/\s+/)
      // TCP  0.0.0.0:8080  0.0.0.0:0  LISTENING  12345
      if (k.length < 5 || k[0] !== 'TCP' || k[3] !== 'LISTENING') continue
      if (!k[1].endsWith(`:${port}`)) continue
      const pid = Number(k[4])
      // PID 0 (Idle) dan 4 (System) tidak boleh disentuh.
      if (Number.isInteger(pid) && pid > 4) pids.add(pid)
    }
    return [...pids]
  }

  const lsof = spawnSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' })
  if (lsof.status === 0 && lsof.stdout) {
    for (const b of lsof.stdout.split(/\s+/)) {
      const pid = Number(b)
      if (Number.isInteger(pid) && pid > 1) pids.add(pid)
    }
    return [...pids]
  }
  // Fallback untuk mesin tanpa lsof (image slim).
  const fuser = spawnSync('fuser', [`${port}/tcp`], { encoding: 'utf8' })
  for (const b of `${fuser.stdout ?? ''} ${fuser.stderr ?? ''}`.split(/\s+/)) {
    const pid = Number(b)
    if (Number.isInteger(pid) && pid > 1) pids.add(pid)
  }
  return [...pids]
}

function bunuhPid(pid) {
  if (WIN) {
    // /T ikut membunuh anak-anaknya: `npm run dev` mem-fork tsx/vite, dan
    // membunuh induknya saja meninggalkan port tetap terpakai.
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
    return
  }
  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    /* sudah mati */
  }
  try {
    process.kill(pid, 'SIGKILL')
  } catch {
    /* sudah mati */
  }
}

function portBebas(port) {
  return new Promise((res) => {
    const srv = net.createServer()
    srv.once('error', () => res(false))
    srv.once('listening', () => srv.close(() => res(true)))
    srv.listen(Number(port), '0.0.0.0')
  })
}

const jeda = (ms) => new Promise((r) => setTimeout(r, ms))

async function bebaskanPort(port, label) {
  const pids = pidDiPort(port)
  if (pids.length === 0) return
  peringatan(`port ${port} (${label}) dipakai PID ${pids.join(', ')} — dibunuh.`)
  for (const pid of pids) bunuhPid(pid)

  // Windows melepas socket tidak seketika; tunggu sampai benar-benar bisa di-bind.
  for (let i = 0; i < 20; i++) {
    if (await portBebas(port)) return
    await jeda(150)
  }
  peringatan(`port ${port} masih terpakai setelah 3 detik. ${label} mungkin gagal start.`)
}

// ---------------------------------------------------------------------------
// 2. Dependensi
// ---------------------------------------------------------------------------

const NPM = WIN ? 'npm.cmd' : 'npm'

function jalankanSinkron(perintah, args, cwd) {
  const r = spawnSync(perintah, args, {
    cwd,
    stdio: 'inherit',
    // Node >=20 menolak spawn .cmd tanpa shell.
    shell: WIN,
  })
  return r.status === 0
}

function pastikanDependensi(ws) {
  if (LEWATI_INSTALL) return
  const dir = join(ROOT, ws)
  if (!existsSync(join(dir, 'node_modules'))) {
    info(`node_modules ${ws} belum ada — menjalankan npm install (sekali saja).`)
    if (!jalankanSinkron(NPM, ['install'], dir)) {
      galat(`npm install gagal di ${ws}.`)
      process.exit(1)
    }
  }
  if (ws === 'backend' && !existsSync(join(dir, 'node_modules', '.prisma', 'client'))) {
    info('Prisma Client belum di-generate — menjalankan prisma generate.')
    if (!jalankanSinkron(NPM, ['exec', '--', 'prisma', 'generate'], dir)) {
      galat('prisma generate gagal.')
      process.exit(1)
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Menjalankan service
// ---------------------------------------------------------------------------

const anak = []
let sedangMati = false

function jalankanService({ nama, dir, warna, env }) {
  const proc = spawn(NPM, ['run', 'dev'], {
    cwd: join(ROOT, dir),
    env: { ...process.env, ...env, FORCE_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: WIN,
  })

  const label = `${warna}${nama.padEnd(9)}${C.reset} ${C.abu}|${C.reset} `
  const sambung = (stream, ke) => {
    let sisa = ''
    stream.setEncoding('utf8')
    stream.on('data', (potongan) => {
      const baris = (sisa + potongan).split(/\r?\n/)
      sisa = baris.pop() ?? ''
      for (const b of baris) ke.write(label + b + '\n')
    })
    stream.on('end', () => {
      if (sisa) ke.write(label + sisa + '\n')
    })
  }
  sambung(proc.stdout, process.stdout)
  sambung(proc.stderr, process.stderr)

  proc.on('exit', (kode, sinyal) => {
    if (sedangMati) return
    galat(`${nama} berhenti (kode ${kode ?? sinyal}). Mematikan service lain.`)
    matikanSemua(kode === 0 ? 1 : (kode ?? 1))
  })

  anak.push({ nama, proc })
  return proc
}

function matikanSemua(kode) {
  if (sedangMati) return
  sedangMati = true
  for (const { proc } of anak) {
    if (proc.exitCode !== null || proc.signalCode !== null) continue
    if (WIN) spawnSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' })
    else proc.kill('SIGTERM')
  }
  setTimeout(() => process.exit(kode), WIN ? 400 : 200)
}

async function tungguSiap(url, batasMs) {
  const mulai = Date.now()
  while (Date.now() - mulai < batasMs) {
    if (sedangMati) return false
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(1500) })
      if (r.ok) return true
    } catch {
      /* belum hidup */
    }
    await jeda(400)
  }
  return false
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

const berkasEnv = siapkanEnv()
const PORT_BACKEND = berkasEnv.BACKEND_PORT || '8080'
const PORT_FRONTEND = berkasEnv.FRONTEND_PORT || '3000'
const PORT_SLIK = berkasEnv.MOCK_SLIK_PORT || '9090'

info(`membebaskan port ${PORT_SLIK}, ${PORT_BACKEND}, ${PORT_FRONTEND} ...`)
await bebaskanPort(PORT_SLIK, 'mock-slik')
await bebaskanPort(PORT_BACKEND, 'backend')
await bebaskanPort(PORT_FRONTEND, 'frontend')

if (HANYA_BUNUH_PORT) {
  info('selesai (--kill-only).')
  process.exit(0)
}

// Terjemahan nama host docker -> localhost. Hanya di memori proses ini.
const slikBase = (berkasEnv.SLIK_BASE_URL ?? '').includes('mock-slik')
  ? `http://localhost:${PORT_SLIK}`
  : berkasEnv.SLIK_BASE_URL || `http://localhost:${PORT_SLIK}`

const dbUrl = (berkasEnv.DATABASE_URL ?? '').replace(
  /@db:\d+/,
  `@localhost:${berkasEnv.DB_PORT || '5432'}`,
)

const asalCors = new Set(
  (berkasEnv.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)
asalCors.add(`http://localhost:${PORT_FRONTEND}`)
asalCors.add(`http://127.0.0.1:${PORT_FRONTEND}`)

pastikanDependensi('mock-slik')
pastikanDependensi('backend')
pastikanDependensi('frontend')

console.log('')
info(`menjalankan 3 service ${C.abu}(Ctrl+C untuk menghentikan semuanya)${C.reset}`)

jalankanService({
  nama: 'mock-slik',
  dir: 'mock-slik',
  warna: C.ungu,
  env: {
    ...berkasEnv,
    PORT: PORT_SLIK,
    FIXTURES_PATH: join(ROOT, 'fixtures', 'nasabah-uji.csv'),
  },
})

jalankanService({
  nama: 'backend',
  dir: 'backend',
  warna: C.biru,
  env: {
    ...berkasEnv,
    PORT: PORT_BACKEND,
    DATABASE_URL: dbUrl,
    SLIK_BASE_URL: slikBase,
    CORS_ALLOWED_ORIGINS: [...asalCors].join(','),
  },
})

jalankanService({
  nama: 'frontend',
  dir: 'frontend',
  warna: C.hijau,
  env: {
    ...berkasEnv,
    PORT: PORT_FRONTEND,
    VITE_API_BASE_URL: `http://localhost:${PORT_BACKEND}`,
  },
})

for (const sinyal of ['SIGINT', 'SIGTERM']) {
  process.on(sinyal, () => {
    console.log('')
    info('sinyal berhenti diterima — mematikan semua service.')
    matikanSemua(0)
  })
}

// Banner hanya dicetak kalau backend benar-benar menjawab /health. Kalau tidak,
// jangan berpura-pura semuanya siap — log service di atas yang menjelaskan.
const backendSiap = await tungguSiap(`http://localhost:${PORT_BACKEND}/health`, 60_000)
if (backendSiap && !sedangMati) {
  console.log('')
  console.log(`${C.hijau}${C.tebal}  iMitra siap${C.reset}`)
  console.log(`    Frontend    ${C.tebal}http://localhost:${PORT_FRONTEND}${C.reset}`)
  console.log(`    Backend     http://localhost:${PORT_BACKEND}/health`)
  console.log(`    Mock SLIK   ${slikBase}/health`)
  console.log('')
}
