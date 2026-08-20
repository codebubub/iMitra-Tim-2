import type { Peran } from '@prisma/client'
import { prisma, type PrismaTx } from '../lib/prisma.js'

/**
 * Akses database untuk tabel `pengguna` (FR-01).
 *
 * ATURAN YANG TIDAK BOLEH DILANGGAR DI SINI: `passwordHash` tidak pernah ikut
 * keluar dari modul ini kecuali lewat `ambilUntukAutentikasi()`, yang namanya
 * sengaja panjang supaya pemakaian di luar jalur login terlihat mencolok saat
 * review. Seluruh fungsi lain memakai `KOLOM_AMAN`.
 */

const KOLOM_AMAN = {
  id: true,
  username: true,
  nama: true,
  peran: true,
  aktif: true,
  dibuatPada: true,
} as const

export type PenggunaAman = {
  id: string
  username: string
  nama: string
  peran: Peran
  aktif: boolean
  dibuatPada: Date
}

/** Satu-satunya fungsi yang mengembalikan hash kata sandi. Hanya untuk login. */
export async function ambilUntukAutentikasi(username: string, db: PrismaTx = prisma) {
  return db.pengguna.findUnique({ where: { username } })
}

export async function daftar(
  filter: { peran?: Peran; aktif?: boolean },
  db: PrismaTx = prisma,
): Promise<PenggunaAman[]> {
  return db.pengguna.findMany({
    where: {
      ...(filter.peran !== undefined ? { peran: filter.peran } : {}),
      ...(filter.aktif !== undefined ? { aktif: filter.aktif } : {}),
    },
    select: KOLOM_AMAN,
    orderBy: [{ peran: 'asc' }, { username: 'asc' }],
  })
}

export async function ambil(id: string, db: PrismaTx = prisma): Promise<PenggunaAman | null> {
  return db.pengguna.findUnique({ where: { id }, select: KOLOM_AMAN })
}

export async function ambilLewatUsername(
  username: string,
  db: PrismaTx = prisma,
): Promise<PenggunaAman | null> {
  return db.pengguna.findUnique({ where: { username }, select: KOLOM_AMAN })
}

export async function buat(
  data: { username: string; nama: string; peran: Peran; passwordHash: string },
  db: PrismaTx = prisma,
): Promise<PenggunaAman> {
  return db.pengguna.create({ data, select: KOLOM_AMAN })
}

export async function ubah(
  id: string,
  data: { nama?: string; peran?: Peran; aktif?: boolean; passwordHash?: string },
  db: PrismaTx = prisma,
): Promise<PenggunaAman> {
  return db.pengguna.update({ where: { id }, data, select: KOLOM_AMAN })
}

/**
 * Dipakai untuk menjaga agar sistem tidak pernah kehilangan seluruh admin
 * aktifnya. Lihat alasannya di services/pengguna.service.ts.
 */
export async function hitungAdminAktif(db: PrismaTx = prisma): Promise<number> {
  return db.pengguna.count({ where: { peran: 'ADM', aktif: true } })
}
