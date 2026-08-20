import type { Prisma } from '@prisma/client'
import type { PrismaTx } from '../lib/prisma.js'

/**
 * Penulisan audit trail (FR-09, BR-10).
 *
 * APPEND-ONLY. Modul ini hanya bisa MENULIS dan MEMBACA. Tidak ada `ubah()`
 * maupun `hapus()` untuk dipanggil siapa pun, tidak ada route yang mengarah ke
 * sini dari luar, dan migrasi terakhir mencabut hak UPDATE/DELETE dari peran
 * database aplikasi. Tiga lapis, dan yang ketiga mengikat walaupun dua yang
 * pertama dilanggar (SDD BAB 4.4, AC-13).
 *
 * `tulis()` SELALU menerima transaksi. Audit yang ditulis di luar transaksi
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
  metadata?: Prisma.InputJsonValue
}

export async function tulisAudit(tx: PrismaTx, masukan: MasukanAudit): Promise<void> {
  await tx.auditTrail.create({
    data: {
      pengajuanId: masukan.pengajuanId ?? null,
      aktorId: masukan.aktorId ?? null,
      aktorPeran: masukan.aktorPeran,
      aksi: masukan.aksi,
      statusSebelum: masukan.statusSebelum ?? null,
      statusSesudah: masukan.statusSesudah ?? null,
      metadata: masukan.metadata ?? {},
    },
  })
}
