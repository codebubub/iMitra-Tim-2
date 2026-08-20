import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ambilNotifikasi, tandaiDibaca, type Notifikasi } from '../api/notifikasi'

/**
 * FR-11 · Notifikasi — daftar notifikasi milik pengguna saat ini.
 *
 * Teks notifikasi sudah bebas data pribadi dari server (BR-11). Frontend hanya
 * menampilkan dan menandai dibaca; menekan notifikasi yang punya pengajuanId
 * membuka detail pengajuannya.
 */
export function NotifikasiHalaman() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['notifikasi'],
    queryFn: ambilNotifikasi,
  })

  const baca = useMutation<Notifikasi, unknown, string>({
    mutationFn: (id) => tandaiDibaca(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifikasi'] }),
  })

  function buka(n: Notifikasi) {
    if (!n.dibaca) baca.mutate(n.id)
    if (n.pengajuanId) navigate(`/pengajuan/${n.pengajuanId}`)
  }

  const belumDibaca = (data ?? []).filter((n) => !n.dibaca).length

  return (
    <div className="konten" style={{ maxWidth: 640 }}>
      <h1>Notifikasi{belumDibaca > 0 ? ` (${belumDibaca} belum dibaca)` : ''}</h1>

      {isLoading && <p className="redup">Memuat notifikasi...</p>}
      {error && <p className="redup">Gagal memuat notifikasi.</p>}

      {data && (
        <div className="kartu" style={{ padding: 0, marginTop: 12 }}>
          {data.length === 0 && (
            <p className="redup" style={{ padding: 16 }}>
              Belum ada notifikasi.
            </p>
          )}
          {data.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => buka(n)}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                borderBottom: '1px solid var(--warna-garis)',
                background: n.dibaca ? 'transparent' : 'var(--bg-info)',
                cursor: 'pointer',
                textAlign: 'left',
                font: 'inherit',
              }}
            >
              <span
                aria-hidden
                style={{
                  marginTop: 6,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: n.dibaca ? 'transparent' : 'var(--warna-info)',
                }}
              />
              <span style={{ flex: 1 }}>
                <span style={{ fontWeight: n.dibaca ? 400 : 600 }}>{n.pesan}</span>
                <span className="redup" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
                  {new Date(n.dibuatPada).toLocaleString('id-ID')}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
