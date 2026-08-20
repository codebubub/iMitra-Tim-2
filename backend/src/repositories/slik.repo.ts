import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SlikRepo {
  async findByPengajuanAnggota(pengajuanAnggotaId: string) {
    return prisma.hasil_slik.findMany({
      where: { pengajuan_anggota_id: pengajuanAnggotaId },
      orderBy: { diperiksa_pada: 'desc' },
    });
  }

  async findLatestByPengajuanAnggota(pengajuanAnggotaId: string) {
    return prisma.hasil_slik.findFirst({
      where: { pengajuan_anggota_id: pengajuanAnggotaId },
      orderBy: { diperiksa_pada: 'desc' },
    });
  }
}
