import { describe, it, expect } from 'vitest'
import {
  anggotaLengkap,
  anggotaUntukPayload,
  bolehKirimPengajuan,
  bolehKirimSurvei,
  bolehUnggahDokumen,
  dokumenTerbaruPerKunci,
  formatRibuan,
  hanyaDigit,
  hitungTotalPlafon,
  kelasBadgeDokumen,
  nilaiSurveiDinonaktifkan,
  riwayatDokumen,
  tolakDinonaktifkan,
} from './logika-lapangan'
import type { AnggotaBaru } from './pengajuan'

/**
 * Test unit logika layar lapangan & dokumen (Ray).
 *
 * Diturunkan dari ACCEPTANCE CRITERIA, bukan dari kode. Setiap blok menyebut AC
 * atau aturan spesifik yang diujinya. Tanpa DOM/RTL — fungsi murni dari
 * logika-lapangan.ts, yaitu kode yang benar-benar dipakai komponen.
 */

/* ------------------------------------------------------------------ S-05 */
describe('S-05 UploadDokumen — bolehUnggahDokumen (AC-03)', () => {
  it('slot kosong (belum ada dokumen) boleh diunggah — unggah pertama', () => {
    expect(bolehUnggahDokumen(undefined)).toBe(true)
  })

  it('dokumen REJECTED boleh diunggah ulang', () => {
    expect(bolehUnggahDokumen({ status: 'REJECTED' })).toBe(true)
  })

  it('dokumen VERIFIED TIDAK boleh diunggah ulang — inti AC-03', () => {
    expect(bolehUnggahDokumen({ status: 'VERIFIED' })).toBe(false)
  })

  it('dokumen MENUNGGU verifikasi TIDAK boleh diunggah ulang', () => {
    expect(bolehUnggahDokumen({ status: 'MENUNGGU' })).toBe(false)
  })
})

describe('kelasBadgeDokumen — warna semantik konsisten', () => {
  it.each([
    ['VERIFIED', 'badge badge--sukses'],
    ['REJECTED', 'badge badge--bahaya'],
    ['MENUNGGU', 'badge badge--info'],
    ['BELUM', 'badge'],
  ] as const)('status %s -> %s', (status, kelas) => {
    expect(kelasBadgeDokumen(status)).toBe(kelas)
  })
})

describe('S-05/06 — dokumenTerbaruPerKunci & riwayatDokumen (AC-03)', () => {
  // Server mengembalikan SEMUA versi (flat). AC-03: unggah ulang membuat versi
  // baru dan versi lama tetap tersimpan sebagai riwayat.
  const flat = [
    { id: 'a1', pengajuanAnggotaId: 'AGG', jenis: 'KTP', versi: 1, status: 'REJECTED' },
    { id: 'a2', pengajuanAnggotaId: 'AGG', jenis: 'KTP', versi: 2, status: 'MENUNGGU' },
    { id: 'b1', pengajuanAnggotaId: 'AGG', jenis: 'KK', versi: 1, status: 'VERIFIED' },
  ]

  it('mengambil versi TERTINGGI per (anggota, jenis)', () => {
    const terbaru = dokumenTerbaruPerKunci(flat)
    const ktp = terbaru.find((d) => d.jenis === 'KTP')
    const kk = terbaru.find((d) => d.jenis === 'KK')
    expect(terbaru).toHaveLength(2)
    expect(ktp?.versi).toBe(2)
    expect(ktp?.status).toBe('MENUNGGU')
    expect(kk?.versi).toBe(1)
  })

  it('riwayat berisi versi lama (di bawah acuan), urut menurun, tanpa versi acuan', () => {
    const acuan = { pengajuanAnggotaId: 'AGG', jenis: 'KTP', versi: 2 }
    const riwayat = riwayatDokumen(flat, acuan)
    expect(riwayat.map((r) => r.versi)).toEqual([1])
  })

  it('tanpa versi lama, riwayat kosong', () => {
    const acuan = { pengajuanAnggotaId: 'AGG', jenis: 'KK', versi: 1 }
    expect(riwayatDokumen(flat, acuan)).toEqual([])
  })
})

/* ------------------------------------------------------------------ S-06 */
describe('S-06 VerifikasiDokumen — tolakDinonaktifkan', () => {
  it('tombol Kirim penolakan NONAKTIF saat kode alasan belum dipilih', () => {
    expect(tolakDinonaktifkan('', false)).toBe(true)
  })

  it('tombol AKTIF setelah kode alasan dipilih', () => {
    expect(tolakDinonaktifkan('BURAM', false)).toBe(false)
  })

  it('tetap NONAKTIF saat sedang mengirim walau alasan sudah dipilih', () => {
    expect(tolakDinonaktifkan('BURAM', true)).toBe(true)
  })

  it('spasi kosong bukan alasan yang sah', () => {
    expect(tolakDinonaktifkan('   ', false)).toBe(true)
  })
})

/* ------------------------------------------------------------------ S-07 */
describe('S-07 Survei AO — bolehKirimSurvei (AC-04)', () => {
  const dasar = { jumlahFoto: 1, omzetHarian: 500_000, adaKoordinat: true }

  it('boleh kirim dengan 1 foto, omzet > 0, dan koordinat terisi', () => {
    expect(bolehKirimSurvei(dasar)).toBe(true)
  })

  it('TIDAK boleh kirim tanpa foto', () => {
    expect(bolehKirimSurvei({ ...dasar, jumlahFoto: 0 })).toBe(false)
  })

  it('TIDAK boleh kirim tanpa omzet', () => {
    expect(bolehKirimSurvei({ ...dasar, omzetHarian: 0 })).toBe(false)
  })

  it('TIDAK boleh kirim tanpa koordinat — server mewajibkan lat & lng', () => {
    expect(bolehKirimSurvei({ ...dasar, adaKoordinat: false })).toBe(false)
  })
})

describe('S-07 Survei ANL — nilaiSurveiDinonaktifkan (A-10)', () => {
  it('tombol nilai NONAKTIF sebelum skala 1-5 dipilih', () => {
    expect(nilaiSurveiDinonaktifkan(null, false)).toBe(true)
  })

  it('tombol AKTIF setelah skala dipilih', () => {
    expect(nilaiSurveiDinonaktifkan(4, false)).toBe(false)
  })

  it('skala 0 dianggap sudah dipilih (aktif) — hanya null yang memblokir', () => {
    // null = belum memilih; nilai numerik apa pun berarti sudah memilih.
    expect(nilaiSurveiDinonaktifkan(0, false)).toBe(false)
  })

  it('tetap NONAKTIF saat sedang mengirim', () => {
    expect(nilaiSurveiDinonaktifkan(3, true)).toBe(true)
  })
})

/* ------------------------------------------------------------------ S-03 */
describe('S-03 BuatPengajuan — anggotaUntukPayload (A-5)', () => {
  const baris = [{ n: 1 }, { n: 2 }, { n: 3 }]

  it('PERORANGAN memakai tepat satu anggota walau ada beberapa baris', () => {
    expect(anggotaUntukPayload('PERORANGAN', baris)).toEqual([{ n: 1 }])
  })

  it('KELOMPOK memakai seluruh baris', () => {
    expect(anggotaUntukPayload('KELOMPOK', baris)).toHaveLength(3)
  })
})

describe('S-03 BuatPengajuan — hitungTotalPlafon (AC-14)', () => {
  it('menjumlahkan seluruh plafon anggota', () => {
    // AC-14: 4 anggota x 60jt = 240jt.
    expect(hitungTotalPlafon([60_000_000, 60_000_000, 60_000_000, 60_000_000])).toBe(240_000_000)
  })

  it('setelah satu anggota dikeluarkan, total ikut turun (180jt)', () => {
    // AC-14: satu ditolak -> 3 x 60jt = 180jt.
    expect(hitungTotalPlafon([60_000_000, 60_000_000, 60_000_000])).toBe(180_000_000)
  })

  it('daftar kosong = 0, NaN diabaikan', () => {
    expect(hitungTotalPlafon([])).toBe(0)
    expect(hitungTotalPlafon([NaN, 100])).toBe(100)
  })
})

describe('S-03 BuatPengajuan — anggotaLengkap (validasi bentuk sebelum kirim)', () => {
  const lengkap: AnggotaBaru = {
    nama: 'Slamet Riyadi',
    nik: '3404010101010001',
    alamat: 'Jl. Melati 1',
    jenisUsaha: 'Warung kelontong',
    plafonDiajukan: 50_000_000,
  }

  it('anggota lengkap valid', () => {
    expect(anggotaLengkap(lengkap)).toBe(true)
  })

  it('alamat kosong -> tidak lengkap (skema zod route wajib .min(1))', () => {
    expect(anggotaLengkap({ ...lengkap, alamat: '' })).toBe(false)
  })

  it('jenis usaha kosong -> tidak lengkap', () => {
    expect(anggotaLengkap({ ...lengkap, jenisUsaha: '   ' })).toBe(false)
  })

  it('NIK bukan 16 digit -> tidak lengkap', () => {
    expect(anggotaLengkap({ ...lengkap, nik: '12345' })).toBe(false)
    expect(anggotaLengkap({ ...lengkap, nik: '3404abcd0101010001' })).toBe(false)
  })

  it('plafon 0 -> tidak lengkap', () => {
    expect(anggotaLengkap({ ...lengkap, plafonDiajukan: 0 })).toBe(false)
  })
})

describe('S-03 BuatPengajuan — bolehKirimPengajuan (FR-10 / AC-14 komposisi)', () => {
  const lengkap: AnggotaBaru = {
    nama: 'Slamet Riyadi',
    nik: '3404010101010001',
    alamat: 'Jl. Melati 1',
    jenisUsaha: 'Warung kelontong',
    plafonDiajukan: 50_000_000,
  }
  const anggotaKe = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      ...lengkap,
      nik: String(3404010101010001 + i).padStart(16, '0'),
    }))

  it('PERORANGAN dengan satu anggota lengkap boleh dikirim', () => {
    expect(bolehKirimPengajuan('PERORANGAN', [lengkap])).toBe(true)
  })

  it('PERORANGAN dengan anggota belum lengkap TIDAK boleh dikirim', () => {
    expect(bolehKirimPengajuan('PERORANGAN', [{ ...lengkap, alamat: '' }])).toBe(false)
  })

  it('KELOMPOK dengan 2 anggota TIDAK boleh dikirim (minimal 3, FR-10)', () => {
    expect(bolehKirimPengajuan('KELOMPOK', anggotaKe(2))).toBe(false)
  })

  it('KELOMPOK dengan 3 anggota lengkap boleh dikirim (batas bawah)', () => {
    expect(bolehKirimPengajuan('KELOMPOK', anggotaKe(3))).toBe(true)
  })

  it('KELOMPOK dengan 4 anggota lengkap boleh dikirim (AC-14: 240jt)', () => {
    expect(bolehKirimPengajuan('KELOMPOK', anggotaKe(4))).toBe(true)
  })

  it('KELOMPOK dengan 11 anggota TIDAK boleh dikirim (maksimal 10)', () => {
    expect(bolehKirimPengajuan('KELOMPOK', anggotaKe(11))).toBe(false)
  })

  it('KELOMPOK 3 anggota tetapi satu tak lengkap TIDAK boleh dikirim', () => {
    const daftar = anggotaKe(3)
    daftar[1] = { ...daftar[1], jenisUsaha: '' }
    expect(bolehKirimPengajuan('KELOMPOK', daftar)).toBe(false)
  })
})

/* ---------------------------------------------------------- util bersama */
describe('util — hanyaDigit & formatRibuan', () => {
  it('hanyaDigit mengambil angka dari input campuran', () => {
    expect(hanyaDigit('Rp 50.000.000')).toBe(50_000_000)
    expect(hanyaDigit('abc')).toBe(0)
  })

  it('formatRibuan memberi pemisah ribuan gaya id-ID', () => {
    expect(formatRibuan('50000000')).toBe('50.000.000')
    expect(formatRibuan('')).toBe('')
  })
})
