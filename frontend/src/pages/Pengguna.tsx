import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GalatApi } from '../api/client'
import {
  ambilDaftarPengguna,
  buatPengguna,
  ubahPengguna,
  DAFTAR_PERAN,
  NAMA_PERAN,
  type Peran,
  type PenggunaAman,
} from '../api/parameter'
import { useAuth } from '../auth/AuthContext'
import { PanelGalat } from '../components/PanelGalat'

/**
 * S-14 · Kelola Pengguna (FR-01) — dipakai ADM.
 *
 * TIDAK ADA AKSI HAPUS DI LAYAR INI, DAN TIDAK BOLEH DITAMBAHKAN.
 *
 * Baris audit_trail menunjuk ke pengguna lewat `aktor_id`. Menghapus pengguna
 * memutus jejak siapa memutuskan apa, dan jejak itu adalah inti FR-09 (AC-12,
 * AC-13). Karena itu pengguna DINONAKTIFKAN (`aktif: false`), tidak dihapus —
 * dan backend pun tidak menyediakan endpoint DELETE untuk sumber daya ini.
 *
 * Dua penjagaan tambahan (ADM tidak dapat menonaktifkan dirinya sendiri, dan
 * admin aktif terakhir tidak dapat dinonaktifkan) ditegakkan DI SERVER karena
 * keduanya perlu membaca data. Layar hanya menampilkan galatnya bila terjadi.
 */

const gaya = {
  panelSamping: {
    borderLeft: '1px solid var(--warna-garis)',
    paddingLeft: 'var(--sp-5)',
  },
  aksi: {
    background: 'none',
    border: 'none',
    padding: 0,
    font: 'inherit',
    color: 'var(--warna-info)',
    cursor: 'pointer',
    textDecoration: 'underline',
    marginRight: 'var(--sp-3)',
  },
} satisfies Record<string, React.CSSProperties>

const tanggal = (iso: string): string =>
  new Date(iso).toLocaleDateString('id-ID', { dateStyle: 'medium' })

/**
 * Membangkitkan kata sandi awal yang acak.
 *
 * Memakai crypto.getRandomValues, bukan Math.random: ini kata sandi awal untuk
 * akun perbankan, dan Math.random tidak dirancang untuk itu. Kata sandi ini
 * hanya ada di memori sampai dikirim, tidak pernah dicatat ke log (BR-11 —
 * kredensial diperlakukan sama ketatnya dengan data pribadi).
 */
function bangkitkanSandi(): string {
  const abjad = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const acak = new Uint32Array(14)
  crypto.getRandomValues(acak)
  return Array.from(acak, (n) => abjad[n % abjad.length]).join('')
}

export function Pengguna() {
  const { pengguna: penggunaAktif } = useAuth()
  const qc = useQueryClient()
  const [galat, setGalat] = useState<GalatApi | null>(null)
  const [panelTambah, setPanelTambah] = useState(false)
  const [ubahPeranUntuk, setUbahPeranUntuk] = useState<string | null>(null)

  const [nama, setNama] = useState('')
  const [username, setUsername] = useState('')
  const [peran, setPeran] = useState<Peran>('AO')
  const [sandi, setSandi] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['pengguna'],
    queryFn: () => ambilDaftarPengguna(),
  })

  const bersihkan = () => {
    setNama('')
    setUsername('')
    setPeran('AO')
    setSandi('')
    setPanelTambah(false)
  }

  const tambah = useMutation<PenggunaAman, GalatApi, void>({
    mutationFn: () => buatPengguna({ username, nama, peran, password: sandi }),
    onSuccess: () => {
      setGalat(null)
      bersihkan()
      qc.invalidateQueries({ queryKey: ['pengguna'] })
    },
    onError: setGalat,
  })

  const ubah = useMutation<
    PenggunaAman,
    GalatApi,
    { id: string; input: { peran?: Peran; aktif?: boolean } }
  >({
    mutationFn: ({ id, input }) => ubahPengguna(id, input),
    onSuccess: () => {
      setGalat(null)
      setUbahPeranUntuk(null)
      qc.invalidateQueries({ queryKey: ['pengguna'] })
    },
    onError: setGalat,
  })

  const daftar = data ?? []
  const formSiap = nama.trim() !== '' && username.trim() !== '' && sandi.length >= 8

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--sp-4)',
          flexWrap: 'wrap',
        }}
      >
        <h1>Kelola Pengguna</h1>
        <button className="tombol" onClick={() => setPanelTambah((v) => !v)}>
          {panelTambah ? 'Tutup form' : '+ Tambah pengguna'}
        </button>
      </div>

      <PanelGalat galat={galat} />

      <div
        className={panelTambah ? 'dua-kolom' : 'dua-kolom dua-kolom--tunggal'}
        style={{
          '--kolom-samping': '360px',
          gap: 'var(--sp-5)',
          marginTop: 'var(--sp-5)',
        } as React.CSSProperties}
      >
        <div className="tabel-bungkus">
          <table className="tabel tabel--kartu">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Nama pengguna</th>
                <th>Peran</th>
                <th>Status</th>
                <th>Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="redup" style={{ textAlign: 'center' }}>
                    Memuat pengguna...
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={6} className="redup" style={{ textAlign: 'center' }}>
                    Gagal memuat daftar pengguna.
                  </td>
                </tr>
              )}
              {daftar.map((p) => {
                const diriSendiri = p.id === penggunaAktif?.id
                return (
                  <tr key={p.id}>
                    <td data-label="Nama">{p.nama}</td>
                    <td data-label="Nama pengguna" className="mono">{p.username}</td>
                    <td data-label="Peran">
                      {ubahPeranUntuk === p.id ? (
                        <select
                          aria-label={`Peran untuk ${p.nama}`}
                          value={p.peran}
                          onChange={(e) =>
                            ubah.mutate({
                              id: p.id,
                              input: { peran: e.target.value as Peran },
                            })
                          }
                        >
                          {DAFTAR_PERAN.map((kode) => (
                            <option key={kode} value={kode}>
                              {kode} — {NAMA_PERAN[kode]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="badge badge--info" title={NAMA_PERAN[p.peran]}>
                          {p.peran}
                        </span>
                      )}
                    </td>
                    <td data-label="Status">
                      <span className={p.aktif ? 'badge badge--sukses' : 'badge'}>
                        {p.aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td data-label="Dibuat">{tanggal(p.dibuatPada)}</td>
                    <td data-label="Aksi">
                      <button
                        style={gaya.aksi}
                        onClick={() => setUbahPeranUntuk(ubahPeranUntuk === p.id ? null : p.id)}
                      >
                        Ubah peran
                      </button>
                      {/*
                       * Nonaktifkan / aktifkan kembali. TIDAK ADA "Hapus" —
                       * lihat catatan di kepala berkas. Tombol pada baris
                       * sendiri dinonaktifkan lebih awal supaya ADM tidak
                       * mengunci dirinya keluar; server memeriksa hal yang sama.
                       */}
                      <button
                        style={{
                          ...gaya.aksi,
                          color: diriSendiri ? 'var(--teks-redup)' : 'var(--warna-bahaya)',
                          cursor: diriSendiri ? 'not-allowed' : 'pointer',
                        }}
                        disabled={diriSendiri || ubah.isPending}
                        title={
                          diriSendiri
                            ? 'Anda tidak dapat menonaktifkan akun Anda sendiri'
                            : undefined
                        }
                        onClick={() =>
                          ubah.mutate({ id: p.id, input: { aktif: !p.aktif } })
                        }
                      >
                        {p.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {!isLoading && !error && daftar.length === 0 && (
                <tr>
                  <td colSpan={6} className="redup" style={{ textAlign: 'center' }}>
                    Belum ada pengguna.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {panelTambah && (
          <aside style={gaya.panelSamping}>
            <h2>Tambah pengguna</h2>

            <div style={{ marginTop: 'var(--sp-3)' }}>
              <label htmlFor="nama-lengkap">Nama lengkap</label>
              <input id="nama-lengkap" value={nama} onChange={(e) => setNama(e.target.value)} />
            </div>

            <div style={{ marginTop: 'var(--sp-3)' }}>
              <label htmlFor="nama-pengguna">Nama pengguna</label>
              <input
                id="nama-pengguna"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
              />
            </div>

            <div style={{ marginTop: 'var(--sp-3)' }}>
              <label htmlFor="peran-baru">Peran</label>
              <select
                id="peran-baru"
                value={peran}
                onChange={(e) => setPeran(e.target.value as Peran)}
              >
                {DAFTAR_PERAN.map((kode) => (
                  <option key={kode} value={kode}>
                    {kode} — {NAMA_PERAN[kode]}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: 'var(--sp-3)' }}>
              <label htmlFor="sandi-awal">Kata sandi awal</label>
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <input
                  id="sandi-awal"
                  type="text"
                  value={sandi}
                  onChange={(e) => setSandi(e.target.value)}
                  aria-describedby="bantuan-sandi"
                />
                <button
                  className="tombol tombol--sekunder"
                  onClick={() => setSandi(bangkitkanSandi())}
                >
                  Bangkitkan
                </button>
              </div>
              <p id="bantuan-sandi" className="redup" style={{ fontSize: 12, marginTop: 4 }}>
                Minimal 8 karakter. Sampaikan ke pengguna lewat kanal terpisah, jangan
                lewat catatan bersama.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)' }}>
              <button
                className="tombol"
                onClick={() => tambah.mutate()}
                disabled={!formSiap || tambah.isPending}
              >
                {tambah.isPending ? 'Menyimpan...' : 'Simpan pengguna'}
              </button>
              <button className="tombol tombol--sekunder" onClick={bersihkan}>
                Batal
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
