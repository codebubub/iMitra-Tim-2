import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GalatApi } from '../api/client'
import {
  ambilDaftarDokumen,
  urlBerkasDokumen,
  verifikasiDokumen,
  LABEL_KODE_ALASAN,
  type Dokumen,
  type KodeAlasan,
} from '../api/dokumen'
import { PanelGalat } from '../components/PanelGalat'

/**
 * S-06 · Verifikasi Dokumen (FR-03, AC-02, AC-03) — web, dipakai ANL.
 *
 * ATURAN INTI:
 * - Kode alasan WAJIB dipilih sebelum tombol "Kirim penolakan" aktif.
 * - Layar ini tidak terjangkau AO lewat navigasi, dan endpoint verifikasi tetap
 *   403 untuk AO (AC-02) — otorisasi di server, bukan di sini.
 * - NIK lengkap TIDAK ditampilkan di mana pun (BR-11), meski gambar KTP tampil.
 *
 * Dua kolom: daftar dokumen (kiri) + panel pratinjau & aksi (kanan).
 */

const LABEL_JENIS: Record<string, string> = {
  KTP: 'KTP',
  KK: 'Kartu Keluarga',
  SKU: 'Surat Keterangan Usaha',
}

const KODE_ALASAN: KodeAlasan[] = [
  'BURAM',
  'TIDAK_TERBACA',
  'KADALUARSA',
  'TIDAK_SESUAI_PEMOHON',
  'BUKAN_JENIS_DOKUMEN',
]

export function VerifikasiDokumen() {
  const { id } = useParams<{ id: string }>()
  const pengajuanId = id ?? ''
  const qc = useQueryClient()
  const [dipilih, setDipilih] = useState<string | null>(null)
  const [galat, setGalat] = useState<GalatApi | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['dokumen', pengajuanId],
    queryFn: () => ambilDaftarDokumen(pengajuanId),
    enabled: !!pengajuanId,
  })

  const daftar = useMemo(() => data ?? [], [data])
  const aktif = daftar.find((d) => d.id === dipilih) ?? daftar[0]

  const verifikasi = useMutation<Dokumen, GalatApi, Parameters<typeof verifikasiDokumen>[1]>({
    mutationFn: (input) => verifikasiDokumen(aktif!.id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dokumen', pengajuanId] }),
    onError: setGalat,
  })

  const jumlahVerified = daftar.filter((d) => d.status === 'VERIFIED').length

  // Kelompokkan per anggota (untuk majelis).
  const perAnggota = useMemo(() => {
    const peta = new Map<string, Dokumen[]>()
    for (const d of daftar) {
      const arr = peta.get(d.namaAnggota) ?? []
      arr.push(d)
      peta.set(d.namaAnggota, arr)
    }
    return [...peta.entries()]
  }, [daftar])

  return (
    <div className="konten">
      <h1>Verifikasi Dokumen</h1>
      <p className="redup">
        {jumlahVerified} dari {daftar.length} dokumen terverifikasi
      </p>

      <div style={{ marginTop: 12 }}>
        <PanelGalat galat={galat} />
      </div>

      {isLoading && <p className="redup">Memuat dokumen...</p>}
      {error && <p className="redup">Gagal memuat dokumen.</p>}

      {data && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(240px, 40%) 1fr',
            gap: 16,
            marginTop: 12,
          }}
        >
          {/* Kolom kiri: daftar */}
          <div className="kartu" style={{ padding: 0 }}>
            {perAnggota.map(([nama, dokumen]) => (
              <div key={nama}>
                <div
                  style={{
                    padding: '8px 16px',
                    fontWeight: 600,
                    background: 'var(--warna-latar)',
                    borderBottom: '1px solid var(--warna-garis)',
                  }}
                >
                  {nama}
                </div>
                {dokumen.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setDipilih(d.id)
                      setGalat(null)
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      padding: '10px 16px',
                      border: 'none',
                      borderBottom: '1px solid var(--warna-garis)',
                      background: aktif?.id === d.id ? 'var(--bg-info)' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      font: 'inherit',
                    }}
                  >
                    <span>{LABEL_JENIS[d.jenis] ?? d.jenis}</span>
                    <span className={badgeKelas(d.status)}>{d.status}</span>
                  </button>
                ))}
              </div>
            ))}
            {daftar.length === 0 && (
              <p className="redup" style={{ padding: 16 }}>
                Belum ada dokumen diunggah.
              </p>
            )}
          </div>

          {/* Kolom kanan: pratinjau + aksi */}
          {aktif ? (
            <PanelVerifikasi
              key={aktif.id}
              dokumen={aktif}
              opsiAlasan={KODE_ALASAN}
              sedang={verifikasi.isPending}
              onVerifikasi={() => {
                setGalat(null)
                verifikasi.mutate({ status: 'VERIFIED' })
              }}
              onTolak={(kodeAlasan, catatan) => {
                setGalat(null)
                verifikasi.mutate({ status: 'REJECTED', kodeAlasan, catatan })
              }}
            />
          ) : (
            <div className="kartu redup">Pilih dokumen untuk diverifikasi.</div>
          )}
        </div>
      )}
    </div>
  )
}

function PanelVerifikasi({
  dokumen,
  opsiAlasan,
  sedang,
  onVerifikasi,
  onTolak,
}: {
  dokumen: Dokumen
  opsiAlasan: KodeAlasan[]
  sedang: boolean
  onVerifikasi: () => void
  onTolak: (kode: KodeAlasan, catatan?: string) => void
}) {
  const [modeTolak, setModeTolak] = useState(false)
  const [kode, setKode] = useState<KodeAlasan | ''>('')
  const [catatan, setCatatan] = useState('')
  const berkasPdf = dokumen.mime === 'application/pdf'

  return (
    <div className="kartu">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>
          {LABEL_JENIS[dokumen.jenis] ?? dokumen.jenis} · versi {dokumen.versi}
        </strong>
        <span className={badgeKelas(dokumen.status)}>{dokumen.status}</span>
      </div>

      {/* Pratinjau berkas — memakai id dokumen, bukan NIK (BR-11). */}
      <div
        style={{
          marginTop: 12,
          border: '1px solid var(--warna-garis)',
          borderRadius: 8,
          overflow: 'hidden',
          background: 'var(--warna-latar)',
          minHeight: 280,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {berkasPdf ? (
          <a
            className="tombol tombol--sekunder"
            href={urlBerkasDokumen(dokumen.id)}
            target="_blank"
            rel="noreferrer"
          >
            Buka berkas PDF
          </a>
        ) : (
          <img
            src={urlBerkasDokumen(dokumen.id)}
            alt={`Pratinjau ${dokumen.jenis}`}
            style={{ maxWidth: '100%', maxHeight: 420, objectFit: 'contain' }}
          />
        )}
      </div>

      {/* Bilah aksi — hanya bila masih MENUNGGU. */}
      {dokumen.status === 'MENUNGGU' && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="tombol" onClick={onVerifikasi} disabled={sedang}>
              Terverifikasi
            </button>
            <button
              type="button"
              className="tombol tombol--bahaya"
              onClick={() => setModeTolak((v) => !v)}
              disabled={sedang}
            >
              Tolak
            </button>
          </div>

          {modeTolak && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                border: '1px solid var(--warna-garis)',
                borderRadius: 8,
              }}
            >
              <label htmlFor="kodeAlasan">Kode alasan</label>
              <select
                id="kodeAlasan"
                value={kode}
                onChange={(e) => setKode(e.target.value as KodeAlasan)}
              >
                <option value="">— Pilih alasan —</option>
                {opsiAlasan.map((k) => (
                  <option key={k} value={k}>
                    {LABEL_KODE_ALASAN[k]}
                  </option>
                ))}
              </select>
              <label htmlFor="catatan" style={{ marginTop: 12 }}>
                Catatan untuk AO (opsional)
              </label>
              <textarea
                id="catatan"
                rows={3}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
              />
              <button
                type="button"
                className="tombol tombol--bahaya"
                style={{ marginTop: 12 }}
                disabled={!kode || sedang}
                onClick={() => kode && onTolak(kode, catatan.trim() || undefined)}
              >
                {sedang ? 'Mengirim...' : 'Kirim penolakan'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function badgeKelas(status: string): string {
  if (status === 'VERIFIED') return 'badge badge--sukses'
  if (status === 'REJECTED') return 'badge badge--bahaya'
  return 'badge badge--info'
}
