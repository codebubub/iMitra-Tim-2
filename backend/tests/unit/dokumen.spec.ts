import { describe, it, expect } from 'vitest'
import {
  semuaDokumenTerverifikasi,
  validasiBerkas,
  validasiKeputusanVerifikasi,
  versiBerikutnya,
} from '../../src/domain/dokumen.js'
import { PelanggaranAturan, ValidasiGagal } from '../../src/lib/errors.js'

/**
 * Test dokumen (FR-03, AC-03). Nilai harapan diturunkan dari brief §3 FR-03,
 * bukan dari kode. MIME dan batas ukuran adalah ARGUMEN — kalau fungsinya
 * diam-diam memakai konstanta sendiri, test ini gagal.
 */
const MIME = ['image/jpeg', 'image/png', 'application/pdf']
const MAKS = 5 * 1024 * 1024

describe('versi dokumen (AC-03 — versi lama disimpan)', () => {
  it('dokumen pertama mulai dari versi 1', () => {
    expect(versiBerikutnya([])).toBe(1)
  })
  it('unggah ulang menaikkan versi tertinggi + 1, bukan menimpa', () => {
    expect(versiBerikutnya([1])).toBe(2)
    expect(versiBerikutnya([1, 2, 3])).toBe(4)
  })
})

describe('validasi berkas', () => {
  it('menolak MIME di luar daftar', () => {
    expect(() => validasiBerkas('text/html', 100, MIME, MAKS)).toThrowError(ValidasiGagal)
  })
  it('menolak berkas kosong', () => {
    expect(() => validasiBerkas('image/png', 0, MIME, MAKS)).toThrowError(ValidasiGagal)
  })
  it('menolak berkas melebihi batas ukuran', () => {
    expect(() => validasiBerkas('image/png', MAKS + 1, MIME, MAKS)).toThrowError(ValidasiGagal)
  })
  it('menerima berkas sah tepat di batas', () => {
    expect(() => validasiBerkas('application/pdf', MAKS, MIME, MAKS)).not.toThrow()
  })
})

describe('keputusan verifikasi', () => {
  it('REJECTED tanpa kode alasan ditolak sebagai pelanggaran aturan', () => {
    expect(() => validasiKeputusanVerifikasi('REJECTED', null)).toThrowError(PelanggaranAturan)
  })
  it('REJECTED dengan kode di luar daftar tertutup ditolak', () => {
    expect(() => validasiKeputusanVerifikasi('REJECTED', 'ENTAH')).toThrowError(ValidasiGagal)
  })
  it('REJECTED dengan kode sah diterima', () => {
    expect(() => validasiKeputusanVerifikasi('REJECTED', 'BURAM')).not.toThrow()
  })
  it('VERIFIED tidak boleh membawa kode alasan', () => {
    expect(() => validasiKeputusanVerifikasi('VERIFIED', 'BURAM')).toThrowError(ValidasiGagal)
  })
  it('VERIFIED tanpa kode alasan diterima', () => {
    expect(() => validasiKeputusanVerifikasi('VERIFIED', null)).not.toThrow()
  })
})

describe('BR-03 (bagian dokumen) — semua dokumen wajib VERIFIED', () => {
  const lengkap = [
    { jenis: 'KTP' as const, status: 'VERIFIED' as const },
    { jenis: 'KK' as const, status: 'VERIFIED' as const },
    { jenis: 'SKU' as const, status: 'VERIFIED' as const },
  ]

  it('perorangan: tiga dokumen VERIFIED memenuhi', () => {
    expect(semuaDokumenTerverifikasi(lengkap, 1)).toBe(true)
  })
  it('satu dokumen belum VERIFIED menggagalkan', () => {
    const kurang = [...lengkap.slice(0, 2), { jenis: 'SKU' as const, status: 'MENUNGGU' as const }]
    expect(semuaDokumenTerverifikasi(kurang, 1)).toBe(false)
  })
  it('majelis 2 anggota butuh 6 dokumen VERIFIED', () => {
    expect(semuaDokumenTerverifikasi([...lengkap, ...lengkap], 2)).toBe(true)
    expect(semuaDokumenTerverifikasi(lengkap, 2)).toBe(false)
  })
  it('tanpa anggota aktif tidak pernah memenuhi', () => {
    expect(semuaDokumenTerverifikasi(lengkap, 0)).toBe(false)
  })
})
