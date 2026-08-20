import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './auth/AuthContext'
import { Penjaga } from './auth/Penjaga'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Pengajuan } from './pages/Pengajuan'
import { BuatPengajuan } from './pages/BuatPengajuan'
import { UploadDokumen } from './pages/UploadDokumen'
import { VerifikasiDokumen } from './pages/VerifikasiDokumen'
import { Survei } from './pages/Survei'
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
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={
              <Penjaga peran={['AO', 'ANL', 'KCP', 'KC', 'KOM', 'ADM']}>
                <Dashboard />
              </Penjaga>
            } />
            <Route path="/pengajuan" element={
              <Penjaga peran={['AO', 'ANL']}>
                <Pengajuan />
              </Penjaga>
            } />
            <Route path="/pengajuan/baru" element={
              <Penjaga peran={['AO']}>
                <BuatPengajuan />
              </Penjaga>
            } />
            <Route path="/pengajuan/:id/dokumen" element={
              <Penjaga peran={['AO']}>
                <UploadDokumen />
              </Penjaga>
            } />
            <Route path="/pengajuan/:id/verifikasi" element={
              <Penjaga peran={['ANL']}>
                <VerifikasiDokumen />
              </Penjaga>
            } />
            <Route path="/pengajuan/:id/survei" element={
              <Penjaga peran={['AO', 'ANL']}>
                <Survei />
              </Penjaga>
            } />
            <Route path="/pengajuan/:id/slik" element={
              <Penjaga peran={['ANL']}>
                <SlikCheck />
              </Penjaga>
            } />
            <Route path="/pengajuan/:id/skoring" element={
              <Penjaga peran={['ANL']}>
                <Skoring />
              </Penjaga>
            } />
            <Route path="/pengajuan/:id/margin" element={
              <Penjaga peran={['ANL']}>
                <Margin />
              </Penjaga>
            } />
            <Route path="/pengajuan/:id/audit" element={
              <Penjaga peran={['AO', 'ANL', 'KCP', 'KC', 'KOM', 'ADM']}>
                <AuditTrail />
              </Penjaga>
            } />
            <Route path="/approval" element={
              <Penjaga peran={['KCP', 'KC', 'KOM']}>
                <AntrianApproval />
              </Penjaga>
            } />
            <Route path="/parameter" element={
              <Penjaga peran={['ADM']}>
                <Parameter />
              </Penjaga>
            } />
            <Route path="/pengguna" element={
              <Penjaga peran={['ADM']}>
                <Pengguna />
              </Penjaga>
            } />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
