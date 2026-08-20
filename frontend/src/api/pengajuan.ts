/**
 * Klien API domain pengajuan (FR-02, FR-10).
 *
 * PEMILIK: Ray. Berkas ini memetakan endpoint pengajuan dari kontrak beku
 * (docs/SDD-iMitra.md BAB 5) menjadi fungsi TypeScript. Tidak ada aturan bisnis
 * di sini — validasi plafon, nomor referensi, dan level approval adalah milik
 * server. Angka batas yang ditampilkan di layar datang dari respons, bukan
 * dituliskan di frontend (risiko R-8).
 */
import { api } from './client'

export type JenisNasabah = 'PERORANGAN' | 'KELOMPOK'
export type Akad = 'MURABAHAH' | 'MUSYARAKAH'
export type StatusAnggota = 'AKTIF' | 'DITOLAK'

/** Satu baris di daftar pengajuan (dashboard, FR-12). */
export type BarisPengajuan = {
  id: string
  nomorReferensi: string
  jenisNasabah: JenisNasabah
  akad: Akad
  status: string
  jumlahAnggota: number
  totalPlafon: number
  diubahPada: string
}

/** Anggota majelis (perorangan = tepat satu anggota, asumsi A-5). */
export type Anggota = {
  id: string
  nama: string
  /** NIK sudah bertopeng dari server (BR-11) — mis. 3404********0001. */
  nikTertutup: string
  plafonDiajukan: number
  statusAnggota: StatusAnggota
  urutan: number
}

/** Detail satu pengajuan. Total plafon & level approval DIHITUNG server (ADR-0002). */
export type DetailPengajuan = {
  id: string
  nomorReferensi: string
  jenisNasabah: JenisNasabah
  akad: Akad
  tenorBulan: number
  status: string
  marginPersen: number | null
  nisbahBankPersen: number | null
  catatanAnalis: string | null
  dibuatOleh: { id: string; nama: string; peran: string }
  dibuatPada: string
  diubahPada: string
  anggota: Anggota[]
  /** Jumlah dari plafon anggota AKTIF saja — dihitung server. */
  totalPlafon: number
  /** Urutan peran approval yang diperlukan, mis. ['KCP','KC','KOM']. */
  levelApproval: string[]
}

/** Satu anggota di dalam permintaan pembuatan pengajuan. */
export type AnggotaBaru = {
  nama: string
  nik: string
  alamat?: string
  jenisUsaha?: string
  plafonDiajukan: number
}

export type BuatPengajuanInput = {
  jenisNasabah: JenisNasabah
  akad: Akad
  tenorBulan: number
  anggota: AnggotaBaru[]
}

/** POST /api/pengajuan — buat DRAFT (perorangan atau kelompok). */
export function buatPengajuan(input: BuatPengajuanInput): Promise<DetailPengajuan> {
  return api<DetailPengajuan>('/api/pengajuan', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** GET /api/pengajuan — daftar terfilter peran. */
export function ambilDaftarPengajuan(params?: {
  status?: string
  q?: string
  page?: number
}): Promise<BarisPengajuan[]> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.q) qs.set('q', params.q)
  if (params?.page) qs.set('page', String(params.page))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return api<BarisPengajuan[]>(`/api/pengajuan${suffix}`)
}

/** GET /api/pengajuan/{id} — detail + total & level dihitung saat dibaca. */
export function ambilDetailPengajuan(id: string): Promise<DetailPengajuan> {
  return api<DetailPengajuan>(`/api/pengajuan/${id}`)
}

/** PATCH /api/pengajuan/{id} — ubah data; hanya saat DRAFT atau DIKEMBALIKAN. */
export function ubahPengajuan(
  id: string,
  input: Partial<Pick<BuatPengajuanInput, 'akad' | 'tenorBulan'>>,
): Promise<DetailPengajuan> {
  return api<DetailPengajuan>(`/api/pengajuan/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

/** POST /api/pengajuan/{id}/submit — BR-01 divalidasi di server, nomor referensi dibangkitkan (AC-01). */
export function kirimPengajuan(id: string): Promise<DetailPengajuan> {
  return api<DetailPengajuan>(`/api/pengajuan/${id}/submit`, { method: 'POST' })
}

/** POST /api/pengajuan/{id}/anggota — tambah anggota majelis (3–10). */
export function tambahAnggota(id: string, anggota: AnggotaBaru): Promise<Anggota> {
  return api<Anggota>(`/api/pengajuan/${id}/anggota`, {
    method: 'POST',
    body: JSON.stringify(anggota),
  })
}

/** PATCH /api/pengajuan/{id}/anggota/{anggotaId} — ubah plafon/nasabah saat DRAFT. */
export function ubahAnggota(
  id: string,
  anggotaId: string,
  input: Partial<Pick<AnggotaBaru, 'nama' | 'plafonDiajukan'>>,
): Promise<Anggota> {
  return api<Anggota>(`/api/pengajuan/${id}/anggota/${anggotaId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

/** POST /api/pengajuan/{id}/anggota/{anggotaId}/tolak — ANL menolak satu anggota (AC-14). */
export function tolakAnggota(id: string, anggotaId: string): Promise<DetailPengajuan> {
  return api<DetailPengajuan>(`/api/pengajuan/${id}/anggota/${anggotaId}/tolak`, {
    method: 'POST',
  })
}
