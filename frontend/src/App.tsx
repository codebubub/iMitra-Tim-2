import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './auth/AuthContext'
import { Penjaga } from './auth/Penjaga'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Pengajuan } from './pages/Pengajuan'
import { DetailPengajuan } from './pages/DetailPengajuan'
import { BuatPengajuan } from './pages/BuatPengajuan'
import { UploadDokumen } from './pages/UploadDokumen'
import { VerifikasiDokumen } from './pages/VerifikasiDokumen'
import { SurveiHalaman } from './pages/Survei'
import { NotifikasiHalaman } from './pages/Notifikasi'
import { SlikCheck } from './pages/SlikCheck'
import { Skoring } from './pages/Skoring'
import { Margin } from './pages/Margin'
import { AntrianApproval } from './pages/AntrianApproval'
import { AuditTrail } from './pages/AuditTrail'
import { Parameter } from './pages/Parameter'
import { Pengguna } from './pages/Pengguna'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data pipeline berubah karena orang lain, bukan karena kita. Muat ulang
      // saat tab difokuskan supaya approver tidak melihat antrian basi.
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

/**
 * Peta route.
 *
 * SETIAP route yang dibatasi peran dibungkus `<Penjaga peran={[...]}>`. Ingat:
 * itu kenyamanan navigasi, BUKAN otorisasi — server yang memutuskan, dan AC-02
 * mengujinya lewat panggilan API langsung. Menghapus `<Penjaga>` tidak membuka
 * satu pun data; ia hanya membuat navigasinya membingungkan.
 *
 * Perannya diambil dari `docs/SDD-iMitra.md` BAB 6.1 (daftar layar per peran),
 * dan harus konsisten dengan `config.peran` pada route backend yang dipanggil
 * layar itu. Kalau keduanya berbeda, pengguna akan melihat layar yang seluruh
 * datanya gagal dimuat — kebingungan yang mahal saat demo.
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Terbuka untuk semua peran yang sudah login */}
            <Route
              path="/dashboard"
              element={
                <Penjaga>
                  <Dashboard />
                </Penjaga>
              }
            />
            <Route
              path="/pengajuan"
              element={
                <Penjaga>
                  <Pengajuan />
                </Penjaga>
              }
            />
            <Route
              path="/notifikasi"
              element={
                <Penjaga>
                  <NotifikasiHalaman />
                </Penjaga>
              }
            />
            <Route
              path="/pengajuan/:id/audit"
              element={
                <Penjaga>
                  <AuditTrail />
                </Penjaga>
              }
            />
            <Route
              path="/pengajuan/:id"
              element={
                <Penjaga>
                  <DetailPengajuan />
                </Penjaga>
              }
            />

            {/* Layar AO di lapangan — mobile-first (NFR-08) */}
            <Route
              path="/pengajuan/baru"
              element={
                <Penjaga peran={['AO']}>
                  <BuatPengajuan />
                </Penjaga>
              }
            />
            <Route
              path="/pengajuan/:id/dokumen"
              element={
                <Penjaga peran={['AO']}>
                  <UploadDokumen />
                </Penjaga>
              }
            />
            <Route
              path="/pengajuan/:id/survei"
              element={
                <Penjaga peran={['AO', 'ANL']}>
                  <SurveiHalaman />
                </Penjaga>
              }
            />

            {/* Layar analis. AC-02 menguji bahwa AO ditolak di endpoint verifikasi. */}
            <Route
              path="/pengajuan/:id/verifikasi-dokumen"
              element={
                <Penjaga peran={['ANL']}>
                  <VerifikasiDokumen />
                </Penjaga>
              }
            />
            <Route
              path="/pengajuan/:id/slik"
              element={
                <Penjaga peran={['ANL', 'KCP', 'KC', 'KOM']}>
                  <SlikCheck />
                </Penjaga>
              }
            />
            <Route
              path="/pengajuan/:id/skoring"
              element={
                <Penjaga peran={['ANL', 'KCP', 'KC', 'KOM']}>
                  <Skoring />
                </Penjaga>
              }
            />
            <Route
              path="/pengajuan/:id/margin"
              element={
                <Penjaga peran={['ANL']}>
                  <Margin />
                </Penjaga>
              }
            />

            {/* Approver — hanya melihat yang berada di levelnya (FR-12) */}
            <Route
              path="/approval"
              element={
                <Penjaga peran={['KCP', 'KC', 'KOM']}>
                  <AntrianApproval />
                </Penjaga>
              }
            />

            {/* Admin */}
            <Route
              path="/parameter"
              element={
                <Penjaga peran={['ADM']}>
                  <Parameter />
                </Penjaga>
              }
            />
            <Route
              path="/pengguna"
              element={
                <Penjaga peran={['ADM']}>
                  <Pengguna />
                </Penjaga>
              }
            />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
