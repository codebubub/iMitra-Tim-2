import { SlikResult, SlikClient } from '#clients/slik.client.js'
import { loadEnv } from '#config/env.js'
import { prisma } from '#lib/prisma.js'

/**
 * Orkestrasi SLIK check (FR-05). Ditulis Alfian; disesuaikan saat rekonsiliasi
 * fondasi dengan tiga perubahan, masing-masing dengan alasannya:
 *
 * 1. Memakai instance Prisma bersama dari `lib/prisma.ts`, bukan `new PrismaClient()`
 *    sendiri. Alasannya bukan gaya: setiap instance membuka pool koneksinya
 *    sendiri, dan kuota database bersama kami 20 koneksi untuk enam orang
 *    (docs/DATABASE.md bagian 4).
 *
 * 2. `diperiksaOleh` menjadi parameter WAJIB. BR-10 mensyaratkan setiap jejak
 *    punya aktor; tanpa ini, baris hasil_slik tidak bisa dipertanggungjawabkan
 *    ke auditor, dan skema menolaknya.
 *
 * 3. `tanggalData` dikonversi menjadi Date. Kolomnya bertipe DATE, dan BR-04
 *    membandingkannya dengan masa berlaku — perbandingan string akan salah
 *    diam-diam pada pergantian bulan.
 *
 * Yang TIDAK diubah, dan sengaja: baris tetap ditulis untuk SETIAP panggilan,
 * berhasil maupun gagal, dengan kolektibilitas `null` saat gagal. Itu sudah
 * benar — kegagalan SLIK bukan SLIK bersih.
 */
export class SlikService {
  private client: SlikClient

  constructor() {
    const env = loadEnv()
    this.client = new SlikClient(env.SLIK_BASE_URL, env.SLIK_INQUIRY_PATH, env.SLIK_TIMEOUT_MS)
  }

  async cekSlik(
    pengajuanAnggotaId: string,
    nik: string,
    diperiksaOleh: string,
  ): Promise<SlikResult> {
    const result = await this.client.inquiry(nik)

    await prisma.hasilSlik.create({
      data: {
        pengajuanAnggotaId,
        statusPanggilan: result.status,
        // Tidak ada `?? 1`, tidak ada `|| 0`. Panggilan gagal berarti tidak ada
        // kolektibilitas, dan prasyarat skoring akan menolaknya karena itu.
        kolektibilitas: result.data?.kolektibilitas ?? null,
        jumlahFasilitasAktif: result.data?.jumlahFasilitasAktif ?? null,
        totalBakiDebet: result.data?.totalBakiDebet ?? null,
        tanggalData: result.data ? new Date(result.data.tanggalData) : null,
        referenceId: result.data?.referenceId ?? null,
        diperiksaOleh,
        diperiksaPada: new Date(),
      },
    })

    return result
  }
}
