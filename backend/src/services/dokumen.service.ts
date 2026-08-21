import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { prisma } from '../lib/prisma.js'
import { env } from '../config/env.js'
import { AksesDitolak, PelanggaranAturan, TidakDitemukan } from '../lib/errors.js'
import {
  validasiBerkas,
  validasiKeputusanVerifikasi,
  versiBerikutnya,
  type JenisDokumen,
  type KodeAlasanDokumen,
} from '../domain/dokumen.js'
import * as repo from '../repositories/pengajuan.repo.js'
import { tulisAudit, AKSI } from './audit.service.js'
import { ubahStatus } from './status.service.js'
import type { PenggunaToken } from '../middleware/rbac.js'

/**
 * Unggah & verifikasi dokumen (FR-03, AC-03).
 *
 * Unggahan diterima sebagai konten base64 di dalam JSON, bukan multipart:
 * repo ini tidak boleh menambah dependensi tanpa persetujuan Tech Lead
 * (AGENTS.md bagian 6 butir 1), dan tidak ada pustaka multipart yang tersedia.
 * Kontrak fungsional tetap terpenuhi — versi, kepemilikan, dan akses berkas
 * lewat id dokumen (bukan NIK, BR-11) tidak bergantung pada format transport.
 *
 * Berkas ditulis ke volume dengan nama UUID; nama asli maupun NIK tidak pernah
 * masuk ke path, log, atau URL.
 */

export type MasukanUnggahDokumen = {
  pengajuanAnggotaId: string
  jenis: JenisDokumen
  mime: string
  kontenBase64: string
}

const STATUS_BOLEH_UNGGAH = ['DRAFT', 'DIKEMBALIKAN', 'SUBMITTED', 'VERIFIKASI_DOKUMEN', 'DOKUMEN_DITOLAK']

export async function unggahDokumen(
  aktor: PenggunaToken,
  pengajuanId: string,
  masukan: MasukanUnggahDokumen,
) {
  const pengajuan = await repo.cariPengajuan(pengajuanId)
  if (!pengajuan) throw new TidakDitemukan('Pengajuan tidak ditemukan')
  if (pengajuan.dibuatOleh !== aktor.id) {
    throw new AksesDitolak('Anda hanya dapat mengunggah dokumen pada pengajuan milik Anda sendiri')
  }
  if (!STATUS_BOLEH_UNGGAH.includes(pengajuan.status)) {
    throw new PelanggaranAturan(
      'FR-03',
      `Dokumen tidak dapat diunggah saat pengajuan berstatus ${pengajuan.status}`,
    )
  }

  const anggota = pengajuan.anggota.find((a) => a.id === masukan.pengajuanAnggotaId)
  if (!anggota) throw new TidakDitemukan('Anggota tidak ditemukan pada pengajuan ini')
  if (anggota.statusAnggota !== 'AKTIF') {
    throw new PelanggaranAturan('FR-03', 'Dokumen tidak dapat diunggah untuk anggota yang ditolak')
  }

  const buffer = Buffer.from(masukan.kontenBase64, 'base64')
  validasiBerkas(masukan.mime, buffer.byteLength, env.uploadAllowedMime, env.uploadMaxBytes)

  const versiAda = await repo.versiDokumen(masukan.pengajuanAnggotaId, masukan.jenis)
  const versi = versiBerikutnya(versiAda.map((v) => v.versi))

  await mkdir(env.uploadDir, { recursive: true })
  const namaBerkas = `${randomUUID()}`
  const pathBerkas = join(env.uploadDir, namaBerkas)
  await writeFile(pathBerkas, buffer)

  return prisma.$transaction(async (tx) => {
    const dokumen = await repo.buatDokumen(
      {
        pengajuanAnggotaId: masukan.pengajuanAnggotaId,
        jenis: masukan.jenis,
        versi,
        pathBerkas,
        mime: masukan.mime,
        ukuranByte: buffer.byteLength,
        diunggahOleh: aktor.id,
      },
      tx,
    )

    // AC-03 — unggah ulang dokumen yang ditolak mengembalikan pengajuan ke meja
    // verifikasi. Hanya dokumen jenis itu yang berubah; data pengajuan lain
    // tidak tersentuh, dan versi lama tetap tersimpan.
    if (pengajuan.status === 'DOKUMEN_DITOLAK') {
      await ubahStatus(tx, {
        pengajuanId,
        dari: 'DOKUMEN_DITOLAK',
        ke: 'VERIFIKASI_DOKUMEN',
        aktor,
        sebab: `Dokumen ${masukan.jenis} diunggah ulang (versi ${versi})`,
        metadata: { jenis: masukan.jenis, versi },
      })
    }

    await tulisAudit(tx, {
      pengajuanId,
      aktorId: aktor.id,
      aktorPeran: aktor.peran,
      aksi: AKSI.UBAH_STATUS,
      metadata: {
        sebab: 'Unggah dokumen',
        dokumenId: dokumen.id,
        jenis: masukan.jenis,
        versi,
      },
    })

    return { id: dokumen.id, jenis: dokumen.jenis, versi: dokumen.versi, status: dokumen.status }
  })
}

export async function verifikasiDokumen(
  aktor: PenggunaToken,
  dokumenId: string,
  keputusan: 'VERIFIED' | 'REJECTED',
  kodeAlasan?: string | null,
  catatan?: string | null,
) {
  const dokumen = await repo.cariDokumen(dokumenId)
  if (!dokumen) throw new TidakDitemukan('Dokumen tidak ditemukan')

  validasiKeputusanVerifikasi(keputusan, kodeAlasan)

  const pengajuanId = dokumen.anggota.pengajuan.id
  const statusAwal = dokumen.anggota.pengajuan.status

  await prisma.$transaction(async (tx) => {
    /**
     * TAHAP DOKUMEN MENGGERAKKAN STATUS PENGAJUAN (SRS 3.2).
     *
     * Sebelumnya verifikasi dokumen hanya menyentuh baris `dokumen`, sehingga
     * pengajuan berhenti selamanya di `SUBMITTED`: SLIK check menolak karena
     * status belum `VERIFIKASI_DOKUMEN`, dan seluruh rantai sesudahnya tidak
     * pernah terjangkau dari aplikasi. Yang membuat ini sulit terlihat adalah
     * data seed — ia menulis status akhir secara langsung, jadi layar tampak
     * berjalan padahal alurnya putus.
     *
     * `SUBMITTED → VERIFIKASI_DOKUMEN` = "mulai verifikasi (ANL)" pada diagram.
     */
    let status: string = statusAwal
    if (status === 'SUBMITTED') {
      await ubahStatus(tx, {
        pengajuanId,
        dari: 'SUBMITTED',
        ke: 'VERIFIKASI_DOKUMEN',
        aktor,
        sebab: 'ANL mulai memverifikasi dokumen',
      })
      status = 'VERIFIKASI_DOKUMEN'
    }

    await tx.dokumen.update({
      where: { id: dokumenId },
      data: {
        status: keputusan,
        kodeAlasan: keputusan === 'REJECTED' ? (kodeAlasan as KodeAlasanDokumen) : null,
        catatan: catatan ?? null,
        diverifikasiOleh: aktor.id,
        diverifikasiPada: new Date(),
      },
    })

    await tulisAudit(tx, {
      pengajuanId,
      aktorId: aktor.id,
      aktorPeran: aktor.peran,
      aksi: AKSI.VERIFIKASI_DOKUMEN,
      metadata: {
        dokumenId,
        jenis: dokumen.jenis,
        versi: dokumen.versi,
        keputusan,
        ...(keputusan === 'REJECTED' ? { kodeAlasan } : {}),
      },
    })

    // "minimal 1 dokumen REJECTED + kode alasan (ANL)" pada SRS 3.2. AO
    // memperbaikinya dengan mengunggah ulang dokumen itu saja (AC-03), dan
    // unggahan itulah yang mengembalikan status ke VERIFIKASI_DOKUMEN.
    if (keputusan === 'REJECTED' && status === 'VERIFIKASI_DOKUMEN') {
      await ubahStatus(tx, {
        pengajuanId,
        dari: 'VERIFIKASI_DOKUMEN',
        ke: 'DOKUMEN_DITOLAK',
        aktor,
        sebab: `Dokumen ${dokumen.jenis} ditolak dengan alasan ${kodeAlasan}`,
        metadata: { dokumenId, jenis: dokumen.jenis, kodeAlasan },
      })
    }
  })

  return { id: dokumenId, status: keputusan, kodeAlasan: keputusan === 'REJECTED' ? kodeAlasan : null }
}

export async function daftarDokumen(pengajuanId: string) {
  const pengajuan = await repo.cariPengajuan(pengajuanId)
  if (!pengajuan) throw new TidakDitemukan('Pengajuan tidak ditemukan')

  const baris = await repo.daftarDokumenPengajuan(pengajuanId)
  return baris.map((d) => ({
    id: d.id,
    pengajuanAnggotaId: d.pengajuanAnggotaId,
    jenis: d.jenis,
    versi: d.versi,
    status: d.status,
    kodeAlasan: d.kodeAlasan,
    catatan: d.catatan,
    mime: d.mime,
    ukuranByte: d.ukuranByte,
    diunggahPada: d.diunggahPada,
    diverifikasiPada: d.diverifikasiPada,
  }))
}

/**
 * Unduh berkas. Kepemilikan diperiksa DI SINI (lapis 2): AO hanya boleh berkas
 * miliknya; ANL dan approver boleh semua. URL memakai id dokumen, bukan NIK.
 */
export async function ambilBerkas(aktor: PenggunaToken, dokumenId: string) {
  const dokumen = await repo.cariDokumen(dokumenId)
  if (!dokumen) throw new TidakDitemukan('Dokumen tidak ditemukan')

  if (aktor.peran === 'AO' && dokumen.anggota.pengajuan.dibuatOleh !== aktor.id) {
    throw new AksesDitolak('Anda hanya dapat mengunduh berkas pada pengajuan milik Anda sendiri')
  }

  const isi = await readFile(dokumen.pathBerkas)
  return { mime: dokumen.mime, isi }
}
