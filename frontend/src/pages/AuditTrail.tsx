import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ambilRiwayatPengajuan, type BarisAudit } from '../api/audit'
import { BadgeStatus } from '../components/Badge'

/**
 * S-12 · Audit Trail (FR-09, AC-12, AC-13) — dapat dibaca semua peran yang berhak.
 *
 * AC-12 meminta "riwayat lengkap satu pengajuan dari DRAFT sampai APPROVED,
 * urut waktu, dengan aktor di setiap baris". Ketiganya ditampilkan apa adanya:
 * waktu dari server, nama aktor, dan peran yang ia pegang SAAT keputusan diambil.
 *
 * TIDAK ADA KONTROL TULIS di layar ini — tidak ada tombol ubah, tidak ada hapus,
 * tidak ada "tambah catatan". Itu bukan kelalaian melainkan bagian dari AC-13:
 * audit bersifat append-only, ditulis dari dalam service, dan trigger database
 * menolak UPDATE maupun DELETE. Layar yang punya tombol hapus akan memancing
 * pertanyaan yang jawabannya sudah benar.
 *
 * Urutan baris datang dari server (`orderBy: terjadiPada asc`) dan sengaja TIDAK
 * diurutkan ulang di sini: kalau urutannya salah, itu masalah data yang harus
 * terlihat, bukan ditutupi di lapisan tampilan.
 */

const gaya = {
  waktu: {
    whiteSpace: 'nowrap' as const,
    fontVariantNumeric: 'tabular-nums' as const,
    color: 'var(--teks-sekunder)',
  },
  panah: { color: 'var(--teks-redup)', margin: '0 var(--sp-1)' },
  metadata: {
    fontFamily: 'ui-monospace, monospace',
    fontSize: 12,
    color: 'var(--teks-sekunder)',
    whiteSpace: 'pre-wrap' as const,
    margin: 0,
  },
} satisfies Record<string, React.CSSProperties>

/** Aksi teknis dari server diterjemahkan menjadi kalimat yang dibaca manusia. */
const LABEL_AKSI: Record<string, string> = {
  LOGIN: 'Login',
  LOGIN_GAGAL: 'Login gagal',
  UBAH_STATUS: 'Perubahan status',
  VERIFIKASI_DOKUMEN: 'Verifikasi dokumen',
  SLIK_OK: 'SLIK check berhasil',
  SLIK_GAGAL: 'SLIK check gagal',
  SKORING: 'Menjalankan skoring',
  OVERRIDE_GRADE: 'Override grade',
  SET_MARGIN: 'Menetapkan margin',
  KEPUTUSAN_APPROVAL: 'Keputusan approval',
  TOLAK_ANGGOTA: 'Menolak anggota',
  UBAH_PARAMETER: 'Mengubah parameter',
  BUAT_PENGGUNA: 'Membuat pengguna',
  UBAH_PENGGUNA: 'Mengubah pengguna',
}

function waktuPanjang(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  })
}

/**
 * Metadata ditampilkan apa adanya, tanpa penyaringan di frontend.
 *
 * Penyaringan data pribadi (BR-11) dilakukan di SERVER saat baris ditulis —
 * menyaring lagi di sini akan menyembunyikan kebocoran, bukan mencegahnya.
 * Kalau NIK sampai muncul di layar ini, itu bug backend yang memang harus
 * terlihat.
 */
function Metadata({ isi }: { isi: BarisAudit['metadata'] }) {
  if (!isi || Object.keys(isi).length === 0) return null
  const baris = Object.entries(isi).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
  return <p style={gaya.metadata}>{baris.join('\n')}</p>
}

export function AuditTrail() {
  const { id } = useParams<{ id: string }>()
  const pengajuanId = id ?? ''

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit', pengajuanId],
    queryFn: () => ambilRiwayatPengajuan(pengajuanId),
    enabled: !!pengajuanId,
  })

  return (
    <>
      <h1>Audit Trail</h1>
      <p className="redup" style={{ marginTop: 4 }}>
        Catatan bersifat append-only. Tidak ada cara mengubah atau menghapus baris di sini.
      </p>

      {isLoading && <p className="redup" style={{ marginTop: 'var(--sp-5)' }}>Memuat riwayat...</p>}
      {error && (
        <p className="redup" style={{ marginTop: 'var(--sp-5)' }}>
          Gagal memuat riwayat audit.
        </p>
      )}

      {data && data.length === 0 && (
        <div className="kartu" style={{ marginTop: 'var(--sp-5)' }}>
          <p className="redup">
            Belum ada catatan untuk pengajuan ini. Baris pertama muncul saat pengajuan dibuat.
          </p>
        </div>
      )}

      {data && data.length > 0 && (
        <>
          <p className="redup" style={{ marginTop: 'var(--sp-4)', fontSize: 13 }}>
            {data.length} catatan, urut waktu.
          </p>

          <div className="tabel-bungkus" style={{ marginTop: 'var(--sp-3)' }}>
            <table className="tabel tabel--kartu">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Aktor</th>
                  <th>Aksi</th>
                  <th>Perubahan status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((b) => (
                  <tr key={b.id}>
                    <td data-label="Waktu" style={gaya.waktu}>{waktuPanjang(b.waktu)}</td>
                    <td data-label="Aktor">
                      <div style={{ fontWeight: 600 }}>{b.aktor}</div>
                      <span className="badge">{b.aktorPeran}</span>
                    </td>
                    <td data-label="Aksi">
                      <div>{LABEL_AKSI[b.aksi] ?? b.aksi}</div>
                      <Metadata isi={b.metadata} />
                    </td>
                    <td data-label="Perubahan status">
                      {b.statusSesudah ? (
                        <>
                          {b.statusSebelum ? (
                            <BadgeStatus status={b.statusSebelum} />
                          ) : (
                            <span className="redup">—</span>
                          )}
                          <span style={gaya.panah}>→</span>
                          <BadgeStatus status={b.statusSesudah} />
                        </>
                      ) : (
                        <span className="redup">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
