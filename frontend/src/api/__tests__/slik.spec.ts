/**
 * Test lapisan api/slik.ts (FR-05, layar S-08).
 *
 * Fokus utama BR-11: NIK tidak boleh masuk URL. Ini pengujian yang paling
 * penting di berkas ini — pelanggaran BR-11 tidak akan tertangkap typecheck
 * maupun build, hanya oleh pemeriksaan eksplisit terhadap URL yang dikirim.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pasangFetch, pasangLocalStorage } from './bantuan-uji'
import { ambilRiwayatSlik, jalankanSlikCheck } from '../slik'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api/slik', () => {
  it('BR-11: NIK dikirim di BODY, tidak pernah di URL', async () => {
    pasangLocalStorage()
    const nik = '3404112233440001'
    const panggilan = pasangFetch({ status: 201, json: { status: 'OK' } })

    await jalankanSlikCheck('peng-1', nik)

    expect(panggilan).toHaveLength(1)
    // URL tidak boleh memuat NIK sama sekali.
    expect(panggilan[0].url).not.toContain(nik)
    expect(panggilan[0].url).toContain('/api/pengajuan/peng-1/slik-check')
    // NIK ADA di body.
    expect(panggilan[0].body).toEqual({ nik })
    expect(panggilan[0].method).toBe('POST')
  })

  it('memetakan hasil OK apa adanya dari server', async () => {
    pasangLocalStorage()
    const dataServer = {
      status: 'OK',
      data: {
        nama: 'Siti Aminah',
        kolektibilitas: 1,
        jumlahFasilitasAktif: 1,
        totalBakiDebet: 8000000,
        tanggalData: '2026-08-20',
        referenceId: 'SLIK-8842',
      },
    }
    pasangFetch({ status: 201, json: dataServer })

    const hasil = await jalankanSlikCheck('peng-1', '3404112233440001')
    expect(hasil.status).toBe('OK')
    expect(hasil.data?.kolektibilitas).toBe(1)
  })

  it('riwayat: kolektibilitas null saat panggilan gagal diteruskan sebagai null', async () => {
    pasangLocalStorage()
    // Server menyimpan baris gagal dengan kolektibilitas NULL — sistem tidak
    // pernah menebak nilai. Lapisan api harus meneruskan null itu apa adanya.
    pasangFetch({
      status: 200,
      json: [
        {
          id: 'r1',
          pengajuanAnggotaId: 'a1',
          statusPanggilan: 'UNAVAILABLE',
          kolektibilitas: null,
          jumlahFasilitasAktif: null,
          totalBakiDebet: null,
          tanggalData: null,
          referenceId: null,
          diperiksaPada: '2026-08-20T10:00:00Z',
        },
      ],
    })

    const riwayat = await ambilRiwayatSlik('peng-1')
    expect(riwayat[0].kolektibilitas).toBeNull()
    expect(riwayat[0].statusPanggilan).toBe('UNAVAILABLE')
  })

  it('GET riwayat memakai method GET tanpa body', async () => {
    pasangLocalStorage()
    const panggilan = pasangFetch({ status: 200, json: [] })
    await ambilRiwayatSlik('peng-9')
    expect(panggilan[0].method).toBe('GET')
    expect(panggilan[0].body).toBeUndefined()
    expect(panggilan[0].url).toContain('/api/pengajuan/peng-9/slik')
  })
})
