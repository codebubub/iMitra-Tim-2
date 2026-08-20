import type { StatusPengajuan } from '@prisma/client'
import type { PrismaTx } from '../lib/prisma.js'
import { TransisiTidakSah } from '../lib/errors.js'
import { tulisAudit, AKSI } from './audit.service.js'
import type { PenggunaToken } from '../middleware/rbac.js'

/**
 * SATU-SATUNYA modul yang boleh menulis kolom `pengajuan.status`.
 *
 * Kenapa dipusatkan: BR-10 mensyaratkan setiap perubahan status punya aktor dan
 * timestamp. Kalau setiap service boleh melakukan `update({ status })` sendiri,
 * suatu saat ada yang lupa menulis auditnya — dan yang hilang adalah jejak
 * keputusan pembiayaan. Di sini, menulis status dan menulis audit adalah satu
 * operasi yang tidak bisa dipisahkan.
 *
 * Kalau service Anda perlu mengubah status, panggil `ubahStatus()`. Jangan
 * menambahkan `prisma.pengajuan.update({ data: { status } })` di tempat lain —
 * review akan menolaknya.
 *
 * Diagram transisinya ada di docs/SRS-iMitra.md bagian 3.2.
 */

/** Transisi yang sah. Status yang tidak muncul sebagai kunci bersifat terminal. */
const TRANSISI: Record<StatusPengajuan, StatusPengajuan[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['VERIFIKASI_DOKUMEN'],
  VERIFIKASI_DOKUMEN: ['DOKUMEN_DITOLAK', 'SLIK_OK', 'SLIK_GAGAL', 'REJECTED_SLIK'],
  DOKUMEN_DITOLAK: ['VERIFIKASI_DOKUMEN'],
  SLIK_GAGAL: ['SLIK_OK', 'REJECTED_SLIK'],
  SLIK_OK: ['SKORED', 'SLIK_GAGAL'],
  SKORED: ['SKORED', 'REJECTED_SCORING', 'MENUNGGU_APPROVAL_L1'],
  MENUNGGU_APPROVAL_L1: ['MENUNGGU_APPROVAL_L2', 'APPROVED', 'REJECTED', 'DIKEMBALIKAN'],
  MENUNGGU_APPROVAL_L2: ['MENUNGGU_APPROVAL_L3', 'APPROVED', 'REJECTED', 'DIKEMBALIKAN'],
  MENUNGGU_APPROVAL_L3: ['APPROVED', 'REJECTED', 'DIKEMBALIKAN'],
  DIKEMBALIKAN: ['SUBMITTED'],

  // Terminal — tidak ada jalan keluar.
  REJECTED_SLIK: [],
  REJECTED_SCORING: [],
  APPROVED: [],
  REJECTED: [],
}

export const STATUS_TERMINAL: StatusPengajuan[] = [
  'REJECTED_SLIK',
  'REJECTED_SCORING',
  'APPROVED',
  'REJECTED',
]

export function transisiSah(dari: StatusPengajuan, ke: StatusPengajuan): boolean {
  return TRANSISI[dari].includes(ke)
}

export function statusTerminal(status: StatusPengajuan): boolean {
  return STATUS_TERMINAL.includes(status)
}

/**
 * Mengubah status DAN menulis audit dalam satu transaksi.
 *
 * `sebab` masuk ke metadata audit — BR-10 melarang perubahan status "oleh sistem"
 * tanpa jejak sebab. Untuk perubahan yang dipicu sistem (mis. REJECTED_SLIK
 * karena kolektibilitas 4), aktornya tetap pengguna yang memicu aksinya, dan
 * sebabnya menjelaskan mengapa sistem memutuskan begitu.
 */
export async function ubahStatus(
  tx: PrismaTx,
  params: {
    pengajuanId: string
    dari: StatusPengajuan
    ke: StatusPengajuan
    aktor: PenggunaToken
    sebab: string
    metadata?: Record<string, unknown>
  },
): Promise<void> {
  const { pengajuanId, dari, ke, aktor, sebab, metadata } = params

  if (!transisiSah(dari, ke)) throw new TransisiTidakSah(dari, ke)

  await tx.pengajuan.update({
    where: { id: pengajuanId },
    data: { status: ke },
  })

  await tulisAudit(tx, {
    pengajuanId,
    aktorId: aktor.id,
    aktorPeran: aktor.peran,
    aksi: AKSI.UBAH_STATUS,
    statusSebelum: dari,
    statusSesudah: ke,
    metadata: { sebab, ...(metadata ?? {}) },
  })
}
