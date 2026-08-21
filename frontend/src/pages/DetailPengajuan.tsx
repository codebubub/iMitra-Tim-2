import { NavLink, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ambilDetailPengajuan } from '../api/pengajuan'
import { rupiah } from '../api/client'
import { BadgeStatus } from '../components/Badge'
import { Memuat } from '../components/Memuat'
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

export function DetailPengajuan() {
  const { id } = useParams<{ id: string }>()
  const pengajuanId = id ?? ''
  const { pengguna } = useAuth()

  const { data, isLoading, error } = useQuery({
    queryKey: ['pengajuan', pengajuanId],
    queryFn: () => ambilDetailPengajuan(pengajuanId),
    enabled: !!pengajuanId,
  })

  if (isLoading) return <Memuat baris={4} />
  if (error || !data) {
    return (
      <div className="panel-galat">
        <span>
          Pengajuan tidak ditemukan, atau Anda tidak berhak membukanya. Kembali ke Dashboard
          dan pilih dari daftar.
        </span>
      </div>
    )
  }

  const tabTampil = TAB.filter((t) => !t.peran || (pengguna && t.peran.includes(pengguna.peran)))
  const anggotaAktif = data.anggota.filter((a) => a.statusAnggota === 'AKTIF')
  const adaDitolak = data.anggota.some((a) => a.statusAnggota === 'DITOLAK')

  return (
    <>
      <div className="aksi" style={{ gap: 'var(--sp-3)' }}>
        <h1 className="mono" style={{ fontSize: 22 }}>
          {data.nomorReferensi}
        </h1>
        <BadgeStatus status={data.status} />
      </div>

      <dl className="ringkas">
        <div>
          <dt className="ringkas__label">Jenis nasabah</dt>
          <dd className="ringkas__nilai">
            {data.jenisNasabah === 'KELOMPOK'
              ? `Kelompok - ${anggotaAktif.length} anggota aktif`
              : 'Perorangan'}
          </dd>
        </div>
        <div>
          <dt className="ringkas__label">Akad</dt>
          <dd className="ringkas__nilai">{data.akad}</dd>
        </div>
        <div>
          <dt className="ringkas__label">Total plafon</dt>
          <dd className="ringkas__nilai">{rupiah(data.totalPlafon)}</dd>
        </div>
        <div>
          <dt className="ringkas__label">Tenor</dt>
          <dd className="ringkas__nilai">{data.tenorBulan} bulan</dd>
        </div>
        <div>
          <dt className="ringkas__label">Jalur approval</dt>
          <dd className="ringkas__nilai">
            {data.urutanApproval.join(' - ')}{' '}
            <span className="redup" style={{ fontWeight: 400 }}>
              ({data.jumlahLevel} level)
            </span>
          </dd>
        </div>
        <div>
          <dt className="ringkas__label">Dibuat oleh</dt>
          <dd className="ringkas__nilai">{data.dibuatOleh.nama}</dd>
        </div>
      </dl>

      <nav className="tab" aria-label="Tahap pengajuan">
        {tabTampil.map((t) => (
          <NavLink
            key={t.ke}
            to={`/pengajuan/${pengajuanId}/${t.ke}`}
            className={({ isActive }) =>
              isActive ? 'tombol tombol--kecil' : 'tombol tombol--sekunder tombol--kecil'
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <h2 style={{ marginBottom: 'var(--sp-3)' }}>
        {data.jenisNasabah === 'KELOMPOK' ? `Anggota kelompok (${data.anggota.length})` : 'Nasabah'}
      </h2>

      <div className="tabel-bungkus">
        <table className="tabel tabel--kartu">
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
                <tr key={a.id} data-ditolak={ditolak}>
                  <td data-label="Urutan">{a.urutan}</td>
                  <td data-label="Nama">{a.nama}</td>
                  {/* NIK selalu tersamar (BR-11). Server yang menyamarkannya. */}
                  <td data-label="NIK" className="mono">
                    {a.nikTersamar}
                  </td>
                  <td data-label="Jenis usaha">{a.jenisUsaha}</td>
                  <td data-label="Plafon" className="angka">
                    {rupiah(a.plafonDiajukan)}
                  </td>
                  <td data-label="Status">
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

      {adaDitolak && (
        <p className="redup" style={{ marginTop: 'var(--sp-3)', fontSize: 13 }}>
          Plafon anggota yang ditolak tidak lagi dihitung. Total plafon dan jalur approval di
          atas sudah menyesuaikan.
        </p>
      )}
    </>
  )
}
