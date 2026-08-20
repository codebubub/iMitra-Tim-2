import type { Prisma } from '@prisma/client'
import { prisma, type PrismaTx } from '../lib/prisma.js'

/**
 * Akses database untuk audit trail (FR-09).
 *
 * MODUL INI HANYA MENGEKSPOR DUA FUNGSI: tulis() dan cari().
 *
 * Tidak ada ubah(), tidak ada hapus(), dan keduanya tidak boleh ditambahkan —
 * ini lapis ke-2 dari tiga penjagaan append-only (SDD BAB 4.4, AC-13). Lapis ke-1
 * adalah ketiadaan route tulis; lapis ke-3 adalah trigger di database
 * (migrasi 20260820134500). Lapis ke-3 mengikat walaupun dua yang pertama
 * dilanggar, tetapi lapis ini yang membuat pelanggarannya tidak sempat ditulis.
 */

export type BarisAuditBaru = {
  pengajuanId: string | null
  aktorId: string | null
  aktorPeran: string
  aksi: string
  statusSebelum: string | null
  statusSesudah: string | null
  metadata: Record<string, unknown>
}

/**
 * SELALU menerima transaksi. Audit yang ditulis di luar transaksi perubahan
 * datanya bisa tertinggal saat transaksi gagal — dan BR-10 menyatakan tidak ada
 * perubahan status tanpa jejak.
 */
export async function tulis(tx: PrismaTx, baris: BarisAuditBaru): Promise<void> {
  // Satu-satunya tempat metadata dilebur ke tipe JSON Prisma.
  await tx.auditTrail.create({
    data: { ...baris, metadata: baris.metadata as Prisma.InputJsonValue },
  })
}

export type FilterAudit = {
  pengajuanId?: string
  aktorId?: string
  aksi?: string
  /** Inklusif, dibandingkan terhadap terjadi_pada. */
  dari?: Date
  /** Inklusif. Pemanggil yang menaikkannya ke akhir hari bila perlu. */
  sampai?: Date
  batas: number
  lewati: number
}

export type BarisAudit = Awaited<ReturnType<typeof cari>>[number]

/**
 * Urut naik menurut waktu — sama dengan urutan id, karena id bigserial.
 * Dipakai AC-12: penilai membaca riwayat dari pengajuan sampai keputusan.
 */
function bangunWhere(filter: FilterAudit): Prisma.AuditTrailWhereInput {
  const where: Prisma.AuditTrailWhereInput = {}

  if (filter.pengajuanId !== undefined) where.pengajuanId = filter.pengajuanId
  if (filter.aktorId !== undefined) where.aktorId = filter.aktorId
  if (filter.aksi !== undefined) where.aksi = filter.aksi
  if (filter.dari !== undefined || filter.sampai !== undefined) {
    where.terjadiPada = {
      ...(filter.dari !== undefined ? { gte: filter.dari } : {}),
      ...(filter.sampai !== undefined ? { lte: filter.sampai } : {}),
    }
  }
  return where
}

export async function cari(filter: FilterAudit, db: PrismaTx = prisma) {
  return db.auditTrail.findMany({
    where: bangunWhere(filter),
    orderBy: { terjadiPada: 'asc' },
    take: filter.batas,
    skip: filter.lewati,
    include: {
      aktor: { select: { nama: true } },
      pengajuan: { select: { nomorReferensi: true } },
    },
  })
}

/** Jumlah baris yang cocok, untuk paginasi di GET /api/audit. */
export async function hitung(filter: FilterAudit, db: PrismaTx = prisma): Promise<number> {
  return db.auditTrail.count({ where: bangunWhere(filter) })
}
