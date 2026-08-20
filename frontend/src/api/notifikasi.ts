/**
 * Klien API notifikasi (FR-11).
 *
 * PEMILIK: Ray. Notifikasi milik pengguna saat ini; teksnya sudah bebas data
 * pribadi dari server (BR-11). Frontend hanya menampilkan dan menandai dibaca.
 */
import { api } from './client'

export type Notifikasi = {
  id: string
  pengajuanId: string | null
  pesan: string
  dibaca: boolean
  dibuatPada: string
}

/** GET /api/notifikasi — notifikasi milik pengguna saat ini. */
export function ambilNotifikasi(): Promise<Notifikasi[]> {
  return api<Notifikasi[]>('/api/notifikasi')
}

/** POST /api/notifikasi/{id}/baca — tandai satu notifikasi dibaca. */
export function tandaiDibaca(id: string): Promise<Notifikasi> {
  return api<Notifikasi>(`/api/notifikasi/${id}/baca`, { method: 'POST' })
}
