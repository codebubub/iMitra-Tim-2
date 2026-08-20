/**
 * Test lapisan api/approval.ts (FR-08, layar S-11).
 *
 * Fokus: bentuk keputusan, alasan opsional vs wajib (yang ditegakkan server),
 * dan bahwa lapisan api tidak menghitung level sendiri.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pasangFetch, pasangLocalStorage } from './bantuan-uji'
import { ajukanKeApproval, ambilAntrianApproval, putuskanApproval } from '../approval'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api/approval', () => {
  it('GET antrian mengembalikan baris dengan level dari server', async () => {
    pasangLocalStorage()
    pasangFetch({
      json: [
        { id: 'p1', nomorReferensi: 'IMT-20260820-0001', status: 'MENUNGGU_APPROVAL_L2', level: 2, totalPlafon: 180000000 },
      ],
    })

    const antrian = await ambilAntrianApproval()
    // Level datang dari server (ADR-0002), tidak dihitung ulang di frontend.
    expect(antrian[0].level).toBe(2)
    expect(antrian[0].totalPlafon).toBe(180000000)
  })

  it('APPROVE boleh tanpa alasan (alasan tidak dikirim bila kosong)', async () => {
    pasangLocalStorage()
    const panggilan = pasangFetch({ json: { id: 'p1', level: 1, keputusan: 'APPROVE', status: 'MENUNGGU_APPROVAL_L2' } })

    await putuskanApproval('p1', { keputusan: 'APPROVE' })
    expect(panggilan[0].body).toEqual({ keputusan: 'APPROVE' })
  })

  it('REJECT mengirim alasan', async () => {
    pasangLocalStorage()
    const panggilan = pasangFetch({ json: { id: 'p1', level: 1, keputusan: 'REJECT', status: 'REJECTED' } })

    await putuskanApproval('p1', { keputusan: 'REJECT', alasan: 'dokumen tidak lengkap' })
    expect(panggilan[0].body).toEqual({ keputusan: 'REJECT', alasan: 'dokumen tidak lengkap' })
    expect(panggilan[0].url).toContain('/api/pengajuan/p1/approval')
  })

  it('ajukanKeApproval memakai endpoint ajukan-approval', async () => {
    pasangLocalStorage()
    const panggilan = pasangFetch({ json: { id: 'p1', status: 'MENUNGGU_APPROVAL_L1' } })

    await ajukanKeApproval('p1')
    expect(panggilan[0].method).toBe('POST')
    expect(panggilan[0].url).toContain('/api/pengajuan/p1/ajukan-approval')
  })
})
