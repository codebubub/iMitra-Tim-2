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
    // TANPA `-p tcp`: filter itu hanya menampilkan TCP IPv4. Vite mendengarkan di
    // `[::]:3000`, jadi dengan filter tersebut ia tak terlihat — port tampak
    // kosong padahal terpakai.
    const out = spawnSync('netstat', ['-ano'], { encoding: 'utf8' }).stdout ?? ''
    for (const baris of out.split(/\r?\n/)) {
      const k = baris.trim().split(/\s+/)
      // TCP  0.0.0.0:8080  0.0.0.0:0  LISTENING  12345
      // TCP  [::]:3000     [::]:0     LISTENING  12345
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

/**
 * Container Docker yang MEMPUBLIKASIKAN port ini.
 *
 * Wajib ada: di Windows, port yang dipublikasikan Docker Desktop TIDAK muncul
 * sebagai listener di `netstat` (relay-nya hidup di sisi WSL). Tanpa cek ini,
 * `docker compose up` yang lupa dimatikan membuat dev.mjs mengira port kosong,
 * lalu backend mati dengan EADDRINUSE beberapa detik kemudian.
 */
function containerDiPort(port) {
  // TANPA shell, sengaja: `docker` adalah .exe sungguhan (bisa di-spawn langsung),
  // dan lewat cmd.exe tanda `|` di string format akan dibaca sebagai pipe.
  const r = spawnSync('docker', ['ps', '--format', '{{.ID}}|{{.Names}}|{{.Ports}}'], {
    encoding: 'utf8',
  })
  if (r.status !== 0 || !r.stdout) return [] // docker tidak terpasang / tidak jalan
  const hasil = []
  for (const baris of r.stdout.split(/\r?\n/)) {
    const [id, nama, ports] = baris.split('|')
    if (!id || !ports) continue
    // "0.0.0.0:3000->80/tcp, [::]:3000->80/tcp"
    if (ports.includes(`:${port}->`)) hasil.push({ id, nama: nama || id })
  }
  return hasil
}

function cobaBind(port, host) {
  return new Promise((res) => {
    const srv = net.createServer()
    // Hanya EADDRINUSE yang berarti "terpakai". EAFNOSUPPORT/EADDRNOTAVAIL
    // artinya keluarga alamat itu tidak ada di mesin ini — bukan bentrok.
    srv.once('error', (e) => res(e.code !== 'EADDRINUSE'))
    srv.once('listening', () => srv.close(() => res(true)))
    srv.listen(Number(port), host)
  })
}

/**
 * Port dianggap bebas hanya kalau IPv4 DAN IPv6 dua-duanya bisa di-bind.
 * Vite (`host: true`) mendengarkan di `[::]`, sedangkan Fastify di `0.0.0.0`:
 * memeriksa satu keluarga saja membuat separuh kasus bentrok lolos.
 */
async function portBebas(port) {
  return (await cobaBind(port, '0.0.0.0')) && (await cobaBind(port, '::'))
}

const jeda = (ms) => new Promise((r) => setTimeout(r, ms))

async function tungguBebas(port, batasMs) {
  const mulai = Date.now()
  do {
    if (await portBebas(port)) return true
    await jeda(200)
  } while (Date.now() - mulai < batasMs)
  return false
}

/** Mengosongkan satu port. Mengembalikan false kalau tetap tidak bisa dibebaskan. */
async function bebaskanPort(port, label) {
  if (await portBebas(port)) return true

  const pids = pidDiPort(port)
  if (pids.length > 0) {
    peringatan(`port ${port} (${label}) dipakai PID ${pids.join(', ')} — dibunuh.`)
    for (const pid of pids) bunuhPid(pid)
    // Windows melepas socket tidak seketika; beri waktu sebentar.
    if (await tungguBebas(port, 3000)) return true
  }

  const containers = containerDiPort(port)
  for (const c of containers) {
    peringatan(`port ${port} (${label}) dipegang container docker "${c.nama}" — dihentikan.`)
    spawnSync('docker', ['stop', c.id], { stdio: 'ignore' })
  }
  /**
   * 45 detik, bukan 15.
   *
   * `docker stop` sendiri menunggu SIGTERM sampai 10 detik sebelum SIGKILL, dan
   * SETELAH container mati, proxy port Docker Desktop di Windows masih perlu
   * beberapa detik lagi untuk melepas bind-nya. Batas 15 detik membuat tiga
   * container berturut-turut dilaporkan "tidak bisa dibebaskan" padahal semuanya
   * berhenti dengan benar — pesan yang salah menuduh, dan menyuruh orang mencari
   * proses yang tidak ada.
   */
  if (await tungguBebas(port, containers.length > 0 ? 45000 : 2000)) return true

  galat(`port ${port} (${label}) tidak bisa dibebaskan.`)
  if (containers.length > 0 || pids.length === 0) {
    // Kasus nyata di Windows: container sudah `Exited`, `netstat` tidak
    // menampilkan listener apa pun, tetapi bind tetap EADDRINUSE — lapisan
    // penerus port Docker Desktop belum melepasnya. Menyuruh orang "tutup
    // prosesnya" tidak menolong; ini yang menolong.
    info(`  coba: docker rm ${containers[0]?.nama ?? '<container>'} , atau restart Docker Desktop`)
    info(`  atau jalankan di port lain: BACKEND_PORT=8180 FRONTEND_PORT=3100 MOCK_SLIK_PORT=9190 npm run dev`)
  }
  return false
}

// ---------------------------------------------------------------------------
// 2. Dependensi
// ---------------------------------------------------------------------------

function jalankanSinkron(perintah, cwd) {
  const r = spawnSync(perintah, { cwd, stdio: 'inherit', shell: true })
  return r.status === 0
}

function pastikanDependensi(ws) {
  if (LEWATI_INSTALL) return
  const dir = join(ROOT, ws)
  if (!existsSync(join(dir, 'node_modules'))) {
    info(`node_modules ${ws} belum ada — menjalankan npm install (sekali saja).`)
    if (!jalankanSinkron('npm install', dir)) {
      galat(`npm install gagal di ${ws}.`)
      process.exit(1)
    }
  }
  if (ws === 'backend' && !existsSync(join(dir, 'node_modules', '.prisma', 'client'))) {
    info('Prisma Client belum di-generate — menjalankan prisma generate.')
    if (!jalankanSinkron('npm exec -- prisma generate', dir)) {
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

function jalankanService({ nama, dir, warna, env, argsTambahan = '' }) {
  // Perintah sebagai SATU string dengan shell: true. Dua alasan: `npm.cmd` tidak
  // bisa di-spawn tanpa shell sejak Node 20, dan bentuk (perintah, args[], shell)
  // memicu DeprecationWarning DEP0190 di setiap start.
  const proc = spawn(`npm run dev${argsTambahan ? ` -- ${argsTambahan}` : ''}`, {
    cwd: join(ROOT, dir),
    env: { ...process.env, ...env, FORCE_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
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

let berkasEnv
try {
  berkasEnv = muatEnvRoot({
    onSalin: () =>
      peringatan('.env belum ada — disalin dari .env.example. Periksa DATABASE_URL & JWT_SECRET.'),
  })
} catch (err) {
  galat(err instanceof Error ? err.message : String(err))
  process.exit(1)
}

const turunan = turunkanEnv(berkasEnv)
const PORT_BACKEND = turunan.portBackend
const PORT_FRONTEND = turunan.portFrontend
const PORT_SLIK = turunan.portSlik

info(`membebaskan port ${PORT_SLIK}, ${PORT_BACKEND}, ${PORT_FRONTEND} ...`)
const semuaBebas = [
  await bebaskanPort(PORT_SLIK, 'mock-slik'),
  await bebaskanPort(PORT_BACKEND, 'backend'),
  await bebaskanPort(PORT_FRONTEND, 'frontend'),
].every(Boolean)

if (HANYA_BUNUH_PORT) {
  info(semuaBebas ? 'selesai (--kill-only).' : 'selesai dengan port yang masih terpakai.')
  process.exit(semuaBebas ? 0 : 1)
}

// Berhenti di sini, bukan lanjut. `tsx watch` TIDAK mati saat aplikasinya kena
// EADDRINUSE — ia tetap hidup dan menunggu perubahan berkas, jadi service yang
// gagal bind akan tampak "jalan" padahal mati. Lebih baik satu pesan jelas.
if (!semuaBebas) {
  galat('Ada port yang masih dipakai proses lain. Tutup proses itu lalu ulangi.')
  process.exit(1)
}

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
    FIXTURES_PATH: turunan.fixturesPath,
  },
})

jalankanService({
  nama: 'backend',
  dir: 'backend',
  warna: C.biru,
  env: {
    ...berkasEnv,
    PORT: PORT_BACKEND,
    DATABASE_URL: turunan.databaseUrl,
    SLIK_BASE_URL: turunan.slikBaseUrl,
    CORS_ALLOWED_ORIGINS: turunan.corsAllowedOrigins,
  },
})

jalankanService({
  nama: 'frontend',
  dir: 'frontend',
  warna: C.hijau,
  // --strictPort: tanpa ini Vite diam-diam pindah ke 3001 kalau 3000 terpakai,
  // dan alamat itu tidak ada di CORS_ALLOWED_ORIGINS backend — gejalanya jadi
  // "login gagal tanpa pesan", bukan "port bentrok".
  argsTambahan: `--strictPort --port ${PORT_FRONTEND}`,
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
  console.log(`    Mock SLIK   ${turunan.slikBaseUrl}/health`)
  console.log('')
}
