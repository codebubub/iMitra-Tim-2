import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { slikService } from '../services/slik.service.js'

const skemaInquiry = z.object({ nik: z.string().length(16) })

export async function slikRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/api/pengajuan/:id/slik-check',
    { config: { peran: ['ANL'] } },
    async (req, reply) => {
      const { id } = req.params as { id: string }
      const { nik } = skemaInquiry.parse(req.body)
      const hasil = await slikService.cekSlik(id, nik, (req as { pengguna?: { id: string } }).pengguna!.id)
      return reply.code(201).send(hasil)
    },
  )

  app.get(
    '/api/pengajuan/:id/slik',
    { config: { peran: ['ANL'] } },
    async (req) => {
      const { id } = req.params as { id: string }
      const anggota = await prisma.pengajuanAnggota.findMany({
        where: { pengajuanId: id },
        select: { id: true },
      })
      const ids = anggota.map((a) => a.id)
      const riwayat = await prisma.hasilSlik.findMany({
        where: { pengajuanAnggotaId: { in: ids } },
        orderBy: { diperiksaPada: 'desc' },
      })
      /**
       * DTO, bukan baris Prisma mentah.
       *
       * `total_baki_debet` bertipe BIGINT, dan Prisma memetakannya ke `BigInt`
       * JavaScript. `JSON.stringify` MELEMPAR pada BigInt — bukan mengubahnya
       * menjadi string, melainkan menggagalkan seluruh respons. Akibatnya
       * endpoint ini menjawab 500 setiap kali ada satu saja hasil SLIK
       * tersimpan, dan layar S-08 tidak pernah menampilkan apa pun.
       *
       * Kegagalan ini lolos dari seluruh test karena test integrasi memeriksa
       * PEMANGGILAN SLIK (POST), yang mengembalikan objek biasa dari klien —
       * bukan baris database. Hanya membuka layarnya yang menunjukkannya.
       *
       * Number aman untuk nilai rupiah: batas aman JavaScript sembilan kuadriliun,
       * jauh di atas baki debet nasabah mikro. Yang tidak aman adalah mengirim
       * BigInt apa adanya.
       *
       * `diperiksaOleh` sengaja tidak ikut: layar tidak memakainya, dan itu
       * identitas pegawai yang tidak perlu meninggalkan server.
       */
      return riwayat.map((r) => ({
        id: r.id,
        pengajuanAnggotaId: r.pengajuanAnggotaId,
        statusPanggilan: r.statusPanggilan,
        kolektibilitas: r.kolektibilitas,
        jumlahFasilitasAktif: r.jumlahFasilitasAktif,
        totalBakiDebet: r.totalBakiDebet === null ? null : Number(r.totalBakiDebet),
        tanggalData: r.tanggalData,
        referenceId: r.referenceId,
        diperiksaPada: r.diperiksaPada,
      }))
    },
  )
}
