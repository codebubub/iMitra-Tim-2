import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth, type Peran } from './AuthContext'

/**
 * Guard route frontend.
 *
 * INI BUKAN OTORISASI. Ia hanya mencegah pengguna tersasar ke layar yang tidak
 * relevan baginya. Otorisasi yang sebenarnya ada di server: setiap endpoint
 * memeriksa peran sendiri, dan AC-02 mengujinya dengan panggilan API langsung.
 *
 * Menghapus komponen ini tidak membuka satu pun data — ia hanya membuat
 * navigasinya membingungkan.
 */
export function Penjaga({ peran, children }: { peran?: Peran[]; children: ReactNode }) {
  const { pengguna, memuat } = useAuth()
  const lokasi = useLocation()

  if (memuat) return <div className="konten">Memuat...</div>
  if (!pengguna) return <Navigate to="/login" state={{ dari: lokasi.pathname }} replace />
  if (peran && !peran.includes(pengguna.peran)) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
