import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { prisma } from '../lib/prisma.js'
import { env } from '../config/env.js'
import { AksesDitolak, PelanggaranAturan, TidakDitemukan, ValidasiGagal } from '../lib/errors.js'
import * as repo from '../repositories/pengajuan.repo.js'
import { tulisAudit, AKSI } from './audit.service.js'
import type { PenggunaToken } from '../middleware/rbac.js'

/**
 * Survei lapangan / OTS (FR-04, AC-04).
 *
 * Pemisahan tugas mengikuti asumsi A-10: AO merekam fakta lapangan (koordinat,
 * foto, omzet, lama usaha), ANL menilai kondisi usaha (skala 1-5) dan menetapkan
 * VALID/TIDAK_VALID. Yang dipakai skoring adalah survei VALID TERBARU (FR-04).
 *
 * Foto disimpan sebagai berkas volume dengan nama UUID; path tidak pernah masuk
 * log atau URL (BR-11).
 */

export type MasukanSurvei = {
  latitude: number
  longitude: number
  fotoBase64: string
  fotoMime: string
  omzetHarian: number
  lamaUsahaBulan: number
  catatan: string
}

const STATUS_BOLEH_SURVEI = ['DRAFT', 'DIKEMBALIKAN', 'SUBMITTED', 'VERIFIKASI_DOKUMEN']

export async function rekamSurvei(aktor: PenggunaToken, pengajuanId: string, masukan: MasukanSurvei) {
  const pengajuan = await repo.cariPengajuan(pengajuanId)
  if (!pengajuan) throw new TidakDitemukan('Pengajuan tidak ditemukan')
  if (pengajuan.dibuatOleh !== aktor.id) {
    throw new AksesDitolak('Anda hanya dapat merekam survei pada pengajuan milik Anda sendiri')
  }
  if (!STATUS_BOLEH_SURVEI.includes(pengajuan.status)) {
    throw new PelanggaranAturan(
      'FR-04',
      `Survei tidak dapat direkam saat pengajuan berstatus ${pengajuan.status}`,
    )
  }

  if (masukan.omzetHarian <= 0) throw new ValidasiGagal('Omzet harian harus lebih dari nol', 'omzetHarian')
  if (masukan.lamaUsahaBulan < 0) throw new ValidasiGagal('Lama usaha tidak boleh negatif', 'lamaUsahaBulan')

  const buffer = Buffer.from(masukan.fotoBase64, 'base64')
  if (!env.uploadAllowedMime.includes(masukan.fotoMime)) {
    throw new ValidasiGagal(
      `Jenis foto ${masukan.fotoMime} tidak diizinkan. Yang diterima: ${env.uploadAllowedMime.join(', ')}.`,
      'foto',
    )
  }
  if (buffer.byteLength <= 0) throw new ValidasiGagal('Foto survei kosong', 'foto')
  if (buffer.byteLength > env.uploadMaxBytes) {
    throw new ValidasiGagal(
      `Ukuran foto melebihi batas ${Math.floor(env.uploadMaxBytes / (1024 * 1024))} MB`,
      'foto',
    )
  }

  await mkdir(env.uploadDir, { recursive: true })
  const fotoPath = join(env.uploadDir, randomUUID())
  await writeFile(fotoPath, buffer)

  return prisma.$transaction(async (tx) => {
    const survei = await repo.buatSurvei(
      {
        pengajuanId,
        latitude: masukan.latitude,
        longitude: masukan.longitude,
        fotoPath,
        omzetHarian: BigInt(Math.trunc(masukan.omzetHarian)),
        lamaUsahaBulan: masukan.lamaUsahaBulan,
        catatan: masukan.catatan,
        direkamOleh: aktor.id,
      },
      tx,
    )

    await tulisAudit(tx, {
      pengajuanId,
      aktorId: aktor.id,
      aktorPeran: aktor.peran,
      aksi: AKSI.UBAH_STATUS,
      metadata: { sebab: 'Rekam survei', surveiId: survei.id },
    })

    return { id: survei.id, status: survei.status }
  })
}

export async function nilaiSurvei(
  aktor: PenggunaToken,
  surveiId: string,
  kondisiUsahaSkala: number,
  status: 'VALID' | 'TIDAK_VALID',
) {
  if (!Number.isInteger(kondisiUsahaSkala) || kondisiUsahaSkala < 1 || kondisiUsahaSkala > 5) {
    throw new ValidasiGagal('Skala kondisi usaha harus bilangan bulat 1 sampai 5', 'kondisiUsahaSkala')
  }

  const survei = await repo.cariSurvei(surveiId)
  if (!survei) throw new TidakDitemukan('Survei tidak ditemukan')

  await prisma.$transaction(async (tx) => {
    await tx.survei.update({
      where: { id: surveiId },
      data: {
        kondisiUsahaSkala,
        status,
        dinilaiOleh: aktor.id,
        dinilaiPada: new Date(),
      },
    })

    await tulisAudit(tx, {
      pengajuanId: survei.pengajuanId,
      aktorId: aktor.id,
      aktorPeran: aktor.peran,
      aksi: AKSI.UBAH_STATUS,
      metadata: { sebab: 'Nilai survei', surveiId, kondisiUsahaSkala, status },
    })
  })

  return { id: surveiId, status, kondisiUsahaSkala }
}

export async function daftarSurvei(pengajuanId: string) {
  const pengajuan = await repo.cariPengajuan(pengajuanId)
  if (!pengajuan) throw new TidakDitemukan('Pengajuan tidak ditemukan')

  const baris = await repo.daftarSurvei(pengajuanId)
  return baris.map((s) => ({
    id: s.id,
    latitude: Number(s.latitude),
    longitude: Number(s.longitude),
    omzetHarian: Number(s.omzetHarian),
    lamaUsahaBulan: s.lamaUsahaBulan,
    kondisiUsahaSkala: s.kondisiUsahaSkala,
    catatan: s.catatan,
    status: s.status,
    direkamPada: s.direkamPada,
    dinilaiPada: s.dinilaiPada,
  }))
}
