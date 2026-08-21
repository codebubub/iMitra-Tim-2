import { vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../../src/lib/prisma.js'

/**
 * Status ditulis ulang sebagai union di sini, bukan diimpor dari `@prisma/client`.
 *
 * Aturan `no-restricted-imports` melarang lapisan selain `lib/prisma.ts` dan
 * `repositories/` mengimpor Prisma — termasuk test. Larangan itu ada supaya
 * bentuk baris database tidak merembes ke seluruh repo, dan mengecualikan test
 * berarti melubanginya di tempat yang paling sering disalin orang.
 */
type StatusPengajuan =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'VERIFIKASI_DOKUMEN'
  | 'DOKUMEN_DITOLAK'
  | 'SLIK_OK'
  | 'SLIK_GAGAL'
  | 'REJECTED_SLIK'
  | 'SKORED'
  | 'REJECTED_SCORING'
  | 'MENUNGGU_APPROVAL_L1'
  | 'MENUNGGU_APPROVAL_L2'
  | 'MENUNGGU_APPROVAL_L3'
  | 'DIKEMBALIKAN'
  | 'APPROVED'
  | 'REJECTED'

/**
 * Bantuan bersama untuk test integrasi.
 *
 * KENAPA FIXTURE DIBANGUN LEWAT PRISMA, BUKAN LEWAT HTTP. Membangun keadaan
 * "siap SLIK" lewat endpoint memerlukan sepuluh permintaan berurutan, dan
 * kegagalan di permintaan ketiga akan tampak sebagai kegagalan aturan yang
 * sedang diuji — bukan sebagai fixture yang tidak jadi. Yang diuji lewat HTTP
 * adalah aturan yang menjadi pokok berkas test-nya.
 *
 * Berkas ini SENGAJA bukan `.spec.ts` supaya vitest tidak menjalankannya
 * sebagai berkas test.
 */

export const PASSWORD_UJI = process.env.SEED_DEFAULT_PASSWORD ?? 'Demo1234!'

export async function login(app: FastifyInstance, username: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username, password: PASSWORD_UJI },
  })
  if (res.statusCode !== 200) {
    throw new Error(`login ${username} gagal (${res.statusCode}) — sudah menjalankan seed?`)
  }
  return res.json().token as string
}

export async function idPengguna(username: string): Promise<string> {
  const p = await prisma.pengguna.findUnique({ where: { username } })
  if (!p) throw new Error(`pengguna ${username} tidak ada — jalankan npm run db:seed`)
  return p.id
}

/** NIK acak 16 digit. Tidak pernah dicetak ke log test (BR-11). */
export function nikAcak(): string {
  const ekor = String(Math.floor(Math.random() * 1e11)).padStart(11, '0')
  return `3404${ekor}${Math.floor(Math.random() * 10)}`
}

/**
 * Nomor referensi untuk fixture test.
 *
 * KENAPA BUKAN SEKADAR ANGKA ACAK. Versi sebelumnya memakai
 * `IMT-99999999-<4 digit acak>` — hanya 8.999 nilai yang mungkin. Baris uji
 * MENUMPUK di schema test antar-run, karena trigger append-only pada
 * `audit_trail` membuat pengajuan yang sudah punya audit tidak bisa dihapus.
 * Setelah beberapa run, `Unique constraint failed on (nomor_referensi)` muncul
 * di berkas test yang berpindah-pindah — kegagalan yang terlihat seperti bug
 * produk, padahal fixture-nya yang bertabrakan.
 *
 * Sekarang: ruang sesi 6 digit acak per proses, DIKALI penghitung monoton di
 * dalam proses. Tabrakan di dalam satu run menjadi mustahil, bukan sekadar
 * jarang, dan antar-run turun ke satu banding sejuta.
 *
 * Awalan `99` dipertahankan supaya nomor uji tidak pernah bertabrakan dengan
 * nomor sungguhan, yang bagian tanggalnya selalu `20xx`.
 */
const SESI_UJI = String(Math.floor(Math.random() * 1e6)).padStart(6, '0')
let urutanUji = 0

export function nomorReferensiUji(): string {
  urutanUji += 1
  return `IMT-99${SESI_UJI}-${String(urutanUji).padStart(4, '0')}`
}

export type OpsiPengajuanUji = {
  status?: StatusPengajuan
  plafon?: bigint
  akad?: 'MURABAHAH' | 'MUSYARAKAH'
  tenorBulan?: number
  /** Dokumen wajib dibuat VERIFIED. Matikan untuk menguji BR-03. */
  dokumenVerified?: boolean
  /** Survei VALID. Matikan untuk menguji BR-03/AC-04. */
  surveiValid?: boolean
  omzetHarian?: bigint
  lamaUsahaBulan?: number
  kondisiUsahaSkala?: number
  dibuatOleh?: string
}

export type PengajuanUji = {
  pengajuanId: string
  anggotaId: string
  nik: string
  aoId: string
}

/**
 * Membuat satu pengajuan perorangan lengkap dengan dokumen dan survei, pada
 * status yang diminta.
 */
export async function buatPengajuanUji(opsi: OpsiPengajuanUji = {}): Promise<PengajuanUji> {
  const aoId = opsi.dibuatOleh ?? (await idPengguna('ao'))
  const nik = nikAcak()

  const nasabah = await prisma.nasabah.upsert({
    where: { nik },
    create: { nik, nama: 'Nasabah Uji', alamat: 'Jl. Uji No. 1', jenisUsaha: 'Warung Kelontong' },
    update: {},
  })

  const pengajuan = await prisma.pengajuan.create({
    data: {
      nomorReferensi: nomorReferensiUji(),
      jenisNasabah: 'PERORANGAN',
      akad: opsi.akad ?? 'MURABAHAH',
      tenorBulan: opsi.tenorBulan ?? 12,
      status: opsi.status ?? 'VERIFIKASI_DOKUMEN',
      dibuatOleh: aoId,
      anggota: {
        create: {
          nasabahId: nasabah.id,
          plafonDiajukan: opsi.plafon ?? 30_000_000n,
          urutan: 1,
        },
      },
    },
    include: { anggota: true },
  })

  const anggotaId = pengajuan.anggota[0]!.id

  if (opsi.dokumenVerified !== false) {
    await prisma.dokumen.createMany({
      data: (['KTP', 'KK', 'SKU'] as const).map((jenis) => ({
        pengajuanAnggotaId: anggotaId,
        jenis,
        versi: 1,
        pathBerkas: `uji/${jenis.toLowerCase()}`,
        mime: 'image/jpeg',
        ukuranByte: 1024,
        status: 'VERIFIED' as const,
        diunggahOleh: aoId,
        diverifikasiPada: new Date(),
      })),
    })
  }

  if (opsi.surveiValid !== false) {
    await prisma.survei.create({
      data: {
        pengajuanId: pengajuan.id,
        latitude: -7.5,
        longitude: 112.5,
        fotoPath: 'uji/foto',
        omzetHarian: opsi.omzetHarian ?? 800_000n,
        lamaUsahaBulan: opsi.lamaUsahaBulan ?? 48,
        kondisiUsahaSkala: opsi.kondisiUsahaSkala ?? 4,
        catatan: 'Survei uji',
        status: 'VALID',
        direkamOleh: aoId,
        dinilaiPada: new Date(),
      },
    })
  }

  return { pengajuanId: pengajuan.id, anggotaId, nik, aoId }
}

/** Menyimpan satu hasil SLIK OK langsung, untuk test yang tidak menguji FR-05. */
export async function simpanSlikOk(
  anggotaId: string,
  kolektibilitas: number,
  diperiksaOleh: string,
  tanggalData: Date = new Date(),
): Promise<void> {
  await prisma.hasilSlik.create({
    data: {
      pengajuanAnggotaId: anggotaId,
      statusPanggilan: 'OK',
      kolektibilitas,
      jumlahFasilitasAktif: 1,
      totalBakiDebet: 8_000_000n,
      tanggalData,
      referenceId: 'SLIK-UJI',
      diperiksaOleh,
    },
  })
}

export type ResponsSlikUji =
  | { httpStatus: 200; kolektibilitas: number; tanggalData?: string }
  | { httpStatus: 404 | 503 }

/**
 * Mengganti `fetch` global dengan mock SLIK.
 *
 * Sengaja TIDAK memanggil layanan mock-slik yang sungguhan: test integrasi
 * backend tidak boleh gagal karena ada orang lain yang mematikan container di
 * laptopnya. Kontrak mock-slik itu sendiri sudah diuji di
 * `mock-slik/tests/kontrak.spec.ts`.
 */
export function pasangMockSlik(peta: Record<string, ResponsSlikUji>): void {
  vi.stubGlobal('fetch', async (_url: string, init?: { body?: string }) => {
    const nik = JSON.parse(String(init?.body ?? '{}')).nik as string
    const respons = peta[nik]
    if (!respons) return { status: 404, json: async () => ({ error: 'NIK_TIDAK_DITEMUKAN' }) }

    if (respons.httpStatus !== 200) {
      return { status: respons.httpStatus, json: async () => ({ error: 'GAGAL' }) }
    }
    return {
      status: 200,
      json: async () => ({
        nik,
        nama: 'Nasabah Uji',
        kolektibilitas: respons.kolektibilitas,
        jumlahFasilitasAktif: 1,
        totalBakiDebet: 8_000_000,
        tanggalData: respons.tanggalData ?? new Date().toISOString().slice(0, 10),
        referenceId: 'SLIK-UJI-001',
      }),
    }
  })
}

export function lepasMockSlik(): void {
  vi.unstubAllGlobals()
}

/**
 * SENGAJA TIDAK ADA fungsi hapus fixture.
 *
 * Menghapus pengajuan akan meng-cascade ke `audit_trail`, dan tabel itu menolak
 * DELETE lewat trigger database (AC-13). Test yang "membersihkan" dirinya
 * sendiri akan gagal di sana — atau, lebih buruk, menelan galatnya dan membuat
 * orang mengira penghapusan berhasil. Data uji menumpuk di schema test milik
 * masing-masing orang, dan itu memang tempatnya (docs/DATABASE.md bagian 3).
 */
