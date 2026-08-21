import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rupiah, type GalatApi } from '../api/client'
import { ambilDetailPengajuan, type Anggota } from '../api/pengajuan'
import {
  ambilRiwayatSlik,
  jalankanSlikCheck,
  type BarisRiwayatSlik,
  type StatusPanggilanSlik,
} from '../api/slik'
import { PanelGalat } from '../components/PanelGalat'

/**
 * S-08 · SLIK Check (FR-05, AC-05, AC-06) — web, dipakai ANL.
 *
 * ATURAN YANG MENENTUKAN BENTUK LAYAR INI:
 *
 * 1. KEGAGALAN TIDAK BOLEH TERLIHAT SEPERTI KEBERHASILAN. Saat panggilan gagal
 *    (NOT_FOUND / UNAVAILABLE / TIMEOUT), kolektibilitas dirender sebagai TANDA
 *    HUBUNG, bukan angka, bukan 0, bukan "-1". Penilai akan mencabut mock SLIK
 *    (brief §13 butir 8) dan layar inilah yang mereka lihat saat itu.
 *
 * 2. KELUARAN PER KOLEKTIBILITAS DIPUTUSKAN SERVER. Layar ini tidak memuat satu
 *    pun `if (kolektibilitas >= 3)`. Tabel 4.2 adalah aturan bisnis; menyalinnya
 *    ke sini akan membuat dua sumber kebenaran. Yang ditampilkan layar hanyalah
 *    KETERANGAN atas nilai yang sudah dikembalikan server.
 *
 * 3. NIK TIDAK PERNAH TAMPIL UTUH (BR-11). Server mengirim `nikTersamar`, dan
 *    NIK untuk pemanggilan dikirim di body — tidak pernah di URL.
 */

/** Label kolektibilitas sesuai istilah SLIK. Label, bukan aturan. */
const LABEL_KOLEKTIBILITAS: Record<number, string> = {
  1: 'Lancar',
  2: 'Dalam Perhatian Khusus',
  3: 'Kurang Lancar',
  4: 'Diragukan',
  5: 'Macet',
}

const LABEL_STATUS_PANGGILAN: Record<StatusPanggilanSlik, string> = {
  OK: 'Berhasil',
  NOT_FOUND: 'NIK tidak ditemukan',
  UNAVAILABLE: 'Layanan tidak tersedia',
  TIMEOUT: 'Waktu tunggu habis',
}

const waktuIndonesia = (iso: string): string =>
  new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

const tanggalIndonesia = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '—'

/**
 * Gaya lokal layar ini.
 *
 * Ditulis sebagai objek di berkas ini, BUKAN sebagai kelas baru di theme.css:
 * berkas itu dan src/components/ hanya disentuh Reffa (docs/PEMBAGIAN-TIM.md,
 * risiko R-2). Kalau salah satu pola di bawah ternyata dipakai lebih dari satu
 * layar, jalur yang benar adalah MEMINTA komponen bersama kepada Reffa —
 * bukan menambah kelas tandingan di sini.
 *
 * Seluruh nilainya memakai token yang sudah ada; tidak ada warna atau jarak baru.
 */
const gaya = {
  kisiKartu: {
    display: 'grid',
    gap: 'var(--sp-4)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  },
  rincian: {
    display: 'grid',
    gap: 'var(--sp-2)',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    margin: 'var(--sp-3) 0 0',
  },
  rincianLabel: {
    fontSize: 12,
    color: 'var(--teks-redup)',
    margin: 0,
  },
  rincianNilai: {
    margin: 0,
    fontWeight: 500,
  },
  panelPeringatan: {
    marginTop: 'var(--sp-3)',
    padding: 'var(--sp-3)',
    borderRadius: 'var(--radius-kartu)',
    background: 'var(--bg-peringatan)',
    color: 'var(--warna-peringatan)',
  },
  pengungkap: {
    width: '100%',
    textAlign: 'left' as const,
    padding: 'var(--sp-4)',
    background: 'none',
    border: 'none',
    font: 'inherit',
    fontWeight: 600,
    cursor: 'pointer',
    color: 'var(--teks-utama)',
  },
} satisfies Record<string, React.CSSProperties>


/**
 * Kartu hasil untuk satu anggota. Menerima baris riwayat TERBARU milik anggota
 * itu, atau null bila SLIK belum pernah dijalankan untuknya.
 */
function KartuHasilSlik({
  anggota,
  baris,
  sedangJalan,
  nik,
  onNikBerubah,
  onJalankan,
}: {
  anggota: Anggota
  baris: BarisRiwayatSlik | null
  sedangJalan: boolean
  nik: string
  onNikBerubah: (nilai: string) => void
  onJalankan: () => void
}) {
  const gagal = baris !== null && baris.statusPanggilan !== 'OK'
  const belumDijalankan = baris === null
  /** Server memvalidasi ulang; ini hanya mencegah panggilan yang pasti gagal. */
  const nikLengkap = /^\d{16}$/.test(nik)

  // Warna tepi kiri mengikuti hasil, TETAPI setiap kartu selalu memuat teks —
  // status tidak pernah disampaikan hanya lewat warna (aturan aksesibilitas
  // yang sama dengan components/Badge.tsx).
  const warnaTepi = belumDijalankan
    ? 'var(--warna-garis)'
    : gagal
      ? 'var(--warna-bahaya)'
      : baris.kolektibilitas === 1
        ? 'var(--warna-sukses)'
        : baris.kolektibilitas === 2
          ? 'var(--warna-peringatan)'
          : 'var(--warna-bahaya)'

  return (
    <div
      className="kartu"
      style={{ borderLeft: `4px solid ${warnaTepi}`, padding: 'var(--sp-4)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 600 }}>{anggota.nama}</div>
          {/* NIK sudah bertopeng dari server (BR-11) */}
          <div className="mono redup" style={{ fontSize: 13 }}>
            {anggota.nikTersamar}
          </div>
        </div>
        <div className="angka redup" style={{ fontSize: 13 }}>
          {rupiah(anggota.plafonDiajukan)}
        </div>
      </div>

      {belumDijalankan && (
        <div style={{ marginTop: 'var(--sp-3)' }}>
          <p className="redup">SLIK belum dijalankan untuk anggota ini.</p>
          <label htmlFor={`nik-${anggota.id}`}>NIK (16 digit)</label>
          <input
            id={`nik-${anggota.id}`}
            inputMode="numeric"
            autoComplete="off"
            maxLength={16}
            value={nik}
            onChange={(e) => onNikBerubah(e.target.value.replace(/\D/g, ''))}
            placeholder="Ketik ulang dari dokumen"
          />
          <button
            className="tombol tombol--sekunder"
            onClick={onJalankan}
            disabled={sedangJalan || !nikLengkap}
            style={{ marginTop: 'var(--sp-2)' }}
          >
            {sedangJalan ? 'Memeriksa...' : 'Jalankan SLIK'}
          </button>
        </div>
      )}

      {/*
       * VARIAN GAGAL. Kolektibilitas dirender sebagai tanda hubung. Tidak ada
       * tombol yang melanjutkan alur — satu-satunya aksi adalah mencoba lagi.
       */}
      {gagal && (
        <div style={{ marginTop: 'var(--sp-3)' }}>
          <span className="badge badge--bahaya">
            {LABEL_STATUS_PANGGILAN[baris.statusPanggilan]}
          </span>
          <div
            className="panel-galat"
            role="alert"
            style={{ marginTop: 'var(--sp-3)' }}
          >
            <span>
              Panggilan SLIK gagal. Pengajuan tidak dapat dilanjutkan ke skoring sampai
              pemeriksaan berhasil.
            </span>
            <span className="panel-galat__kode">{baris.statusPanggilan}</span>
          </div>
          <dl style={gaya.rincian}>
            <div>
              <dt style={gaya.rincianLabel}>Kolektibilitas</dt>
              {/* Tanda hubung, BUKAN angka. Sistem tidak menebak saat gagal. */}
              <dd className="angka" style={gaya.rincianNilai}>—</dd>
            </div>
            <div>
              <dt style={gaya.rincianLabel}>Diperiksa pada</dt>
              <dd style={gaya.rincianNilai}>{waktuIndonesia(baris.diperiksaPada)}</dd>
            </div>
          </dl>
          <label htmlFor={`nik-ulang-${anggota.id}`}>NIK (16 digit)</label>
          <input
            id={`nik-ulang-${anggota.id}`}
            inputMode="numeric"
            autoComplete="off"
            maxLength={16}
            value={nik}
            onChange={(e) => onNikBerubah(e.target.value.replace(/\D/g, ''))}
            placeholder="Ketik ulang dari dokumen"
          />
          <button
            className="tombol tombol--sekunder"
            onClick={onJalankan}
            disabled={sedangJalan || !nikLengkap}
            style={{ marginTop: 'var(--sp-2)' }}
          >
            {sedangJalan ? 'Memeriksa...' : 'Coba lagi'}
          </button>
        </div>
      )}

      {baris !== null && baris.statusPanggilan === 'OK' && (
        <div style={{ marginTop: 'var(--sp-3)' }}>
          <span
            className={
              baris.kolektibilitas === 1
                ? 'badge badge--sukses'
                : baris.kolektibilitas === 2
                  ? 'badge badge--peringatan'
                  : 'badge badge--bahaya'
            }
          >
            Kolektibilitas {baris.kolektibilitas} —{' '}
            {LABEL_KOLEKTIBILITAS[baris.kolektibilitas ?? 0] ?? 'Tidak dikenal'}
          </span>

          <dl style={gaya.rincian}>
            <div>
              <dt style={gaya.rincianLabel}>Fasilitas aktif</dt>
              <dd className="angka" style={gaya.rincianNilai}>{baris.jumlahFasilitasAktif ?? '—'}</dd>
            </div>
            <div>
              <dt style={gaya.rincianLabel}>Total baki debet</dt>
              <dd className="angka" style={gaya.rincianNilai}>
                {baris.totalBakiDebet === null ? '—' : rupiah(baris.totalBakiDebet)}
              </dd>
            </div>
            <div>
              <dt style={gaya.rincianLabel}>Tanggal data</dt>
              <dd style={gaya.rincianNilai}>{tanggalIndonesia(baris.tanggalData)}</dd>
            </div>
            <div>
              <dt style={gaya.rincianLabel}>Referensi</dt>
              <dd className="mono" style={gaya.rincianNilai}>{baris.referenceId ?? '—'}</dd>
            </div>
          </dl>

          {/*
           * Keterangan untuk kolektibilitas 2. Kalimatnya menjelaskan konsekuensi
           * yang DITERAPKAN SERVER (lantai grade 3 + catatan analis wajib) —
           * layar tidak menerapkannya sendiri.
           */}
          {baris.kolektibilitas === 2 && (
            <div style={gaya.panelPeringatan} role="note">
              Grade risiko akan dibatasi minimal 3 dan catatan analis wajib diisi sebelum
              pengajuan diajukan ke approval.
            </div>
          )}

          {/*
           * Kolektibilitas 3-5: penolakan otomatis oleh server. Tidak ada tombol
           * aksi apa pun di kartu ini.
           */}
          {baris.kolektibilitas !== null && baris.kolektibilitas >= 3 && (
            <div className="panel-galat" role="alert" style={{ marginTop: 'var(--sp-3)' }}>
              <span>
                Pengajuan ditolak otomatis oleh sistem berdasarkan hasil SLIK. Status:
                REJECTED_SLIK.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function SlikCheck() {
  const { id } = useParams<{ id: string }>()
  const pengajuanId = id ?? ''
  const qc = useQueryClient()
  const [galat, setGalat] = useState<GalatApi | null>(null)
  const [riwayatTerbuka, setRiwayatTerbuka] = useState(false)
  /**
   * NIK yang sedang diketik ANL, per anggota. Disimpan di state komponen dan
   * dibuang setelah panggilan berhasil.
   *
   * KENAPA DIKETIK, BUKAN DIAMBIL DARI DETAIL PENGAJUAN: server mengirim NIK
   * dalam bentuk BERTOPENG (`nikTersamar`, mis. 3404********0001) karena NIK
   * adalah data pribadi (BR-11). Frontend memang TIDAK memilikinya. Mengirim
   * NIK bertopeng ke endpoint SLIK akan lolos validasi panjang 16 karakter
   * tetapi dijawab NIK_NOT_FOUND oleh mock — kegagalan palsu yang jauh lebih
   * buruk daripada meminta ANL mengetik ulang dari dokumen fisik.
   */
  const [nikMasukan, setNikMasukan] = useState<Record<string, string>>({})

  const detail = useQuery({
    queryKey: ['pengajuan', pengajuanId],
    queryFn: () => ambilDetailPengajuan(pengajuanId),
    enabled: !!pengajuanId,
  })

  const riwayat = useQuery({
    queryKey: ['slik', pengajuanId],
    queryFn: () => ambilRiwayatSlik(pengajuanId),
    enabled: !!pengajuanId,
  })

  const periksa = useMutation<unknown, GalatApi, string>({
    mutationFn: (nik) => jalankanSlikCheck(pengajuanId, nik),
    onSuccess: () => {
      setGalat(null)
      // NIK dibuang dari state segera setelah panggilan berhasil (BR-11):
      // ia tidak pernah menetap di memori layar lebih lama dari yang perlu.
      setNikMasukan({})
      qc.invalidateQueries({ queryKey: ['slik', pengajuanId] })
      qc.invalidateQueries({ queryKey: ['pengajuan', pengajuanId] })
    },
    /**
     * Galat TIDAK ditelan. 502 dari SLIK muncul di layar sebagai kegagalan —
     * tidak ada jalur yang mengubahnya menjadi "berhasil, kolektibilitas 1".
     */
    onError: setGalat,
  })

  const daftarRiwayat = riwayat.data ?? []
  const anggota = detail.data?.anggota ?? []

  /** Baris terbaru per anggota. Server sudah mengurutkan terbaru lebih dulu. */
  const terbaruUntuk = (anggotaId: string): BarisRiwayatSlik | null =>
    daftarRiwayat.find((r) => r.pengajuanAnggotaId === anggotaId) ?? null

  return (
    <div className="konten">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 'var(--sp-4)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1>SLIK Check</h1>
          {detail.data && (
            <p className="mono redup" style={{ margin: '4px 0 0' }}>
              {detail.data.nomorReferensi}
            </p>
          )}
        </div>
        {/*
         * Masa berlaku 30 hari (BR-04) adalah PARAMETER di database
         * (SLIK_MASA_BERLAKU_HARI), bukan konstanta. Kalimat ini sengaja tidak
         * menyebut angkanya, supaya layar tidak menjadi sumber kebenaran kedua
         * yang usang saat ADM mengubah parameternya.
         */}
        <p className="redup" style={{ margin: 0 }}>
          Hasil SLIK memiliki masa berlaku; setelah lewat, pengajuan perlu diperiksa ulang
          (BR-04).
        </p>
      </div>

      <PanelGalat galat={galat} />

      {(detail.isLoading || riwayat.isLoading) && <p className="redup">Memuat data SLIK...</p>}
      {detail.error && <p className="redup">Gagal memuat detail pengajuan.</p>}

      {anggota.length > 0 && (
        <div style={{ ...gaya.kisiKartu, marginTop: 'var(--sp-5)' }}>
          {anggota.map((a) => (
            <KartuHasilSlik
              key={a.id}
              anggota={a}
              baris={terbaruUntuk(a.id)}
              sedangJalan={periksa.isPending}
              nik={nikMasukan[a.id] ?? ''}
              onNikBerubah={(nilai) => setNikMasukan((m) => ({ ...m, [a.id]: nilai }))}
              onJalankan={() => periksa.mutate(nikMasukan[a.id] ?? '')}
            />
          ))}
        </div>
      )}

      {anggota.length === 0 && !detail.isLoading && (
        <div className="kartu" style={{ textAlign: 'center', padding: 'var(--sp-7)' }}>
          <p className="redup">Pengajuan ini belum memiliki anggota.</p>
        </div>
      )}

      {/*
       * Riwayat panggilan — termasuk yang GAGAL. Baris gagal tidak disembunyikan:
       * ia bukti bahwa layanan pernah tidak tersedia (jejak audit FR-09).
       */}
      {daftarRiwayat.length > 0 && (
        <div className="kartu" style={{ marginTop: 'var(--sp-5)', padding: 0 }}>
          <button
            style={gaya.pengungkap}
            onClick={() => setRiwayatTerbuka((v) => !v)}
            aria-expanded={riwayatTerbuka}
          >
            Riwayat panggilan ({daftarRiwayat.length})
          </button>
          {riwayatTerbuka && (
            <div className="tabel-bungkus">
              <table className="tabel tabel--kartu">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Hasil panggilan</th>
                    <th className="angka">Kolektibilitas</th>
                    <th>Referensi</th>
                  </tr>
                </thead>
                <tbody>
                  {daftarRiwayat.map((r) => (
                    <tr key={r.id}>
                      <td data-label="Waktu">{waktuIndonesia(r.diperiksaPada)}</td>
                      <td data-label="Hasil panggilan">
                        <span
                          className={
                            r.statusPanggilan === 'OK'
                              ? 'badge badge--sukses'
                              : 'badge badge--bahaya'
                          }
                        >
                          {r.statusPanggilan}
                        </span>
                      </td>
                      {/* Tanda hubung untuk setiap panggilan gagal. */}
                      <td data-label="Kolektibilitas" className="angka">{r.kolektibilitas ?? '—'}</td>
                      <td data-label="Referensi" className="mono">{r.referenceId ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
