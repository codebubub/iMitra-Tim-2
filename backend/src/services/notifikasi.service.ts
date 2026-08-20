import type { PrismaTx } from '../lib/prisma.js'
import { TidakDitemukan } from '../lib/errors.js'
import * as repo from '../repositories/notifikasi.repo.js'
import type { PenggunaToken } from '../middleware/rbac.js'

/**
 * Notifikasi perubahan status (FR-11) — SISI PENULISAN.
 *
 * Baris notifikasi ditulis di dalam transaksi yang sama dengan perubahan
 * statusnya (dipanggil dari status.service.ts). Kalau transaksi gagal,
 * notifikasinya ikut batal — pengguna tidak pernah diberi tahu tentang
 * perubahan yang tidak jadi terjadi.
 *
 * Sisi tampilannya (layar S-xx) milik Ray; modul ini hanya menyediakan datanya.
 *
 * BR-11: pesan disusun dari NOMOR REFERENSI dan STATUS. Tidak ada NIK, nama
 * nasabah, alamat, atau path berkas di dalamnya.
 */

const BATAS_BAWAAN = 50
const BATAS_MAKS = 200

export type BarisNotifikasiDTO = {
  id: string
  pengajuanId: string | null
  nomorReferensi: string | null
  pesan: string
  dibaca: boolean
  dibuatPada: Date
}

/**
 * Memberi tahu pihak yang berkepentingan atas satu perubahan status.
 *
 * Yang diberi tahu: pembuat pengajuan. Aktor yang melakukan perubahan TIDAK
 * diberi tahu atas aksinya sendiri — ia baru saja melakukannya, dan notifikasi
 * untuk diri sendiri hanya membuat daftar notifikasi berisik sampai tidak
 * dibaca siapa pun.
 */
export async function beriTahuPerubahanStatus(
  tx: PrismaTx,
  params: {
    pengajuanId: string
    nomorReferensi: string
    dibuatOleh: string
    ke: string
    aktorId: string
  },
): Promise<void> {
  const penerima = new Set<string>([params.dibuatOleh])
  penerima.delete(params.aktorId)

  await repo.tulisBanyak(
    tx,
    [...penerima].map((penggunaId) => ({
      penggunaId,
      pengajuanId: params.pengajuanId,
      pesan: `Pengajuan ${params.nomorReferensi} berubah status menjadi ${params.ke}`,
    })),
  )
}

export async function daftarNotifikasi(
  aktor: PenggunaToken,
  opsi: { belumDibaca?: boolean; batas?: number },
): Promise<{ belumDibaca: number; baris: BarisNotifikasiDTO[] }> {
  const batas = Math.min(opsi.batas ?? BATAS_BAWAAN, BATAS_MAKS)

  const [baris, belumDibaca] = await Promise.all([
    repo.daftarUntuk(aktor.id, { belumDibaca: opsi.belumDibaca, batas }),
    repo.hitungBelumDibaca(aktor.id),
  ])

  return {
    belumDibaca,
    baris: baris.map((n) => ({
      id: n.id,
      pengajuanId: n.pengajuanId,
      nomorReferensi: n.pengajuan?.nomorReferensi ?? null,
      pesan: n.pesan,
      dibaca: n.dibaca,
      dibuatPada: n.dibuatPada,
    })),
  }
}

/**
 * Kepemilikan ditegakkan di klausa WHERE repository. Notifikasi milik orang lain
 * dijawab 404 dan bukan 403, supaya id milik orang lain tidak bisa ditebak dari
 * bedanya jawaban.
 */
export async function tandaiDibaca(aktor: PenggunaToken, id: string): Promise<void> {
  const berubah = await repo.tandaiDibaca(id, aktor.id)
  if (berubah === 0) throw new TidakDitemukan('Notifikasi tidak ditemukan')
}
