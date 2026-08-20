import type { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { AksesDitolak, TidakTerautentikasi } from '../lib/errors.js'
import type { Peran } from '../domain/approval.js'

/**
 * Otorisasi LAPIS 1: siapa boleh memanggil route ini.
 *
 * Lapis 2 (apakah orang ini berhak atas objek ini) ada di service, karena ia
 * memerlukan data — middleware tidak tahu siapa pembuat pengajuan.
 *
 * ATURAN FAIL-CLOSED: setiap route WAJIB mendeklarasikan peran yang diizinkan.
 * Route yang lupa mendeklarasikannya membuat proses GAGAL SAAT START, bukan
 * lolos tanpa otorisasi. Ini mencegah kelas kesalahan yang paling mahal di
 * sistem ini — endpoint baru yang terbuka karena seseorang lupa.
 *
 * AC-02 menguji ini secara langsung: AO yang memanggil endpoint verifikasi
 * dokumen harus mendapat 403, bukan 200 dan bukan 404.
 */

export type PenggunaToken = { id: string; peran: Peran; nama: string }

declare module 'fastify' {
  interface FastifyRequest {
    pengguna?: PenggunaToken
  }
  interface FastifyContextConfig {
    /** Peran yang boleh. `'PUBLIK'` untuk route tanpa autentikasi. */
    peran?: Peran[] | 'PUBLIK'
  }
}

export function buatToken(pengguna: PenggunaToken): string {
  return jwt.sign(
    { sub: pengguna.id, peran: pengguna.peran, nama: pengguna.nama },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
  )
}

function bacaToken(req: FastifyRequest): PenggunaToken {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) throw new TidakTerautentikasi()

  try {
    const isi = jwt.verify(header.slice(7), env.jwtSecret) as jwt.JwtPayload
    return { id: String(isi.sub), peran: isi.peran as Peran, nama: String(isi.nama) }
  } catch {
    // Sengaja tidak membedakan "token kedaluwarsa" dari "tanda tangan salah":
    // keduanya berarti sesi tidak valid, dan membedakannya hanya berguna bagi
    // penyerang.
    throw new TidakTerautentikasi()
  }
}

/** Hook onRequest global. Dipasang sekali di app.ts. */
export async function penjagaPeran(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const diizinkan = req.routeOptions?.config?.peran

  if (diizinkan === undefined) {
    // Tidak seharusnya terjadi: pastikanSemuaRouteBerperan() sudah menolaknya
    // saat start. Ini jaring pengaman terakhir, dan ia menolak, bukan meloloskan.
    throw new AksesDitolak('Route ini belum mendeklarasikan peran yang berwenang')
  }

  if (diizinkan === 'PUBLIK') return

  const pengguna = bacaToken(req)
  req.pengguna = pengguna

  if (!diizinkan.includes(pengguna.peran)) {
    throw new AksesDitolak(
      `Peran ${pengguna.peran} tidak berwenang atas ${req.method} ${req.routeOptions.url}`,
    )
  }
}

/**
 * Dipanggil setelah seluruh route terdaftar dan SEBELUM server mendengarkan.
 * Kalau ada satu saja route tanpa deklarasi peran, proses berhenti.
 */
export function pastikanSemuaRouteBerperan(_app: FastifyInstance): void {
  const tanpaPeran: string[] = []

  // Fastify tidak mengekspos daftar route sebagai API stabil; kami mengumpulkannya
  // lewat hook onRoute di app.ts dan menyimpannya di daftarRoute.
  for (const r of daftarRoute) {
    if (r.peran === undefined) tanpaPeran.push(`${r.method} ${r.url}`)
  }

  if (tanpaPeran.length > 0) {
    throw new Error(
      `Route berikut belum mendeklarasikan config.peran (fail-closed):\n  ${tanpaPeran.join('\n  ')}`,
    )
  }
}

/** Daftar route terdaftar. Dipakai pastikanSemuaRouteBerperan() dan GET /api/_routes (AC-13). */
export const daftarRoute: { method: string; url: string; peran?: Peran[] | 'PUBLIK' }[] = []

// ---------------------------------------------------------------------------
//  LAPISAN KOMPATIBILITAS — jangan dipakai untuk route baru.
//
//  Modul yang ditulis Alfian memakai gaya guard per-route (`requireRole([...])`
//  dipasang sebagai preHandler). Gaya itu OPT-IN: route yang lupa memasangnya
//  akan terbuka tanpa otorisasi, dan tidak ada yang memberi tahu.
//
//  Repo ini memakai gaya FAIL-CLOSED: peran dideklarasikan di `config.peran`
//  pada definisi route, dan `pastikanSemuaRouteBerperan()` menghentikan proses
//  saat start kalau ada satu saja route yang belum mendeklarasikannya.
//  Itulah yang membuat AC-02 tidak bisa gagal karena kelalaian.
//
//  Fungsi di bawah tetap ada supaya berkas Alfian jalan tanpa ditulis ulang.
//  Route baru WAJIB memakai `config: { peran: [...] }`, bukan ini.
// ---------------------------------------------------------------------------

const SEMUA_PERAN: Peran[] = ['AO', 'ANL', 'KCP', 'KC', 'KOM', 'ADM']

export function rbac(peranDiizinkan: Peran[]) {
  return async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const pengguna = req.pengguna
    if (!pengguna) throw new TidakTerautentikasi()
    if (!peranDiizinkan.includes(pengguna.peran)) {
      throw new AksesDitolak(`Peran ${pengguna.peran} tidak berwenang`)
    }
  }
}

export const requireRole = (peranDiizinkan: Peran[]) => rbac(peranDiizinkan)
export const requireAnyRole = () => rbac(SEMUA_PERAN)
export const requireAdmin = () => rbac(['ADM'])
