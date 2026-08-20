import { prisma, type PrismaTx } from '../lib/prisma.js'

/**
 * Akses database untuk notifikasi (FR-11).
 *
 * BR-11: kolom `pesan` tidak boleh memuat NIK, nama nasabah, atau path berkas.
 * Yang dipakai untuk mengenali pengajuan adalah NOMOR REFERENSI — ia memang
 * dibuat untuk itu, dan ia bukan data pribadi.
 */

export type NotifikasiBaru = {
  penggunaId: string
  pengajuanId: string | null
  pesan: string
}

export async function tulisBanyak(tx: PrismaTx, baris: NotifikasiBaru[]): Promise<void> {
  if (baris.length === 0) return
  await tx.notifikasi.createMany({ data: baris })
}

export async function daftarUntuk(
  penggunaId: string,
  opsi: { belumDibaca?: boolean; batas: number },
  db: PrismaTx = prisma,
) {
  return db.notifikasi.findMany({
    where: {
      penggunaId,
      ...(opsi.belumDibaca === true ? { dibaca: false } : {}),
    },
    orderBy: { dibuatPada: 'desc' },
    take: opsi.batas,
    include: { pengajuan: { select: { nomorReferensi: true } } },
  })
}

export async function hitungBelumDibaca(
  penggunaId: string,
  db: PrismaTx = prisma,
): Promise<number> {
  return db.notifikasi.count({ where: { penggunaId, dibaca: false } })
}

/**
 * Menandai dibaca HANYA bila notifikasi itu milik pengguna yang meminta.
 * Kepemilikan ada di klausa WHERE, bukan di pemeriksaan terpisah lebih dulu:
 * dengan begitu tidak ada celah antara "memeriksa" dan "mengubah", dan tidak ada
 * jalan bagi pemanggil untuk lupa memeriksanya.
 *
 * Mengembalikan jumlah baris yang benar-benar berubah; 0 berarti notifikasi itu
 * tidak ada ATAU bukan milik pengguna ini. Keduanya dijawab 404 supaya pemanggil
 * tidak bisa memakai bedanya untuk menebak id milik orang lain.
 */
export async function tandaiDibaca(
  id: string,
  penggunaId: string,
  db: PrismaTx = prisma,
): Promise<number> {
  const hasil = await db.notifikasi.updateMany({
    where: { id, penggunaId },
    data: { dibaca: true },
  })
  return hasil.count
}
