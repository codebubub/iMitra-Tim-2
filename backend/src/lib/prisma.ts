import { PrismaClient } from '@prisma/client'
import { env } from '../config/env.js'

/**
 * Satu instance Prisma untuk seluruh proses.
 *
 * HANYA berkas di `repositories/` yang boleh mengimpor modul ini. Aturan itu
 * ditegakkan lint (`import/no-restricted-paths` di .eslintrc.cjs), bukan hanya
 * disepakati — kesepakatan yang tidak ditegakkan akan dilanggar pada jam ke-7.
 */
export const prisma = new PrismaClient({
  datasources: { db: { url: env.databaseUrl } },
  log: env.logLevel === 'debug' ? ['warn', 'error'] : ['error'],
})

/** Tipe transaksi Prisma, dipakai repository yang menerima transaksi dari service. */
export type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/**
 * BigInt tidak bisa diserialkan JSON secara bawaan, dan seluruh nilai rupiah
 * kami bertipe BigInt (supaya tidak ada yang tergoda memakai float untuk uang).
 * Konversi dilakukan di batas HTTP, bukan dengan mengubah tipe kolom.
 */
export function rupiahKeNumber(nilai: bigint): number {
  const n = Number(nilai)
  if (!Number.isSafeInteger(n)) {
    throw new Error(`Nilai rupiah ${nilai} melebihi batas aman Number`)
  }
  return n
}
