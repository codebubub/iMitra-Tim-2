import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './auth/AuthContext'
import { Penjaga } from './auth/Penjaga'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { BuatPengajuan } from './pages/BuatPengajuan'
import { UploadDokumen } from './pages/UploadDokumen'
import { VerifikasiDokumen } from './pages/VerifikasiDokumen'
import { SurveiHalaman } from './pages/Survei'
import { NotifikasiHalaman } from './pages/Notifikasi'

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
 * Peta route. Setiap route yang dibatasi peran dibungkus <Penjaga> — tetapi
 * ingat: itu kenyamanan navigasi, BUKAN otorisasi. Server yang memutuskan.
 *
 * Layar berikutnya ditambahkan di sini oleh pemiliknya masing-masing
 * (docs/PEMBAGIAN-TIM.md), satu berkas per layar di src/pages/.
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <Penjaga>
                  <Dashboard />
                </Penjaga>
              }
            />
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
              path="/pengajuan/:id/verifikasi-dokumen"
              element={
                <Penjaga peran={['ANL']}>
                  <VerifikasiDokumen />
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
            <Route
              path="/notifikasi"
              element={
                <Penjaga>
                  <NotifikasiHalaman />
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
