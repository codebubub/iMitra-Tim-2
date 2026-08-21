import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth, type Peran } from '../auth/AuthContext'
import { Ikon, type NamaIkon } from './Ikon'
import { ambilNotifikasi } from '../api/notifikasi'

/**
 * Kerangka aplikasi: sidebar (kolom kiri penuh) + kolom utama berisi topbar dan
 * konten.
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
 * ------------------------------------------------------------------------
 * SUSUNAN INI MENGIKUTI theme.css YANG BARU (Stitch S-02).
 *
 * Versi sebelumnya menumpuk topbar di atas baris [sidebar | konten]. Susunan
 * Stitch membalik urutannya: sidebar adalah kolom penuh dari atas ke bawah, dan
 * topbar hidup DI DALAM kolom kanan. Perbedaannya bukan selera — sidebar yang
 * membentang penuh itulah yang menjadi jangkar visual halaman, sehingga topbar
 * tidak perlu lagi menggelapkan dirinya sendiri.
 *
 * Nama kelas di sini (`cangkang`, `kolom-utama`, `sidebar__merek-nama`,
 * `sidebar__menu`, `topnav__keluar`) harus sama persis dengan theme.css. Ketika
 * keduanya sempat tidak cocok, sidebar merender sebagai blok biasa dan MENUTUPI
 * seluruh area konten — halaman terlihat utuh, tetapi tidak satu pun tombol di
 * dalamnya bisa ditekan.
 * ------------------------------------------------------------------------
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

/**
 * Judul halaman dari path, untuk remah roti.
 *
 * Dipetakan dari segmen, BUKAN dari daftar route: sebagian layar tahap tidak
 * punya entri menu, dan yang punya pun labelnya berbeda ("Pengajuan" di menu,
 * "Detail" di remah roti).
 */
const JUDUL_SEGMEN: Record<string, string> = {
  dashboard: 'Dashboard',
  pengajuan: 'Pengajuan',
  baru: 'Buat Pengajuan',
  approval: 'Antrian Approval',
  notifikasi: 'Notifikasi',
  parameter: 'Parameter',
  pengguna: 'Kelola Pengguna',
  dokumen: 'Dokumen',
  'verifikasi-dokumen': 'Verifikasi Dokumen',
  survei: 'Survei',
  slik: 'SLIK',
  skoring: 'Skoring',
  margin: 'Margin',
  audit: 'Audit Trail',
}

const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Remah = { label: string; ke?: string }

function remahDariPath(pathname: string): Remah[] {
  const segmen = pathname.split('/').filter(Boolean)
  const hasil: Remah[] = []
  let jalan = ''

  for (let i = 0; i < segmen.length; i++) {
    const s = segmen[i]
    jalan += `/${s}`

    // UUID tidak pernah ditampilkan sebagai teks. Ia panjang, tidak bermakna
    // bagi siapa pun, dan pada layar sempit ia mendorong sisa remah keluar.
    // Nomor referensi yang bermakna ada di judul halaman detailnya sendiri.
    if (POLA_UUID.test(s)) {
      hasil.push({ label: 'Detail', ke: jalan })
      continue
    }

    const label = JUDUL_SEGMEN[s] ?? s
    // Remah terakhir tidak ditautkan: menautkan halaman ke dirinya sendiri
    // hanya menambah target yang tidak melakukan apa-apa.
    hasil.push({ label, ke: i === segmen.length - 1 ? undefined : jalan })
  }

  return hasil
}

export function Layout({ children }: { children: ReactNode }) {
  const { pengguna, keluar } = useAuth()
  const navigate = useNavigate()
  const lokasi = useLocation()
  const [laciTerbuka, setLaciTerbuka] = useState(false)
  const tombolLaci = useRef<HTMLButtonElement>(null)

  const menuTampil = MENU.filter((m) => !m.peran || (pengguna && m.peran.includes(pengguna.peran)))
  const remah = remahDariPath(lokasi.pathname)

  /**
   * Jumlah notifikasi belum dibaca untuk lencana di topbar.
   *
   * `belumDibaca` datang dari COUNT di server, bukan dari panjang array — kalau
   * diturunkan dari `baris.length`, angkanya salah begitu daftar dibatasi.
   *
   * Kegagalan query ini sengaja TIDAK ditampilkan sebagai galat: lencana adalah
   * informasi tambahan, dan panel merah di setiap halaman hanya karena
   * hitungannya gagal jauh lebih mengganggu daripada lencana yang tidak muncul.
   */
  const { data: notif } = useQuery({
    queryKey: ['notifikasi'],
    queryFn: () => ambilNotifikasi(),
    // Antrian bergerak saat orang lain bekerja, jadi angkanya basi kalau hanya
    // diambil sekali. Satu menit cukup dekat tanpa membanjiri server.
    refetchInterval: 60_000,
    retry: false,
  })
  const belumDibaca = notif?.belumDibaca ?? 0

  // Pindah halaman menutup laci. Tanpa ini, menu menutupi halaman yang baru saja
  // dibuka pengguna, dan ia harus menutupnya sendiri untuk melihat hasilnya.
  useEffect(() => {
    setLaciTerbuka(false)
  }, [lokasi.pathname])

  // Escape menutup laci, dan fokus kembali ke tombol pembukanya. Tanpa yang
  // terakhir, pengguna keyboard terlempar ke awal halaman setiap kali menutup.
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

  function keluarSekarang() {
    keluar()
    navigate('/login', { replace: true })
  }

  return (
    <div className="cangkang">
      {/*
       * Tautan lompat-ke-konten. Tidak terlihat sampai difokus lewat Tab —
       * gunanya supaya pengguna keyboard tidak harus melewati seluruh menu di
       * setiap halaman sebelum sampai ke isinya.
       */}
      <a href="#konten-utama" className="tombol tombol--sekunder lewati">
        Lompat ke konten
      </a>

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
        <NavLink to="/dashboard" className="sidebar__merek">
          <Ikon nama="logo" ukuran={28} />
          <span>
            <span className="sidebar__merek-nama">iMitra</span>
            <span className="sidebar__merek-sub">Pembiayaan Mikro Syariah</span>
          </span>
        </NavLink>

        <div className="sidebar__menu">
          <div className="sidebar__judul">Menu</div>
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
              <span>{m.label}</span>
              {m.ke === '/notifikasi' && belumDibaca > 0 && (
                <span className="sidebar__jumlah">{belumDibaca > 99 ? '99+' : belumDibaca}</span>
              )}
            </NavLink>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Hanya tampak di ponsel: di desktop, Keluar ada di topbar. */}
        <button
          className="tombol tombol--sekunder tombol--blok sidebar__keluar"
          onClick={keluarSekarang}
        >
          <Ikon nama="keluar" />
          Keluar
        </button>
      </nav>

      <div className="kolom-utama">
        <header className="topnav">
          <button
            ref={tombolLaci}
            type="button"
            className="topnav__hamburger"
            aria-label={laciTerbuka ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={laciTerbuka}
            aria-controls="menu-utama"
            onClick={() => setLaciTerbuka((t) => !t)}
          >
            <Ikon nama={laciTerbuka ? 'silang' : 'menu'} ukuran={20} />
          </button>

          {/* Merek di topbar hanya muncul di ponsel, saat sidebar tersembunyi. */}
          <NavLink to="/dashboard" className="topnav__merek">
            <Ikon nama="logo" ukuran={22} />
            <span>iMitra</span>
          </NavLink>

          <nav className="remah" aria-label="Remah roti">
            {remah.map((r, i) => (
              <span key={`${r.label}-${i}`} className="remah__item">
                {i > 0 && (
                  <span className="remah__pemisah" aria-hidden="true">
                    /
                  </span>
                )}
                {r.ke ? <NavLink to={r.ke}>{r.label}</NavLink> : <span>{r.label}</span>}
              </span>
            ))}
          </nav>

          <div className="topnav__kanan">
            <NavLink
              to="/notifikasi"
              className="topnav__aksi"
              aria-label={
                belumDibaca > 0
                  ? `Notifikasi, ${belumDibaca} belum dibaca`
                  : 'Notifikasi, semua sudah dibaca'
              }
            >
              <Ikon nama="lonceng" ukuran={20} />
              {belumDibaca > 0 && (
                /* Di atas 99 lencana melebar dan mendorong isi topbar; angka
                   pastinya toh ada di halaman notifikasi. */
                <span className="lencana">{belumDibaca > 99 ? '99+' : belumDibaca}</span>
              )}
            </NavLink>

            {/*
             * IDENTITAS DAN PERAN TETAP TERLIHAT.
             *
             * Seluruh aplikasi ini berperilaku berbeda menurut peran: menu yang
             * muncul, tombol yang aktif, dan pengajuan yang terlihat. Saat demo,
             * penilai berganti akun berkali-kali dalam hitungan menit. Tanpa
             * penanda peran yang tetap di layar, satu-satunya cara mengetahui
             * sedang masuk sebagai siapa adalah menebak dari menu yang tampil.
             */}
            <span className="topnav__pengguna">
              <span className="topnav__pengguna-nama">{pengguna?.nama}</span>
              <span className="badge badge--info">{pengguna?.peran}</span>
            </span>

            <button type="button" className="topnav__keluar" onClick={keluarSekarang}>
              Keluar
            </button>
          </div>
        </header>

        <main id="konten-utama" className="konten">
          {children}
        </main>
      </div>
    </div>
  )
}
