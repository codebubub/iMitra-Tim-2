/**
 * Klien API SLIK (FR-05, layar S-08).
 *
 * PEMILIK: Eka. Bentuk respons mengikuti kontrak beku docs/SDD-iMitra.md BAB 5
 * dan tabel hasil_slik di BAB 4.1. Backend: Alfian.
 *
 * ATURAN YANG DIWAKILI TIPE DI BERKAS INI:
 * - `kolektibilitas` bertipe `number | null`. NULL-nya BUKAN kebetulan: saat
 *   panggilan gagal, kolom itu kosong dan sistem TIDAK PERNAH menebak nilai
 *   (BR-11 tabel 4.2, larangan agent nomor 15). Tipe non-null di sini akan
 *   membuat layar menampilkan `0` — persis kesalahan yang dilarang.
 * - Tidak ada NIK lengkap. Server mengirim `nikTersamar` (BR-11).
 * - Keluaran per kolektibilitas (lanjut / lantai grade 3 / tolak otomatis)
 *   TIDAK diputuskan di sini. Layar membaca `keluaran` dari server, karena
 *   Tabel 4.2 adalah aturan bisnis dan tempatnya di backend.
 */
import { api } from './client'

export type StatusPanggilanSlik = 'OK' | 'NOT_FOUND' | 'UNAVAILABLE' | 'TIMEOUT'

/**
 * Satu baris riwayat panggilan SLIK — termasuk yang GAGAL.
 * Baris gagal tetap disimpan dan tetap ditampilkan; itu bukti jejak audit
 * bahwa layanan pernah tidak tersedia, bukan sesuatu yang disembunyikan.
 */
export type BarisRiwayatSlik = {
  id: string
  pengajuanAnggotaId: string
  statusPanggilan: StatusPanggilanSlik
  /** NULL saat gagal. Layar WAJIB merender tanda hubung, bukan angka. */
  kolektibilitas: number | null
  jumlahFasilitasAktif: number | null
  totalBakiDebet: number | null
  tanggalData: string | null
  referenceId: string | null
  diperiksaPada: string
}

/** Hasil satu panggilan SLIK untuk satu anggota (POST .../slik-check). */
export type HasilPanggilanSlik = {
  status: StatusPanggilanSlik
  /** Terisi hanya saat status OK. */
  data?: {
    nama: string
    kolektibilitas: number
    jumlahFasilitasAktif: number
    totalBakiDebet: number
    tanggalData: string
    referenceId: string
  }
  /** Kode galat teknis dari klien SLIK, mis. NIK_NOT_FOUND / SERVICE_UNAVAILABLE. */
  error?: string
}

/** GET /api/pengajuan/{id}/slik — riwayat panggilan, terbaru di atas. */
export function ambilRiwayatSlik(pengajuanId: string): Promise<BarisRiwayatSlik[]> {
  return api<BarisRiwayatSlik[]>(`/api/pengajuan/${pengajuanId}/slik`)
}

/**
 * POST /api/pengajuan/{id}/slik-check — jalankan pemeriksaan untuk satu anggota.
 *
 * NIK dikirim di BODY, bukan di URL: URL masuk ke access log dan riwayat
 * browser, dan NIK adalah data pribadi (BR-11).
 */
export function jalankanSlikCheck(pengajuanId: string, nik: string): Promise<HasilPanggilanSlik> {
  return api<HasilPanggilanSlik>(`/api/pengajuan/${pengajuanId}/slik-check`, {
    method: 'POST',
    body: JSON.stringify({ nik }),
  })
}
