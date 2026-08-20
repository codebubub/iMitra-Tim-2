import Fastify, { type FastifyInstance } from 'fastify'
import { muatFixtures, NIK_PEMICU_404, NIK_PEMICU_503, type BarisSlik } from './fixtures.js'

const PORT = Number(process.env.PORT ?? 9090)
const FIXTURES_PATH = process.env.FIXTURES_PATH ?? '../fixtures/nasabah-uji.csv'
const APP_ENV = process.env.APP_ENV ?? 'development'

/**
 * Mode paksa untuk keperluan demo. Penilai AKAN meminta jalur error (brief 13 butir 8),
 * dan NIK pemicu saja tidak cukup karena ia hanya bekerja untuk satu nasabah.
 *
 * `timeout` sengaja tidak pernah membalas: klien backend yang harus memutus koneksinya
 * sendiri lewat AbortController. Kalau mock yang membalas lambat lalu tetap membalas,
 * jalur timeout backend tidak benar-benar teruji.
 */
type Mode = 'ok' | '503' | 'timeout'
let mode: Mode = 'ok'

function nomorReferensi(nik: string): string {
  // Deterministik supaya respons yang sama menghasilkan referenceId yang sama —
  // memudahkan test. Tidak ada arti bisnis pada angkanya.
  let h = 0
  for (const ch of nik) h = (h * 31 + ch.charCodeAt(0)) % 100000
  return `SLIK-${String(h).padStart(5, '0')}`
}

function tanggalHariIni(): string {
  return new Date().toISOString().slice(0, 10)
}

export function buatServer(data: Map<string, BarisSlik>): FastifyInstance {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },
    // NIK adalah data pribadi (BR-11). Fastify mencatat body request secara default
    // pada level debug — matikan supaya NIK tidak pernah sampai ke log.
    disableRequestLogging: true,
  })

  app.get('/health', async () => ({
    status: 'ok',
    nasabahDimuat: data.size,
    mode,
  }))

  app.post<{ Body: { nik?: string } }>('/slik/inquiry', async (req, reply) => {
    if (mode === 'timeout') {
      // Tidak pernah membalas. Backend harus memutusnya sendiri.
      await new Promise(() => {})
    }
    if (mode === '503') {
      return reply.code(503).send({ error: 'SERVICE_UNAVAILABLE' })
    }

    const nik = req.body?.nik
    if (typeof nik !== 'string' || !/^\d{16}$/.test(nik)) {
      return reply.code(400).send({ error: 'NIK_TIDAK_VALID' })
    }

    if (nik === NIK_PEMICU_503) {
      return reply.code(503).send({ error: 'SERVICE_UNAVAILABLE' })
    }

    const baris = data.get(nik)
    if (!baris || nik === NIK_PEMICU_404) {
      return reply.code(404).send({ error: 'NIK_NOT_FOUND' })
    }

    return reply.code(200).send({
      nik: baris.nik,
      nama: baris.nama,
      kolektibilitas: baris.kolektibilitas,
      jumlahFasilitasAktif: baris.jumlahFasilitasAktif,
      totalBakiDebet: baris.totalBakiDebet,
      tanggalData: tanggalHariIni(),
      referenceId: nomorReferensi(baris.nik),
    })
  })

  // Endpoint kontrol untuk demo. Tidak pernah aktif di produksi.
  if (APP_ENV !== 'production') {
    app.post<{ Body: { mode?: Mode } }>('/slik/_control/mode', async (req, reply) => {
      const diminta = req.body?.mode
      if (diminta !== 'ok' && diminta !== '503' && diminta !== 'timeout') {
        return reply.code(400).send({ error: 'MODE_TIDAK_VALID', diterima: ['ok', '503', 'timeout'] })
      }
      mode = diminta
      return reply.send({ mode })
    })
  }

  return app
}

// Hanya jalan saat berkas ini dieksekusi langsung, bukan saat diimpor test.
if (process.argv[1]?.includes('server')) {
  const data = muatFixtures(FIXTURES_PATH)
  const app = buatServer(data)
  app.listen({ port: PORT, host: '0.0.0.0' }).catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
}
