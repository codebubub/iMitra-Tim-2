import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ambilToken, hapusToken, simpanToken } from '../api/client'

export type Peran = 'AO' | 'ANL' | 'KCP' | 'KC' | 'KOM' | 'ADM'
export type Pengguna = { id: string; nama: string; peran: Peran }

type Konteks = {
  pengguna: Pengguna | null
  memuat: boolean
  masuk: (username: string, password: string) => Promise<void>
  keluar: () => void
}

const AuthContext = createContext<Konteks | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [pengguna, setPengguna] = useState<Pengguna | null>(null)
  const [memuat, setMemuat] = useState(true)

  useEffect(() => {
    if (!ambilToken()) {
      setMemuat(false)
      return
    }
    api<Pengguna>('/api/auth/me')
      .then(setPengguna)
      .catch(() => hapusToken())
      .finally(() => setMemuat(false))
  }, [])

  const nilai = useMemo<Konteks>(
    () => ({
      pengguna,
      memuat,
      async masuk(username, password) {
        const hasil = await api<{ token: string; pengguna: Pengguna }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        })
        simpanToken(hasil.token)
        setPengguna(hasil.pengguna)
      },
      keluar() {
        hapusToken()
        setPengguna(null)
      },
    }),
    [pengguna, memuat],
  )

  return <AuthContext.Provider value={nilai}>{children}</AuthContext.Provider>
}

export function useAuth(): Konteks {
  const k = useContext(AuthContext)
  if (!k) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return k
}
