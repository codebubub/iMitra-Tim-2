import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GalatApi } from '../api/client'
import {
  ambilDaftarDokumen,
  unggahDokumen,
  type Dokumen,
  type JenisDokumen,
  type RingkasUnggahDokumen,
} from '../api/dokumen'
import { ambilDetailPengajuan } from '../api/pengajuan'
import {
  bolehUnggahDokumen,
  dokumenTerbaruPerKunci,
  kelasBadgeDokumen,
  riwayatDokumen,
} from '../api/logika-lapangan'
import { PanelGalat } from '../components/PanelGalat'

/**
 * S-05 · Upload Dokumen (FR-03, AC-03) — mobile, dipakai AO.
 *
 * ATURAN INTI (AC-03): hanya dokumen berstatus REJECTED yang menampilkan tombol
 * unggah ulang. Dokumen VERIFIED dan MENUNGGU tidak punya kontrol unggah sama
 * sekali — AO mengirim ulang SATU dokumen, bukan seluruh pengajuan. Kesalahan
 * paling umum adalah membuat seluruh form bisa diisi ulang.
 *
 * Unggah ulang membuat versi baru di server; versi lama tetap tersimpan
 * (riwayat ditampilkan di dalam kartu). Nama berkas/NIK tidak masuk URL (BR-11).
 */

const JENIS_URUT: JenisDokumen[] = ['KTP', 'KK', 'SKU']
const LABEL_JENIS: Record<JenisDokumen, string> = {
  KTP: 'KTP',
  KK: 'Kartu Keluarga',
  SKU: 'Surat Keterangan Usaha',
}
const LABEL_STATUS: Record<string, string> = {
  VERIFIED: 'Terverifikasi',
  MENUNGGU: 'Menunggu verifikasi',
  REJECTED: 'Ditolak',
}

export function UploadDokumen() {
  const { id } = useParams<{ id: string }>()
  const pengajuanId = id ?? ''
  const qc = useQueryClient()
  const [galat, setGalat] = useState<GalatApi | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['dokumen', pengajuanId],
    queryFn: () => ambilDaftarDokumen(pengajuanId),
    enabled: !!pengajuanId,
  })

  // Detail dipakai HANYA untuk memetakan slot dokumen ke id anggota (perorangan
  // = satu anggota). Angka bisnis apa pun tetap dari server, bukan dari sini.
  const { data: detail } = useQuery({
    queryKey: ['pengajuan', pengajuanId],
    queryFn: () => ambilDetailPengajuan(pengajuanId),
    enabled: !!pengajuanId,
  })

  const unggah = useMutation<
    RingkasUnggahDokumen,
    GalatApi,
    { pengajuanAnggotaId: string; jenis: JenisDokumen; berkas: File }
  >({
    mutationFn: (v) => unggahDokumen(pengajuanId, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dokumen', pengajuanId] }),
    onError: setGalat,
  })

  // Server mengirim SEMUA versi (flat); ambil versi terakhir per (anggota, jenis).
  const semua = data ?? []
  const terbaru = dokumenTerbaruPerKunci(semua)
  // Anggota tunggal (perorangan) untuk memetakan slot yang belum punya dokumen.
  const anggotaTunggal = detail?.anggota[0]?.id ?? ''

  return (
    <div className="konten" style={{ maxWidth: 480 }}>
      <h1>Dokumen</h1>
      <p className="redup mono">Pengajuan {pengajuanId}</p>

      <div style={{ marginTop: 12 }}>
        <PanelGalat galat={galat} />
      </div>

      {isLoading && <p className="redup">Memuat dokumen...</p>}
      {error && <p className="redup">Gagal memuat dokumen.</p>}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          {JENIS_URUT.map((jenis) => {
            const dok = terbaru.find((d) => d.jenis === jenis)
            const anggotaId = dok?.pengajuanAnggotaId ?? anggotaTunggal
            return (
              <KartuDokumen
                key={jenis}
                jenis={jenis}
                dokumen={dok}
                riwayat={dok ? riwayatDokumen(semua, dok) : []}
                bisaUnggah={anggotaId !== ''}
                sedangUnggah={unggah.isPending && unggah.variables?.jenis === jenis}
                onUnggah={(berkas) => {
                  setGalat(null)
                  unggah.mutate({ pengajuanAnggotaId: anggotaId, jenis, berkas })
                }}
              />
            )
          })}
        </div>
      )}

      <p className="redup" style={{ fontSize: 12, marginTop: 12 }}>
        Maks 5 MB · JPG, PNG, atau PDF
      </p>
    </div>
  )
}

function KartuDokumen({
  jenis,
  dokumen,
  riwayat,
  bisaUnggah,
  sedangUnggah,
  onUnggah,
}: {
  jenis: JenisDokumen
  dokumen: Dokumen | undefined
  riwayat: Dokumen[]
  bisaUnggah: boolean
  sedangUnggah: boolean
  onUnggah: (berkas: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [bukaRiwayat, setBukaRiwayat] = useState(false)

  const status = dokumen?.status ?? 'BELUM'
  const ditolak = status === 'REJECTED'
  // Hanya boleh unggah bila belum ada dokumen ATAU dokumen ditolak (AC-03),
  // dan id anggota sudah diketahui.
  const bolehUnggah = bolehUnggahDokumen(dokumen) && bisaUnggah

  function pilihBerkas(e: React.ChangeEvent<HTMLInputElement>) {
    const berkas = e.target.files?.[0]
    if (berkas) onUnggah(berkas)
    e.target.value = ''
  }

  return (
    <div className="kartu">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{LABEL_JENIS[jenis]}</strong>
        {dokumen ? (
          <span className={kelasBadgeDokumen(status)}>{LABEL_STATUS[status] ?? status}</span>
        ) : (
          <span className="badge">Belum diunggah</span>
        )}
      </div>

      {dokumen && (
        <div className="redup" style={{ fontSize: 12, marginTop: 8 }}>
          Versi {dokumen.versi} · {new Date(dokumen.diunggahPada).toLocaleString('id-ID')}
        </div>
      )}

      {/* Panel alasan penolakan + catatan analis (AC-03). */}
      {ditolak && (
        <div
          className="panel-galat"
          style={{ marginTop: 12, flexDirection: 'column', alignItems: 'stretch' }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>Alasan: {dokumen?.kodeAlasan ? labelAlasan(dokumen.kodeAlasan) : '—'}</span>
          </div>
          {dokumen?.catatan && (
            <div style={{ fontSize: 12, marginTop: 4 }}>Catatan analis: {dokumen.catatan}</div>
          )}
        </div>
      )}

      {/* Riwayat versi (AC-03) — versi lama diturunkan dari daftar flat server. */}
      {riwayat.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            className="redup"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: 12,
              textDecoration: 'underline',
            }}
            onClick={() => setBukaRiwayat((v) => !v)}
          >
            {bukaRiwayat ? 'Sembunyikan riwayat' : `Riwayat (${riwayat.length})`}
          </button>
          {bukaRiwayat && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12 }} className="redup">
              {riwayat.map((r) => (
                <li key={r.versi}>
                  Versi {r.versi} {LABEL_STATUS[r.status] ?? r.status}{' '}
                  {new Date(r.diunggahPada).toLocaleDateString('id-ID')}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {bolehUnggah && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={pilihBerkas}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="tombol"
            style={{ width: '100%', marginTop: 12 }}
            onClick={() => inputRef.current?.click()}
            disabled={sedangUnggah}
          >
            {sedangUnggah ? 'Mengunggah...' : ditolak ? `Unggah ulang ${jenis}` : `Unggah ${jenis}`}
          </button>
        </>
      )}
    </div>
  )
}

function labelAlasan(kode: string): string {
  const peta: Record<string, string> = {
    BURAM: 'Buram',
    TIDAK_TERBACA: 'Tidak terbaca',
    KADALUARSA: 'Kadaluarsa',
    TIDAK_SESUAI_PEMOHON: 'Tidak sesuai pemohon',
    BUKAN_JENIS_DOKUMEN: 'Bukan jenis dokumen',
  }
  return peta[kode] ?? kode
}
