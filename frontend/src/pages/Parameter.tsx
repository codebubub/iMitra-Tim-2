import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rupiah, type GalatApi } from '../api/client'
import {
  ambilAmbangApproval,
  ambilParameterSkoring,
  ambilRentangMargin,
  simpanBobotKomponen,
} from '../api/parameter'
import { LABEL_KOMPONEN, type KodeKomponen } from '../api/skoring'
import { PanelGalat } from '../components/PanelGalat'

/**
 * S-13 · Parameter Sistem (FR-13, AC-15) — dipakai ADM.
 *
 * INI LAYAR YANG MEMBUKTIKAN LARANGAN NOMOR 3.
 *
 * Seluruh angka di layar ini — bobot komponen, ambang plafon per level, rentang
 * skor dan margin per grade — dibaca dari database lewat API. Tidak satu pun
 * ditulis sebagai konstanta di berkas ini. Kalau backend mengembalikan tabel
 * kosong, layar menampilkan "belum diatur", BUKAN nilai bawaan: nilai bawaan di
 * frontend akan membuat AC-15 lolos secara semu, karena layar tetap menampilkan
 * angka yang benar walaupun database sudah berubah.
 *
 * KENAPA TIDAK ADA PESAN RESTART: backend membaca parameter pada SETIAP
 * pemanggilan, tanpa cache (ADR-0003). Perubahan berlaku pada perhitungan
 * berikutnya. AC-15 dianggap gagal kalau layanan perlu di-restart, jadi
 * menyarankan restart di layar ini akan salah sekaligus merusak penilaian.
 */

const duaDesimal = (n: number): string =>
  n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const gaya = {
  bilahLekat: {
    position: 'sticky' as const,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--sp-4)',
    padding: 'var(--sp-3) var(--sp-4)',
    marginTop: 'var(--sp-5)',
    background: 'var(--warna-permukaan)',
    border: '1px solid var(--warna-garis)',
    borderRadius: 'var(--radius-kartu)',
    boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
  },
  masukanBobot: {
    width: 90,
    padding: '6px var(--sp-2)',
    textAlign: 'right' as const,
    fontFamily: 'var(--font-angka)',
  },
  petunjuk: {
    fontSize: 12,
    color: 'var(--teks-redup)',
    marginTop: 2,
  },
  toast: {
    padding: 'var(--sp-3) var(--sp-4)',
    borderRadius: 'var(--radius-kartu)',
    background: 'var(--bg-sukses)',
    color: 'var(--warna-sukses)',
    marginTop: 'var(--sp-4)',
    fontWeight: 500,
  },
  chip: {
    padding: '2px 8px',
    borderRadius: 'var(--radius-badge)',
    fontSize: 12,
    fontWeight: 600,
    background: 'var(--bg-netral)',
    color: 'var(--teks-sekunder)',
    marginRight: 4,
  },
} satisfies Record<string, React.CSSProperties>

export function Parameter() {
  const qc = useQueryClient()
  const [galat, setGalat] = useState<GalatApi | null>(null)
  const [tersimpan, setTersimpan] = useState(false)
  /** Perubahan bobot yang belum disimpan: kode → nilai baru. */
  const [ubahan, setUbahan] = useState<Record<string, string>>({})

  const skoring = useQuery({ queryKey: ['parameter-skoring'], queryFn: ambilParameterSkoring })
  const ambang = useQuery({ queryKey: ['parameter-ambang'], queryFn: ambilAmbangApproval })
  const rentang = useQuery({ queryKey: ['parameter-rentang'], queryFn: ambilRentangMargin })

  const simpan = useMutation<unknown, GalatApi, { kode: string; bobot: number }[]>({
    mutationFn: (data) => simpanBobotKomponen(data),
    onSuccess: () => {
      setGalat(null)
      setUbahan({})
      setTersimpan(true)
      qc.invalidateQueries({ queryKey: ['parameter-skoring'] })
    },
    onError: (g) => {
      setTersimpan(false)
      setGalat(g)
    },
  })

  const bobot = useMemo(() => skoring.data?.bobot ?? {}, [skoring.data])
  const kodeBobot = useMemo(() => Object.keys(bobot), [bobot])

  /** Nilai efektif satu bobot: ubahan yang belum disimpan, atau nilai server. */
  const nilaiEfektif = (kode: string): number => {
    const draf = ubahan[kode]
    if (draf === undefined) return bobot[kode]
    const n = Number(draf.replace(',', '.'))
    return Number.isFinite(n) ? n : bobot[kode]
  }

  const totalBobot = kodeBobot.reduce((s, k) => s + nilaiEfektif(k), 0)
  const jumlahUbahan = Object.keys(ubahan).filter(
    (k) => Number(ubahan[k]?.replace(',', '.')) !== bobot[k],
  ).length

  const kirim = () => {
    const data = Object.keys(ubahan)
      .map((kode) => ({ kode, bobot: Number(ubahan[kode].replace(',', '.')) }))
      .filter((d) => Number.isFinite(d.bobot) && d.bobot !== bobot[d.kode])
    if (data.length > 0) simpan.mutate(data)
  }

  return (
    <div>
      <h1>Parameter Sistem</h1>
      <p className="redup" style={{ marginTop: 4 }}>
        Perubahan berlaku pada perhitungan berikutnya, tanpa restart aplikasi.
      </p>

      <PanelGalat galat={galat} />

      {tersimpan && (
        <div style={gaya.toast} role="status">
          Parameter tersimpan. Berlaku untuk perhitungan berikutnya.
        </div>
      )}

      {/* ------------------ BAGIAN 1 · Bobot komponen skor ------------------ */}
      <h2 style={{ marginTop: 'var(--sp-6)' }}>Bobot Komponen Skor</h2>
      {skoring.isLoading && <p className="redup">Memuat bobot komponen...</p>}
      {skoring.error && (
        <p className="redup">
          Gagal memuat bobot komponen. Layar tidak menampilkan nilai bawaan — angka bobot
          hanya sah bila berasal dari database.
        </p>
      )}

      {skoring.data && (
        <div className="tabel-bungkus" style={{ marginTop: 'var(--sp-3)' }}>
          <div className="tabel-bungkus">
            <table className="tabel tabel--kartu">
              <thead>
                <tr>
                  <th>Komponen</th>
                  <th className="angka">Bobot</th>
                </tr>
              </thead>
              <tbody>
                {kodeBobot.map((kode) => {
                  const berubah =
                    ubahan[kode] !== undefined &&
                    Number(ubahan[kode].replace(',', '.')) !== bobot[kode]
                  return (
                    <tr key={kode}>
                      <td data-label="Komponen">{LABEL_KOMPONEN[kode as KodeKomponen] ?? kode}</td>
                      <td data-label="Bobot" className="angka">
                        <input
                          aria-label={`Bobot ${LABEL_KOMPONEN[kode as KodeKomponen] ?? kode}`}
                          inputMode="decimal"
                          style={gaya.masukanBobot}
                          value={ubahan[kode] ?? String(bobot[kode])}
                          onChange={(e) => {
                            setTersimpan(false)
                            setUbahan((u) => ({ ...u, [kode]: e.target.value }))
                          }}
                        />
                        {berubah && (
                          <div style={gaya.petunjuk}>Sebelumnya: {bobot[kode]}</div>
                        )}
                      </td>
                    </tr>
                  )
                })}
                <tr style={{ fontWeight: 700, borderTop: '2px solid var(--warna-garis)' }}>
                  <td data-label="Komponen">Total bobot</td>
                  <td data-label="Bobot" className="angka">{totalBobot.toLocaleString('id-ID')}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="redup" style={{ fontSize: 12, padding: 'var(--sp-3) var(--sp-4)' }}>
            Skor akhir dibagi total bobot, jadi total tidak harus 100 (BR-07).
          </p>
        </div>
      )}

      {/* Parameter skalar — juga data, bukan konstanta (A-1, A-2, A-8). */}
      {skoring.data && (
        <div className="kartu" style={{ padding: 'var(--sp-4)', marginTop: 'var(--sp-4)' }}>
          <h2 style={{ fontSize: 15 }}>Parameter perhitungan</h2>
          <div className="tabel-bungkus" style={{ marginTop: 'var(--sp-2)' }}>
            <table className="tabel">
              <tbody>
                {Object.entries(skoring.data.skalar).map(([kode, nilai]) => (
                  <tr key={kode}>
                    <td>{kode}</td>
                    <td className="angka">{String(nilai)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------- BAGIAN 2 · Ambang approval -------------------- */}
      <h2 style={{ marginTop: 'var(--sp-6)' }}>Ambang Approval</h2>
      {ambang.isLoading && <p className="redup">Memuat ambang approval...</p>}
      {ambang.error && <p className="redup">Gagal memuat ambang approval.</p>}
      {ambang.data && (
        <div className="tabel-bungkus" style={{ marginTop: 'var(--sp-3)' }}>
          <table className="tabel tabel--kartu">
            <thead>
              <tr>
                <th className="angka">Plafon minimum</th>
                <th className="angka">Plafon maksimum</th>
                <th>Level yang diperlukan</th>
              </tr>
            </thead>
            <tbody>
              {ambang.data.map((b) => (
                <tr key={`${b.plafonMin}-${b.plafonMaks}`}>
                  <td data-label="Plafon minimum" className="angka">{rupiah(b.plafonMin)}</td>
                  <td data-label="Plafon maksimum" className="angka">{rupiah(b.plafonMaks)}</td>
                  <td data-label="Level yang diperlukan">
                    {b.urutanPeran.map((p) => (
                      <span key={p} style={gaya.chip}>
                        {p}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
              {ambang.data.length === 0 && (
                <tr>
                  <td colSpan={3} className="redup" style={{ textAlign: 'center' }}>
                    Tabel ambang_approval belum diatur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --------------- BAGIAN 3 · Rentang margin per grade --------------- */}
      <h2 style={{ marginTop: 'var(--sp-6)' }}>Rentang Margin per Grade</h2>
      {rentang.isLoading && <p className="redup">Memuat rentang margin...</p>}
      {rentang.error && <p className="redup">Gagal memuat rentang margin.</p>}
      {rentang.data && (
        <div className="tabel-bungkus" style={{ marginTop: 'var(--sp-3)' }}>
          <table className="tabel tabel--kartu">
            <thead>
              <tr>
                <th className="angka">Grade</th>
                <th className="angka">Rentang skor</th>
                <th className="angka">Margin murabahah</th>
                <th className="angka">Nisbah musyarakah</th>
                <th>Dibiayai</th>
              </tr>
            </thead>
            <tbody>
              {rentang.data.map((r) => (
                <tr key={r.grade}>
                  <td data-label="Grade" className="angka">{r.grade}</td>
                  <td data-label="Rentang skor" className="angka">
                    {r.skorMin}–{r.skorMaks}
                  </td>
                  {/* Grade yang tidak dibiayai: rentangnya null di database. */}
                  <td data-label="Margin murabahah" className="angka">
                    {r.marginMin === null || r.marginMaks === null
                      ? 'Tidak dibiayai'
                      : `${duaDesimal(r.marginMin)}% – ${duaDesimal(r.marginMaks)}%`}
                  </td>
                  <td data-label="Nisbah musyarakah" className="angka">
                    {r.nisbahMin === null || r.nisbahMaks === null
                      ? 'Tidak dibiayai'
                      : `${duaDesimal(r.nisbahMin)}% – ${duaDesimal(r.nisbahMaks)}%`}
                  </td>
                  <td data-label="Dibiayai">
                    <span className={r.dibiayai ? 'badge badge--sukses' : 'badge badge--bahaya'}>
                      {r.dibiayai ? 'Ya' : 'Tidak'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bilah lekat muncul hanya bila ada perubahan yang belum disimpan. */}
      {jumlahUbahan > 0 && (
        <div style={gaya.bilahLekat}>
          <span>
            {jumlahUbahan} perubahan belum disimpan
          </span>
          <span style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <button
              className="tombol tombol--sekunder"
              onClick={() => {
                setUbahan({})
                setGalat(null)
              }}
            >
              Batalkan
            </button>
            <button className="tombol" onClick={kirim} disabled={simpan.isPending}>
              {simpan.isPending ? 'Menyimpan...' : 'Simpan perubahan'}
            </button>
          </span>
        </div>
      )}
    </div>
  )
}
