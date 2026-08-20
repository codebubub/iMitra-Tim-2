import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from '../../src/lib/prisma.js'

/**
 * AC-13 — audit trail append-only, DIBUKTIKAN DI DATABASE.
 *
 * Berkas rbac.spec.ts sudah membuktikan lapis ke-1: tidak ada route
 * PUT/PATCH/DELETE untuk sumber daya audit. Itu bukti yang bagus, tetapi ia
 * hanya membuktikan bahwa API kami tidak menyediakan jalannya — bukan bahwa
 * jalannya tidak ada.
 *
 * Berkas ini membuktikan lapis ke-3: PostgreSQL sendiri yang menolak, sehingga
 * kode apa pun yang mencoba — kode kami besok, psql, Prisma Studio — tetap gagal.
 *
 * KENAPA TEST INI ADA. Sebelum migrasi 20260820134500, lapis ke-3 hanya berupa
 *     REVOKE UPDATE, DELETE ON audit_trail FROM imitra_app;
 * dan itu TIDAK BERPENGARUH, karena imitra_app adalah pemilik tabel dan pemilik
 * punya hak implisit yang tidak bisa dicabut REVOKE. Lubang itu tidak terlihat
 * dari kode mana pun; hanya database yang bisa menjawabnya. Karena itu test ini
 * menembak database secara langsung, bukan lewat app.inject().
 */
describe('AC-13 — database menolak UPDATE dan DELETE atas audit_trail', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('INSERT tetap diizinkan — audit ditulis, hanya tidak boleh diubah', async () => {
    const sebelum = await prisma.auditTrail.count()

    await prisma.auditTrail.create({
      data: { aktorPeran: 'ADM', aksi: 'UJI_APPEND_ONLY', metadata: {} },
    })

    expect(await prisma.auditTrail.count()).toBe(sebelum + 1)
  })

  it('UPDATE ditolak database, bukan sekadar tidak disediakan API', async () => {
    await expect(
      prisma.$executeRawUnsafe(`UPDATE audit_trail SET aksi = 'DIUBAH'`),
    ).rejects.toThrow(/append-only/i)
  })

  it('DELETE ditolak database', async () => {
    await expect(prisma.$executeRawUnsafe('DELETE FROM audit_trail')).rejects.toThrow(
      /append-only/i,
    )
  })

  it('baris yang sudah ditulis masih utuh setelah kedua percobaan di atas', async () => {
    const baris = await prisma.auditTrail.findFirst({
      where: { aksi: 'UJI_APPEND_ONLY' },
    })
    expect(baris, 'baris uji hilang — berarti DELETE tadi sebenarnya lolos').not.toBeNull()
    expect(baris?.aksi).toBe('UJI_APPEND_ONLY')
  })
})
