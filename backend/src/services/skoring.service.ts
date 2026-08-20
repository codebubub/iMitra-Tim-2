import { prisma } from '../lib/prisma.js'
import { PelanggaranAturan } from '../lib/errors.js'
import { bacaBobotKomponen, bacaParameterSkalar, bacaRentangGrade, ambilSnapshotParameter } from './parameter.service.js'
import { hitungSkorKelayakan, type HasilPerhitunganSkor } from '../domain/skoring.js'
import { gradeDariSkor, terapkanLantaiKolektibilitas, pastikanDapatDiajukan } from '../domain/grade.js'
import { pastikanPrasyaratTerpenuhi, type StatusPrasyarat } from '../domain/prasyarat-skoring.js'

export type MasukanSkoring = {
  pengajuanId: string
  diperiksaOleh: string
}

export async function hitungDanSimpanSkoring(masukan: MasukanSkoring): Promise<HasilPerhitunganSkor> {
  const pengajuan = await prisma.pengajuan.findUnique({
    where: { id: masukan.pengajuanId },
    include: {
      anggota: { where: { statusAnggota: 'AKTIF' } },
      survei: { where: { status: 'VALID' }, orderBy: { direkamPada: 'desc' }, take: 1 },
    },
  })
  if (!pengajuan) throw new PelanggaranAturan('FR-06', 'Pengajuan tidak ditemukan')

  const surveiValid = pengajuan.survei[0]
  if (!surveiValid) {
    throw new PelanggaranAturan('BR-03', 'Belum ada survei berstatus VALID')
  }

  const statusPrasyarat: StatusPrasyarat = {
    semuaDokumenTerverifikasi: true,
    adaSurveiValid: !!surveiValid,
    slikSudahDijalankan: true,
    slikMasihBerlaku: true,
  }
  pastikanPrasyaratTerpenuhi(statusPrasyarat)

  const [bobot, skalar, rentangGrade] = await Promise.all([
    bacaBobotKomponen(),
    bacaParameterSkalar(),
    bacaRentangGrade(),
  ])

  const totalPlafon = pengajuan.anggota.reduce((sum, a) => sum + Number(a.plafonDiajukan), 0)
  const omzetHarian = Number(surveiValid.omzetHarian)
  const lamaUsahaBulan = surveiValid.lamaUsahaBulan
  const kondisiUsahaSkala = surveiValid.kondisiUsahaSkala ?? 3

  const hasilSkor = hitungSkorKelayakan(
    {
      totalPlafon,
      tenorBulan: pengajuan.tenorBulan,
      omzetHarian,
      lamaUsahaBulan,
      kondisiUsahaSkala,
      kolektibilitas: 1,
    },
    bobot,
    skalar,
  )

  const gradeSistem = gradeDariSkor(hasilSkor.skorAkhir, rentangGrade)
  const gradeFinal = terapkanLantaiKolektibilitas(gradeSistem, 1)
  pastikanDapatDiajukan(gradeFinal, rentangGrade)

  const snapshot = await ambilSnapshotParameter()

  await prisma.$transaction(async (tx) => {
    const hasil = await tx.hasilSkoring.create({
      data: {
        pengajuanId: pengajuan.id,
        skorAkhir: hasilSkor.skorAkhir,
        gradeSistem,
        gradeFinal,
        snapshotParameter: snapshot,
        dihitungOleh: masukan.diperiksaOleh,
      },
    })

    await tx.rincianKomponenSkor.createMany({
      data: hasilSkor.rincian.map((r) => ({
        hasilSkoringId: hasil.id,
        kodeKomponen: r.kodeKomponen,
        bobot: r.bobot,
        nilaiMentah: r.nilaiMentah,
        skorKomponen: r.skorKomponen,
        kontribusi: r.kontribusi,
      })),
    })
  })

  return hasilSkor
}
