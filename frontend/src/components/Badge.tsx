/**
 * Badge status. Nilai dan pengelompokan warnanya SAMA PERSIS dengan 15 enum
 * status backend (AGENTS.md bagian 4.1) dan dengan blok Design System di
 * docs/UIUX-STITCH.md bagian 2.
 *
 * Setiap badge SELALU memuat teks. Status tidak pernah disampaikan hanya lewat
 * warna — itu aturan aksesibilitas, dan juga menyelamatkan demo di proyektor
 * yang warnanya pucat.
 */
const WARNA: Record<string, string> = {
  DRAFT: 'badge',
  SUBMITTED: 'badge badge--info',
  VERIFIKASI_DOKUMEN: 'badge badge--info',
  DOKUMEN_DITOLAK: 'badge badge--peringatan',
  SLIK_OK: 'badge badge--info',
  SLIK_GAGAL: 'badge badge--peringatan',
  REJECTED_SLIK: 'badge badge--bahaya',
  SKORED: 'badge badge--info',
  REJECTED_SCORING: 'badge badge--bahaya',
  MENUNGGU_APPROVAL_L1: 'badge badge--info',
  MENUNGGU_APPROVAL_L2: 'badge badge--info',
  MENUNGGU_APPROVAL_L3: 'badge badge--info',
  APPROVED: 'badge badge--sukses',
  REJECTED: 'badge badge--bahaya',
  DIKEMBALIKAN: 'badge badge--peringatan',
}

export function BadgeStatus({ status }: { status: string }) {
  return <span className={WARNA[status] ?? 'badge'}>{status}</span>
}
