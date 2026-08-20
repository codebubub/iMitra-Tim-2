import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

type Step = 1 | 2 | 3

export function BuatPengajuan() {
  const [step, setStep] = useState<Step>(1)
  const [jenisNasabah, setJenisNasabah] = useState<'PERORANGAN' | 'KELOMPOK'>('PERORANGAN')
  const [akad, setAkad] = useState<'MURABAHAH' | 'MUSYARAKAH'>('MURABAHAH')
  const [plafon, setPlafon] = useState('')
  const [tenor, setTenor] = useState('24')
  const [anggota, setAnggota] = useState<Array<{ nama: string; nik: string; plafon: string }>>([])
  const navigate = useNavigate()

  const totalPlafon = jenisNasabah === 'KELOMPOK'
    ? anggota.reduce((sum, a) => sum + Number(a.plafon || 0), 0)
    : Number(plafon || 0)

  const levelApproval = totalPlafon <= 50000000 ? 'KCP' : totalPlafon <= 200000000 ? 'KCP → KC' : 'KCP → KC → KOM'

  const tambahAnggota = () => {
    if (anggota.length < 10) {
      setAnggota([...anggota, { nama: '', nik: '', plafon: '' }])
    }
  }

  const hapusAnggota = (index: number) => {
    setAnggota(anggota.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    try {
      await api('/api/pengajuan', {
        method: 'POST',
        body: JSON.stringify({
          jenis_nasabah: jenisNasabah,
          akad,
          tenor_bulan: Number(tenor),
          anggota: jenisNasabah === 'KELOMPOK' ? anggota.map((a) => ({
            nasabah_id: a.nik,
            plafon_diajukan: Number(a.plafon),
          })) : undefined,
        }),
      })
      navigate('/pengajuan')
    } catch (e: any) {
      alert(e.message || 'Gagal membuat pengajuan')
    }
  }

  const isPlafonValid = totalPlafon >= 5000000 && totalPlafon <= 500000000

  return (
    <div className="konten">
      <h1>Buat Pengajuan</h1>
      <p className="redup">Langkah {step} dari 3</p>

      <div style={{ display: 'flex', gap: 8, margin: '24px 0' }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? 'var(--warna-primer)' : 'var(--warna-garis)' }} />
        ))}
      </div>

      {step === 2 && (
        <div className="kartu" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Pembiayaan</h2>

          <div style={{ marginBottom: 16 }}>
            <label>Jenis nasabah</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {(['PERORANGAN', 'KELOMPOK'] as const).map((value) => (
                <button key={value} type="button" onClick={() => setJenisNasabah(value)} className="tombol" style={{
                  flex: 1,
                  background: jenisNasabah === value ? 'var(--warna-primer)' : 'var(--warna-permukaan)',
                  color: jenisNasabah === value ? '#fff' : 'var(--teks-utama)',
                  border: `1px solid ${jenisNasabah === value ? 'var(--warna-primer)' : 'var(--warna-garis)'}`,
                }}>
                  {value === 'PERORANGAN' ? 'Perorangan' : 'Kelompok (Majelis)'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label>Akad</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {(['MURABAHAH', 'MUSYARAKAH'] as const).map((value) => (
                <button key={value} type="button" onClick={() => setAkad(value)} className="tombol" style={{
                  flex: 1,
                  background: akad === value ? 'var(--warna-primer)' : 'var(--warna-permukaan)',
                  color: akad === value ? '#fff' : 'var(--teks-utama)',
                  border: `1px solid ${akad === value ? 'var(--warna-primer)' : 'var(--warna-garis)'}`,
                }}>
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="plafon">{jenisNasabah === 'KELOMPOK' ? 'Total Plafon Kelompok' : 'Plafon diajukan'}</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--teks-redup)' }}>Rp</span>
              <input id="plafon" type="number" value={plafon} onChange={(e) => setPlafon(e.target.value)} style={{ paddingLeft: 40 }} disabled={jenisNasabah === 'KELOMPOK'} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--teks-redup)', marginTop: 4 }}>Batas Rp 5.000.000 – Rp 500.000.000</div>
          </div>

          <div>
            <label htmlFor="tenor">Tenor (bulan)</label>
            <input id="tenor" type="number" value={tenor} onChange={(e) => setTenor(e.target.value)} min="3" max="36" />
          </div>
        </div>
      )}

      {step === 3 && jenisNasabah === 'KELOMPOK' && (
        <div className="kartu" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Anggota</h2>
          {anggota.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <label>Nama nasabah {i + 1}</label>
                <input value={a.nama} onChange={(e) => { const u = [...anggota]; u[i].nama = e.target.value; setAnggota(u) }} />
              </div>
              <div style={{ flex: 1 }}>
                <label>NIK</label>
                <input value={a.nik} onChange={(e) => { const u = [...anggota]; u[i].nik = e.target.value; setAnggota(u) }} placeholder="3404********0001" />
              </div>
              <div style={{ flex: 1 }}>
                <label>Plafon</label>
                <input type="number" value={a.plafon} onChange={(e) => { const u = [...anggota]; u[i].plafon = e.target.value; setAnggota(u) }} />
              </div>
              <button type="button" onClick={() => hapusAnggota(i)} className="tombol tombol--bahaya" style={{ marginTop: 20, padding: '6px 10px' }}>Hapus</button>
            </div>
          ))}
          <button type="button" onClick={tambahAnggota} className="tombol tombol--sekunder" style={{ width: '100%', borderStyle: 'dashed' }}>+ Tambah anggota</button>
          <div style={{ fontSize: 12, color: 'var(--teks-redup)', marginTop: 6 }}>Minimal 3, maksimal 10 anggota</div>
        </div>
      )}

      {(step === 2 || step === 3) && (
        <div className="kartu" style={{ marginBottom: 16, background: 'var(--bg-info)', borderColor: 'var(--warna-primer)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Total plafon {jenisNasabah === 'KELOMPOK' ? 'kelompok' : ''}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--warna-primer)', fontVariantNumeric: 'tabular-nums' }}>
            Rp {totalPlafon.toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--teks-sekunder)', marginTop: 4 }}>
            Level approval yang diperlukan: {levelApproval} ({levelApproval.split('→').length} level)
          </div>
        </div>
      )}

      {step === 3 && !isPlafonValid && totalPlafon > 0 && (
        <div className="panel-galat" style={{ marginBottom: 16 }}>
          <span className="panel-galat__kode">BR-01</span>
          <span>Plafon Rp {totalPlafon.toLocaleString('id-ID')} di bawah batas minimum Rp 5.000.000 atau melebihi batas maksimum Rp 500.000.000</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        {step > 1 && <button type="button" onClick={() => setStep((step - 1) as Step)} className="tombol tombol--sekunder">Kembali</button>}
        {step < 3 ? (
          <button type="button" onClick={() => setStep((step + 1) as Step)} className="tombol">Lanjut</button>
        ) : (
          <button type="button" onClick={handleSubmit} className="tombol" disabled={!isPlafonValid}>Kirim</button>
        )}
      </div>
    </div>
  )
}
