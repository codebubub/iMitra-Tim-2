import { Fragment, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { rupiah, type GalatApi } from '../api/client'
import {
  buatPengajuan,
  kirimPengajuan,
  type Akad,
  type AnggotaBaru,
  type JenisNasabah,
  type RingkasBuatPengajuan,
} from '../api/pengajuan'
import { PanelGalat } from '../components/PanelGalat'
import {
  anggotaUntukPayload,
  bolehKirimPengajuan,
  formatRibuan,
  hanyaDigit,
  hitungTotalPlafon,
} from '../api/logika-lapangan'

/**
 * S-03 · Buat Pengajuan (FR-02, FR-10) — mobile-first, dipakai AO di lapangan.
 *
 * Wizard 3 langkah: Nasabah → Pembiayaan → Anggota. Perorangan = tepat satu
 * anggota (asumsi A-5); majelis = 3–10 anggota.
 *
 * ATURAN yang dijaga layar ini:
 * - Total plafon di panel ringkasan = penjumlahan input pengguna (aritmetika,
 *   bukan parameter bisnis). Batas plafon (BR-01) dan level approval TIDAK
 *   ditulis di sini — keduanya divalidasi/dihitung server (risiko R-8, #3).
 * - Nomor referensi dibangkitkan server saat submit (#4), tidak pernah di sini.
 * - Level approval yang ditampilkan berasal dari respons server setelah draft
 *   disimpan, bukan dari ambang yang ditebak frontend.
 *
 * Logika keputusan (total plafon, kelengkapan anggota, pemilihan baris payload)
 * diekstrak ke src/api/logika-lapangan.ts supaya bisa diuji tanpa merender.
 */

type BarisAnggota = {
  nama: string
  nik: string
  alamat: string
  jenisUsaha: string
  plafon: string
}

const anggotaKosong = (): BarisAnggota => ({
  nama: '',
  nik: '',
  alamat: '',
  jenisUsaha: '',
  plafon: '',
})

export function BuatPengajuan() {
  const navigate = useNavigate()
  const [langkah, setLangkah] = useState<1 | 2 | 3>(1)
  const [jenisNasabah, setJenisNasabah] = useState<JenisNasabah>('PERORANGAN')
  const [akad, setAkad] = useState<Akad>('MURABAHAH')
  const [tenor, setTenor] = useState('12')
  const [galat, setGalat] = useState<GalatApi | null>(null)
  const [anggota, setAnggota] = useState<BarisAnggota[]>([anggotaKosong()])

  const kelompok = jenisNasabah === 'KELOMPOK'

  // Total plafon dihitung live dari input (penjumlahan murni).
  const totalPlafon = useMemo(
    () => hitungTotalPlafon(anggota.map((a) => hanyaDigit(a.plafon))),
    [anggota],
  )

  function setAnggotaField(i: number, patch: Partial<BarisAnggota>) {
    setAnggota((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)))
  }
  function tambahBaris() {
    setAnggota((prev) => (prev.length < 10 ? [...prev, anggotaKosong()] : prev))
  }
  function hapusBaris(i: number) {
    setAnggota((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))
  }

  function bangunPayload(): {
    jenisNasabah: JenisNasabah
    akad: Akad
    tenorBulan: number
    anggota: AnggotaBaru[]
  } {
    const daftar = anggotaUntukPayload(jenisNasabah, anggota).map((a) => ({
      nama: a.nama.trim(),
      nik: a.nik.replace(/\D/g, ''),
      alamat: a.alamat.trim(),
      jenisUsaha: a.jenisUsaha.trim(),
      plafonDiajukan: hanyaDigit(a.plafon),
    }))
    return { jenisNasabah, akad, tenorBulan: Number(tenor) || 0, anggota: daftar }
  }

  const simpanDraft = useMutation<RingkasBuatPengajuan, GalatApi>({
    mutationFn: () => buatPengajuan(bangunPayload()),
    onSuccess: (d) => navigate(`/pengajuan/${d.id}`),
    onError: setGalat,
  })

  const kirim = useMutation<RingkasBuatPengajuan, GalatApi>({
    mutationFn: async () => {
      const draft = await buatPengajuan(bangunPayload())
      return kirimPengajuan(draft.id)
    },
    onSuccess: (d) => navigate(`/pengajuan/${d.id}`),
    onError: setGalat,
  })

  const sedangKirim = simpanDraft.isPending || kirim.isPending

  // "Kirim" hanya aktif jika komposisi anggota sah untuk dikirim: perorangan =
  // satu anggota lengkap, majelis = 3–10 anggota lengkap (FR-10). Server tetap
  // penegak akhir; ini mencegah 422 yang membingungkan di lapangan. "Simpan
  // draft" tetap boleh walau belum lengkap — AO menyimpan draf setengah jadi.
  const semuaLengkap = bolehKirimPengajuan(
    jenisNasabah,
    anggota.map((a) => ({
      nama: a.nama.trim(),
      nik: a.nik.replace(/\D/g, ''),
      alamat: a.alamat.trim(),
      jenisUsaha: a.jenisUsaha.trim(),
      plafonDiajukan: hanyaDigit(a.plafon),
    })),
  )

  function lanjut(e: FormEvent) {
    e.preventDefault()
    setGalat(null)
    if (langkah === 1) setLangkah(2)
    else if (langkah === 2) setLangkah(kelompok ? 3 : 2)
  }

  return (
    <div className="halaman-form">
      <a
        href="#/dashboard"
        onClick={(e) => {
          e.preventDefault()
          navigate('/dashboard')
        }}
        className="redup"
      >
        ← Kembali
      </a>
      <h1 style={{ marginTop: 8 }}>Buat Pengajuan</h1>

      <IndikatorLangkah langkah={langkah} kelompok={kelompok} />

      <div style={{ marginTop: 16 }}>
        <PanelGalat galat={galat} />
      </div>

      <form onSubmit={lanjut} style={{ marginTop: 16 }}>
        {langkah === 1 && (
          <div className="kartu">
            <label>Jenis nasabah</label>
            <Segmen
              nilai={jenisNasabah}
              opsi={[
                ['PERORANGAN', 'Perorangan'],
                ['KELOMPOK', 'Kelompok (Majelis)'],
              ]}
              onPilih={(v) => setJenisNasabah(v as JenisNasabah)}
            />
            {/*
              Dua kolom bila ruangnya cukup, menumpuk bila tidak. Nama dan NIK
              diisi berurutan dari kartu identitas yang sama, begitu juga alamat
              dan jenis usaha dari kunjungan yang sama — jadi pasangannya bukan
              sekadar demi ringkas, melainkan mengikuti urutan orang membaca
              sumbernya.
            */}
            {!kelompok && (
              <div className="grid-bidang">
                <div className="bidang">
                  <label htmlFor="nama0">Nama nasabah</label>
                  <input
                    id="nama0"
                    value={anggota[0].nama}
                    onChange={(e) => setAnggotaField(0, { nama: e.target.value })}
                    required
                  />
                </div>
                <div className="bidang">
                  <label htmlFor="nik0">NIK</label>
                  <input
                    id="nik0"
                    inputMode="numeric"
                    maxLength={16}
                    value={anggota[0].nik}
                    onChange={(e) => setAnggotaField(0, { nik: e.target.value.replace(/\D/g, '') })}
                    placeholder="16 digit"
                    required
                  />
                  <span className="bantuan">Tanpa spasi atau tanda baca.</span>
                </div>
                <div className="bidang">
                  <label htmlFor="alamat0">Alamat</label>
                  <input
                    id="alamat0"
                    value={anggota[0].alamat}
                    onChange={(e) => setAnggotaField(0, { alamat: e.target.value })}
                    required
                  />
                </div>
                <div className="bidang">
                  <label htmlFor="usaha0">Jenis usaha</label>
                  <input
                    id="usaha0"
                    value={anggota[0].jenisUsaha}
                    onChange={(e) => setAnggotaField(0, { jenisUsaha: e.target.value })}
                    placeholder="mis. Warung kelontong"
                    required
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {langkah === 2 && (
          <div className="kartu">
            <label>Akad</label>
            <Segmen
              nilai={akad}
              opsi={[
                ['MURABAHAH', 'Murabahah'],
                ['MUSYARAKAH', 'Musyarakah'],
              ]}
              onPilih={(v) => setAkad(v as Akad)}
            />
            <div className="grid-bidang">
              {!kelompok && (
                <div className="bidang">
                  <label htmlFor="plafon0">Plafon diajukan</label>
                  <InputRupiah
                    id="plafon0"
                    nilai={anggota[0].plafon}
                    onUbah={(v) => setAnggotaField(0, { plafon: v })}
                  />
                  {/*
                   * Batasnya sengaja TIDAK ditulis sebagai angka di sini.
                   * Batas plafon adalah parameter yang bisa diubah admin tanpa
                   * restart (AC-15); angka yang ditulis di layar akan menjadi
                   * salah pada hari pertama seseorang mengubahnya, dan tidak
                   * ada yang akan ingat memperbaikinya.
                   */}
                  <span className="bantuan">Batas plafon divalidasi saat pengiriman.</span>
                </div>
              )}
              <div className="bidang">
                <label htmlFor="tenor">Tenor (bulan)</label>
                <input
                  id="tenor"
                  inputMode="numeric"
                  value={tenor}
                  onChange={(e) => setTenor(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </div>
          </div>
        )}

        {langkah === 3 && kelompok && (
          <>
            {anggota.map((a, i) => (
              <div key={i} className="kartu" style={{ marginBottom: 'var(--sp-3)' }}>
                <div className="kartu__kepala">
                  <h3>Anggota {i + 1}</h3>
                  <button
                    type="button"
                    className="tombol tombol--bahaya tombol--kecil"
                    onClick={() => hapusBaris(i)}
                    disabled={anggota.length <= 1}
                  >
                    Hapus
                  </button>
                </div>
                <div className="grid-bidang" style={{ marginTop: 0 }}>
                  <div className="bidang">
                    <label htmlFor={`nama${i}`}>Nama nasabah</label>
                    <input
                      id={`nama${i}`}
                      value={a.nama}
                      onChange={(e) => setAnggotaField(i, { nama: e.target.value })}
                      required
                    />
                  </div>
                  <div className="bidang">
                    <label htmlFor={`nik${i}`}>NIK</label>
                    <input
                      id={`nik${i}`}
                      inputMode="numeric"
                      maxLength={16}
                      value={a.nik}
                      onChange={(e) => setAnggotaField(i, { nik: e.target.value.replace(/\D/g, '') })}
                      required
                    />
                  </div>
                  <div className="bidang">
                    <label htmlFor={`alamat${i}`}>Alamat</label>
                    <input
                      id={`alamat${i}`}
                      value={a.alamat}
                      onChange={(e) => setAnggotaField(i, { alamat: e.target.value })}
                      required
                    />
                  </div>
                  <div className="bidang">
                    <label htmlFor={`usaha${i}`}>Jenis usaha</label>
                    <input
                      id={`usaha${i}`}
                      value={a.jenisUsaha}
                      onChange={(e) => setAnggotaField(i, { jenisUsaha: e.target.value })}
                      required
                    />
                  </div>
                  <div className="bidang">
                    <label htmlFor={`plafon${i}`}>Plafon</label>
                    <InputRupiah
                      id={`plafon${i}`}
                      nilai={a.plafon}
                      onUbah={(v) => setAnggotaField(i, { plafon: v })}
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={tambahBaris}
              disabled={anggota.length >= 10}
              className="tombol tombol--sekunder"
              style={{ width: '100%', borderStyle: 'dashed' }}
            >
              + Tambah anggota
            </button>
            <p className="redup" style={{ fontSize: 12, marginTop: 4 }}>
              Minimal 3, maksimal 10 anggota
              {anggota.length < 3 && ' — tambah anggota hingga minimal 3 sebelum mengirim'}
            </p>

            <div
              className="kartu"
              style={{
                marginTop: 12,
                background: 'var(--bg-info)',
                borderColor: 'var(--warna-info)',
              }}
            >
              <div className="redup" style={{ fontSize: 13 }}>
                Total plafon kelompok
              </div>
              <div className="angka" style={{ fontSize: 24, fontWeight: 700, textAlign: 'left' }}>
                {rupiah(totalPlafon)}
              </div>
              <p className="redup" style={{ fontSize: 12, marginTop: 8 }}>
                Level approval ditentukan server dari total plafon saat pengiriman.
              </p>
            </div>
          </>
        )}

        {/* Bilah aksi bawah */}
        <div className="kaki-form">
          {langkah > 1 && (
            <button
              type="button"
              className="tombol tombol--sekunder"
              onClick={() => setLangkah((l) => (l === 3 ? 2 : 1))}
              disabled={sedangKirim}
            >
              Kembali
            </button>
          )}
          {langkah === 1 || (langkah === 2 && kelompok) ? (
            <button type="submit" className="tombol">
              Lanjut
            </button>
          ) : (
            <>
              <button
                type="button"
                className="tombol tombol--sekunder"
                onClick={() => simpanDraft.mutate()}
                disabled={sedangKirim}
              >
                {simpanDraft.isPending ? 'Menyimpan...' : 'Simpan draft'}
              </button>
              <button
                type="button"
                className="tombol"
                onClick={() => {
                  setGalat(null)
                  kirim.mutate()
                }}
                disabled={sedangKirim || !semuaLengkap}
                title={!semuaLengkap ? 'Lengkapi seluruh data anggota sebelum mengirim' : undefined}
              >
                {kirim.isPending ? 'Mengirim...' : 'Kirim'}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  )
}

function IndikatorLangkah({ langkah, kelompok }: { langkah: number; kelompok: boolean }) {
  const daftar = kelompok
    ? ['Nasabah', 'Pembiayaan', 'Anggota']
    : ['Nasabah', 'Pembiayaan']
  return (
    <nav className="langkah" aria-label="Langkah pengisian">
      {daftar.map((t, i) => {
        const nomor = i + 1
        return (
          <Fragment key={t}>
            {i > 0 && <span className="langkah__garis" aria-hidden="true" />}
            <span
              className="langkah__item"
              data-aktif={nomor === langkah}
              data-lewat={nomor < langkah}
              // Pembaca layar mendapat kalimat utuh; bagi pengguna awas hal yang
              // sama disampaikan lewat warna lingkaran, yang tidak terbaca.
              aria-current={nomor === langkah ? 'step' : undefined}
            >
              <span className="langkah__nomor">{nomor}</span>
              <span>{t}</span>
            </span>
          </Fragment>
        )
      })}
    </nav>
  )
}

function Segmen({
  nilai,
  opsi,
  onPilih,
}: {
  nilai: string
  opsi: [string, string][]
  onPilih: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {opsi.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onPilih(v)}
          className={nilai === v ? 'tombol' : 'tombol tombol--sekunder'}
          style={{ flex: 1 }}
          aria-pressed={nilai === v}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function InputRupiah({
  id,
  nilai,
  onUbah,
}: {
  id: string
  nilai: string
  onUbah: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="redup">Rp</span>
      <input
        id={id}
        inputMode="numeric"
        value={formatRibuan(nilai)}
        onChange={(e) => onUbah(e.target.value.replace(/\D/g, ''))}
        required
      />
    </div>
  )
}
