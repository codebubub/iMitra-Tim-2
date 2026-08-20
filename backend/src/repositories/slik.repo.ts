import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SlikRepo {
  async findByPengajuanAnggota(pengajuanAnggotaId: string) {
    return prisma.hasilSlik.findMany({
      where: { pengajuanAnggotaId: pengajuanAnggotaId },
      orderBy: { diperiksaPada: 'desc' },
    });
  }

  async findLatestByPengajuanAnggota(pengajuanAnggotaId: string) {
    return prisma.hasilSlik.findFirst({
      where: { pengajuanAnggotaId: pengajuanAnggotaId },
      orderBy: { diperiksaPada: 'desc' },
    });
  }
}
