import { PrismaClient } from '@prisma/client';
import { SlikResult, SlikClient } from '#clients/slik.client.js';
import { loadEnv } from '#config/env.js';

const prisma = new PrismaClient();

export class SlikService {
  private client: SlikClient;

  constructor() {
    const env = loadEnv();
    this.client = new SlikClient(env.SLIK_BASE_URL, env.SLIK_INQUIRY_PATH, env.SLIK_TIMEOUT_MS);
  }

  async cekSlik(pengajuanAnggotaId: string, nik: string) {
    const result = await this.client.inquiry(nik);

    await prisma.hasil_slik.create({
      data: {
        pengajuan_anggota_id: pengajuanAnggotaId,
        status_panggilan: result.status,
        kolektibilitas: result.data ? result.data.kolektibilitas : null,
        jumlah_fasilitas_aktif: result.data ? result.data.jumlahFasilitasAktif : null,
        total_baki_debet: result.data ? result.data.totalBakiDebet : null,
        tanggal_data: result.data ? result.data.tanggalData : null,
        reference_id: result.data ? result.data.referenceId : null,
        diperiksa_pada: new Date(),
      },
    });

    return result;
  }
}
