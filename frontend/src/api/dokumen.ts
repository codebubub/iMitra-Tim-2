/**
 * Klien API domain dokumen (FR-03).
 *
 * PEMILIK: Ray. KONTRAK (docs/SDD-iMitra.md BAB 5 + routes/dokumen.ts): unggah
 * memakai JSON dengan konten base64 (`kontenBase64` + `mime`), BUKAN multipart —
 * repo backend sengaja tidak menambah dependensi multipart (AGENTS.md bagian 6
 * butir 1). Unggah ulang membuat VERSI baru di server; server mengembalikan
 * SATU baris per versi (bukan satu baris dengan riwayat bersarang), jadi
 * riwayat & versi terakhir diturunkan di klien dari daftar itu.
 *
 * URL berkas memakai id dokumen, TIDAK PERNAH NIK atau nama berkas (BR-11).
 */
import { api } from './client'
import { fileKeBase64 } from './berkas'

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export type JenisDokumen = 'KTP' | 'KK' | 'SKU'
export type StatusDokumen = 'MENUNGGU' | 'VERIFIED' | 'REJECTED'
export type KodeAlasan =
  | 'BURAM'
  | 'TIDAK_TERBACA'
  | 'KADALUARSA'
  | 'TIDAK_SESUAI_PEMOHON'
  | 'BUKAN_JENIS_DOKUMEN'

/**
 * Satu baris dokumen sebagaimana dikembalikan server: SATU per versi. Server
 * TIDAK mengirim nama anggota (BR-11: tidak ada data pribadi di daftar ini) —
 * pengelompokan per anggota di layar ANL memakai `pengajuanAnggotaId`.
 */
export type Dokumen = {
  id: string
  pengajuanAnggotaId: string
  jenis: JenisDokumen
  versi: number
  mime: string
  ukuranByte: number
  status: StatusDokumen
  kodeAlasan: KodeAlasan | null
  catatan: string | null
  diunggahPada: string
  diverifikasiPada: string | null
}

/** Ringkasan yang dikembalikan POST unggah (bukan detail penuh). */
export type RingkasUnggahDokumen = {
  id: string
  jenis: JenisDokumen
  versi: number
  status: StatusDokumen
}

/** Label kode alasan penolakan untuk dropdown (S-06). Nilai = enum server. */
export const LABEL_KODE_ALASAN: Record<KodeAlasan, string> = {
  BURAM: 'Buram',
  TIDAK_TERBACA: 'Tidak terbaca',
  KADALUARSA: 'Kadaluarsa',
  TIDAK_SESUAI_PEMOHON: 'Tidak sesuai pemohon',
  BUKAN_JENIS_DOKUMEN: 'Bukan jenis dokumen',
}

/** GET /api/pengajuan/{id}/dokumen — SEMUA versi seluruh dokumen (flat). */
export function ambilDaftarDokumen(pengajuanId: string): Promise<Dokumen[]> {
  return api<Dokumen[]>(`/api/pengajuan/${pengajuanId}/dokumen`)
}

/**
 * POST /api/pengajuan/{id}/dokumen — unggah JSON base64. Unggah ulang jenis yang
 * sama untuk anggota yang sama membuat versi baru (server yang menaikkan `versi`).
 */
export async function unggahDokumen(
  pengajuanId: string,
  input: { pengajuanAnggotaId: string; jenis: JenisDokumen; berkas: File },
): Promise<RingkasUnggahDokumen> {
  const kontenBase64 = await fileKeBase64(input.berkas)
  return api<RingkasUnggahDokumen>(`/api/pengajuan/${pengajuanId}/dokumen`, {
    method: 'POST',
    body: JSON.stringify({
      pengajuanAnggotaId: input.pengajuanAnggotaId,
      jenis: input.jenis,
      mime: input.berkas.type || 'application/octet-stream',
      kontenBase64,
    }),
  })
}

/** URL unduh berkas — memakai id dokumen (BR-11), bukan NIK. */
export function urlBerkasDokumen(dokumenId: string): string {
  return `${BASE}/api/dokumen/${dokumenId}/berkas`
}

/**
 * POST /api/dokumen/{dokumenId}/verifikasi — ANL saja. VERIFIED atau REJECTED
 * dengan kode alasan wajib bila REJECTED. AC-02 menembak endpoint ini sebagai
 * AO dan HARUS 403 — otorisasinya di server, bukan tombol yang disembunyikan.
 *
 * Server memvalidasi bentuk `{ keputusan, kodeAlasan?, catatan? }`.
 */
export function verifikasiDokumen(
  dokumenId: string,
  input: { status: 'VERIFIED' } | { status: 'REJECTED'; kodeAlasan: KodeAlasan; catatan?: string },
): Promise<{ id: string; status: StatusDokumen; kodeAlasan: KodeAlasan | null }> {
  const body =
    input.status === 'VERIFIED'
      ? { keputusan: 'VERIFIED' as const }
      : { keputusan: 'REJECTED' as const, kodeAlasan: input.kodeAlasan, catatan: input.catatan }
  return api(`/api/dokumen/${dokumenId}/verifikasi`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
