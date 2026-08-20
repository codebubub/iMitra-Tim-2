/**
 * Klien API approval berjenjang (FR-08, layar S-11).
 *
 * PEMILIK: Eka. Kontrak: docs/SDD-iMitra.md BAB 5. Backend: Dani.
 *
 * DUA HAL YANG SENGAJA TIDAK ADA DI BERKAS INI:
 *
 * 1. Tidak ada fungsi yang menghitung level approval dari total plafon.
 *    Level dihitung server dari tabel ambang_approval pada SETIAP pembacaan
 *    (ADR-0002), karena menolak satu anggota majelis mengubah total dan
 *    dengan begitu mengubah jalurnya (AC-14). Menyalin logika itu ke frontend
 *    berarti dua sumber kebenaran yang akan berbeda saat anggota ditolak.
 *
 * 2. Tidak ada pemeriksaan BR-02 (urutan) atau BR-09 (maker ≠ approver).
 *    Keduanya ditegakkan di server dan diuji AC-10/AC-11 lewat panggilan API
 *    langsung. Layar menonaktifkan tombol HANYA berdasarkan keterangan yang
 *    dikirim server — itu kenyamanan, bukan otorisasi.
 */
import { api } from './client'

export type Keputusan = 'APPROVE' | 'REJECT' | 'RETURN'
export type PeranApprover = 'KCP' | 'KC' | 'KOM'

/**
 * Satu baris antrian. Server sudah memfilter: hanya pengajuan yang level
 * berjalannya diisi oleh peran pemanggil (FR-12). Frontend tidak menyaring.
 */
export type BarisAntrian = {
  id: string
  nomorReferensi: string
  status: string
  /** Level yang sedang menunggu (1, 2, atau 3). Dihitung server. */
  level: number
  totalPlafon: number
}

/**
 * Alasan mengapa keputusan tidak dapat diambil, DITENTUKAN SERVER.
 *
 * `rule` memuat kode BR-nya ('BR-02' atau 'BR-09') sehingga layar dapat
 * menampilkan badge kode itu tanpa menebaknya — sama seperti PanelGalat
 * membaca `rule` dari respons galat.
 */
export type Penghalang = {
  rule: string
  pesan: string
}

/** GET /api/approval/antrian — hanya pengajuan pada level peran pemanggil. */
export function ambilAntrianApproval(): Promise<BarisAntrian[]> {
  return api<BarisAntrian[]>('/api/approval/antrian')
}

/**
 * POST /api/pengajuan/{id}/approval — putuskan.
 *
 * `alasan` wajib untuk REJECT dan RETURN (ditegakkan server). Untuk APPROVE
 * ia opsional. Bila urutan belum tiba (BR-02) atau pemanggil adalah pembuat
 * pengajuan (BR-09), server menjawab 422/403 dengan `rule` terisi — layar
 * menampilkannya lewat PanelGalat, tidak menyembunyikannya.
 */
export function putuskanApproval(
  pengajuanId: string,
  input: { keputusan: Keputusan; alasan?: string },
): Promise<{ id: string; level: number; keputusan: Keputusan; status: string }> {
  return api(`/api/pengajuan/${pengajuanId}/approval`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/**
 * POST /api/pengajuan/{id}/ajukan-approval — ANL mengajukan ke L1.
 * BR-05 diperiksa server: grade 5 berhenti di REJECTED_SCORING.
 */
export function ajukanKeApproval(pengajuanId: string): Promise<{ id: string; status: string }> {
  return api(`/api/pengajuan/${pengajuanId}/ajukan-approval`, { method: 'POST' })
}
