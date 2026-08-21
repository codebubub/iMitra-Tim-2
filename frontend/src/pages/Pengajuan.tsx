import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, rupiah } from '../api/client'
import { BadgeStatus } from '../components/Badge'

type BarisPengajuan = {
  id: string
  nomorReferensi: string
  jenisNasabah: string
  akad: string
  status: string
  totalPlafon: number
  diubahPada: string
}

export function Pengajuan() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['pengajuan'],
    queryFn: () => api<BarisPengajuan[]>('/api/pengajuan'),
  })

  return (
    <div className="konten">
      <h1>Daftar Pengajuan</h1>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0' }}>
        <div />
        <Link to="/pengajuan/baru">
          <button className="tombol">+ Buat Pengajuan</button>
        </Link>
      </div>

      {isLoading && <p className="redup">Memuat pengajuan...</p>}
      {error && <p className="redup">Gagal memuat data.</p>}

      {data && (
        <div className="tabel-bungkus">
          <table className="tabel tabel--kartu">
            <thead>
              <tr>
                <th>Nomor Referensi</th>
                <th>Nasabah</th>
                <th>Akad</th>
                <th className="angka">Total Plafon</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id}>
                  <td data-label="Nomor Referensi" className="mono">
                    <Link to={`/pengajuan/${p.id}`}>{p.nomorReferensi}</Link>
                  </td>
                  <td data-label="Nasabah">{p.jenisNasabah === 'KELOMPOK' ? `Kelompok` : p.nomorReferensi}</td>
                  <td data-label="Akad">{p.akad}</td>
                  <td data-label="Total Plafon" className="angka">{rupiah(p.totalPlafon)}</td>
                  <td data-label="Status"><BadgeStatus status={p.status} /></td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="redup" style={{ textAlign: 'center' }}>
                    Belum ada pengajuan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
