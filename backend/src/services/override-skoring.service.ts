import { prisma } from '../lib/prisma.js'
import { PelanggaranAturan } from '../lib/errors.js'
import { validasiOverrideGrade } from '../domain/grade.js'
import { tulisAudit, AKSI } from './audit.service.js'
import type { PenggunaToken } from '../middleware/rbac.js'

/**
 * Override grade oleh ANL (FR-06.1, AC-08).
 *
 * KENAPA BERKAS INI ADA. Endpoint override sebelumnya berisi
 * `// TODO: implement override logic` dan mengembalikan ECHO dari input.
 * Layar ANL menampilkan "tersimpan", audit trail kosong, dan grade tidak
 * berubah — tanpa satu pun tanda bahwa sesuatu gagal. Untuk keputusan yang
 * harus dipertanggungjawabkan ke auditor, jawaban 200 yang tidak menyimpan
 * apa pun lebih buruk daripada galat.
 *
 * AC-08 menuntut tiga hal, dan ketiganya ditegakkan di sini:
 *   1. sistem MENOLAK jika alasan kosong
 *   2. setelah alasan diisi, override TERSIMPAN
 *   3. override TERCATAT di audit trail dengan identitas ANL
 *
 * Aturan grade-nya sendiri tidak ditulis ulang di sini — ia dipanggil dari
 * `domain/grade.ts` yang sudah punya unit test, termasuk larangan override
 * menembus lantai kolektibilitas-2 (asumsi A-4).
 */
export async function overrideGradeSkoring(
  aktor: PenggunaToken,
  pengajuanId: string,
  gradeFinal: number,
  alasan: string,
) {
  const hasil = await prisma.hasilSkoring.findFirst({
    where: { pengajuanId },
    orderBy: { dihitungPada: 'desc' },
  })
  if (!hasil) {
    throw new PelanggaranAturan(
      'BR-03',
      'Belum ada hasil skoring untuk pengajuan ini. Jalankan skoring lebih dulu.',
    )
  }

  // Kolektibilitas terburuk menentukan lantai grade (Tabel 4.2). Dibaca dari
  // hasil SLIK yang benar-benar tersimpan, bukan dari input klien — kalau
  // klien yang menentukannya, lantai itu bisa dilewati dengan mengirim angka
  // lain.
  const slik = await prisma.hasilSlik.findMany({
    where: {
      anggota: { pengajuanId, statusAnggota: 'AKTIF' },
      statusPanggilan: 'OK',
    },
    select: { kolektibilitas: true },
  })
  const kolTerburuk = slik.reduce((maks, s) => Math.max(maks, s.kolektibilitas ?? 0), 0)

  // Melempar bila alasan kosong/terlalu pendek, atau bila override menembus
  // lantai kol-2. Keduanya sudah bertest di unit/skoring.spec.ts.
  validasiOverrideGrade(gradeFinal, alasan, kolTerburuk)

  return prisma.$transaction(async (tx) => {
    const sesudah = await tx.hasilSkoring.update({
      where: { id: hasil.id },
      data: {
        gradeFinal,
        diOverride: true,
        alasanOverride: alasan.trim(),
      },
      include: { rincian: true },
    })

    await tulisAudit(tx, {
      pengajuanId,
      aktorId: aktor.id,
      aktorPeran: aktor.peran,
      aksi: AKSI.OVERRIDE_GRADE,
      metadata: {
        gradeSebelum: hasil.gradeFinal,
        gradeSesudah: gradeFinal,
        gradeSistem: hasil.gradeSistem,
        alasan: alasan.trim(),
      },
    })

    // DTO, bukan baris Prisma mentah: kolom NUMERIC menjadi Decimal dan
    // JSON mengubahnya menjadi string, sehingga penjumlahan di frontend akan
    // menggabungkan teks. Lihat catatan panjang di routes/skoring.ts.
    return {
      id: sesudah.id,
      pengajuanId: sesudah.pengajuanId,
      skorAkhir: sesudah.skorAkhir,
      gradeSistem: sesudah.gradeSistem,
      gradeFinal: sesudah.gradeFinal,
      diOverride: sesudah.diOverride,
      alasanOverride: sesudah.alasanOverride,
      snapshotParameter: sesudah.snapshotParameter,
      dihitungOleh: sesudah.dihitungOleh,
      dihitungPada: sesudah.dihitungPada,
      rincian: sesudah.rincian.map((r) => ({
        id: r.id,
        kodeKomponen: r.kodeKomponen,
        bobot: Number(r.bobot),
        nilaiMentah: Number(r.nilaiMentah),
        skorKomponen: Number(r.skorKomponen),
        kontribusi: Number(r.kontribusi),
      })),
    }
  })
}

// Ekspor tipe agar route tidak perlu menebak bentuknya.
export type HasilOverride = Awaited<ReturnType<typeof overrideGradeSkoring>>



