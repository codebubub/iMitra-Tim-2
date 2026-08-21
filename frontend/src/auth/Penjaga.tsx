import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth, type Peran } from './AuthContext'
import { Layout } from '../components/Layout'

/**
 * Guard route frontend, sekaligus pembungkus kerangka aplikasi.
 *
 * INI BUKAN OTORISASI. Ia hanya mencegah pengguna tersasar ke layar yang tidak
 * relevan baginya. Otorisasi yang sebenarnya ada di server: setiap endpoint
 * memeriksa peran sendiri, dan AC-02 mengujinya dengan panggilan API langsung.
 *
 * Menghapus komponen ini tidak membuka satu pun data — ia hanya membuat
 * navigasinya membingungkan.
 *
 * KENAPA <Layout> DIPASANG DI SINI, bukan di setiap halaman: setiap route yang
 * memerlukan login sudah dibungkus <Penjaga>, jadi memasangnya di sini membuat
 * seluruh layar mendapat sidebar sekaligus — tanpa menyentuh satu pun berkas
 * halaman. Halaman tetap merender isinya saja dan tidak perlu tahu soal
 * navigasi.
 */
export function Penjaga({ peran, children }: { peran?: Peran[]; children: ReactNode }) {
  const { pengguna, memuat } = useAuth()
  const lokasi = useLocation()

  if (memuat) return <div className="konten">Memuat...</div>
  if (!pengguna) return <Navigate to="/login" state={{ dari: lokasi.pathname }} replace />
  if (peran && !peran.includes(pengguna.peran)) return <Navigate to="/dashboard" replace />

  return <Layout>{children}</Layout>
}
