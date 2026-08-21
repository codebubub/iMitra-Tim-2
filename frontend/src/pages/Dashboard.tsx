import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, rupiah } from '../api/client'
import { BadgeStatus } from '../components/Badge'
import { Memuat } from '../components/Memuat'

type BarisPengajuan = {
  id: string
  nomorReferensi: string
  jenisNasabah: string
  akad: string
  status: string
  jumlahAnggota: number
  totalPlafon: number
  diubahPada: string
}

/**
 * Dashboard pipeline (FR-12).
 *
 * Daftar yang diterima SUDAH difilter peran di query server — AO hanya menerima
 * pengajuan miliknya. Frontend tidak menyaring apa pun soal kepemilikan; kalau
 * ia yang menyaring, pembatasannya bisa ditembus dengan membuka DevTools.
 *
 * KARTU STATUS ADALAH FILTER, bukan sekadar angka. FR-12 meminta pipeline
 * dapat disaring per status, dan menaruh filternya pada angka yang sudah
 * ditampilkan menghindari satu baris kontrol tambahan yang harus dipelajari
 * sendiri. Penyaringan ini murni tampilan — ia menyempitkan daftar yang SUDAH
 * boleh dilihat pengguna, bukan membuka apa pun. Data yang tidak berhak ia
 * lihat tidak pernah sampai ke browser sejak awal.
 */
export function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['pengajuan'],
    queryFn: () => api<BarisPengajuan[]>('/api/pengajuan'),
  })
  const [filter, setFilter] = useState<string | null>(null)

  const semua = data ?? []
  const jumlahPerStatus = semua.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {})

  // Filter yang menunjuk status yang sudah tidak ada lagi (misalnya setelah
  // pengajuan terakhirnya berpindah status) akan mengosongkan tabel tanpa sebab
  // yang terlihat. Karena itu ia diabaikan begitu statusnya hilang dari data.
  const filterAktif = filter && jumlahPerStatus[filter] ? filter : null
  const tampil = filterAktif ? semua.filter((p) => p.status === filterAktif) : semua

  return (
    <>
      <h1>Dashboard Pipeline</h1>
      <p className="redup" style={{ marginTop: 'var(--sp-2)' }}>
        Ringkasan pengajuan yang menjadi tanggung jawab Anda. Ketuk kartu status untuk
        menyaring daftar di bawahnya.
      </p>

      {isLoading && <Memuat baris={5} />}

      {error && (
        <div className="panel-galat" style={{ marginTop: 'var(--sp-4)' }}>
          <span>Gagal memuat data pengajuan. Periksa koneksi lalu muat ulang halaman.</span>
        </div>
      )}

      {data && (
        <>
          <div className="statistik">
            {Object.entries(jumlahPerStatus).map(([status, jumlah]) => {
              const dipilih = filterAktif === status
              return (
                <button
                  key={status}
                  type="button"
                  className="kartu kartu--klik"
                  aria-pressed={dipilih}
                  data-dipilih={dipilih}
                  onClick={() => setFilter(dipilih ? null : status)}
                >
                  <div className="statistik__angka">{jumlah}</div>
                  <BadgeStatus status={status} />
                </button>
              )
            })}
          </div>

          {filterAktif && (
            <div className="aksi" style={{ marginBottom: 'var(--sp-4)' }}>
              <span className="redup">
                Menampilkan {tampil.length} dari {semua.length} pengajuan
              </span>
              <button
                type="button"
                className="tombol tombol--sekunder tombol--kecil"
                onClick={() => setFilter(null)}
              >
                Tampilkan semua
              </button>
            </div>
          )}

          <div className="tabel-bungkus">
            <table className="tabel tabel--kartu">
              <thead>
                <tr>
                  <th>Nomor Referensi</th>
                  <th>Jenis</th>
                  <th>Akad</th>
                  <th className="angka">Total Plafon</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Nomor" className="mono">
                      <Link to={`/pengajuan/${p.id}`}>{p.nomorReferensi}</Link>
                    </td>
                    <td data-label="Jenis">
                      {p.jenisNasabah === 'KELOMPOK'
                        ? `Kelompok - ${p.jumlahAnggota} anggota`
                        : 'Perorangan'}
                    </td>
                    <td data-label="Akad">{p.akad}</td>
                    <td data-label="Total plafon" className="angka">
                      {rupiah(p.totalPlafon)}
                    </td>
                    <td data-label="Status">
                      <BadgeStatus status={p.status} />
                    </td>
                  </tr>
                ))}
                {tampil.length === 0 && (
                  <tr>
                    <td colSpan={5} className="kosong">
                      Belum ada pengajuan di pipeline Anda. AO dapat memulainya lewat menu{' '}
                      <strong>Buat Pengajuan</strong>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
