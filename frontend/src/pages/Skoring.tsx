import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GalatApi } from '../api/client'
import {
  ambilHasilSkoring,
  jalankanSkoring,
  overrideGrade,
  LABEL_KOMPONEN,
  type HasilSkoring,
  type KodeKomponen,
} from '../api/skoring'
import { PanelGalat } from '../components/PanelGalat'

/**
 * S-09 · Skoring Kelayakan (FR-06, BR-07, BR-08, AC-07, AC-08) — dipakai ANL.
 *
 * KENAPA LAYAR INI SEPERTI INI:
 *
 * Analis harus dapat mempertahankan angka ini di depan auditor. Karena itu
 * aritmetikanya DITAMPILKAN, bukan hanya hasilnya:
 *
 * - Keempat rincian komponen selalu tampil (BR-08) — bukan hanya skor akhir.
 * - `skorKomponen` dan `kontribusi` tampil dengan 3 desimal (AC-07), memakai
 *   angka dari server tanpa dibulatkan ulang di sini.
 * - Baris aritmetika akhir (Σ kontribusi ÷ Σ bobot → pembulatan) ditulis
 *   eksplisit, sehingga `skorAkhir` terlihat BERASAL dari tabel di atasnya.
 *   Kalau baris itu tidak menutup, yang salah adalah datanya — dan itu memang
 *   harus terlihat, bukan disembunyikan.
 *
 * TIDAK ADA di layar ini: bobot, ambang grade, atau rentang skor sebagai
 * konstanta. Bobot datang dari setiap baris rincian; batas grade tidak
 * ditampilkan sama sekali karena bukan milik layar ini (larangan nomor 3).
 */

/** Format angka Indonesia dengan 3 desimal — untuk skor komponen & kontribusi. */
const tigaDesimal = (n: number): string =>
  n.toLocaleString('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

/** Bobot bisa berupa bilangan bulat; tampilkan apa adanya. */
const angkaBiasa = (n: number): string => n.toLocaleString('id-ID')

const LABEL_GRADE: Record<number, string> = {
  1: 'Sangat baik',
  2: 'Baik',
  3: 'Cukup',
  4: 'Perlu perhatian',
  5: 'Berisiko tinggi',
}

const gaya = {
  kartuAngka: {
    display: 'grid',
    gap: 'var(--sp-4)',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    margin: 'var(--sp-5) 0',
  },
  angkaBesar: {
    fontSize: 40,
    fontWeight: 700,
    lineHeight: '48px',
    fontFamily: 'var(--font-angka)',
    fontVariantNumeric: 'tabular-nums' as const,
  },
  label: {
    fontSize: 12,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    color: 'var(--teks-redup)',
    marginBottom: 'var(--sp-1)',
  },
  aritmetika: {
    padding: 'var(--sp-4)',
    borderTop: '1px solid var(--warna-garis)',
    fontFamily: 'var(--font-angka)',
    fontVariantNumeric: 'tabular-nums' as const,
  },
  barisTotal: {
    fontWeight: 700,
    borderTop: '2px solid var(--warna-garis)',
  },
  daftarPrasyarat: {
    listStyle: 'none',
    padding: 0,
    margin: 'var(--sp-4) 0 0',
    display: 'grid',
    gap: 'var(--sp-2)',
  },
} satisfies Record<string, React.CSSProperties>

/** Urutan tampil komponen — mengikuti urutan tabel brief §4.4. */
const URUTAN_KOMPONEN: KodeKomponen[] = [
  'KAPASITAS_BAYAR',
  'RIWAYAT_SLIK',
  'LAMA_USAHA',
  'HASIL_SURVEI',
]

/**
 * Panel override (AC-08).
 *
 * Tombol simpan nonaktif selama alasan < 10 karakter. Batas itu JUGA ditegakkan
 * server (zod `min(10)`); yang di sini hanya mempercepat umpan balik. Override
 * tanpa alasan adalah keputusan tanpa jejak sebab, dan BR-10 melarangnya.
 */
function PanelOverride({
  hasil,
  pengajuanId,
  onGalat,
}: {
  hasil: HasilSkoring
  pengajuanId: string
  onGalat: (g: GalatApi | null) => void
}) {
  const qc = useQueryClient()
  const [terbuka, setTerbuka] = useState(false)
  const [grade, setGrade] = useState(hasil.gradeFinal)
  const [alasan, setAlasan] = useState('')

  const simpan = useMutation<HasilSkoring, GalatApi, void>({
    mutationFn: () => overrideGrade(pengajuanId, { gradeFinal: grade, alasan }),
    onSuccess: () => {
      onGalat(null)
      setTerbuka(false)
      setAlasan('')
      qc.invalidateQueries({ queryKey: ['skoring', pengajuanId] })
    },
    onError: onGalat,
  })

  const alasanCukup = alasan.trim().length >= 10

  if (!terbuka) {
    return (
      <button
        className="tombol tombol--sekunder"
        onClick={() => setTerbuka(true)}
        style={{ marginTop: 'var(--sp-2)' }}
      >
        Override grade
      </button>
    )
  }

  return (
    <div className="kartu" style={{ padding: 'var(--sp-4)', marginTop: 'var(--sp-4)' }}>
      <h2>Override grade final</h2>
      <div style={{ marginTop: 'var(--sp-3)' }}>
        <label htmlFor="grade-final">Grade final</label>
        <select
          id="grade-final"
          value={grade}
          onChange={(e) => setGrade(Number(e.target.value))}
        >
          {[1, 2, 3, 4, 5].map((g) => (
            <option key={g} value={g}>
              {g} — {LABEL_GRADE[g]}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 'var(--sp-3)' }}>
        <label htmlFor="alasan-override">Alasan override (wajib)</label>
        <textarea
          id="alasan-override"
          rows={3}
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          aria-describedby="bantuan-alasan"
        />
        <p id="bantuan-alasan" className="redup" style={{ fontSize: 12, marginTop: 4 }}>
          Minimal 10 karakter. Alasan disimpan bersama hasil dan masuk audit trail.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
        <button
          className="tombol"
          onClick={() => simpan.mutate()}
          disabled={!alasanCukup || simpan.isPending}
        >
          {simpan.isPending ? 'Menyimpan...' : 'Simpan override'}
        </button>
        <button
          className="tombol tombol--sekunder"
          onClick={() => {
            setTerbuka(false)
            setAlasan('')
          }}
        >
          Batal
        </button>
      </div>
    </div>
  )
}

export function Skoring() {
  const { id } = useParams<{ id: string }>()
  const pengajuanId = id ?? ''
  const qc = useQueryClient()
  const [galat, setGalat] = useState<GalatApi | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['skoring', pengajuanId],
    queryFn: () => ambilHasilSkoring(pengajuanId),
    enabled: !!pengajuanId,
  })

  /**
   * Catatan analis (FR-05, Tabel 4.2).
   *
   * SLIK kolektibilitas 2 boleh lanjut, tetapi keputusannya wajib punya alasan
   * tertulis. Layar TIDAK memutuskan sendiri kapan catatan itu wajib — ia
   * mengirimkannya apa adanya, dan server yang menolak bila kurang. Menyalin
   * aturannya ke sini berarti ada dua tempat yang bisa berbeda.
   */
  const [catatanAnalis, setCatatanAnalis] = useState('')

  const hitung = useMutation<HasilSkoring, GalatApi, void>({
    mutationFn: () =>
      jalankanSkoring(pengajuanId, {
        catatanAnalis: catatanAnalis.trim() === '' ? undefined : catatanAnalis.trim(),
      }),
    onSuccess: () => {
      setGalat(null)
      qc.invalidateQueries({ queryKey: ['skoring', pengajuanId] })
    },
    /**
     * Pelanggaran BR-03 datang ke sini sebagai 422 dengan `rule: 'BR-03'`.
     * Ia ditampilkan lewat PanelGalat yang merender kode BR-nya (AC-04) —
     * bukan diubah menjadi pesan generik.
     */
    onError: setGalat,
  })

  const rincianTerurut = useMemo(() => {
    const baris = data?.rincian ?? []
    return URUTAN_KOMPONEN.map((kode) => baris.find((r) => r.kodeKomponen === kode)).filter(
      (r): r is NonNullable<typeof r> => r !== undefined,
    )
  }, [data])

  /**
   * Total dihitung dari baris yang DITAMPILKAN, bukan diambil dari field lain.
   * Alasannya: kalau jumlah di layar tidak sama dengan skor akhir server, itu
   * ketidaksesuaian nyata yang harus terlihat — bukan ditutupi dengan memakai
   * angka server di kedua sisi.
   */
  /**
   * `Number(...)` di sini bukan hiasan.
   *
   * Kolom NUMERIC di PostgreSQL dipetakan Prisma menjadi Decimal, dan JSON
   * mengubahnya menjadi STRING. Tanpa konversi, `s + r.bobot` menggabungkan
   * teks: "35" + "25" menjadi "3525", dan baris Total menampilkan angka yang
   * tidak masuk akal walaupun skor akhirnya benar.
   *
   * Backend sekarang sudah mengirim number lewat DTO, tetapi konversi ini
   * dipertahankan sebagai pertahanan berlapis: tipe respons API tidak
   * divalidasi saat runtime, jadi perubahan di server tidak akan tertangkap
   * compiler di sini.
   */
  const totalBobot = rincianTerurut.reduce((s, r) => s + Number(r.bobot), 0)
  const totalKontribusi = rincianTerurut.reduce((s, r) => s + Number(r.kontribusi), 0)
  const skorSebelumPembulatan = totalBobot === 0 ? 0 : totalKontribusi / totalBobot

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--sp-4)',
          flexWrap: 'wrap',
        }}
      >
        <h1>Skoring Kelayakan</h1>
        <button className="tombol" onClick={() => hitung.mutate()} disabled={hitung.isPending}>
          {hitung.isPending ? 'Menghitung...' : data ? 'Hitung ulang' : 'Jalankan skoring'}
        </button>
      </div>

      <PanelGalat galat={galat} />

      <div className="kartu" style={{ padding: 'var(--sp-4)', marginTop: 'var(--sp-4)' }}>
        <label htmlFor="catatan-analis" style={{ fontWeight: 600 }}>
          Catatan analis
        </label>
        <p className="redup" style={{ margin: 'var(--sp-2) 0' }}>
          Wajib diisi, minimal 10 karakter, bila ada anggota berkolektibilitas 2. SLIK kol-2
          boleh lanjut, tetapi grade finalnya dilantai di 3 dan keputusannya harus punya
          alasan tertulis (Tabel 4.2). Server yang menegakkan aturan ini.
        </p>
        <textarea
          id="catatan-analis"
          rows={3}
          style={{ width: '100%' }}
          value={catatanAnalis}
          onChange={(e) => setCatatanAnalis(e.target.value)}
          placeholder="Mis. tunggakan 45 hari pada fasilitas lain, sudah dilunasi Juli 2026."
        />
      </div>

      {/*
       * VARIAN TERBLOKIR (BR-03). Ditampilkan saat server menolak skoring karena
       * prasyarat belum lengkap. Daftar prasyaratnya diambil dari pesan server,
       * bukan dihitung ulang di frontend — layar tidak tahu, dan tidak perlu
       * tahu, aturan mana yang belum terpenuhi.
       */}
      {galat?.rule === 'BR-03' && (
        <div className="kartu" style={{ padding: 'var(--sp-4)', marginTop: 'var(--sp-4)' }}>
          <h2>Skoring belum dapat dijalankan</h2>
          <p className="redup" style={{ marginTop: 'var(--sp-2)' }}>
            Tiga prasyarat berikut wajib terpenuhi lebih dulu (BR-03). Status setiap
            prasyarat ditentukan server; perbaiki di layar terkait, lalu jalankan ulang.
          </p>
          <ul style={gaya.daftarPrasyarat}>
            <li>Semua dokumen wajib berstatus VERIFIED</li>
            <li>Minimal satu survei berstatus VALID</li>
            <li>SLIK check sudah dijalankan dan hasilnya masih berlaku</li>
          </ul>
        </div>
      )}

      {isLoading && <p className="redup">Memuat hasil skoring...</p>}
      {error && <p className="redup">Gagal memuat hasil skoring.</p>}

      {!isLoading && !data && !galat && (
        <div className="kartu" style={{ textAlign: 'center', padding: 'var(--sp-7)' }}>
          <p className="redup">
            Skoring belum pernah dijalankan untuk pengajuan ini. Prasyarat BR-03 diperiksa
            saat tombol di atas ditekan.
          </p>
        </div>
      )}

      {data && (
        <>
          <div style={gaya.kartuAngka}>
            <div className="kartu" style={{ padding: 'var(--sp-4)' }}>
              <div style={gaya.label}>Skor akhir</div>
              <div style={gaya.angkaBesar}>{data.skorAkhir}</div>
              <div className="redup" style={{ fontSize: 12 }}>
                dari 100
              </div>
            </div>
            <div className="kartu" style={{ padding: 'var(--sp-4)' }}>
              <div style={gaya.label}>Grade sistem</div>
              <div style={{ ...gaya.angkaBesar, fontSize: 28 }}>
                {data.gradeSistem} — {LABEL_GRADE[data.gradeSistem] ?? '—'}
              </div>
            </div>
            <div className="kartu" style={{ padding: 'var(--sp-4)' }}>
              <div style={gaya.label}>Grade final</div>
              <div style={{ ...gaya.angkaBesar, fontSize: 28 }}>
                {data.gradeFinal} — {LABEL_GRADE[data.gradeFinal] ?? '—'}
              </div>
              {data.diOverride && (
                <span className="badge badge--peringatan" style={{ marginTop: 'var(--sp-2)' }}>
                  Di-override
                </span>
              )}
              <PanelOverride hasil={data} pengajuanId={pengajuanId} onGalat={setGalat} />
            </div>
          </div>

          {/* Alasan override ditampilkan — keputusan wajib punya sebab (BR-10). */}
          {data.diOverride && data.alasanOverride && (
            <div className="kartu" style={{ padding: 'var(--sp-4)', marginBottom: 'var(--sp-5)' }}>
              <div style={gaya.label}>Alasan override</div>
              <p style={{ margin: 0 }}>{data.alasanOverride}</p>
            </div>
          )}

          <h2>Rincian Komponen Skor</h2>
          <div className="tabel-bungkus" style={{ marginTop: 'var(--sp-3)' }}>
            <div>
              <table className="tabel tabel--kartu">
                <thead>
                  <tr>
                    <th>Komponen</th>
                    <th className="angka">Bobot</th>
                    <th className="angka">Nilai mentah</th>
                    <th className="angka">Skor komponen</th>
                    <th className="angka">Kontribusi</th>
                  </tr>
                </thead>
                <tbody>
                  {rincianTerurut.map((r) => (
                    <tr key={r.kodeKomponen}>
                      <td data-label="Komponen">{LABEL_KOMPONEN[r.kodeKomponen]}</td>
                      <td data-label="Bobot" className="angka">{angkaBiasa(Number(r.bobot))}</td>
                      <td data-label="Nilai mentah" className="angka">{tigaDesimal(Number(r.nilaiMentah))}</td>
                      {/* 3 desimal, tidak dibulatkan (BR-07, AC-07) */}
                      <td data-label="Skor komponen" className="angka">{tigaDesimal(Number(r.skorKomponen))}</td>
                      <td data-label="Kontribusi" className="angka">{tigaDesimal(Number(r.kontribusi))}</td>
                    </tr>
                  ))}
                  <tr style={gaya.barisTotal}>
                    <td data-label="Komponen">Total</td>
                    <td data-label="Bobot" className="angka">{angkaBiasa(totalBobot)}</td>
                    <td data-label="Nilai mentah" className="angka">—</td>
                    <td data-label="Skor komponen" className="angka">—</td>
                    <td data-label="Kontribusi" className="angka">{tigaDesimal(totalKontribusi)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/*
             * Baris aritmetika akhir. Inilah yang membuat skor akhir dapat
             * dipertanggungjawabkan: pembaca bisa menjumlahkan kolom kontribusi
             * sendiri, membaginya dengan total bobot, dan mendapatkan angka yang
             * sama dengan kartu "Skor akhir" di atas (BR-07).
             */}
            <div style={gaya.aritmetika}>
              {tigaDesimal(totalKontribusi)} ÷ {angkaBiasa(totalBobot)} ={' '}
              {tigaDesimal(skorSebelumPembulatan)} → dibulatkan menjadi{' '}
              <strong>{data.skorAkhir}</strong>
            </div>
          </div>

          <p className="redup" style={{ fontSize: 12, marginTop: 'var(--sp-3)' }}>
            Parameter yang dipakai perhitungan ini disimpan bersama hasilnya. Perubahan
            parameter setelah ini tidak mengubah angka di atas.
          </p>
        </>
      )}
    </div>
  )
}
