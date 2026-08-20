/**
 * Klien API domain dokumen (FR-03).
 *
 * PEMILIK: Ray. Unggah memakai multipart/form-data (bukan JSON), jadi ia tidak
 * lewat helper `api()` yang memaksa content-type JSON — ia memanggil fetch
 * langsung dengan token yang sama. Unggah ulang membuat VERSI baru di server;
 * frontend tidak pernah menghapus versi lama (AC-03).
 *
 * URL berkas memakai id dokumen, TIDAK PERNAH NIK atau nama berkas (BR-11).
 */
import { api, ambilToken, hapusToken, type GalatApi } from './client'

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export type JenisDokumen = 'KTP' | 'KK' | 'SKU'
export type StatusDokumen = 'MENUNGGU' | 'VERIFIED' | 'REJECTED'
export type KodeAlasan =
  | 'BURAM'
  | 'TIDAK_TERBACA'
  | 'KADALUARSA'
  | 'TIDAK_SESUAI_PEMOHON'
  | 'BUKAN_JENIS_DOKUMEN'

export type Dokumen = {
  id: string
  pengajuanAnggotaId: string
  /** Nama anggota pemilik dokumen — untuk pengelompokan di layar ANL (S-06). */
  namaAnggota: string
  jenis: JenisDokumen
  versi: number
  mime: string
  ukuranByte: number
  status: StatusDokumen
  kodeAlasan: KodeAlasan | null
  catatan: string | null
  diunggahPada: string
  diverifikasiPada: string | null
  /** Riwayat versi lama (AC-03): urut versi menurun. Boleh kosong. */
  riwayat?: Array<{
    versi: number
    status: StatusDokumen
    kodeAlasan: KodeAlasan | null
    diunggahPada: string
  }>
}

/** Label kode alasan penolakan untuk dropdown (S-06). Nilai = enum server. */
export const LABEL_KODE_ALASAN: Record<KodeAlasan, string> = {
  BURAM: 'Buram',
  TIDAK_TERBACA: 'Tidak terbaca',
  KADALUARSA: 'Kadaluarsa',
  TIDAK_SESUAI_PEMOHON: 'Tidak sesuai pemohon',
  BUKAN_JENIS_DOKUMEN: 'Bukan jenis dokumen',
}

/** GET /api/pengajuan/{id}/dokumen — daftar dokumen + status + kode alasan. */
export function ambilDaftarDokumen(pengajuanId: string): Promise<Dokumen[]> {
  return api<Dokumen[]>(`/api/pengajuan/${pengajuanId}/dokumen`)
}

/**
 * POST /api/pengajuan/{id}/dokumen — unggah multipart. Unggah ulang jenis yang
 * sama membuat versi baru (server yang menaikkan `versi`).
 */
export async function unggahDokumen(
  pengajuanId: string,
  input: { anggotaId: string; jenis: JenisDokumen; berkas: File },
): Promise<Dokumen> {
  const token = ambilToken()
  const form = new FormData()
  form.append('anggotaId', input.anggotaId)
  form.append('jenis', input.jenis)
  form.append('berkas', input.berkas)

  const res = await fetch(`${BASE}/api/pengajuan/${pengajuanId}/dokumen`, {
    method: 'POST',
    // Sengaja TANPA content-type: browser mengisi boundary multipart sendiri.
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: form,
  })

  if (res.status === 401) hapusToken()

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const galat: GalatApi = {
      error: body.error ?? 'GALAT_TIDAK_DIKENAL',
      message: body.message ?? 'Gagal mengunggah dokumen',
      rule: body.rule,
      status: res.status,
    }
    throw galat
  }
  return body as Dokumen
}

/** URL unduh berkas — memakai id dokumen (BR-11), bukan NIK. */
export function urlBerkasDokumen(dokumenId: string): string {
  return `${BASE}/api/dokumen/${dokumenId}/berkas`
}

/**
 * POST /api/dokumen/{dokumenId}/verifikasi — ANL saja. VERIFIED atau REJECTED
 * dengan kode alasan wajib bila REJECTED. AC-02 menembak endpoint ini sebagai
 * AO dan HARUS 403 — otorisasinya di server, bukan tombol yang disembunyikan.
 */
export function verifikasiDokumen(
  dokumenId: string,
  input: { status: 'VERIFIED' } | { status: 'REJECTED'; kodeAlasan: KodeAlasan; catatan?: string },
): Promise<Dokumen> {
  return api<Dokumen>(`/api/dokumen/${dokumenId}/verifikasi`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
