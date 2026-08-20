/**
 * Klien API parameter sistem (FR-13, layar S-13) dan kelola pengguna (S-14).
 *
 * PEMILIK: Eka. Kontrak: docs/SDD-iMitra.md BAB 5. Backend: Alfian (parameter),
 * Firman (pengguna).
 *
 * INTI FR-13 / AC-15: angka-angka di sini adalah DATA, bukan konstanta. Tidak
 * ada satu pun bobot, ambang plafon, atau rentang margin yang ditulis di
 * frontend — semuanya datang dari GET dan kembali lewat PUT. Perubahan berlaku
 * pada perhitungan BERIKUTNYA tanpa restart (ADR-0003: backend tidak men-cache).
 *
 * Bentuk GET /api/parameter/skoring adalah OBJEK { bobot, skalar }, bukan array.
 * Ini diverifikasi langsung dari backend/src/routes/parameter.ts — versi
 * sebelumnya di frontend mengasumsikan array dan akan merender tabel kosong.
 */
import { api } from './client'

/** Bobot per kode komponen, mis. { KAPASITAS_BAYAR: 35, ... }. */
export type BobotKomponen = Record<string, number>

/** Parameter skalar turunan asumsi tim (A-1, A-2, A-8). */
export type ParameterSkalar = {
  marginReferensiSkoring: number
  hariKerjaPerBulan: number
  marginUsahaPersen: number
  rasioPenuh: number
  rasioNol: number
  lamaUsahaPenuhBulan: number
  lamaUsahaNolBulan: number
}

export type ParameterSkoring = {
  bobot: BobotKomponen
  skalar: ParameterSkalar
}

export type BarisAmbangApproval = {
  plafonMin: number
  plafonMaks: number
  /** Panjang array = jumlah level, mis. ['KCP','KC']. */
  urutanPeran: string[]
}

export type BarisRentangMargin = {
  grade: number
  skorMin: number
  skorMaks: number
  marginMin: number | null
  marginMaks: number | null
  nisbahMin: number | null
  nisbahMaks: number | null
  dibiayai: boolean
}

/** GET /api/parameter/skoring — bobot komponen + parameter skalar. */
export function ambilParameterSkoring(): Promise<ParameterSkoring> {
  return api<ParameterSkoring>('/api/parameter/skoring')
}

/** PUT /api/parameter/skoring — simpan bobot yang diubah ADM. */
export function simpanBobotKomponen(
  bobot: { kode: string; bobot: number }[],
): Promise<{ kode: string; bobot: number }[]> {
  return api('/api/parameter/skoring', { method: 'PUT', body: JSON.stringify(bobot) })
}

/** GET /api/parameter/ambang-approval — ambang plafon per level. */
export function ambilAmbangApproval(): Promise<BarisAmbangApproval[]> {
  return api<BarisAmbangApproval[]>('/api/parameter/ambang-approval')
}

/** GET /api/parameter/rentang-margin — rentang skor & margin per grade. */
export function ambilRentangMargin(): Promise<BarisRentangMargin[]> {
  return api<BarisRentangMargin[]>('/api/parameter/rentang-margin')
}

// --- Kelola pengguna (layar S-14) -----------------------------------------

export type Peran = 'AO' | 'ANL' | 'KCP' | 'KC' | 'KOM' | 'ADM'

/** Nama Indonesia per kode peran. Label tampilan saja, bukan wewenang. */
export const NAMA_PERAN: Record<Peran, string> = {
  AO: 'Account Officer Mikro',
  ANL: 'Analis Mikro',
  KCP: 'Kepala Cabang Pembantu',
  KC: 'Kepala Cabang',
  KOM: 'Komite Pembiayaan',
  ADM: 'Admin',
}

export const DAFTAR_PERAN: Peran[] = ['AO', 'ANL', 'KCP', 'KC', 'KOM', 'ADM']

/** Bentuk aman pengguna — TANPA hash kata sandi. */
export type PenggunaAman = {
  id: string
  username: string
  nama: string
  peran: Peran
  aktif: boolean
  dibuatPada: string
}

export function ambilDaftarPengguna(filter?: {
  peran?: Peran
  aktif?: boolean
}): Promise<PenggunaAman[]> {
  const qs = new URLSearchParams()
  if (filter?.peran) qs.set('peran', filter.peran)
  if (filter?.aktif !== undefined) qs.set('aktif', String(filter.aktif))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return api<PenggunaAman[]>(`/api/pengguna${suffix}`)
}

export function buatPengguna(input: {
  username: string
  nama: string
  peran: Peran
  password: string
}): Promise<PenggunaAman> {
  return api<PenggunaAman>('/api/pengguna', { method: 'POST', body: JSON.stringify(input) })
}

/**
 * PATCH /api/pengguna/{id} — ubah nama, peran, atau status aktif.
 *
 * TIDAK ADA fungsi hapus pengguna, dan backend tidak menyediakan DELETE.
 * Baris audit trail menunjuk ke pengguna; menghapusnya memutus jejak siapa
 * memutuskan apa, dan itu inti FR-09. Pengguna dinonaktifkan (`aktif: false`).
 */
export function ubahPengguna(
  id: string,
  input: { nama?: string; peran?: Peran; aktif?: boolean; password?: string },
): Promise<PenggunaAman> {
  return api<PenggunaAman>(`/api/pengguna/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
