import type { PrismaTx } from '../lib/prisma.js'
import { cari, hitung, tulis, type FilterAudit } from '../repositories/audit.repo.js'

/**
 * Audit trail (FR-09, BR-10).
 *
 * APPEND-ONLY. Modul ini hanya bisa MENULIS dan MEMBACA. Tidak ada `ubah()`
 * maupun `hapus()` untuk dipanggil siapa pun, tidak ada route yang mengarah ke
 * sini dari luar, dan migrasi 20260820134500 memasang trigger yang menolak
 * UPDATE dan DELETE di sisi database. Tiga lapis, dan yang ketiga mengikat
 * walaupun dua yang pertama dilanggar (SDD BAB 4.4, AC-13).
 *
 * `tulisAudit()` SELALU menerima transaksi. Audit yang ditulis di luar transaksi
 * perubahan datanya bisa tertinggal saat transaksi gagal — dan BR-10 menyatakan
 * tidak ada perubahan status tanpa jejak.
 */

export const AKSI = {
  LOGIN: 'LOGIN',
  LOGIN_GAGAL: 'LOGIN_GAGAL',
  UBAH_STATUS: 'UBAH_STATUS',
  VERIFIKASI_DOKUMEN: 'VERIFIKASI_DOKUMEN',
  SLIK_OK: 'SLIK_OK',
  SLIK_GAGAL: 'SLIK_GAGAL',
  SKORING: 'SKORING',
  OVERRIDE_GRADE: 'OVERRIDE_GRADE',
  SET_MARGIN: 'SET_MARGIN',
  KEPUTUSAN_APPROVAL: 'KEPUTUSAN_APPROVAL',
  TOLAK_ANGGOTA: 'TOLAK_ANGGOTA',
  UBAH_PARAMETER: 'UBAH_PARAMETER',
  BUAT_PENGGUNA: 'BUAT_PENGGUNA',
  UBAH_PENGGUNA: 'UBAH_PENGGUNA',
} as const

export type Aksi = (typeof AKSI)[keyof typeof AKSI]

export type MasukanAudit = {
  pengajuanId?: string | null
  aktorId?: string | null
  aktorPeran: string
  aksi: Aksi
  statusSebelum?: string | null
  statusSesudah?: string | null
  /**
   * TANPA data pribadi (BR-11). Yang boleh: id internal, kode, angka, status.
   * Yang tidak boleh: NIK, nama nasabah, alamat, path berkas.
   */
  metadata?: Record<string, unknown>
}

export async function tulisAudit(tx: PrismaTx, masukan: MasukanAudit): Promise<void> {
  await tulis(tx, {
    pengajuanId: masukan.pengajuanId ?? null,
    aktorId: masukan.aktorId ?? null,
    aktorPeran: masukan.aktorPeran,
    aksi: masukan.aksi,
    statusSebelum: masukan.statusSebelum ?? null,
    statusSesudah: masukan.statusSesudah ?? null,
    metadata: masukan.metadata ?? {},
  })
}

/**
 * Bentuk baris audit yang dikirim ke klien.
 *
 * Sengaja TIDAK memuat aktorId mentah selain untuk penyaringan: yang dibaca
 * manusia adalah nama aktor dan perannya SAAT keputusan diambil (kolom
 * aktor_peran disalin, bukan di-join, karena peran seseorang bisa berubah
 * setelah keputusan diambil).
 */
export type BarisAuditDTO = {
  id: number
  waktu: Date
  aktor: string
  aktorPeran: string
  aksi: string
  statusSebelum: string | null
  statusSesudah: string | null
  metadata: unknown
}

function keDTO(b: Awaited<ReturnType<typeof cari>>[number]): BarisAuditDTO {
  return {
    id: Number(b.id),
    waktu: b.terjadiPada,
    // Aktor bisa kosong untuk LOGIN_GAGAL — tidak ada pengguna yang terverifikasi.
    aktor: b.aktor?.nama ?? '-',
    aktorPeran: b.aktorPeran,
    aksi: b.aksi,
    statusSebelum: b.statusSebelum,
    statusSesudah: b.statusSesudah,
    metadata: b.metadata,
  }
}

/**
 * Batas atas jumlah baris yang boleh dikembalikan satu permintaan. Bukan aturan
 * bisnis, melainkan pagar agar satu permintaan tidak menarik seluruh tabel audit
 * ke memori proses.
 */
const BATAS_MAKS = 500
const BATAS_BAWAAN = 100

/** AC-12 — riwayat satu pengajuan, urut waktu, dengan aktor di setiap baris. */
export async function riwayatPengajuan(pengajuanId: string): Promise<BarisAuditDTO[]> {
  const baris = await cari({ pengajuanId, batas: BATAS_MAKS, lewati: 0 })
  return baris.map(keDTO)
}

export type FilterAuditDTO = {
  pengajuanId?: string
  aktorId?: string
  aksi?: string
  dari?: Date
  sampai?: Date
  batas?: number
  lewati?: number
}

/** GET /api/audit — hanya ADM. Difilter aktor, aksi, dan rentang tanggal. */
export async function cariAudit(
  filter: FilterAuditDTO,
): Promise<{ total: number; batas: number; lewati: number; baris: BarisAuditDTO[] }> {
  const lengkap: FilterAudit = {
    ...filter,
    batas: Math.min(filter.batas ?? BATAS_BAWAAN, BATAS_MAKS),
    lewati: filter.lewati ?? 0,
  }

  const [baris, total] = await Promise.all([cari(lengkap), hitung(lengkap)])
  return { total, batas: lengkap.batas, lewati: lengkap.lewati, baris: baris.map(keDTO) }
}
