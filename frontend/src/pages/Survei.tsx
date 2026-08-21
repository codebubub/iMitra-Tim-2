import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rupiah, type GalatApi } from '../api/client'
import { ambilDaftarSurvei, nilaiSurvei, rekamSurvei, type Survei } from '../api/survei'
import {
  bolehKirimSurvei,
  formatRibuan,
  hanyaDigit,
  nilaiSurveiDinonaktifkan,
} from '../api/logika-lapangan'
import { useAuth } from '../auth/AuthContext'
import { PanelGalat } from '../components/PanelGalat'

/**
 * S-07 · Rekam & Nilai Survei (FR-04, AC-04) — mobile.
 *
 * Dua sisi dari data yang sama:
 * - AO MEREKAM: koordinat (Geolocation + fallback manual yang selalu terlihat),
 *   foto (min 1), omzet harian, lama usaha, catatan.
 * - ANL MENILAI: skala kondisi usaha 1–5 + VALID/TIDAK_VALID (asumsi A-10).
 *
 * Penilaian 1–5 HANYA muncul untuk ANL. Skoring memerlukan minimal satu survei
 * VALID (BR-03) — dijelaskan di helper text, tapi ditegakkan server.
 */

export function SurveiHalaman() {
  const { id } = useParams<{ id: string }>()
  const pengajuanId = id ?? ''
  const { pengguna } = useAuth()
  const adalahAnl = pengguna?.peran === 'ANL'

  const { data, isLoading, error } = useQuery({
    queryKey: ['survei', pengajuanId],
    queryFn: () => ambilDaftarSurvei(pengajuanId),
    enabled: !!pengajuanId,
  })

  return (
    <div className="konten" style={{ maxWidth: 520 }}>
      <h1>Survei Lapangan</h1>
      <p className="redup mono">Pengajuan {pengajuanId}</p>

      {isLoading && <p className="redup">Memuat survei...</p>}
      {error && <p className="redup">Gagal memuat survei.</p>}

      {/* ANL menilai survei yang sudah direkam; AO merekam yang baru. */}
      {adalahAnl ? (
        <DaftarNilaiSurvei pengajuanId={pengajuanId} survei={data ?? []} />
      ) : (
        <FormRekamSurvei pengajuanId={pengajuanId} survei={data ?? []} />
      )}
    </div>
  )
}

/* ------------------------- SISI AO: rekam survei ------------------------- */

function FormRekamSurvei({ pengajuanId, survei }: { pengajuanId: string; survei: Survei[] }) {
  const qc = useQueryClient()
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [omzet, setOmzet] = useState('')
  const [lama, setLama] = useState('')
  const [catatan, setCatatan] = useState('')
  const [foto, setFoto] = useState<File[]>([])
  const [galat, setGalat] = useState<GalatApi | null>(null)
  const [statusGeo, setStatusGeo] = useState<string | null>(null)

  const rekam = useMutation<Survei, GalatApi>({
    mutationFn: () =>
      rekamSurvei(pengajuanId, {
        latitude: lat ? Number(lat) : null,
        longitude: lng ? Number(lng) : null,
        omzetHarian: hanyaDigit(omzet),
        lamaUsahaBulan: Number(lama) || 0,
        catatan: catatan.trim(),
        foto,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['survei', pengajuanId] })
      setFoto([])
      setStatusGeo(null)
    },
    onError: setGalat,
  })

  function ambilKoordinat() {
    if (!navigator.geolocation) {
      setStatusGeo('Perangkat tidak mendukung GPS — isi manual di bawah.')
      return
    }
    setStatusGeo('Mengambil koordinat...')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        setStatusGeo('Koordinat terisi dari GPS.')
      },
      () => setStatusGeo('Gagal mengambil GPS — isi manual di bawah.'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  function tambahFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const baru = Array.from(e.target.files ?? [])
    setFoto((prev) => [...prev, ...baru])
    e.target.value = ''
  }

  const bolehKirim =
    bolehKirimSurvei({ jumlahFoto: foto.length, omzetHarian: hanyaDigit(omzet) }) &&
    !rekam.isPending

  return (
    <>
      {survei.length > 0 && (
        <p className="redup" style={{ fontSize: 12 }}>
          {survei.length} survei sudah direkam untuk pengajuan ini.
        </p>
      )}
      <div style={{ marginTop: 12 }}>
        <PanelGalat galat={galat} />
      </div>

      <div className="kartu" style={{ marginTop: 12 }}>
        <label>Lokasi usaha</label>
        <button
          type="button"
          className="tombol tombol--sekunder"
          style={{ width: '100%' }}
          onClick={ambilKoordinat}
        >
          📍 Ambil koordinat saat ini
        </button>
        {statusGeo && (
          <p className="redup" style={{ fontSize: 12, marginTop: 4 }}>
            {statusGeo}
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="lat">Latitude</label>
            <input
              id="lat"
              inputMode="decimal"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="-6.200000"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="lng">Longitude</label>
            <input
              id="lng"
              inputMode="decimal"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="106.816666"
            />
          </div>
        </div>
      </div>

      <div className="kartu" style={{ marginTop: 12 }}>
        <label>Foto tempat usaha</label>
        <label
          htmlFor="foto"
          className="tombol tombol--sekunder"
          style={{ width: '100%', borderStyle: 'dashed', cursor: 'pointer' }}
        >
          + Ambil / pilih foto
        </label>
        <input
          id="foto"
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={tambahFoto}
          style={{ display: 'none' }}
        />
        {foto.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {foto.map((f, i) => (
              <div
                key={i}
                style={{
                  position: 'relative',
                  width: 64,
                  height: 64,
                  border: '1px solid var(--warna-garis)',
                  borderRadius: 6,
                  overflow: 'hidden',
                }}
              >
                <img
                  src={URL.createObjectURL(f)}
                  alt={`Foto ${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  type="button"
                  aria-label="Hapus foto"
                  onClick={() => setFoto((prev) => prev.filter((_, idx) => idx !== i))}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: 'var(--warna-bahaya)',
                    color: '#fff',
                    border: 'none',
                    width: 18,
                    height: 18,
                    cursor: 'pointer',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="redup" style={{ fontSize: 12, marginTop: 4 }}>
          Minimal 1 foto
        </p>
      </div>

      <div className="kartu" style={{ marginTop: 12 }}>
        <label htmlFor="omzet">Estimasi omzet harian</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="redup">Rp</span>
          <input
            id="omzet"
            inputMode="numeric"
            value={formatRibuan(omzet)}
            onChange={(e) => setOmzet(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        <label htmlFor="lama" style={{ marginTop: 12 }}>
          Lama usaha berjalan (bulan)
        </label>
        <input
          id="lama"
          inputMode="numeric"
          value={lama}
          onChange={(e) => setLama(e.target.value.replace(/\D/g, ''))}
        />
        <label htmlFor="cat" style={{ marginTop: 12 }}>
          Catatan kondisi usaha
        </label>
        <textarea id="cat" rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
      </div>

      <button
        type="button"
        className="tombol"
        style={{ width: '100%', marginTop: 16 }}
        disabled={!bolehKirim}
        onClick={() => {
          setGalat(null)
          rekam.mutate()
        }}
      >
        {rekam.isPending ? 'Mengirim...' : 'Kirim survei'}
      </button>
    </>
  )
}

/* ------------------------- SISI ANL: nilai survei ------------------------ */

function DaftarNilaiSurvei({ pengajuanId, survei }: { pengajuanId: string; survei: Survei[] }) {
  if (survei.length === 0)
    return (
      <p className="redup" style={{ marginTop: 12 }}>
        Belum ada survei untuk dinilai.
      </p>
    )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
      {survei.map((s) => (
        <KartuNilaiSurvei key={s.id} pengajuanId={pengajuanId} survei={s} />
      ))}
    </div>
  )
}

function KartuNilaiSurvei({ pengajuanId, survei }: { pengajuanId: string; survei: Survei }) {
  const qc = useQueryClient()
  const [skala, setSkala] = useState<number | null>(survei.kondisiUsahaSkala)
  const [galat, setGalat] = useState<GalatApi | null>(null)

  const nilai = useMutation<Survei, GalatApi, 'VALID' | 'TIDAK_VALID'>({
    mutationFn: (status) => nilaiSurvei(survei.id, { kondisiUsahaSkala: skala!, status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['survei', pengajuanId] }),
    onError: setGalat,
  })

  const sudahDinilai = survei.status !== 'DRAFT'

  return (
    <div className="kartu">
      {/* Ringkasan read-only yang direkam AO. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Survei · {new Date(survei.direkamPada).toLocaleDateString('id-ID')}</strong>
        <span
          className={
            survei.status === 'VALID'
              ? 'badge badge--sukses'
              : survei.status === 'TIDAK_VALID'
                ? 'badge badge--bahaya'
                : 'badge'
          }
        >
          {survei.status}
        </span>
      </div>

      {survei.fotoUrl.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {survei.fotoUrl.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Foto usaha ${i + 1}`}
              style={{
                width: 80,
                height: 80,
                objectFit: 'cover',
                borderRadius: 6,
                border: '1px solid var(--warna-garis)',
              }}
            />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }} className="redup">
        <span>
          Omzet/hari: <strong className="angka">{rupiah(survei.omzetHarian)}</strong>
        </span>
        <span>
          Lama usaha: <strong>{survei.lamaUsahaBulan} bln</strong>
        </span>
        {survei.latitude != null && survei.longitude != null && (
          <span className="mono">
            {survei.latitude}, {survei.longitude}
          </span>
        )}
      </div>
      {survei.catatan && <p style={{ marginTop: 8 }}>{survei.catatan}</p>}

      <div style={{ marginTop: 12 }}>
        <PanelGalat galat={galat} />
      </div>

      {/* Penilaian analis — HANYA ANL (A-10). */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--warna-garis)' }}>
        <label>Penilaian analis — Kondisi usaha</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSkala(n)}
              className={skala === n ? 'tombol' : 'tombol tombol--sekunder'}
              style={{ flex: 1, flexDirection: 'column', padding: '8px 0' }}
              aria-pressed={skala === n}
            >
              <span style={{ fontSize: 18 }}>{n}</span>
              {n === 1 && <span style={{ fontSize: 10 }}>Sangat buruk</span>}
              {n === 5 && <span style={{ fontSize: 10 }}>Sangat baik</span>}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            className="tombol"
            disabled={nilaiSurveiDinonaktifkan(skala, nilai.isPending)}
            onClick={() => {
              setGalat(null)
              nilai.mutate('VALID')
            }}
          >
            Tandai VALID
          </button>
          <button
            type="button"
            className="tombol tombol--bahaya"
            disabled={nilaiSurveiDinonaktifkan(skala, nilai.isPending)}
            onClick={() => {
              setGalat(null)
              nilai.mutate('TIDAK_VALID')
            }}
          >
            Tandai TIDAK VALID
          </button>
        </div>
        <p className="redup" style={{ fontSize: 12, marginTop: 8 }}>
          Skoring memerlukan minimal satu survei berstatus VALID.
          {sudahDinilai && ' Survei ini sudah dinilai; menekan lagi memperbarui nilainya.'}
        </p>
      </div>
    </div>
  )
}
