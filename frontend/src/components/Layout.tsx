import { NavLink, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth, type Peran } from '../auth/AuthContext'

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
 */

type Menu = { ke: string; label: string; peran?: Peran[] }

const MENU: Menu[] = [
  { ke: '/dashboard', label: 'Dashboard' },
  { ke: '/pengajuan', label: 'Pengajuan' },
  { ke: '/pengajuan/baru', label: 'Buat Pengajuan', peran: ['AO'] },
  { ke: '/approval', label: 'Antrian Approval', peran: ['KCP', 'KC', 'KOM'] },
  { ke: '/notifikasi', label: 'Notifikasi' },
  { ke: '/parameter', label: 'Parameter', peran: ['ADM'] },
  { ke: '/pengguna', label: 'Kelola Pengguna', peran: ['ADM'] },
]

export function Layout({ children }: { children: ReactNode }) {
  const { pengguna, keluar } = useAuth()
  const navigate = useNavigate()

  const menuTampil = MENU.filter((m) => !m.peran || (pengguna && m.peran.includes(pengguna.peran)))

  return (
    <div className="layout">
      <nav className="sidebar" aria-label="Navigasi utama">
        <div style={{ fontWeight: 700, color: 'var(--warna-primer)', padding: 'var(--sp-2)' }}>
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
            {m.label}
          </NavLink>
        ))}

        <div style={{ flex: 1 }} />

        <div style={{ padding: 'var(--sp-2)', borderTop: '1px solid var(--warna-garis)' }}>
          <div style={{ fontWeight: 600 }}>{pengguna?.nama}</div>
          <span className="badge badge--info">{pengguna?.peran}</span>
          <button
            className="tombol tombol--sekunder"
            style={{ marginTop: 'var(--sp-2)', width: '100%' }}
            onClick={() => {
              keluar()
              navigate('/login', { replace: true })
            }}
          >
            Keluar
          </button>
        </div>
      </nav>

      <main className="konten">{children}</main>
    </div>
  )
}
