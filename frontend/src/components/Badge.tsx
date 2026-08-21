/**
 * Badge status. Nilai dan pengelompokan warnanya SAMA PERSIS dengan 15 enum
 * status backend (AGENTS.md bagian 4.1) dan dengan blok Design System di
 * docs/UIUX-STITCH.md bagian 2.
 *
 * Setiap badge SELALU memuat teks. Status tidak pernah disampaikan hanya lewat
 * warna — itu aturan aksesibilitas, dan juga menyelamatkan demo di proyektor
 * yang warnanya pucat.
 *
 * KENAPA ADA LABEL TERPISAH DARI ENUM. Sebelumnya badge menampilkan nilai enum
 * apa adanya: `MENUNGGU_APPROVAL_L1`. Yang membaca layar ini adalah AO, analis,
 * dan kepala cabang — bukan orang yang pernah melihat skema database. Menuliskan
 * nama kolom di antarmuka memaksa mereka menerjemahkannya sendiri setiap kali.
 *
 * Di layar 390px, `MENUNGGU_APPROVAL_L1` juga tidak punya satu pun titik patah
 * (huruf besar tersambung garis bawah), sehingga badge-nya meluber 9px ke luar
 * layar dan membuat SELURUH halaman bisa digeser ke samping. Label yang terdiri
 * dari beberapa kata bisa dipatah baris secara wajar.
 *
 * Nilai enum aslinya tetap tersedia di atribut `title` — berguna saat menelusuri
 * bug bersama backend, tanpa menampilkannya kepada pengguna.
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

const LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Diajukan',
  VERIFIKASI_DOKUMEN: 'Verifikasi dokumen',
  DOKUMEN_DITOLAK: 'Dokumen ditolak',
  SLIK_OK: 'SLIK lolos',
  SLIK_GAGAL: 'SLIK gagal',
  REJECTED_SLIK: 'Ditolak - SLIK',
  SKORED: 'Sudah diskor',
  REJECTED_SCORING: 'Ditolak - skoring',
  MENUNGGU_APPROVAL_L1: 'Menunggu approval L1',
  MENUNGGU_APPROVAL_L2: 'Menunggu approval L2',
  MENUNGGU_APPROVAL_L3: 'Menunggu approval L3',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  DIKEMBALIKAN: 'Dikembalikan',
}

export function BadgeStatus({ status }: { status: string }) {
  // Status yang tidak dikenal ditampilkan apa adanya, BUKAN disembunyikan atau
  // diganti "-". Kalau backend menambah enum baru, ia harus terlihat di layar
  // supaya ketahuan — bukan diam-diam hilang.
  return (
    <span className={WARNA[status] ?? 'badge'} title={status}>
      {LABEL[status] ?? status}
    </span>
  )
}
