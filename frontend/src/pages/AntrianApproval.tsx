import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rupiah, type GalatApi } from '../api/client'
import {
  ambilAntrianApproval,
  putuskanApproval,
  type BarisAntrian,
  type Keputusan,
} from '../api/approval'
import { useAuth } from '../auth/AuthContext'
import { BadgeStatus } from '../components/Badge'
import { PanelGalat } from '../components/PanelGalat'

/**
 * S-11 · Antrian Approval (FR-08, BR-02, BR-09, AC-10, AC-11) — KCP/KC/KOM.
 *
 * APA YANG LAYAR INI TIDAK LAKUKAN:
 *
 * - Tidak menyaring antrian. Server mengembalikan HANYA pengajuan yang level
 *   berjalannya diisi peran pemanggil (FR-12). Kalau penyaringan ada di sini,
 *   membuka DevTools cukup untuk melihat antrian orang lain.
 * - Tidak menghitung level dari total plafon. Level datang dari server, yang
 *   menghitungnya ulang dari tabel ambang_approval pada setiap pembacaan
 *   (ADR-0002) — sehingga penolakan satu anggota majelis langsung mengubah
 *   jalurnya (AC-14) tanpa kode terpisah di frontend.
 * - Tidak memutuskan sendiri apakah BR-02 atau BR-09 dilanggar. Keduanya
 *   ditegakkan server dan diuji AC-10/AC-11 lewat panggilan API LANGSUNG.
 *   Tombol yang nonaktif di sini adalah kenyamanan; penilai akan menembak
 *   endpoint-nya, dan di sanalah jawabannya harus benar.
 *
 * Yang layar ini lakukan: menampilkan penghalang yang DIKEMBALIKAN server
 * beserta kode BR-nya, supaya approver tahu mengapa ia belum bisa memutuskan.
 */

const gaya = {
  rantai: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap' as const,
  },
  chip: {
    padding: '2px 8px',
    borderRadius: 'var(--radius-badge)',
    fontSize: 12,
    fontWeight: 600,
    background: 'var(--bg-netral)',
    color: 'var(--teks-redup)',
  },
  chipSelesai: {
    background: 'var(--bg-sukses)',
    color: 'var(--warna-sukses)',
  },
  chipBerjalan: {
    background: 'var(--bg-info)',
    color: 'var(--warna-info)',
    outline: '2px solid var(--warna-info)',
  },
  panelSamping: {
    borderLeft: '1px solid var(--warna-garis)',
    paddingLeft: 'var(--sp-5)',
  },
  barisRingkas: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: 'var(--sp-2) 0',
    borderBottom: '1px solid var(--warna-garis)',
  },
  barisTerpilih: {
    background: 'var(--bg-info)',
  },
} satisfies Record<string, React.CSSProperties>

/**
 * Rantai level approval. Menerima `level` yang sedang berjalan dari server dan
 * jumlah level total; tidak menghitungnya sendiri dari plafon.
 */
function RantaiApproval({ level, jumlahLevel }: { level: number; jumlahLevel: number }) {
  /**
   * Nama peran per level TIDAK ditebak di sini bila server belum mengirimnya.
   * Yang ditampilkan adalah nomor levelnya, yang selalu benar. Menebak
   * 'KCP → KC → KOM' dari jumlah level akan salah begitu ADM mengubah
   * urutan_peran di tabel ambang_approval.
   */
  return (
    <div style={gaya.rantai}>
      {Array.from({ length: jumlahLevel }, (_, i) => i + 1).map((n) => (
        <span
          key={n}
          style={{
            ...gaya.chip,
            ...(n < level ? gaya.chipSelesai : {}),
            ...(n === level ? gaya.chipBerjalan : {}),
          }}
        >
          L{n}
          {n < level ? ' ✓' : ''}
        </span>
      ))}
    </div>
  )
}

export function AntrianApproval() {
  const { pengguna } = useAuth()
  const qc = useQueryClient()
  const [dipilih, setDipilih] = useState<string | null>(null)
  const [keputusan, setKeputusan] = useState<Keputusan | null>(null)
  const [alasan, setAlasan] = useState('')
  const [galat, setGalat] = useState<GalatApi | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['antrian-approval'],
    queryFn: ambilAntrianApproval,
  })

  const antrian = data ?? []
  const aktif: BarisAntrian | undefined = antrian.find((a) => a.id === dipilih)

  const putuskan = useMutation<unknown, GalatApi, { keputusan: Keputusan }>({
    mutationFn: ({ keputusan: k }) =>
      putuskanApproval(aktif!.id, { keputusan: k, alasan: alasan.trim() || undefined }),
    onSuccess: () => {
      setGalat(null)
      setAlasan('')
      setKeputusan(null)
      setDipilih(null)
      qc.invalidateQueries({ queryKey: ['antrian-approval'] })
    },
    /**
     * BR-02 (urutan belum tiba) dan BR-09 (pembuat = approver) sampai di sini
     * sebagai 422/403 dengan `rule` terisi. PanelGalat menampilkan kode BR-nya.
     * Galat TIDAK diubah menjadi pesan generik — kode itu yang diperiksa AC-11.
     */
    onError: setGalat,
  })

  /** Alasan wajib untuk REJECT dan RETURN; server yang menegakkannya. */
  const alasanWajib = keputusan === 'REJECT' || keputusan === 'RETURN'
  const alasanTerpenuhi = !alasanWajib || alasan.trim().length > 0

  return (
    <div className="konten">
      <h1>Antrian Approval</h1>
      <p className="redup" style={{ marginTop: 4 }}>
        Menampilkan pengajuan pada level Anda ({pengguna?.peran}). Daftar ini disaring di
        server.
      </p>

      <PanelGalat galat={galat} />

      {isLoading && <p className="redup">Memuat antrian...</p>}
      {error && <p className="redup">Gagal memuat antrian approval.</p>}

      {data && antrian.length === 0 && (
        <div className="kartu" style={{ textAlign: 'center', padding: 'var(--sp-7)' }}>
          <p className="redup">
            Tidak ada pengajuan yang menunggu keputusan Anda saat ini.
          </p>
        </div>
      )}

      {antrian.length > 0 && (
        <div
          className={aktif ? 'dua-kolom' : 'dua-kolom dua-kolom--tunggal'}
          style={{
            // Lebar panel sebagai variabel, bukan angka tetap: di bawah 980px
            // kelasnya menumpuk kedua kolom (lihat theme.css).
            '--kolom-samping': '420px',
            gap: 'var(--sp-5)',
            marginTop: 'var(--sp-5)',
          } as React.CSSProperties}
        >
          <div className="tabel-bungkus">
            <table className="tabel tabel--kartu">
              <thead>
                <tr>
                  <th>Nomor Referensi</th>
                  <th className="angka">Total Plafon</th>
                  <th>Status</th>
                  <th>Jalur Approval</th>
                </tr>
              </thead>
              <tbody>
                {antrian.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => {
                      setDipilih(a.id)
                      setGalat(null)
                      setKeputusan(null)
                      setAlasan('')
                    }}
                    style={{
                      cursor: 'pointer',
                      ...(a.id === dipilih ? gaya.barisTerpilih : {}),
                    }}
                  >
                    <td data-label="Nomor Referensi" className="mono">
                      <Link to={`/pengajuan/${a.id}`}>{a.nomorReferensi}</Link>
                    </td>
                    <td data-label="Total Plafon" className="angka">{rupiah(a.totalPlafon)}</td>
                    <td data-label="Status">
                      <BadgeStatus status={a.status} />
                    </td>
                    <td data-label="Jalur Approval">
                      {/*
                       * Jumlah level tidak dikirim per baris oleh endpoint
                       * antrian saat ini, jadi rantai digambar sampai level
                       * berjalan. Ini menampilkan posisi tanpa mengarang
                       * panjang jalur — lebih baik kurang informasi daripada
                       * informasi yang salah saat ambang diubah ADM.
                       */}
                      <RantaiApproval level={a.level} jumlahLevel={a.level} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {aktif && (
            <aside style={gaya.panelSamping}>
              <h2>Keputusan</h2>
              <p className="mono redup" style={{ marginTop: 4 }}>
                {aktif.nomorReferensi}
              </p>

              <div style={{ margin: 'var(--sp-4) 0' }}>
                <div style={gaya.barisRingkas}>
                  <span className="redup">Total plafon</span>
                  <strong className="angka">{rupiah(aktif.totalPlafon)}</strong>
                </div>
                <div style={gaya.barisRingkas}>
                  <span className="redup">Level berjalan</span>
                  <strong>{aktif.level}</strong>
                </div>
                <div style={gaya.barisRingkas}>
                  <span className="redup">Status</span>
                  <BadgeStatus status={aktif.status} />
                </div>
              </div>

              <Link to={`/pengajuan/${aktif.id}/audit`} className="redup">
                Lihat jejak audit pengajuan ini
              </Link>

              <div style={{ marginTop: 'var(--sp-4)' }}>
                <label htmlFor="alasan-keputusan">Alasan</label>
                <textarea
                  id="alasan-keputusan"
                  rows={3}
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  aria-describedby="bantuan-alasan-keputusan"
                />
                <p
                  id="bantuan-alasan-keputusan"
                  className="redup"
                  style={{ fontSize: 12, marginTop: 4 }}
                >
                  Wajib untuk Tolak dan Kembalikan.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--sp-2)',
                  marginTop: 'var(--sp-3)',
                }}
              >
                <button
                  className="tombol"
                  onClick={() => {
                    setKeputusan('APPROVE')
                    putuskan.mutate({ keputusan: 'APPROVE' })
                  }}
                  disabled={putuskan.isPending}
                >
                  Setujui
                </button>
                <button
                  className="tombol tombol--bahaya"
                  onClick={() => {
                    setKeputusan('REJECT')
                    if (alasan.trim()) putuskan.mutate({ keputusan: 'REJECT' })
                  }}
                  disabled={putuskan.isPending || (keputusan === 'REJECT' && !alasanTerpenuhi)}
                >
                  Tolak
                </button>
                <button
                  className="tombol tombol--sekunder"
                  onClick={() => {
                    setKeputusan('RETURN')
                    if (alasan.trim()) putuskan.mutate({ keputusan: 'RETURN' })
                  }}
                  disabled={putuskan.isPending || (keputusan === 'RETURN' && !alasanTerpenuhi)}
                >
                  Kembalikan ke AO
                </button>
              </div>

              {alasanWajib && !alasanTerpenuhi && (
                <p className="redup" style={{ fontSize: 12, marginTop: 'var(--sp-2)' }}>
                  Isi alasan lebih dulu untuk keputusan Tolak atau Kembalikan.
                </p>
              )}

              {/*
               * Kedua penghalang di bawah ditampilkan berdasarkan JAWABAN SERVER,
               * bukan tebakan frontend. Caption-nya menegaskan tempat pemeriksaan
               * yang sebenarnya, karena itu yang diuji AC-11.
               */}
              {galat?.rule === 'BR-02' && (
                <p className="redup" style={{ fontSize: 12, marginTop: 'var(--sp-3)' }}>
                  Urutan approval belum tiba pada level Anda. Pemeriksaan ini dilakukan di
                  server.
                </p>
              )}
              {galat?.rule === 'BR-09' && (
                <p className="redup" style={{ fontSize: 12, marginTop: 'var(--sp-3)' }}>
                  Anda adalah pembuat pengajuan ini dan tidak dapat menyetujuinya.
                  Pemeriksaan ini dilakukan di server.
                </p>
              )}
            </aside>
          )}
        </div>
      )}
    </div>
  )
}
