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
  jumlahAnggota: number
  totalPlafon: number
  diubahPada: string
}

/**
 * Dashboard pipeline (FR-12).
 *
 * Daftar yang diterima SUDAH difilter peran di query server — AO hanya menerima
 * pengajuan miliknya. Frontend tidak menyaring apa pun; kalau ia yang menyaring,
 * pembatasannya bisa ditembus dengan membuka DevTools.
 */
export function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['pengajuan'],
    queryFn: () => api<BarisPengajuan[]>('/api/pengajuan'),
  })

  const jumlahPerStatus = (data ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <>
        <h1>Dashboard Pipeline</h1>

        {isLoading && <p className="redup">Memuat pengajuan...</p>}
        {error && <p className="redup">Gagal memuat data.</p>}

        {data && (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '24px 0' }}>
              {Object.entries(jumlahPerStatus).map(([status, jumlah]) => (
                <div key={status} className="kartu" style={{ minWidth: 150, padding: 16 }}>
                  <div className="angka" style={{ fontSize: 28, fontWeight: 700, textAlign: 'left' }}>
                    {jumlah}
                  </div>
                  <BadgeStatus status={status} />
                </div>
              ))}
            </div>

            <div className="kartu" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="tabel">
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
                  {data.map((p) => (
                    <tr key={p.id}>
                      <td className="mono">
                        <Link to={`/pengajuan/${p.id}`}>{p.nomorReferensi}</Link>
                      </td>
                      <td>
                        {p.jenisNasabah === 'KELOMPOK'
                          ? `Kelompok - ${p.jumlahAnggota} anggota`
                          : 'Perorangan'}
                      </td>
                      <td>{p.akad}</td>
                      <td className="angka">{rupiah(p.totalPlafon)}</td>
                      <td>
                        <BadgeStatus status={p.status} />
                      </td>
                    </tr>
                  ))}
                  {data.length === 0 && (
                    <tr>
                      <td colSpan={5} className="redup" style={{ textAlign: 'center' }}>
                        Belum ada pengajuan. AO dapat membuat pengajuan baru.
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
