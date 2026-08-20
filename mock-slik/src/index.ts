import Fastify from 'fastify';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURES_PATH = process.env.FIXTURES_PATH || join(__dirname, '../../fixtures/nasabah-uji.csv');
const PORT = Number(process.env.PORT) || 9090;

interface NasabahRow {
  nik: string;
  nama: string;
  jenis_usaha: string;
  kolektibilitas: string;
  jumlah_fasilitas_aktif: string;
  total_baki_debet: string;
  omzet_harian: string;
  lama_usaha_bulan: string;
  skenario: string;
}

const fastify = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' } });

let nasabahData: Map<string, NasabahRow> = new Map();
let controlMode: 'ok' | '503' | 'timeout' = 'ok';
let controlUsed = false;

function parseCsv(content: string): NasabahRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows: NasabahRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row as NasabahRow);
  }
  return rows;
}

function loadFixtures() {
  if (!existsSync(FIXTURES_PATH)) {
    fastify.log.warn(`Fixtures not found at ${FIXTURES_PATH}`);
    return;
  }
  const content = readFileSync(FIXTURES_PATH, 'utf-8');
  const rows = parseCsv(content);
  for (const row of rows) {
    if (row.nik && row.nik !== 'nik') {
      nasabahData.set(row.nik, row);
    }
  }
  fastify.log.info(`Loaded ${nasabahData.size} rows from ${FIXTURES_PATH}`);
}

fastify.get('/health', async () => {
  return { status: 'ok', loaded: nasabahData.size };
});

fastify.post('/slik/inquiry', async (request, reply) => {
  const body = request.body as { nik?: string };

  if (controlMode === 'timeout' && !controlUsed) {
    controlUsed = true;
    fastify.log.warn('Mock SLIK timeout (controlled)');
    return reply.status(504).send({ error: 'GATEWAY_TIMEOUT' });
  }

  if (controlMode === '503' && !controlUsed) {
    controlUsed = true;
    fastify.log.warn('Mock SLIK 503 (controlled)');
    return reply.status(503).send({ error: 'SERVICE_UNAVAILABLE' });
  }

  controlUsed = false;

  const nik = body?.nik;
  if (!nik) {
    return reply.status(400).send({ error: 'NIK_REQUIRED' });
  }

  const row = nasabahData.get(nik);
  if (!row) {
    fastify.log.info(`NIK not found: ${nik}`);
    return reply.status(404).send({ error: 'NIK_NOT_FOUND' });
  }

  fastify.log.info(`SLIK inquiry OK for NIK ${nik}`);
  return {
    nik: row.nik,
    nama: row.nama,
    kolektibilitas: row.kolektibilitas === '-' ? null : Number(row.kolektibilitas),
    jumlahFasilitasAktif: row.jumlah_fasilitas_aktif === '-' ? null : Number(row.jumlah_fasilitas_aktif),
    totalBakiDebet: row.total_baki_debet === '-' ? null : Number(row.total_baki_debet),
    tanggalData: new Date().toISOString().split('T')[0],
    referenceId: `SLIK-${Date.now()}`,
  };
});

fastify.post('/slik/_control/mode', async (request, reply) => {
  const body = request.body as { mode?: string };
  const mode = body?.mode;
  if (!['ok', '503', 'timeout'].includes(mode || '')) {
    return reply.status(400).send({ error: 'INVALID_MODE' });
  }
  controlMode = mode as any;
  controlUsed = false;
  fastify.log.info(`Mock SLIK mode set to ${controlMode}`);
  return { mode: controlMode };
});

const start = async () => {
  loadFixtures();
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`Mock SLIK listening on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
