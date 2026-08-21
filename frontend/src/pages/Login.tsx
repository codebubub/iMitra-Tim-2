import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { PanelGalat } from '../components/PanelGalat'
import type { GalatApi } from '../api/client'

export function Login() {
  const { pengguna, masuk } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [lihatSandi, setLihatSandi] = useState(false)
  const [galat, setGalat] = useState<GalatApi | null>(null)
  const [mengirim, setMengirim] = useState(false)

  if (pengguna) return <Navigate to="/dashboard" replace />

  async function kirim(e: FormEvent) {
    e.preventDefault()
    setGalat(null)
    setMengirim(true)
    try {
      await masuk(username, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      // Pesan dari server sengaja tidak membedakan username salah dari sandi
      // salah — membedakannya hanya berguna bagi orang yang sedang menebak akun.
      setGalat(err as GalatApi)
    } finally {
      setMengirim(false)
    }
  }

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 16 }}>
      <form className="kartu" style={{ width: 400, maxWidth: '100%' }} onSubmit={kirim}>
        <h1 style={{ color: 'var(--warna-primer)' }}>iMitra</h1>
        <p className="redup" style={{ marginTop: 4 }}>
          Sistem Originasi Pembiayaan Mikro Syariah
        </p>

        <div style={{ marginTop: 24 }}>
          <PanelGalat galat={galat} />
        </div>

        <div style={{ marginTop: 16 }}>
          <label htmlFor="username">Nama pengguna</label>
          <input
            id="username"
            // Satu-satunya field pada layar tanpa isi lain, jadi tidak ada
            // fokus yang direbut dari pengguna pembaca layar.
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label htmlFor="password">Kata sandi</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="password"
              type={lihatSandi ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="tombol tombol--sekunder"
              style={{ flex: 'none' }}
              onClick={() => setLihatSandi((v) => !v)}
              aria-label={lihatSandi ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            >
              {lihatSandi ? 'Sembunyi' : 'Lihat'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="tombol tombol--blok"
          style={{ marginTop: 24 }}
          disabled={mengirim}
        >
          {mengirim ? 'Memproses...' : 'Masuk'}
        </button>

        <p className="redup" style={{ textAlign: 'center', marginTop: 16, fontSize: 12 }}>
          Bank Syariah Nasional · Lingkungan demo
        </p>
      </form>
    </main>
  )
}
