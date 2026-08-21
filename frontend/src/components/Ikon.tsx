/**
 * Ikon garis, ditulis langsung sebagai SVG.
 *
 * KENAPA BUKAN PUSTAKA IKON. Paket seperti lucide-react atau react-icons
 * membawa ribuan ikon untuk dipakai tujuh, menambah dependensi yang harus
 * di-audit, dan memperbesar bundle di aplikasi yang dipakai AO lewat jaringan
 * seluler di lapangan (NFR-08). Tujuh path SVG lebih kecil daripada satu baris
 * di package.json.
 *
 * SEMUA IKON DI SINI DEKORATIF, dan itu keputusan sadar: setiap ikon selalu
 * berdampingan dengan teks yang menjelaskan maksudnya. Karena itu semuanya
 * ber-`aria-hidden` — kalau tidak, pembaca layar akan membacakan label yang
 * sama dua kali. Ikon yang berdiri sendiri (tombol hamburger) mendapat
 * `aria-label` pada TOMBOLNYA, bukan pada SVG-nya.
 *
 * `currentColor` dipakai supaya ikon mengikuti warna teks di sekitarnya —
 * termasuk saat menu aktif berubah warna, tanpa aturan CSS tambahan.
 */

export type NamaIkon =
  | 'logo'
  | 'dashboard'
  | 'berkas'
  | 'tambah'
  | 'centang'
  | 'lonceng'
  | 'geser'
  | 'orang'
  | 'keluar'
  | 'menu'
  | 'silang'

const JALUR: Record<NamaIkon, JSX.Element> = {
  // Bentuk sederhana yang mengingatkan pada akad bagi hasil: dua sisi seimbang.
  logo: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M8 15V9m8 6V9M8 12h8" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  berkas: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  tambah: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  centang: (
    <>
      <path d="M20 6 9 17l-5-5" />
    </>
  ),
  lonceng: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
      <path d="M13.7 19a2 2 0 0 1-3.4 0" />
    </>
  ),
  geser: (
    <>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h10M18 18h2" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="16" cy="18" r="2" />
    </>
  ),
  orang: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  keluar: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  silang: (
    <>
      <path d="M6 6l12 12M18 6L6 18" />
    </>
  ),
}

export function Ikon({ nama, ukuran = 18 }: { nama: NamaIkon; ukuran?: number }) {
  return (
    <svg
      width={ukuran}
      height={ukuran}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {JALUR[nama]}
    </svg>
  )
}
