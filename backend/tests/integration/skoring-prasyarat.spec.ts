import { describe, it, expect } from 'vitest'
import {
  pastikanPrasyaratTerpenuhi,
  periksaPrasyarat,
} from '../../src/domain/prasyarat-skoring.js'
import { PelanggaranAturan } from '../../src/lib/errors.js'

/**
 * AC-04 — pengajuan tanpa survei VALID ditolak saat mencoba masuk skoring,
 * dengan pesan yang MENYEBUT "BR-03".
 *
 * Prasyarat BR-03 (dokumen VERIFIED + survei VALID + SLIK dijalankan) ditegakkan
 * oleh domain/prasyarat-skoring.ts, yang menjadi gerbang FR-04 sebelum skoring
 * (FR-06, milik Alfian) berjalan. Test ini membuktikan gerbang itu menolak dan
 * bahwa pesannya memuat string yang diperiksa penilai.
 *
 * Angka harapan (string BR-03) dihitung dari brief §5 AC-04, bukan dari kode.
 */
describe('AC-04 — prasyarat skoring menyebut BR-03', () => {
  it('tanpa survei VALID: ditolak 422 dan pesan memuat BR-03', () => {
    const status = {
      semuaDokumenTerverifikasi: true,
      adaSurveiValid: false,
      slikSudahDijalankan: true,
      slikMasihBerlaku: true,
    }

    expect(() => pastikanPrasyaratTerpenuhi(status)).toThrowError(PelanggaranAturan)
    try {
      pastikanPrasyaratTerpenuhi(status)
      throw new Error('seharusnya melempar')
    } catch (e) {
      const err = e as PelanggaranAturan
      expect(err.rule).toBe('BR-03')
      expect(err.status).toBe(422)
      // Penilai mencocokkan string ini di body respons.
      expect(err.message).toContain('BR-03')
      expect(err.message).toContain('survei')
    }
  })

  it('daftar prasyarat kurang menyebut survei valid ketika belum ada', () => {
    const { kurang } = periksaPrasyarat({
      semuaDokumenTerverifikasi: true,
      adaSurveiValid: false,
      slikSudahDijalankan: true,
      slikMasihBerlaku: true,
    })
    expect(kurang.some((k) => k.toLowerCase().includes('survei'))).toBe(true)
  })

  it('semua prasyarat terpenuhi: tidak melempar', () => {
    expect(() =>
      pastikanPrasyaratTerpenuhi({
        semuaDokumenTerverifikasi: true,
        adaSurveiValid: true,
        slikSudahDijalankan: true,
        slikMasihBerlaku: true,
      }),
    ).not.toThrow()
  })
})
