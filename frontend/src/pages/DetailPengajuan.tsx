import { NavLink, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ambilDetailPengajuan } from '../api/pengajuan'
import { rupiah } from '../api/client'
import { BadgeStatus } from '../components/Badge'
import { useAuth, type Peran } from '../auth/AuthContext'

/**
 * S-04 · Detail Pengajuan — hub tempat seluruh tab dicapai.
 *
 * KENAPA LAYAR INI PERLU ADA. Tanpa halaman ini, setiap layar tahap (dokumen,
 * survei, SLIK, skoring, margin, audit) hanya bisa dicapai dengan mengetik URL
 * berisi UUID. Layar-layarnya sudah jadi dan berfungsi; yang hilang hanyalah
 * jalan menuju ke sana.
 *
 * DUA HAL YANG SENGAJA DITAMPILKAN DI HEADER:
 *
 * 1. TOTAL PLAFON dan JALUR APPROVAL. Keduanya nilai TURUNAN yang dihitung
 *    server dari anggota AKTIF (ADR-0002) — tidak pernah disimpan, dan tidak
 *    dihitung ulang di sini. Menampilkannya berdampingan membuat AC-14 bisa
 *    didemokan tanpa berpindah layar: tolak satu anggota, muat ulang, dan
 *    jumlah levelnya berubah sendiri.
 *
 * 2. ANGGOTA YANG DITOLAK tampil tercoret dengan plafon diredupkan. Kalau
 *    anggota yang ditolak hilang dari daftar, penilai tidak bisa melihat bahwa
 *    Rp 60.000.000 memang berhenti dihitung — ia hanya melihat angka yang
 *    berbeda tanpa sebab.
 *
 * Tab difilter peran hanya sebagai kenyamanan navigasi. Otorisasi tetap di
 * server; membuka tab yang tidak berhak akan tetap ditolak endpoint-nya (AC-02).
 */

type Tab = { ke: string; label: string; peran?: Peran[] }

const TAB: Tab[] = [
  { ke: 'dokumen', label: 'Dokumen', peran: ['AO'] },
  { ke: 'verifikasi-dokumen', label: 'Verifikasi Dokumen', peran: ['ANL'] },
  { ke: 'survei', label: 'Survei', peran: ['AO', 'ANL'] },
  { ke: 'slik', label: 'SLIK', peran: ['ANL', 'KCP', 'KC', 'KOM'] },
  { ke: 'skoring', label: 'Skoring', peran: ['ANL', 'KCP', 'KC', 'KOM'] },
  { ke: 'margin', label: 'Margin', peran: ['ANL'] },
  { ke: 'audit', label: 'Audit Trail' },
]

const gaya = {
  ringkas: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 'var(--sp-5)',
    margin: 'var(--sp-4) 0',
  },
  item: { minWidth: 130 },
  label: {
    fontSize: 12,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    color: 'var(--teks-redup)',
  },
  nilai: { fontWeight: 600, fontVariantNumeric: 'tabular-nums' as const },
  tab: {
    display: 'flex',
    gap: 'var(--sp-2)',
    flexWrap: 'wrap' as const,
    borderBottom: '1px solid var(--warna-garis)',
    paddingBottom: 'var(--sp-2)',
    margin: 'var(--sp-5) 0',
  },
  ditolak: { textDecoration: 'line-through', color: 'var(--teks-redup)' },
} satisfies Record<string, React.CSSProperties>

export function DetailPengajuan() {
  const { id } = useParams<{ id: string }>()
  const pengajuanId = id ?? ''
  const { pengguna } = useAuth()

  const { data, isLoading, error } = useQuery({
    queryKey: ['pengajuan', pengajuanId],
    queryFn: () => ambilDetailPengajuan(pengajuanId),
    enabled: !!pengajuanId,
  })

  if (isLoading) return <p className="redup">Memuat pengajuan...</p>
  if (error || !data) return <p className="redup">Pengajuan tidak ditemukan.</p>

  const tabTampil = TAB.filter((t) => !t.peran || (pengguna && t.peran.includes(pengguna.peran)))
  const anggotaAktif = data.anggota.filter((a) => a.statusAnggota === 'AKTIF')

  return (
    <>
      <h1 className="mono">{data.nomorReferensi}</h1>

      <div style={{ marginTop: 'var(--sp-2)' }}>
        <BadgeStatus status={data.status} />
      </div>

      <div style={gaya.ringkas}>
        <div style={gaya.item}>
          <div style={gaya.label}>Jenis nasabah</div>
          <div style={gaya.nilai}>
            {data.jenisNasabah === 'KELOMPOK'
              ? `Kelompok · ${anggotaAktif.length} anggota aktif`
              : 'Perorangan'}
          </div>
        </div>
        <div style={gaya.item}>
          <div style={gaya.label}>Akad</div>
          <div style={gaya.nilai}>{data.akad}</div>
        </div>
        <div style={gaya.item}>
          <div style={gaya.label}>Total plafon</div>
          <div style={gaya.nilai}>{rupiah(data.totalPlafon)}</div>
        </div>
        <div style={gaya.item}>
          <div style={gaya.label}>Tenor</div>
          <div style={gaya.nilai}>{data.tenorBulan} bulan</div>
        </div>
        <div style={gaya.item}>
          <div style={gaya.label}>Jalur approval</div>
          <div style={gaya.nilai}>
            {data.urutanApproval.join(' → ')}{' '}
            <span className="redup" style={{ fontWeight: 400 }}>
              ({data.jumlahLevel} level)
            </span>
          </div>
        </div>
        <div style={gaya.item}>
          <div style={gaya.label}>Dibuat oleh</div>
          <div style={gaya.nilai}>{data.dibuatOleh.nama}</div>
        </div>
      </div>

      <nav style={gaya.tab} aria-label="Tahap pengajuan">
        {tabTampil.map((t) => (
          <NavLink
            key={t.ke}
            to={`/pengajuan/${pengajuanId}/${t.ke}`}
            className={({ isActive }) =>
              isActive ? 'tombol' : 'tombol tombol--sekunder'
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <h2>
        {data.jenisNasabah === 'KELOMPOK' ? `Anggota kelompok (${data.anggota.length})` : 'Nasabah'}
      </h2>
      <div className="kartu" style={{ padding: 0, marginTop: 'var(--sp-3)', overflowX: 'auto' }}>
        <table className="tabel">
          <thead>
            <tr>
              <th>#</th>
              <th>Nama</th>
              <th>NIK</th>
              <th>Jenis usaha</th>
              <th className="angka">Plafon</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.anggota.map((a) => {
              const ditolak = a.statusAnggota === 'DITOLAK'
              return (
                <tr key={a.id} style={ditolak ? gaya.ditolak : undefined}>
                  <td>{a.urutan}</td>
                  <td>{a.nama}</td>
                  {/* NIK selalu tersamar (BR-11). Server yang menyamarkannya. */}
                  <td className="mono">{a.nikTersamar}</td>
                  <td>{a.jenisUsaha}</td>
                  <td className="angka">{rupiah(a.plafonDiajukan)}</td>
                  <td>
                    <span className={ditolak ? 'badge badge--bahaya' : 'badge badge--sukses'}>
                      {ditolak ? 'Ditolak' : 'Aktif'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {data.anggota.some((a) => a.statusAnggota === 'DITOLAK') && (
        <p className="redup" style={{ marginTop: 'var(--sp-3)', fontSize: 13 }}>
          Plafon anggota yang ditolak tidak lagi dihitung. Total plafon dan jalur approval di
          atas sudah menyesuaikan.
        </p>
      )}
    </>
  )
}
