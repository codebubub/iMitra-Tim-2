#!/usr/bin/env node
/**
 * Menjalankan skrip npm sebuah workspace DENGAN .env root sudah dimuat.
 *
 *   node scripts/dengan-env.mjs backend migrate:deploy
 *   node scripts/dengan-env.mjs backend seed
 *
 * Kenapa perlu: Prisma CLI hanya membaca `.env` di sebelah schema-nya
 * (backend/.env), sedangkan repo ini menyimpan satu-satunya .env di root.
 * Tanpa pembungkus ini, `npm --prefix backend run migrate:deploy` jalan tanpa
 * DATABASE_URL dan gagal dengan pesan yang menyesatkan.
 *
 * Sama seperti scripts/dev.mjs, nama host docker diterjemahkan ke localhost
 * untuk mode native — .env tidak pernah ditulis ulang.
 */

import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

import { muatEnvRoot, ROOT, turunkanEnv } from './env.mjs'

const [workspace, ...args] = process.argv.slice(2)

if (!workspace || args.length === 0) {
  console.error('Pemakaian: node scripts/dengan-env.mjs <workspace> <skrip-npm> [argumen...]')
  process.exit(2)
}

let berkasEnv
try {
  berkasEnv = muatEnvRoot()
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
}

const turunan = turunkanEnv(berkasEnv)

const hasil = spawnSync(`npm run ${args.join(' ')}`, {
  cwd: join(ROOT, workspace),
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    ...berkasEnv,
    DATABASE_URL: turunan.databaseUrl,
    SLIK_BASE_URL: turunan.slikBaseUrl,
    FIXTURES_PATH: turunan.fixturesPath,
  },
})

process.exit(hasil.status ?? 1)
