import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth, type Peran } from '../auth/AuthContext'
import { Ikon, type NamaIkon } from './Ikon'

/**
 * Kerangka aplikasi: sidebar + area konten.
 *
 * KENAPA KOMPONEN, BUKAN DITULIS DI TIAP HALAMAN. Sebelumnya sidebar tertanam
 * di dalam `Dashboard.tsx`, sehingga empat belas layar lain merender konten
 * telanjang tanpa navigasi apa pun. Layarnya berfungsi penuh — tetapi satu-
 * satunya cara mencapainya adalah mengetik URL berisi UUID. Di depan penilai
 * itu terlihat seperti aplikasi yang belum jadi, padahal isinya sudah jadi.
 *
 * MENU MENYESUAIKAN PERAN, dan itu KENYAMANAN — BUKAN OTORISASI. Server yang
 * memutuskan siapa boleh apa (AC-02 mengujinya lewat panggilan API langsung).
 * Menyembunyikan tautan di sini hanya mencegah pengguna tersasar ke layar yang
 * pasti menolaknya. Menghapus seluruh berkas ini tidak membuka satu pun data.
 *
 * Daftar peran per menu mengikuti `docs/SDD-iMitra.md` BAB 6.1 dan harus sama
 * dengan `<Penjaga peran={...}>` di `App.tsx`. Kalau keduanya berbeda, pengguna
 * melihat menu yang mengantarnya ke halaman yang langsung memantulkannya.
 *
 * DI PONSEL SIDEBAR MENJADI LACI. Bentuk lama — baris menu yang di-scroll ke
 * samping — mendorong identitas pengguna dan tombol "Keluar" ke luar layar, dan
 * merebut ruang vertikal dari isi halaman di layar yang justru paling sempit.
 * AO mengisi survei sambil berdiri di lokasi usaha (NFR-08), jadi ini kondisi
 * kerja yang normal, bukan kasus pinggiran.
 *
 * Tiga hal yang membuat laci terasa benar, dan ketiganya mudah terlewat:
 * menutup sendiri saat pindah halaman, menutup saat Escape ditekan, dan
 * mengembalikan fokus ke tombol pembukanya. Tanpa yang ketiga, pengguna
 * keyboard terlempar ke awal halaman setiap kali menutup laci.
 */

type Menu = { ke: string; label: string; ikon: NamaIkon; peran?: Peran[] }

const MENU: Menu[] = [
  { ke: '/dashboard', label: 'Dashboard', ikon: 'dashboard' },
  { ke: '/pengajuan', label: 'Pengajuan', ikon: 'berkas' },
  { ke: '/pengajuan/baru', label: 'Buat Pengajuan', ikon: 'tambah', peran: ['AO'] },
  {
    ke: '/approval',
    label: 'Antrian Approval',
    ikon: 'centang',
    peran: ['KCP', 'KC', 'KOM'],
  },
  { ke: '/notifikasi', label: 'Notifikasi', ikon: 'lonceng' },
  { ke: '/parameter', label: 'Parameter', ikon: 'geser', peran: ['ADM'] },
  { ke: '/pengguna', label: 'Kelola Pengguna', ikon: 'orang', peran: ['ADM'] },
]

export function Layout({ children }: { children: ReactNode }) {
  const { pengguna, keluar } = useAuth()
  const navigate = useNavigate()
  const lokasi = useLocation()
  const [laciTerbuka, setLaciTerbuka] = useState(false)
  const tombolLaci = useRef<HTMLButtonElement>(null)

  const menuTampil = MENU.filter((m) => !m.peran || (pengguna && m.peran.includes(pengguna.peran)))

  // Pindah halaman menutup laci. Tanpa ini, menu menutupi halaman yang baru
  // saja dibuka pengguna — dan ia harus menutupnya sendiri untuk melihat
  // hasil ketukannya.
  useEffect(() => {
    setLaciTerbuka(false)
  }, [lokasi.pathname])

  // Escape menutup laci, dan fokus kembali ke tombol pembukanya.
  useEffect(() => {
    if (!laciTerbuka) return
    const saatTombol = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLaciTerbuka(false)
        tombolLaci.current?.focus()
      }
    }
    document.addEventListener('keydown', saatTombol)
    return () => document.removeEventListener('keydown', saatTombol)
  }, [laciTerbuka])

  return (
    <div className="layout">
      {/*
       * Tautan lompat-ke-konten. Tidak terlihat sampai difokus lewat Tab —
       * gunanya supaya pengguna keyboard tidak harus melewati tujuh menu di
       * setiap halaman sebelum sampai ke isinya.
       */}
      <a href="#konten-utama" className="tombol tombol--sekunder lewati">
        Lompat ke konten
      </a>

      <header className="topbar">
        <button
          ref={tombolLaci}
          type="button"
          className="hamburger"
          aria-label={laciTerbuka ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={laciTerbuka}
          aria-controls="menu-utama"
          onClick={() => setLaciTerbuka((t) => !t)}
        >
          <Ikon nama={laciTerbuka ? 'silang' : 'menu'} />
        </button>
        <span className="topbar__merek">iMitra</span>
      </header>

      {/*
       * Tirai gelap di belakang laci. Sebagai <button> supaya bisa ditutup
       * dengan ketukan DAN dengan keyboard; sebuah <div> ber-onClick hanya
       * melayani yang pertama.
       */}
      {laciTerbuka && (
        <button
          type="button"
          className="tirai"
          aria-label="Tutup menu"
          onClick={() => setLaciTerbuka(false)}
        />
      )}

      <nav
        id="menu-utama"
        className="sidebar"
        data-terbuka={laciTerbuka}
        aria-label="Navigasi utama"
      >
        <div className="sidebar__merek">
          <Ikon nama="logo" />
          iMitra
        </div>

        {menuTampil.map((m) => (
          <NavLink
            key={m.ke}
            to={m.ke}
            // `end` supaya /pengajuan tidak ikut aktif saat berada di
            // /pengajuan/baru atau /pengajuan/<id>/skoring.
            end={m.ke === '/pengajuan'}
            className={({ isActive }) => (isActive ? 'aktif' : '')}
          >
            <Ikon nama={m.ikon} />
            {m.label}
          </NavLink>
        ))}

        <div style={{ flex: 1 }} />

        <div className="sidebar__pengguna">
          <div style={{ fontWeight: 600 }}>{pengguna?.nama}</div>
          <span className="badge badge--info" style={{ marginTop: 2 }}>
            {pengguna?.peran}
          </span>
          <button
            className="tombol tombol--sekunder tombol--blok"
            style={{ marginTop: 'var(--sp-3)' }}
            onClick={() => {
              keluar()
              navigate('/login', { replace: true })
            }}
          >
            <Ikon nama="keluar" />
            Keluar
          </button>
        </div>
      </nav>

      <main id="konten-utama" className="konten">
        {children}
      </main>
    </div>
  )
}
