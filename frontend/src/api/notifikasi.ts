/**
 * Klien API notifikasi (FR-11).
 *
 * PEMILIK: Ray. Notifikasi milik pengguna saat ini; teksnya sudah bebas data
 * pribadi dari server (BR-11). Frontend hanya menampilkan dan menandai dibaca.
 *
 * Bentuk respons mengikuti kontrak beku (docs/SDD-iMitra.md BAB 5 +
 * services/notifikasi.service.ts): GET mengembalikan OBJEK
 * `{ belumDibaca, baris[] }` — bukan array telanjang — supaya jumlah belum
 * dibaca dihitung server (satu query COUNT), bukan diturunkan ulang di klien
 * dari halaman yang mungkin terpotong `batas`.
 */
import { api } from './client'

export type Notifikasi = {
  id: string
  pengajuanId: string | null
  /** Nomor referensi pengajuan terkait; null untuk notifikasi non-pengajuan. */
  nomorReferensi: string | null
  pesan: string
  dibaca: boolean
  dibuatPada: string
}

export type DaftarNotifikasi = {
  /** Jumlah belum dibaca dihitung server (COUNT), bukan dari panjang `baris`. */
  belumDibaca: number
  baris: Notifikasi[]
}

/** GET /api/notifikasi — notifikasi milik pengguna saat ini. */
export function ambilNotifikasi(opsi?: {
  belumDibaca?: boolean
  batas?: number
}): Promise<DaftarNotifikasi> {
  const qs = new URLSearchParams()
  if (opsi?.belumDibaca !== undefined) qs.set('belumDibaca', String(opsi.belumDibaca))
  if (opsi?.batas !== undefined) qs.set('batas', String(opsi.batas))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return api<DaftarNotifikasi>(`/api/notifikasi${suffix}`)
}

/**
 * POST /api/notifikasi/{id}/baca — tandai satu notifikasi dibaca.
 * Server hanya membalas `{ status: 'ok' }`; baris terbaru diambil ulang lewat
 * invalidasi query, bukan dari respons ini.
 */
export function tandaiDibaca(id: string): Promise<{ status: string }> {
  return api<{ status: string }>(`/api/notifikasi/${id}/baca`, { method: 'POST' })
}
