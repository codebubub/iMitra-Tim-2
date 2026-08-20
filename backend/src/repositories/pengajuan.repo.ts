import { prisma, type PrismaTx } from '../lib/prisma.js'

/**
 * Akses data untuk agregat pengajuan: anggota, dokumen, survei, dan keputusan
 * approval (FR-02, FR-03, FR-04, FR-08, FR-10).
 *
 * Satu-satunya tempat Prisma dipakai untuk agregat ini. Service memanggil fungsi
 * di sini; ia tidak pernah menulis query sendiri. Fungsi yang menerima `db`
 * dipakai di dalam transaksi service supaya penulisan data dan audit menyatu.
 */

export function cariPengajuan(id: string, db: PrismaTx = prisma) {
  return db.pengajuan.findUnique({
    where: { id },
    include: { anggota: true },
  })
}

export function cariPengajuanDenganNasabah(id: string, db: PrismaTx = prisma) {
  return db.pengajuan.findUnique({
    where: { id },
    include: { anggota: { include: { nasabah: true } }, pembuat: true },
  })
}

export function cariAnggota(anggotaId: string, db: PrismaTx = prisma) {
  return db.pengajuanAnggota.findUnique({
    where: { id: anggotaId },
    include: { pengajuan: true },
  })
}

// --- Dokumen (FR-03) -------------------------------------------------------

/** Versi yang sudah ada untuk satu (anggota, jenis) — dipakai menghitung versi baru. */
export function versiDokumen(
  pengajuanAnggotaId: string,
  jenis: 'KTP' | 'KK' | 'SKU',
  db: PrismaTx = prisma,
) {
  return db.dokumen.findMany({
    where: { pengajuanAnggotaId, jenis },
    select: { versi: true },
    orderBy: { versi: 'desc' },
  })
}

export function buatDokumen(
  data: {
    pengajuanAnggotaId: string
    jenis: 'KTP' | 'KK' | 'SKU'
    versi: number
    pathBerkas: string
    mime: string
    ukuranByte: number
    diunggahOleh: string
  },
  db: PrismaTx = prisma,
) {
  return db.dokumen.create({ data })
}

export function cariDokumen(dokumenId: string, db: PrismaTx = prisma) {
  return db.dokumen.findUnique({
    where: { id: dokumenId },
    include: { anggota: { include: { pengajuan: true } } },
  })
}

/** Semua dokumen sebuah pengajuan, lewat anggotanya. */
export function daftarDokumenPengajuan(pengajuanId: string, db: PrismaTx = prisma) {
  return db.dokumen.findMany({
    where: { anggota: { pengajuanId } },
    orderBy: [{ pengajuanAnggotaId: 'asc' }, { jenis: 'asc' }, { versi: 'asc' }],
  })
}

/** Versi tertinggi per (anggota, jenis) — dasar prasyarat BR-03. */
export async function dokumenTerbaruPerJenis(pengajuanId: string, db: PrismaTx = prisma) {
  const semua = await db.dokumen.findMany({
    where: { anggota: { pengajuanId, statusAnggota: 'AKTIF' } },
    orderBy: { versi: 'desc' },
  })
  const terlihat = new Set<string>()
  const terbaru: typeof semua = []
  for (const d of semua) {
    const kunci = `${d.pengajuanAnggotaId}:${d.jenis}`
    if (terlihat.has(kunci)) continue
    terlihat.add(kunci)
    terbaru.push(d)
  }
  return terbaru
}

// --- Survei (FR-04) --------------------------------------------------------

export function buatSurvei(
  data: {
    pengajuanId: string
    latitude: number
    longitude: number
    fotoPath: string
    omzetHarian: bigint
    lamaUsahaBulan: number
    catatan: string
    direkamOleh: string
  },
  db: PrismaTx = prisma,
) {
  return db.survei.create({ data })
}

export function cariSurvei(surveiId: string, db: PrismaTx = prisma) {
  return db.survei.findUnique({
    where: { id: surveiId },
    include: { pengajuan: true },
  })
}

export function daftarSurvei(pengajuanId: string, db: PrismaTx = prisma) {
  return db.survei.findMany({
    where: { pengajuanId },
    orderBy: { direkamPada: 'desc' },
  })
}

// --- Approval (FR-08) ------------------------------------------------------

export function daftarKeputusan(pengajuanId: string, db: PrismaTx = prisma) {
  return db.keputusanApprovalRow.findMany({
    where: { pengajuanId },
    orderBy: { level: 'asc' },
  })
}
