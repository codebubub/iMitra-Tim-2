import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { bacaPrasyaratSkoring, hitungDanSimpanSkoring } from '../services/skoring.service.js'
import { overrideGradeSkoring } from '../services/override-skoring.service.js'

const skemaSkoring = z
  .object({
    /** Wajib bila ada anggota berkolektibilitas 2 (FR-05, Tabel 4.2). */
    catatanAnalis: z.string().optional(),
  })
  .optional()

const skemaOverride = z.object({
  gradeFinal: z.number().int().min(1).max(5),
  alasan: z.string().min(10),
})

export async function skoringRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/pengajuan/:id/skoring', { config: { peran: ['ANL'] } }, async (req) => {
    const { id } = req.params as { id: string }
    const body = skemaSkoring.parse(req.body ?? undefined)
    return hitungDanSimpanSkoring({
      pengajuanId: id,
      aktor: req.pengguna!,
      catatanAnalis: body?.catatanAnalis,
    })
  })

  /**
   * Prasyarat BR-03/BR-04 apa adanya, untuk varian "terblokir" layar S-09.
   *
   * Ada supaya analis tahu APA yang kurang sebelum menekan tombol, bukan hanya
   * setelah menerima 422. Aturannya tetap ditegakkan di POST — endpoint ini
   * murni pembacaan.
   */
  app.get(
    '/api/pengajuan/:id/skoring/prasyarat',
    { config: { peran: ['ANL', 'KCP', 'KC', 'KOM', 'ADM'] } },
    async (req) => {
      const { id } = req.params as { id: string }
      return bacaPrasyaratSkoring(id)
    },
  )

  app.get(
    '/api/pengajuan/:id/skoring',
    // Approver membaca dasar keputusan yang sama dengan analis (SDD BAB 5).
    { config: { peran: ['ANL', 'KCP', 'KC', 'KOM', 'ADM'] } },
    async (req) => {
      const { id } = req.params as { id: string }
      const hasil = await prisma.hasilSkoring.findFirst({
        where: { pengajuanId: id },
        orderBy: { dihitungPada: 'desc' },
        include: { rincian: true },
      })
      if (!hasil) return null

      /**
       * DTO, bukan baris Prisma mentah.
       *
       * KENAPA INI PENTING, dan bukan sekadar kerapian: kolom NUMERIC dipetakan
       * Prisma menjadi `Decimal`, dan `JSON.stringify` mengubahnya menjadi
       * STRING. Frontend yang menjumlahkannya dengan `+` akan menggabungkan
       * teks, bukan menambah angka — "35" + "25" menjadi "3525".
       *
       * Itu bukan dugaan: baris Total di layar Skoring sempat menampilkan
       * bobot 035252020 dan kontribusi 03500100020002000, lalu membaginya
       * menjadi 99.287.927.898. Skor akhirnya tetap benar karena diambil dari
       * kolom terpisah, sehingga kesalahan ini LOLOS dari seluruh test dan
       * hanya terlihat oleh mata manusia yang membaca layar.
       *
       * AC-07 justru meminta rincian ini ditampilkan supaya analis bisa
       * mempertanggungjawabkan angkanya ke auditor. Baris total yang tidak
       * masuk akal menghancurkan tepat hal itu.
       */
      return {
        id: hasil.id,
        pengajuanId: hasil.pengajuanId,
        skorAkhir: hasil.skorAkhir,
        gradeSistem: hasil.gradeSistem,
        gradeFinal: hasil.gradeFinal,
        diOverride: hasil.diOverride,
        alasanOverride: hasil.alasanOverride,
        snapshotParameter: hasil.snapshotParameter,
        dihitungOleh: hasil.dihitungOleh,
        dihitungPada: hasil.dihitungPada,
        rincian: hasil.rincian.map((r) => ({
          id: r.id,
          kodeKomponen: r.kodeKomponen,
          bobot: Number(r.bobot),
          nilaiMentah: Number(r.nilaiMentah),
          skorKomponen: Number(r.skorKomponen),
          kontribusi: Number(r.kontribusi),
        })),
      }
    },
  )

  app.post('/api/pengajuan/:id/skoring/override', { config: { peran: ['ANL'] } }, async (req) => {
    const { id } = req.params as { id: string }
    const { gradeFinal, alasan } = skemaOverride.parse(req.body)
    return overrideGradeSkoring(req.pengguna!, id, gradeFinal, alasan)
  })
}
