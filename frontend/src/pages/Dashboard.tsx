import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, rupiah } from '../api/client'
import { BadgeStatus, labelStatus, nadaStatus } from '../components/Badge'
import { Memuat } from '../components/Memuat'
import { useAuth } from '../auth/AuthContext'
import { waktuLengkap, waktuRelatif } from '../lib/waktu'

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
 * SUSUNAN LAYAR INI DIBACA DARI ATAS KE BAWAH, dan setiap lapis menjawab satu
 * pertanyaan yang berbeda:
 *
 *   1. RINGKASAN ANGKA — "berapa banyak, dan berapa nilainya?"
 *   2. BAR KOMPOSISI   — "pipeline saya menumpuk di tahap mana?"
 *   3. CHIP FILTER     — "tunjukkan hanya tahap itu"
 *   4. TABEL           — "yang mana persisnya?"
 *
 * RINGKASAN ANGKA IKUT FILTER, dan itu disengaja. Total plafon dari seluruh
 * status — termasuk yang sudah ditolak — hampir tidak berarti apa-apa. Begitu
 * disaring ke "Menunggu approval L1", angka yang sama menjadi jawaban atas
 * pertanyaan nyata: berapa rupiah yang sedang menunggu tanda tangan saya.
 *
 * PENYARINGAN DI SINI MURNI TAMPILAN. Ia menyempitkan daftar yang memang sudah
 * boleh dilihat pengguna, bukan membuka apa pun. Data yang tidak berhak ia
 * lihat tidak pernah sampai ke browser sejak awal.
 */
export function Dashboard() {
  const { pengguna } = useAuth()
  const { data, isLoading, error } = useQuery({
    queryKey: ['pengajuan'],
    queryFn: () => api<BarisPengajuan[]>('/api/pengajuan'),
  })
  const [filter, setFilter] = useState<string | null>(null)

  const semua = data ?? []

  // Urut menurun supaya tahap yang paling menumpuk tampil lebih dulu, baik di
  // bar maupun di chip. Tahap dengan satu pengajuan tidak perlu merebut posisi
  // pertama hanya karena namanya lebih awal di enum.
  const perStatus = Object.entries(
    semua.reduce<Record<string, number>>((acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])

  const jumlahPerStatus = Object.fromEntries(perStatus)

  /**
   * Kadar warna per status.
   *
   * Lima belas status hanya punya lima nada semantik, jadi beberapa di antaranya
   * berwarna sama persis — "Sudah diskor" dan "Menunggu approval L1" keduanya
   * biru. Berdampingan di bar, keduanya terbaca sebagai satu segmen dan
   * proporsinya salah dibaca.
   *
   * Status kedua dan seterusnya dalam satu keluarga warna dibuat lebih muda.
   * Batas bawah 46% supaya yang paling muda pun tetap cukup pekat di atas latar
   * putih; di bawah itu segmen tipis mulai menghilang.
   */
  const kadar: Record<string, string> = {}
  const urutanDalamNada: Record<string, number> = {}
  for (const [status] of perStatus) {
    const nada = nadaStatus(status)
    const ke = urutanDalamNada[nada] ?? 0
    urutanDalamNada[nada] = ke + 1
    kadar[status] = `${Math.max(46, 100 - ke * 26)}%`
  }

  // Filter yang menunjuk status yang sudah tidak ada lagi akan mengosongkan
  // tabel tanpa sebab yang terlihat, jadi ia diabaikan begitu statusnya hilang.
  const filterAktif = filter && jumlahPerStatus[filter] ? filter : null
  const tampil = filterAktif ? semua.filter((p) => p.status === filterAktif) : semua

  const totalPlafon = tampil.reduce((n, p) => n + p.totalPlafon, 0)
  const jumlahKelompok = tampil.filter((p) => p.jenisNasabah === 'KELOMPOK').length
  const keterangan = filterAktif ? labelStatus(filterAktif) : 'semua tahap'

  return (
    <>
      <div className="kepala-halaman">
        <div>
          <h1>Dashboard Pipeline</h1>
          <p className="redup" style={{ marginTop: 'var(--sp-1)' }}>
            Pengajuan yang menjadi tanggung jawab Anda, dikelompokkan menurut tahap.
          </p>
        </div>
        {pengguna?.peran === 'AO' && (
          <Link to="/pengajuan/baru" className="tombol">
            Buat Pengajuan
          </Link>
        )}
      </div>

      {isLoading && <Memuat baris={5} />}

      {error && (
        <div className="panel-galat" style={{ marginTop: 'var(--sp-4)' }}>
          <span>Gagal memuat data pengajuan. Periksa koneksi lalu muat ulang halaman.</span>
        </div>
      )}

      {data && semua.length === 0 && (
        <div className="kartu kosong" style={{ marginTop: 'var(--sp-5)' }}>
          <p style={{ margin: 0 }}>Belum ada pengajuan di pipeline Anda.</p>
          {pengguna?.peran === 'AO' && (
            <p style={{ marginTop: 'var(--sp-3)' }}>
              <Link to="/pengajuan/baru" className="tombol">
                Buat pengajuan pertama
              </Link>
            </p>
          )}
        </div>
      )}

      {data && semua.length > 0 && (
        <>
          <div className="kpi">
            <div className="kartu">
              <div className="kpi__label">Pengajuan</div>
              <div className="kpi__nilai">{tampil.length}</div>
              <div className="kpi__catatan redup">dari {semua.length} total</div>
            </div>
            <div className="kartu">
              <div className="kpi__label">Total plafon</div>
              <div className="kpi__nilai">{rupiah(totalPlafon)}</div>
              <div className="kpi__catatan redup">{keterangan}</div>
            </div>
            <div className="kartu">
              <div className="kpi__label">Pembiayaan kelompok</div>
              <div className="kpi__nilai">{jumlahKelompok}</div>
              <div className="kpi__catatan redup">
                {tampil.length - jumlahKelompok} perorangan
              </div>
            </div>
          </div>

          <section aria-labelledby="judul-komposisi" style={{ marginTop: 'var(--sp-6)' }}>
            <div className="kepala-halaman" style={{ marginBottom: 'var(--sp-3)' }}>
              <h2 id="judul-komposisi">Komposisi pipeline</h2>
              {filterAktif && (
                <button
                  type="button"
                  className="tombol tombol--sekunder tombol--kecil"
                  onClick={() => setFilter(null)}
                >
                  Tampilkan semua
                </button>
              )}
            </div>

            {/*
             * Bar proporsi. Ia menjawab pertanyaan yang tidak dijawab deretan
             * angka: tahap mana yang menumpuk. Lima angka berjajar harus
             * dibandingkan satu per satu; satu bar terlihat sekali pandang.
             *
             * Bar ini TIDAK bisa diklik, dan itu disengaja. Segmen selebar 4%
             * adalah target sentuh selebar 14px — mustahil dikenai jari, dan
             * menyesatkan kalau terlihat bisa diketuk. Chip di bawahnya yang
             * memegang interaksi, dengan target sentuh penuh.
             */}
            <div
              className="komposisi"
              role="img"
              aria-label={perStatus
                .map(([s, n]) => `${labelStatus(s)}: ${n} pengajuan`)
                .join(', ')}
            >
              {perStatus.map(([status, jumlah]) => (
                <span
                  key={status}
                  className={`komposisi__seg komposisi__seg--${nadaStatus(status)}`}
                  style={
                    { flexGrow: jumlah, '--kadar': kadar[status] } as React.CSSProperties
                  }
                  data-redup={filterAktif !== null && filterAktif !== status}
                />
              ))}
            </div>

            <div className="cip-baris">
              <button
                type="button"
                className="cip"
                aria-pressed={filterAktif === null}
                data-dipilih={filterAktif === null}
                onClick={() => setFilter(null)}
              >
                Semua
                <span className="cip__jumlah">{semua.length}</span>
              </button>

              {perStatus.map(([status, jumlah]) => (
                <button
                  key={status}
                  type="button"
                  className={`cip cip--${nadaStatus(status)}`}
                  style={{ '--kadar': kadar[status] } as React.CSSProperties}
                  aria-pressed={filterAktif === status}
                  data-dipilih={filterAktif === status}
                  onClick={() => setFilter(filterAktif === status ? null : status)}
                >
                  {labelStatus(status)}
                  <span className="cip__jumlah">{jumlah}</span>
                </button>
              ))}
            </div>
          </section>

          <h2 style={{ marginTop: 'var(--sp-6)', marginBottom: 'var(--sp-3)' }}>
            {filterAktif ? `Pengajuan - ${keterangan}` : 'Semua pengajuan'}{' '}
            <span className="redup" style={{ fontWeight: 400, fontSize: 14 }}>
              ({tampil.length})
            </span>
          </h2>

          <div className="tabel-bungkus">
            <table className="tabel tabel--kartu">
              <thead>
                <tr>
                  <th>Nomor Referensi</th>
                  <th>Jenis</th>
                  <th>Akad</th>
                  <th className="angka">Total Plafon</th>
                  <th>Status</th>
                  <th>Diperbarui</th>
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
                    {/*
                     * Waktu relatif untuk yang baru, tanggal penuh untuk yang
                     * lama. "3 jam lalu" menjawab "apakah ini masih bergerak?";
                     * setelah lewat seminggu pertanyaannya berubah menjadi
                     * "kapan tepatnya?", dan tanggal yang menjawabnya.
                     * Nilai lengkapnya selalu ada di atribut title.
                     */}
                    <td data-label="Diperbarui" title={waktuLengkap(p.diubahPada)}>
                      <span className="redup">{waktuRelatif(p.diubahPada)}</span>
                    </td>
                  </tr>
                ))}
                {tampil.length === 0 && (
                  <tr>
                    <td colSpan={6} className="kosong">
                      Tidak ada pengajuan pada tahap {keterangan}.
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
