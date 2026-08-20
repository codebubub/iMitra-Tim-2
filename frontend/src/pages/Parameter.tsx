import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function Parameter() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['parameter'],
    queryFn: () => api<any[]>('/api/parameter/skoring'),
  })

  return (
    <div className="konten">
      <h1>Parameter Sistem</h1>
      <p className="redup" style={{ marginBottom: 24 }}>
        Perubahan berlaku pada perhitungan berikutnya, tanpa restart aplikasi.
      </p>

      {isLoading && <p className="redup">Memuat parameter...</p>}
      {error && <p className="redup">Gagal memuat data.</p>}

      {data && (
        <div className="kartu" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="tabel">
            <thead>
              <tr>
                <th>Komponen</th>
                <th className="angka">Bobot</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any) => (
                <tr key={item.id}>
                  <td>{item.nama}</td>
                  <td className="angka">{item.bobot}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
