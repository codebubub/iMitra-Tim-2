import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GalatApi } from '../api/client'
import { ambilMargin, tetapkanMargin, type HasilMargin } from '../api/margin'
import { PanelGalat } from '../components/PanelGalat'

/**
 * S-10 · Penetapan Margin / Nisbah (FR-07, BR-06, AC-09) — dipakai ANL.
 *
 * SATU ATURAN MENENTUKAN SELURUH BENTUK LAYAR INI — BR-06:
 * nilai di luar rentang grade DIBLOKIR, bukan diberi peringatan.
 *
 * Konsekuensinya, dan ini disengaja:
 * - TIDAK ADA tombol "lanjutkan saja".
 * - TIDAK ADA "simpan sebagai pengecualian".
 * - TIDAK ADA checkbox "saya mengerti risikonya" yang membuka jalur simpan.
 * - Tombol "Simpan" nonaktif saat nilai di luar rentang, DAN server tetap
 *   memeriksa ulang — kalau seseorang memaksa lewat DevTools, jawabannya 422.
 *
 * Kalau ada yang menambahkan salah satu jalur di atas, itu pelanggaran BR-06
 * dan harus ditolak saat review, bukan didiskusikan.
 *
 * Rentang yang ditampilkan datang dari server (tabel rentang_margin). Tidak ada
 * satu pun angka rentang yang ditulis di berkas ini (larangan nomor 3, R-8).
 */

const duaDesimal = (n: number): string =>
  n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const gaya = {
  stripRentang: {
    padding: 'var(--sp-3) var(--sp-4)',
    borderRadius: 'var(--radius-kartu)',
    background: 'var(--bg-info)',
    color: 'var(--warna-info)',
    fontWeight: 600,
    fontFamily: 'var(--font-angka)',
    fontVariantNumeric: 'tabular-nums' as const,
  },
  masukanBahaya: {
    borderColor: 'var(--warna-bahaya)',
    outlineColor: 'var(--warna-bahaya)',
  },
  barisBaca: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: 'var(--sp-2) 0',
    borderBottom: '1px solid var(--warna-garis)',
  },
} satisfies Record<string, React.CSSProperties>

export function Margin() {
  const { id } = useParams<{ id: string }>()
  const pengajuanId = id ?? ''
  const qc = useQueryClient()
  const [galat, setGalat] = useState<GalatApi | null>(null)
  const [nilai, setNilai] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['margin', pengajuanId],
    queryFn: () => ambilMargin(pengajuanId),
    enabled: !!pengajuanId,
  })

  // Isi kolom dengan nilai tersimpan saat data pertama datang.
  useEffect(() => {
    if (!data) return
    const tersimpan = data.akad === 'MURABAHAH' ? data.marginPersen : data.nisbahBankPersen
    if (tersimpan !== null && tersimpan !== undefined) {
      setNilai(duaDesimal(tersimpan))
    }
  }, [data])

  const simpan = useMutation<HasilMargin, GalatApi, number>({
    mutationFn: (angka) =>
      tetapkanMargin(
        pengajuanId,
        data?.akad === 'MURABAHAH' ? { marginPersen: angka } : { nisbahBankPersen: angka },
      ),
    onSuccess: () => {
      setGalat(null)
      qc.invalidateQueries({ queryKey: ['margin', pengajuanId] })
    },
    onError: setGalat,
  })

  /** Terima koma maupun titik sebagai pemisah desimal. */
  const angka = Number(nilai.replace(',', '.'))
  const angkaValid = nilai.trim() !== '' && Number.isFinite(angka)

  const murabahah = data?.akad === 'MURABAHAH'
  const labelKolom = murabahah ? 'Margin (p.a.)' : 'Nisbah bagi hasil bank'
  const labelRentang = murabahah ? 'Margin murabahah' : 'Nisbah bank musyarakah'

  /**
   * Pemeriksaan batas untuk MENONAKTIFKAN tombol lebih awal.
   *
   * Ini BUKAN penegakan BR-06 — penegakannya di server (domain/margin.ts).
   * Batas bersifat inklusif, sama seperti server: nilai tepat di batas diterima.
   * Kalau kedua sisi pernah berbeda, yang benar adalah server.
   */
  const rentang = data?.rentang
  const diLuarRentang =
    angkaValid &&
    rentang !== undefined &&
    rentang.min !== null &&
    rentang.maks !== null &&
    (angka < rentang.min || angka > rentang.maks)

  const tidakDibiayai = rentang !== undefined && !rentang.dibiayai

  return (
    <div className="konten">
      <h1>Penetapan Margin / Nisbah</h1>

      {isLoading && <p className="redup">Memuat rentang yang berlaku...</p>}

      {/*
       * Kegagalan memuat ditampilkan sebagai kegagalan. Layar TIDAK memakai
       * rentang bawaan saat server tidak menjawab — rentang bawaan di frontend
       * adalah cara paling halus untuk melanggar larangan nomor 3.
       */}
      {error && (
        <div className="panel-galat" role="alert" style={{ marginTop: 'var(--sp-4)' }}>
          <span>
            Rentang margin tidak dapat dimuat dari server. Margin tidak dapat ditetapkan
            sampai data parameter tersedia.
          </span>
        </div>
      )}

      <PanelGalat galat={galat} />

      {data && (
        <div className="kartu" style={{ padding: 'var(--sp-5)', marginTop: 'var(--sp-4)' }}>
          <h2>Penetapan Margin</h2>

          <div style={{ margin: 'var(--sp-4) 0' }}>
            <div style={gaya.barisBaca}>
              <span className="redup">Grade final</span>
              <strong>{data.grade}</strong>
            </div>
            <div style={gaya.barisBaca}>
              <span className="redup">Akad</span>
              <strong>{data.akad}</strong>
            </div>
          </div>

          {/*
           * VARIAN GRADE TIDAK DIBIAYAI (BR-05). Seluruh bagian masukan diganti
           * panel — tidak ada kolom, tidak ada tombol simpan. Tidak ada cara
           * menetapkan margin pada pengajuan yang tidak dibiayai.
           */}
          {tidakDibiayai ? (
            <div className="panel-galat" role="alert">
              <span>
                Grade {data.grade} tidak dapat dibiayai. Pengajuan berstatus
                REJECTED_SCORING dan margin tidak dapat ditetapkan.
              </span>
              <span className="panel-galat__kode">BR-05</span>
            </div>
          ) : (
            <>
              {/* Rentang dari parameter, bukan dari kode. */}
              <div style={gaya.stripRentang}>
                Rentang yang disetujui untuk grade {data.grade}:{' '}
                {rentang?.min !== null && rentang?.maks !== null
                  ? `${duaDesimal(rentang!.min)}% – ${duaDesimal(rentang!.maks)}%`
                  : '—'}
              </div>
              <p className="redup" style={{ fontSize: 12, marginTop: 'var(--sp-1)' }}>
                {labelRentang} diambil dari parameter sistem, bukan dari kode.
              </p>

              <div style={{ marginTop: 'var(--sp-4)', maxWidth: 260 }}>
                <label htmlFor="nilai-margin">{labelKolom}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  <input
                    id="nilai-margin"
                    inputMode="decimal"
                    value={nilai}
                    onChange={(e) => setNilai(e.target.value)}
                    style={diLuarRentang ? gaya.masukanBahaya : undefined}
                    aria-invalid={diLuarRentang}
                    aria-describedby={diLuarRentang ? 'galat-rentang' : undefined}
                  />
                  <span aria-hidden="true">%</span>
                </div>
              </div>

              {/*
               * Banner terblokir. Kalimatnya menyebut angka dan batasnya supaya
               * analis tahu apa yang harus diubah, dan memuat kode BR-06 —
               * AC-09 memeriksa keberadaan kode itu.
               */}
              {diLuarRentang && rentang?.min !== null && rentang?.maks !== null && (
                <div
                  className="panel-galat"
                  role="alert"
                  id="galat-rentang"
                  style={{ marginTop: 'var(--sp-3)' }}
                >
                  <span>
                    {murabahah ? 'Margin' : 'Nisbah bank'} {duaDesimal(angka)}%{' '}
                    {angka < rentang!.min
                      ? `di bawah batas bawah grade ${data.grade} (${duaDesimal(rentang!.min)}%)`
                      : `di atas batas atas grade ${data.grade} (${duaDesimal(rentang!.maks)}%)`}
                    .
                  </span>
                  <span className="panel-galat__kode">BR-06</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)' }}>
                {/*
                 * Nonaktif saat di luar rentang. Server memeriksa ulang; tombol
                 * ini hanya mempercepat umpan balik, bukan penjaga terakhir.
                 */}
                <button
                  className="tombol"
                  onClick={() => simpan.mutate(angka)}
                  disabled={!angkaValid || diLuarRentang || simpan.isPending}
                >
                  {simpan.isPending ? 'Menyimpan...' : 'Simpan margin'}
                </button>
                <button
                  className="tombol tombol--sekunder"
                  onClick={() => {
                    const tersimpan = murabahah ? data.marginPersen : data.nisbahBankPersen
                    setNilai(tersimpan === null ? '' : duaDesimal(tersimpan))
                    setGalat(null)
                  }}
                >
                  Batal
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
