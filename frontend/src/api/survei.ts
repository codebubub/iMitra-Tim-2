/**
 * Klien API domain survei lapangan (FR-04).
 *
 * PEMILIK: Ray. Dua sisi: AO MEREKAM survei (koordinat, foto, omzet) dan ANL
 * MENILAI-nya (skala kondisi usaha 1–5 + VALID/TIDAK_VALID, asumsi A-10).
 * Penilaian 1–5 TIDAK diisi AO — kalau muncul di layar AO, itu bug.
 *
 * Foto diunggah sebagai multipart; sisanya JSON.
 */
import { api, ambilToken, hapusToken, type GalatApi } from './client'

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export type StatusSurvei = 'DRAFT' | 'VALID' | 'TIDAK_VALID'

export type Survei = {
  id: string
  pengajuanId: string
  latitude: number | null
  longitude: number | null
  /** URL foto (id berkas, BR-11) — minimal satu saat dikirim. */
  fotoUrl: string[]
  omzetHarian: number
  lamaUsahaBulan: number
  /** 1–5, diisi ANL (A-10). NULL sebelum dinilai. */
  kondisiUsahaSkala: number | null
  catatan: string
  status: StatusSurvei
  direkamOleh: { id: string; nama: string } | null
  dinilaiOleh: { id: string; nama: string } | null
  direkamPada: string
  dinilaiPada: string | null
}

export type RekamSurveiInput = {
  latitude: number | null
  longitude: number | null
  omzetHarian: number
  lamaUsahaBulan: number
  catatan: string
  /** Minimal satu foto tempat usaha. */
  foto: File[]
}

/** GET /api/pengajuan/{id}/survei — daftar survei. */
export function ambilDaftarSurvei(pengajuanId: string): Promise<Survei[]> {
  return api<Survei[]>(`/api/pengajuan/${pengajuanId}/survei`)
}

/** POST /api/pengajuan/{id}/survei — AO merekam survei + foto (multipart). */
export async function rekamSurvei(pengajuanId: string, input: RekamSurveiInput): Promise<Survei> {
  const token = ambilToken()
  const form = new FormData()
  if (input.latitude !== null) form.append('latitude', String(input.latitude))
  if (input.longitude !== null) form.append('longitude', String(input.longitude))
  form.append('omzetHarian', String(input.omzetHarian))
  form.append('lamaUsahaBulan', String(input.lamaUsahaBulan))
  form.append('catatan', input.catatan)
  input.foto.forEach((f) => form.append('foto', f))

  const res = await fetch(`${BASE}/api/pengajuan/${pengajuanId}/survei`, {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: form,
  })

  if (res.status === 401) hapusToken()

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const galat: GalatApi = {
      error: body.error ?? 'GALAT_TIDAK_DIKENAL',
      message: body.message ?? 'Gagal merekam survei',
      rule: body.rule,
      status: res.status,
    }
    throw galat
  }
  return body as Survei
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
