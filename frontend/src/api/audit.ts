import { api } from './client'

/**
 * Klien audit trail (FR-09, AC-12, AC-13).
 *
 * HANYA MEMBACA. Tidak ada fungsi tulis di sini, dan tidak boleh ditambahkan —
 * audit ditulis dari dalam service backend, tidak pernah dari luar. Daftar route
 * server pun tidak memuat POST/PUT/PATCH/DELETE untuk audit, dan trigger
 * database menolak UPDATE serta DELETE (AC-13, tiga lapis).
 */

export type BarisAudit = {
  id: number
  waktu: string
  /** Nama aktor. '-' untuk LOGIN_GAGAL, yang tidak punya pengguna terverifikasi. */
  aktor: string
  /** Peran SAAT keputusan diambil — disalin, bukan di-join, karena peran bisa berubah. */
  aktorPeran: string
  aksi: string
  statusSebelum: string | null
  statusSesudah: string | null
  /** TANPA data pribadi (BR-11): hanya id internal, kode, angka, dan status. */
  metadata: Record<string, unknown> | null
}

/** AC-12 — riwayat satu pengajuan, urut waktu, dengan aktor di setiap baris. */
export function ambilRiwayatPengajuan(pengajuanId: string): Promise<BarisAudit[]> {
  return api<BarisAudit[]>(`/api/pengajuan/${pengajuanId}/audit`)
}
