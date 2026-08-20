import { prisma } from '../lib/prisma.js'
import { PelanggaranAturan } from '../lib/errors.js'
import { validasiMargin, type Akad } from '../domain/margin.js'
import { bacaRentangMargin } from './parameter.service.js'
import type { PenggunaToken } from '../middleware/rbac.js'

export type MasukanMargin = {
  pengajuanId: string
  akad: Akad
  marginPersen?: number
  nisbahBankPersen?: number
}

export async function tetapkanMargin(aktor: PenggunaToken, masukan: MasukanMargin): Promise<void> {
  const pengajuan = await prisma.pengajuan.findUnique({
    where: { id: masukan.pengajuanId },
    include: { skoring: { orderBy: { dihitungPada: 'desc' }, take: 1 } },
  })
  if (!pengajuan) throw new PelanggaranAturan('FR-07', 'Pengajuan tidak ditemukan')

  const skoringTerbaru = pengajuan.skoring[0]
  if (!skoringTerbaru) {
    throw new PelanggaranAturan('FR-07', 'Skoring belum dijalankan')
  }

  const rentang = await bacaRentangMargin()
  const grade = skoringTerbaru.gradeFinal

  if (masukan.akad === 'MURABAHAH') {
    if (masukan.marginPersen === undefined) {
      throw new PelanggaranAturan('FR-07', 'Margin harus diisi untuk akad Murabahah')
    }
    const nilai = validasiMargin(masukan.marginPersen, grade, masukan.akad, rentang)
    await prisma.pengajuan.update({
      where: { id: masukan.pengajuanId },
      data: { marginPersen: nilai, nisbahBankPersen: null },
    })
  } else {
    if (masukan.nisbahBankPersen === undefined) {
      throw new PelanggaranAturan('FR-07', 'Nisbah bank harus diisi untuk akad Musyarakah')
    }
    const nilai = validasiMargin(masukan.nisbahBankPersen, grade, masukan.akad, rentang)
    await prisma.pengajuan.update({
      where: { id: masukan.pengajuanId },
      data: { marginPersen: null, nisbahBankPersen: nilai },
    })
  }
}
