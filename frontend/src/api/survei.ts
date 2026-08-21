/**
 * Klien API domain survei lapangan (FR-04).
 *
 * PEMILIK: Ray. Dua sisi: AO MEREKAM survei (koordinat, foto, omzet) dan ANL
 * MENILAI-nya (skala kondisi usaha 1–5 + VALID/TIDAK_VALID, asumsi A-10).
 * Penilaian 1–5 TIDAK diisi AO — kalau muncul di layar AO, itu bug.
 *
 * BENTUK KONTRAK (docs/SDD-iMitra.md BAB 5 + routes/survei.ts): perekaman
 * dikirim sebagai JSON, bukan multipart — repo backend sengaja tidak menambah
 * dependensi multipart (AGENTS.md bagian 6 butir 1), jadi foto dikirim sebagai
 * base64 di dalam JSON. Kontrak menerima SATU foto per perekaman
 * (`fotoBase64` + `fotoMime`), dan koordinat WAJIB (server menolak tanpa
 * keduanya) — layar menyediakan fallback isian manual bila GPS gagal.
 */
import { api } from './client'

export type StatusSurvei = 'DRAFT' | 'VALID' | 'TIDAK_VALID'

/**
 * Bentuk yang benar-benar dikembalikan `GET /api/pengajuan/{id}/survei`
 * (services/survei.service.ts). Server TIDAK mengembalikan URL foto maupun
 * identitas perekam/penilai pada daftar ini — hanya fakta terukur + status.
 */
export type Survei = {
  id: string
  latitude: number
  longitude: number
  omzetHarian: number
  lamaUsahaBulan: number
  /** 1–5, diisi ANL (A-10). NULL sebelum dinilai. */
  kondisiUsahaSkala: number | null
  catatan: string
  status: StatusSurvei
  direkamPada: string
  dinilaiPada: string | null
}

export type RekamSurveiInput = {
  latitude: number
  longitude: number
  omzetHarian: number
  lamaUsahaBulan: number
  catatan: string
  /** Satu foto tempat usaha; server menyimpan satu path per perekaman. */
  fotoBase64: string
  fotoMime: string
}

/** GET /api/pengajuan/{id}/survei — daftar survei. */
export function ambilDaftarSurvei(pengajuanId: string): Promise<Survei[]> {
  return api<Survei[]>(`/api/pengajuan/${pengajuanId}/survei`)
}

/**
 * POST /api/pengajuan/{id}/survei — AO merekam survei (JSON, foto base64).
 * Lewat helper `api()` biasa: kontraknya JSON, bukan multipart.
 */
export function rekamSurvei(pengajuanId: string, input: RekamSurveiInput): Promise<Survei> {
  return api<Survei>(`/api/pengajuan/${pengajuanId}/survei`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/**
 * POST /api/survei/{surveiId}/nilai — ANL menilai. Skala 1–5 + status.
 * Skoring memerlukan minimal satu survei berstatus VALID (BR-03).
 */
export function nilaiSurvei(
  surveiId: string,
  input: { kondisiUsahaSkala: number; status: 'VALID' | 'TIDAK_VALID' },
): Promise<Survei> {
  return api<Survei>(`/api/survei/${surveiId}/nilai`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
