import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ambilNotifikasi, tandaiDibaca, type Notifikasi } from '../api/notifikasi'
import { Ikon } from '../components/Ikon'
import { Memuat } from '../components/Memuat'
import { waktuLengkap, waktuRelatif } from '../lib/waktu'

/**
 * FR-11 · Notifikasi — daftar notifikasi milik pengguna saat ini.
 *
 * Teks notifikasi sudah bebas data pribadi dari server (BR-11). Frontend hanya
 * menampilkan dan menandai dibaca; menekan notifikasi yang punya pengajuanId
 * membuka detail pengajuannya.
 *
 * ------------------------------------------------------------------------
 * DUA HAL YANG DIPERBAIKI DARI VERSI SEBELUMNYA
 *
 * 1. HALAMAN INI MERENDER `.konten` DI DALAM `.konten`. Setelah kerangka
 *    aplikasi memindahkan `<main className="konten">` ke Layout, pembungkus di
 *    sini menjadi lapis kedua: padding ganda, dan `maxWidth: 640` yang membatasi
 *    isi ke sepertiga layar. Itulah sebab kartunya terlihat kecil — bukan
 *    kartunya yang sempit, melainkan ruang yang diberikan kepadanya.
 *
 * 2. SATU NOTIFIKASI KINI SATU KARTU, bukan satu baris setinggi 44px di dalam
 *    satu kotak panjang. Bentuk lama membuat pesan pendek melayang di ruang
 *    kosong dan seluruh daftar terbaca sebagai tabel tanpa kolom.
 * ------------------------------------------------------------------------
 */
export function NotifikasiHalaman() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['notifikasi'],
    queryFn: () => ambilNotifikasi(),
  })

  const baca = useMutation<{ status: string }, unknown, string>({
    mutationFn: (id) => tandaiDibaca(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifikasi'] }),
  })

  function buka(n: Notifikasi) {
    if (!n.dibaca) baca.mutate(n.id)
    if (n.pengajuanId) navigate(`/pengajuan/${n.pengajuanId}`)
  }

  // Jumlah belum dibaca datang dari server (COUNT), bukan diturunkan dari
  // panjang `baris` yang bisa terpotong `batas`.
  const baris = data?.baris ?? []
  const belumDibaca = data?.belumDibaca ?? 0

  return (
    <div className="halaman-form">
      <div className="kepala-halaman">
        <div>
          <h1>Notifikasi</h1>
          <p className="redup" style={{ marginTop: 'var(--sp-1)' }}>
            {belumDibaca > 0
              ? `${belumDibaca} belum dibaca. Membuka notifikasi menandainya sudah dibaca.`
              : 'Semua notifikasi sudah dibaca.'}
          </p>
        </div>
        {belumDibaca > 0 && <span className="badge badge--info">{belumDibaca} baru</span>}
      </div>

      {isLoading && <Memuat baris={4} />}

      {error && (
        <div className="panel-galat" style={{ marginTop: 'var(--sp-4)' }}>
          <span>Gagal memuat notifikasi. Periksa koneksi lalu muat ulang halaman.</span>
        </div>
      )}

      {data && baris.length === 0 && (
        <div className="kartu kosong" style={{ marginTop: 'var(--sp-5)' }}>
          <p style={{ margin: 0 }}>Belum ada notifikasi.</p>
          <p className="redup" style={{ marginTop: 'var(--sp-2)', fontSize: 13 }}>
            Notifikasi muncul saat status pengajuan yang Anda tangani berubah.
          </p>
        </div>
      )}

      {data && baris.length > 0 && (
        <div className="notif-daftar">
          {baris.map((n) => {
            const bisaDibuka = !!n.pengajuanId
            return (
              <button
                key={n.id}
                type="button"
                className="notif"
                data-belum={!n.dibaca}
                onClick={() => buka(n)}
                /*
                 * Kalimat lengkap untuk pembaca layar. Tanpa ini yang terbaca
                 * hanya isi pesannya, tanpa kabar bahwa notifikasi ini belum
                 * dibaca dan bahwa menekannya membuka pengajuan — dua hal yang
                 * bagi pengguna awas disampaikan lewat warna dan tanda panah.
                 */
                aria-label={
                  `${n.dibaca ? 'Sudah dibaca' : 'Belum dibaca'}: ${n.pesan}` +
                  (bisaDibuka ? '. Buka detail pengajuan.' : '')
                }
              >
                <span className="notif__ikon" aria-hidden="true">
                  <Ikon nama="lonceng" ukuran={18} />
                </span>

                <span className="notif__isi">
                  <span className="notif__pesan">{n.pesan}</span>
                  <span className="notif__meta">
                    {n.nomorReferensi && (
                      <>
                        <span className="notif__ref">{n.nomorReferensi}</span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span title={waktuLengkap(n.dibuatPada)}>{waktuRelatif(n.dibuatPada)}</span>
                  </span>
                </span>

                {bisaDibuka && (
                  <span className="notif__panah" aria-hidden="true">
                    <Ikon nama="panah-kanan" ukuran={18} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
