import { prisma, type PrismaTx } from '../lib/prisma.js'
import { KesalahanKonfigurasi } from '../lib/errors.js'
import type { BobotKomponen, ParameterSkalar } from '../domain/skoring.js'
import type { BarisRentangMargin } from '../domain/margin.js'
import type { BarisAmbangApproval, Peran } from '../domain/approval.js'

/**
 * Pembacaan parameter bisnis dari database (FR-13, ADR-0003).
 *
 * TIDAK ADA CACHE. Bukan cache dengan TTL, bukan cache dengan invalidasi manual,
 * bukan variabel tingkat modul. Setiap fungsi di sini melakukan query.
 *
 * Kenapa: AC-15 mensyaratkan perubahan ADM berlaku pada perhitungan BERIKUTNYA
 * tanpa restart. Cache apa pun membuat AC itu gagal, atau — lebih buruk — lolos
 * di laptop pengembang yang baru saja restart dan gagal di depan penilai.
 *
 * Kalau suatu saat ini menjadi masalah kinerja, jawabannya indeks atau read
 * replica. BUKAN cache di proses.
 */

const KODE_SKALAR = {
  MARGIN_REFERENSI_SKORING: 'MARGIN_REFERENSI_SKORING',
  HARI_KERJA_PER_BULAN: 'HARI_KERJA_PER_BULAN',
  MARGIN_USAHA_PERSEN: 'MARGIN_USAHA_PERSEN',
  SLIK_MASA_BERLAKU_HARI: 'SLIK_MASA_BERLAKU_HARI',
} as const

export async function bacaBobotKomponen(db: PrismaTx = prisma): Promise<BobotKomponen> {
  const baris = await db.parameterSkoring.findMany({ where: { bobot: { not: null } } })
  const peta = Object.fromEntries(baris.map((b) => [b.kode, Number(b.bobot)]))

  for (const kode of ['KAPASITAS_BAYAR', 'RIWAYAT_SLIK', 'LAMA_USAHA', 'HASIL_SURVEI']) {
    if (typeof peta[kode] !== 'number') {
      throw new KesalahanKonfigurasi(`Bobot komponen ${kode} belum diatur di parameter_skoring`)
    }
  }
  return peta as unknown as BobotKomponen
}

export async function bacaParameterSkalar(db: PrismaTx = prisma): Promise<ParameterSkalar> {
  const baris = await db.parameterSkoring.findMany()
  const peta = new Map(baris.map((b) => [b.kode, b]))

  const skalar = (kode: string): number => {
    const b = peta.get(kode)
    if (!b || b.nilai === null) {
      throw new KesalahanKonfigurasi(`Parameter ${kode} belum diatur di parameter_skoring`)
    }
    return Number(b.nilai)
  }

  const aturan = (kode: string): Record<string, number> => {
    const b = peta.get(kode)
    if (!b || b.aturan === null) {
      throw new KesalahanKonfigurasi(`Aturan komponen ${kode} belum diatur di parameter_skoring`)
    }
    return b.aturan as Record<string, number>
  }

  const kapasitas = aturan('KAPASITAS_BAYAR')
  const lamaUsaha = aturan('LAMA_USAHA')

  return {
    marginReferensiSkoring: skalar(KODE_SKALAR.MARGIN_REFERENSI_SKORING),
    hariKerjaPerBulan: skalar(KODE_SKALAR.HARI_KERJA_PER_BULAN),
    marginUsahaPersen: skalar(KODE_SKALAR.MARGIN_USAHA_PERSEN),
    rasioPenuh: kapasitas.penuh,
    rasioNol: kapasitas.nol,
    lamaUsahaPenuhBulan: lamaUsaha.penuh,
    lamaUsahaNolBulan: lamaUsaha.nol,
  }
}

export async function bacaMasaBerlakuSlikHari(db: PrismaTx = prisma): Promise<number> {
  const b = await db.parameterSkoring.findUnique({
    where: { kode: KODE_SKALAR.SLIK_MASA_BERLAKU_HARI },
  })
  if (!b || b.nilai === null) {
    throw new KesalahanKonfigurasi(
      `Parameter ${KODE_SKALAR.SLIK_MASA_BERLAKU_HARI} belum diatur (BR-04)`,
    )
  }
  return Number(b.nilai)
}

export async function bacaRentangMargin(db: PrismaTx = prisma): Promise<BarisRentangMargin[]> {
  const baris = await db.rentangMargin.findMany({ orderBy: { grade: 'asc' } })
  if (baris.length === 0) throw new KesalahanKonfigurasi('Tabel rentang_margin kosong')

  return baris.map((b) => ({
    grade: b.grade,
    marginMin: b.marginMin === null ? null : Number(b.marginMin),
    marginMaks: b.marginMaks === null ? null : Number(b.marginMaks),
    nisbahMin: b.nisbahMin === null ? null : Number(b.nisbahMin),
    nisbahMaks: b.nisbahMaks === null ? null : Number(b.nisbahMaks),
    dibiayai: b.dibiayai,
  }))
}

export async function bacaRentangGrade(db: PrismaTx = prisma) {
  const baris = await db.rentangMargin.findMany({ orderBy: { grade: 'asc' } })
  return baris.map((b) => ({
    grade: b.grade,
    skorMin: b.skorMin,
    skorMaks: b.skorMaks,
    dibiayai: b.dibiayai,
  }))
}

export async function bacaAmbangApproval(db: PrismaTx = prisma): Promise<BarisAmbangApproval[]> {
  const baris = await db.ambangApproval.findMany({ orderBy: { plafonMin: 'asc' } })
  if (baris.length === 0) throw new KesalahanKonfigurasi('Tabel ambang_approval kosong')

  return baris.map((b) => ({
    plafonMin: Number(b.plafonMin),
    plafonMaks: Number(b.plafonMaks),
    urutanPeran: b.urutanPeran as Peran[],
  }))
}

/**
 * Snapshot seluruh parameter yang dipakai satu eksekusi skoring, disimpan
 * bersama hasilnya (ADR-0003). Supaya hasil lama tetap bisa direkonstruksi
 * setelah ADM mengubah bobot — auditor perlu tahu skor SAAT keputusan dibuat.
 */
export async function ambilSnapshotParameter(db: PrismaTx = prisma) {
  const [bobot, skalar, rentang] = await Promise.all([
    bacaBobotKomponen(db),
    bacaParameterSkalar(db),
    bacaRentangGrade(db),
  ])
  return { bobot, skalar, rentangGrade: rentang, diambilPada: new Date().toISOString() }
}
