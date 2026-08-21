import type { StatusPengajuan } from '@prisma/client'
import { prisma, rupiahKeNumber, type PrismaTx } from '../lib/prisma.js'
import { PelanggaranAturan, TidakDitemukan } from '../lib/errors.js'
import {
  hitungTotalPlafon,
  levelBerjalan,
  pastikanAlasanLengkap,
  pastikanBolehMemutuskan,
  pastikanBukanMaker,
  urutanApprovalUntuk,
  type Peran,
} from '../domain/approval.js'
import { pastikanDapatDiajukan } from '../domain/grade.js'
import * as repo from '../repositories/pengajuan.repo.js'
import { pastikanMarginSudahDitetapkan } from './margin.service.js'
import { bacaAmbangApproval, bacaRentangGrade } from './parameter.service.js'
import { ubahStatus } from './status.service.js'
import { tulisAudit, AKSI } from './audit.service.js'
import type { PenggunaToken } from '../middleware/rbac.js'

/**
 * Approval berjenjang (FR-08, BR-02, BR-05, BR-09, AC-10, AC-11).
 *
 * Level TIDAK PERNAH disimpan: ia dihitung ulang dari total plafon anggota AKTIF
 * pada setiap keputusan (ADR-0002). Karena itu menolak satu anggota (AC-14)
 * langsung mengubah jalur approval tanpa kode "hitung ulang" terpisah.
 *
 * Seluruh keputusan bisnis ada di domain/approval.ts dan domain/grade.ts.
 * Service ini hanya membaca data, memanggil fungsi murni, lalu menyimpan hasil
 * dan audit dalam satu transaksi.
 */

const STATUS_LEVEL: Record<number, StatusPengajuan> = {
  1: 'MENUNGGU_APPROVAL_L1',
  2: 'MENUNGGU_APPROVAL_L2',
  3: 'MENUNGGU_APPROVAL_L3',
}

/** Peta status menunggu → nomor level yang sedang menunggu. */
const LEVEL_DARI_STATUS: Partial<Record<StatusPengajuan, number>> = {
  MENUNGGU_APPROVAL_L1: 1,
  MENUNGGU_APPROVAL_L2: 2,
  MENUNGGU_APPROVAL_L3: 3,
}

async function totalPlafonPengajuan(pengajuanId: string, db: PrismaTx = prisma): Promise<number> {
  const p = await repo.cariPengajuan(pengajuanId, db)
  if (!p) throw new TidakDitemukan('Pengajuan tidak ditemukan')
  return hitungTotalPlafon(
    p.anggota.map((a) => ({
      plafonDiajukan: rupiahKeNumber(a.plafonDiajukan),
      statusAnggota: a.statusAnggota,
    })),
  )
}

/**
 * ANL mengajukan pengajuan bergrade layak ke approval (SKORED → L1).
 * BR-05 diperiksa lebih dulu: grade 5 berhenti di REJECTED_SCORING.
 */
export async function ajukanApproval(aktor: PenggunaToken, pengajuanId: string) {
  const pengajuan = await repo.cariPengajuan(pengajuanId)
  if (!pengajuan) throw new TidakDitemukan('Pengajuan tidak ditemukan')
  if (pengajuan.status !== 'SKORED') {
    throw new PelanggaranAturan(
      'FR-08',
      `Hanya pengajuan berstatus SKORED yang dapat diajukan ke approval, bukan ${pengajuan.status}`,
    )
  }

  const skoring = await prisma.hasilSkoring.findFirst({
    where: { pengajuanId },
    orderBy: { dihitungPada: 'desc' },
  })
  if (!skoring) throw new PelanggaranAturan('FR-08', 'Pengajuan belum memiliki hasil skoring')

  const rentang = await bacaRentangGrade()
  // BR-05: melempar bila grade final tidak dapat dibiayai.
  try {
    pastikanDapatDiajukan(skoring.gradeFinal, rentang)
  } catch (e) {
    if (e instanceof PelanggaranAturan && e.rule === 'BR-05') {
      await prisma.$transaction(async (tx) => {
        await ubahStatus(tx, {
          pengajuanId,
          dari: 'SKORED',
          ke: 'REJECTED_SCORING',
          aktor,
          sebab: `Grade ${skoring.gradeFinal} tidak dapat dibiayai (BR-05)`,
          metadata: { gradeFinal: skoring.gradeFinal },
        })
      })
    }
    throw e
  }

  /**
   * SRS 3.2: `SKORED → MENUNGGU_APPROVAL_L1: margin dalam rentang LALU diajukan`.
   * Tanpa pemeriksaan ini, pengajuan bisa melewati seluruh jenjang approval
   * tanpa satu pun angka margin, dan kekosongan itu baru ketahuan saat akad.
   */
  pastikanMarginSudahDitetapkan(pengajuan)

  await prisma.$transaction(async (tx) => {
    await ubahStatus(tx, {
      pengajuanId,
      dari: 'SKORED',
      ke: 'MENUNGGU_APPROVAL_L1',
      aktor,
      sebab: 'Diajukan ke approval oleh ANL',
      metadata: { gradeFinal: skoring.gradeFinal },
    })
  })

  return { id: pengajuanId, status: 'MENUNGGU_APPROVAL_L1' }
}

export async function putuskanApproval(
  aktor: PenggunaToken,
  pengajuanId: string,
  keputusan: 'APPROVE' | 'REJECT' | 'RETURN',
  alasan?: string | null,
) {
  const pengajuan = await repo.cariPengajuan(pengajuanId)
  if (!pengajuan) throw new TidakDitemukan('Pengajuan tidak ditemukan')

  const levelMenunggu = LEVEL_DARI_STATUS[pengajuan.status]
  if (!levelMenunggu) {
    throw new PelanggaranAturan(
      'FR-08',
      `Pengajuan berstatus ${pengajuan.status} tidak sedang menunggu keputusan approval`,
    )
  }

  // BR-09: pembuat tidak boleh menyetujui, apa pun perannya. Diperiksa lebih dulu.
  pastikanBukanMaker(pengajuan.dibuatOleh, aktor.id)
  pastikanAlasanLengkap(keputusan, alasan)

  const totalPlafon = await totalPlafonPengajuan(pengajuanId)
  const ambang = await bacaAmbangApproval()
  const urutan = urutanApprovalUntuk(totalPlafon, ambang)

  const keputusanTercatat = (await repo.daftarKeputusan(pengajuanId)).map((k) => ({
    level: k.level,
    keputusan: k.keputusan as 'APPROVE' | 'REJECT' | 'RETURN',
  }))

  // BR-02: hanya peran pada level berjalan yang boleh memutuskan. Melempar
  // 422 (giliran belum tiba) atau 403 (di luar jalur).
  const level = pastikanBolehMemutuskan(aktor.peran as Peran, urutan, keputusanTercatat)

  const statusBerikutnya = tentukanStatusBerikutnya(keputusan, level, urutan.length)

  await prisma.$transaction(async (tx) => {
    await tx.keputusanApprovalRow.create({
      data: {
        pengajuanId,
        level,
        peranWajib: urutan[level - 1],
        keputusan,
        alasan: alasan ?? null,
        diputuskanOleh: aktor.id,
      },
    })

    await ubahStatus(tx, {
      pengajuanId,
      dari: pengajuan.status,
      ke: statusBerikutnya,
      aktor,
      sebab: `Keputusan ${keputusan} pada level ${level} oleh ${aktor.peran}`,
      metadata: { level, keputusan, jumlahLevel: urutan.length },
    })

    await tulisAudit(tx, {
      pengajuanId,
      aktorId: aktor.id,
      aktorPeran: aktor.peran,
      aksi: AKSI.KEPUTUSAN_APPROVAL,
      statusSebelum: pengajuan.status,
      statusSesudah: statusBerikutnya,
      metadata: { level, keputusan },
    })
  })

  return { id: pengajuanId, level, keputusan, status: statusBerikutnya }
}

function tentukanStatusBerikutnya(
  keputusan: 'APPROVE' | 'REJECT' | 'RETURN',
  level: number,
  jumlahLevel: number,
): StatusPengajuan {
  if (keputusan === 'REJECT') return 'REJECTED'
  if (keputusan === 'RETURN') return 'DIKEMBALIKAN'

  // APPROVE: naik ke level berikutnya, atau APPROVED bila ini level terakhir.
  const berikutnya = levelBerjalan(
    // Simulasikan keputusan APPROVE pada level ini untuk menemukan level lanjutan.
    [{ level, keputusan: 'APPROVE' }],
    jumlahLevel,
  )
  if (berikutnya === null) return 'APPROVED'
  const status = STATUS_LEVEL[berikutnya]
  if (!status) {
    throw new PelanggaranAturan('FR-08', `Level approval ${berikutnya} tidak dikenal`)
  }
  return status
}

/**
 * Antrian approval untuk peran approver (FR-12): hanya pengajuan yang SEDANG
 * menunggu pada level yang peran ini isi. Difilter di query + dihitung ulang dari
 * total plafon, bukan disembunyikan di frontend.
 */
export async function antrianApproval(aktor: PenggunaToken) {
  const statusMenunggu: StatusPengajuan[] = [
    'MENUNGGU_APPROVAL_L1',
    'MENUNGGU_APPROVAL_L2',
    'MENUNGGU_APPROVAL_L3',
  ]

  const kandidat = await prisma.pengajuan.findMany({
    where: { status: { in: statusMenunggu } },
    include: { anggota: true },
    orderBy: { diubahPada: 'asc' },
    take: 100,
  })

  const ambang = await bacaAmbangApproval()
  const antrian: {
    id: string
    nomorReferensi: string
    status: StatusPengajuan
    level: number
    totalPlafon: number
  }[] = []

  for (const p of kandidat) {
    const level = LEVEL_DARI_STATUS[p.status]
    if (!level) continue

    const totalPlafon = hitungTotalPlafon(
      p.anggota.map((a) => ({
        plafonDiajukan: rupiahKeNumber(a.plafonDiajukan),
        statusAnggota: a.statusAnggota,
      })),
    )
    const urutan = urutanApprovalUntuk(totalPlafon, ambang)
    const peranLevelIni = urutan[level - 1]

    // Hanya tampilkan pengajuan yang peran level berjalannya adalah peran aktor.
    if (peranLevelIni !== aktor.peran) continue

    antrian.push({
      id: p.id,
      nomorReferensi: p.nomorReferensi,
      status: p.status,
      level,
      totalPlafon,
    })
  }

  return antrian
}
