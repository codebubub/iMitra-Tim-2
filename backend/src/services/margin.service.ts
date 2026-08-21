import type { Akad as AkadPrisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { PelanggaranAturan, TidakDitemukan } from '../lib/errors.js'
import { rentangUntuk, validasiMargin, type Akad } from '../domain/margin.js'
import { bacaRentangMargin } from './parameter.service.js'
import { tulisAudit, AKSI } from './audit.service.js'
import type { PenggunaToken } from '../middleware/rbac.js'

/**
 * Penetapan margin murabahah / nisbah musyarakah (FR-07, BR-06, AC-09).
 *
 * KENAPA BERKAS INI SEMPAT TIDAK BERPENGARUH APA-APA. Logikanya sudah ada dan
 * bertest, tetapi tidak ada satu pun route yang memanggilnya: `routes/margin.ts`
 * tidak pernah dibuat, sehingga `POST /api/pengajuan/{id}/margin` — yang ada di
 * kontrak beku SDD BAB 5 dan dipakai layar S-10 — dijawab sebagai route tidak
 * dikenal. Fitur yang lengkap di service tetapi tidak terdaftar sama saja
 * dengan fitur yang tidak ada.
 *
 * TIGA HAL YANG DITEGAKKAN DI SINI:
 *
 *   1. AKAD DIBACA DARI PENGAJUAN, bukan dari klien. Klien yang boleh memilih
 *      akad bisa memilih rentang yang lebih longgar — memvalidasi terhadap
 *      rentang yang salah sama dengan tidak memvalidasi.
 *   2. GRADE DIBACA DARI HASIL SKORING TERAKHIR, termasuk hasil override ANL
 *      (FR-06.1). Rentang mengikuti grade FINAL, bukan grade sistem.
 *   3. DI LUAR RENTANG BERARTI DIBLOKIR (BR-06). Tidak ada parameter `paksa`,
 *      tidak ada mode peringatan, tidak ada jalur "simpan sebagai pengecualian".
 *      Kalau suatu saat ada yang menambahkannya, AC-09 akan lolos di layar dan
 *      kehilangan maknanya.
 */

export type MasukanMargin = {
  marginPersen?: number
  nisbahBankPersen?: number
}

export type HasilMargin = {
  pengajuanId: string
  grade: number
  akad: Akad
  marginPersen: number | null
  nisbahBankPersen: number | null
  rentang: {
    grade: number
    akad: Akad
    /** null untuk grade yang tidak dibiayai (grade 5, BR-05). */
    min: number | null
    maks: number | null
    dibiayai: boolean
  }
}

/** Status pengajuan yang boleh menetapkan margin (SRS 3.2: SKORED → approval). */
const STATUS_BOLEH_MARGIN = ['SKORED'] as const

async function muatKonteks(pengajuanId: string) {
  const pengajuan = await prisma.pengajuan.findUnique({
    where: { id: pengajuanId },
    include: { skoring: { orderBy: { dihitungPada: 'desc' }, take: 1 } },
  })
  if (!pengajuan) throw new TidakDitemukan('Pengajuan tidak ditemukan')

  const skoring = pengajuan.skoring[0]
  if (!skoring) {
    throw new PelanggaranAturan(
      'FR-07',
      'Skoring belum dijalankan; rentang margin ditentukan oleh grade final',
    )
  }
  return { pengajuan, skoring }
}

/**
 * Rentang yang berlaku, DIHITUNG SERVER. Tidak melempar untuk grade yang tidak
 * dibiayai — layar S-10 perlu bisa menampilkan "grade ini tidak dibiayai"
 * alih-alih galat tanpa penjelasan.
 */
async function rentangBerlaku(grade: number, akad: Akad): Promise<HasilMargin['rentang']> {
  const rentang = await bacaRentangMargin()
  const baris = rentang.find((r) => r.grade === grade)
  if (!baris || !baris.dibiayai) {
    return { grade, akad, min: null, maks: null, dibiayai: false }
  }
  const { min, maks } = rentangUntuk(grade, akad, rentang)
  return { grade, akad, min, maks, dibiayai: true }
}

/** GET — nilai tersimpan + rentang yang berlaku untuk grade final saat ini. */
/**
 * GET — membaca margin/nisbah beserta rentang yang berlaku.
 *
 * MENGEMBALIKAN `null` BILA SKORING BELUM DIJALANKAN, bukan melempar
 * PelanggaranAturan.
 *
 * Sebelumnya endpoint ini memakai `muatKonteks()` yang sama dengan POST,
 * sehingga membuka layar margin pada pengajuan yang belum diskor menjawab
 * HTTP 422 "ATURAN_BISNIS_DILANGGAR". Itu salah dua kali:
 *
 *   1. SECARA SEMANTIK. 422 berarti permintaan yang bentuknya benar tetapi
 *      melanggar aturan bisnis — tepat untuk aksi TULIS. Membaca sesuatu yang
 *      belum ada bukan pelanggaran; tidak ada aturan yang dilanggar oleh
 *      seseorang yang membuka sebuah layar.
 *   2. BAGI PENGGUNANYA. Layar S-10 menerjemahkan setiap kegagalan muat menjadi
 *      "Rentang margin tidak dapat dimuat dari server", sehingga analis dikirim
 *      memeriksa parameter dan koneksi — padahal yang kurang hanyalah skoring,
 *      satu langkah yang bisa ia kerjakan sendiri saat itu juga.
 *
 * INVARIAN yang dipakai layar: `null` HANYA berarti skoring belum ada. Bila
 * skoring sudah ada, fungsi ini selalu mengembalikan objek — dengan
 * `marginPersen: null` bila margin memang belum ditetapkan. Jadi layar bisa
 * membedakan "belum bisa diisi" dari "belum diisi" tanpa field tambahan.
 *
 * Pengajuan yang benar-benar tidak ada tetap melempar TidakDitemukan (404):
 * itu memang bukan sumber daya yang bisa dibaca siapa pun.
 */
export async function bacaMargin(pengajuanId: string): Promise<HasilMargin | null> {
  const pengajuanAda = await prisma.pengajuan.findUnique({
    where: { id: pengajuanId },
    select: { id: true, skoring: { select: { id: true }, take: 1 } },
  })
  if (!pengajuanAda) throw new TidakDitemukan('Pengajuan tidak ditemukan')
  if (pengajuanAda.skoring.length === 0) return null

  const { pengajuan, skoring } = await muatKonteks(pengajuanId)
  const akad = pengajuan.akad as Akad

  return {
    pengajuanId,
    grade: skoring.gradeFinal,
    akad,
    marginPersen: pengajuan.marginPersen === null ? null : Number(pengajuan.marginPersen),
    nisbahBankPersen:
      pengajuan.nisbahBankPersen === null ? null : Number(pengajuan.nisbahBankPersen),
    rentang: await rentangBerlaku(skoring.gradeFinal, akad),
  }
}

/** POST — menetapkan margin/nisbah setelah lolos validasi rentang (BR-06). */
export async function tetapkanMargin(
  aktor: PenggunaToken,
  pengajuanId: string,
  masukan: MasukanMargin,
): Promise<HasilMargin> {
  const { pengajuan, skoring } = await muatKonteks(pengajuanId)

  if (!STATUS_BOLEH_MARGIN.includes(pengajuan.status as (typeof STATUS_BOLEH_MARGIN)[number])) {
    throw new PelanggaranAturan(
      'FR-07',
      `Margin hanya dapat ditetapkan saat pengajuan berstatus SKORED, bukan ${pengajuan.status}`,
    )
  }

  const akad = pengajuan.akad as Akad
  const grade = skoring.gradeFinal
  const rentang = await bacaRentangMargin()

  const nilaiDiajukan =
    akad === 'MURABAHAH' ? masukan.marginPersen : masukan.nisbahBankPersen
  if (nilaiDiajukan === undefined || nilaiDiajukan === null) {
    throw new PelanggaranAturan(
      'FR-07',
      akad === 'MURABAHAH'
        ? 'Margin p.a. wajib diisi untuk akad Murabahah'
        : 'Nisbah bank wajib diisi untuk akad Musyarakah',
    )
  }

  // Melempar 422 dengan pesan yang menyebut BR-06 beserta kedua batas (AC-09).
  const nilai = validasiMargin(nilaiDiajukan, grade, akad, rentang)

  const data: { marginPersen: number | null; nisbahBankPersen: number | null } =
    akad === 'MURABAHAH'
      ? { marginPersen: nilai, nisbahBankPersen: null }
      : { marginPersen: null, nisbahBankPersen: nilai }

  await prisma.$transaction(async (tx) => {
    await tx.pengajuan.update({ where: { id: pengajuanId }, data })

    // FR-09 — penetapan margin adalah keputusan yang wajib berjejak.
    await tulisAudit(tx, {
      pengajuanId,
      aktorId: aktor.id,
      aktorPeran: aktor.peran,
      aksi: AKSI.SET_MARGIN,
      metadata: {
        akad,
        grade,
        nilaiPersen: nilai,
        marginSebelum:
          pengajuan.marginPersen === null ? null : Number(pengajuan.marginPersen),
        nisbahSebelum:
          pengajuan.nisbahBankPersen === null ? null : Number(pengajuan.nisbahBankPersen),
      },
    })
  })

  return {
    pengajuanId,
    grade,
    akad,
    marginPersen: data.marginPersen,
    nisbahBankPersen: data.nisbahBankPersen,
    rentang: await rentangBerlaku(grade, akad),
  }
}

/**
 * Dipakai `approval.service` sebelum pengajuan naik ke approval: transisi
 * SKORED → MENUNGGU_APPROVAL_L1 pada SRS 3.2 berbunyi "margin dalam rentang
 * LALU diajukan". Tanpa pemeriksaan ini, pengajuan bisa disetujui berjenjang
 * tanpa satu pun angka margin — dan itu baru ketahuan saat akad.
 */
export function pastikanMarginSudahDitetapkan(pengajuan: {
  akad: AkadPrisma
  marginPersen: unknown
  nisbahBankPersen: unknown
}): void {
  const terisi =
    pengajuan.akad === 'MURABAHAH'
      ? pengajuan.marginPersen !== null && pengajuan.marginPersen !== undefined
      : pengajuan.nisbahBankPersen !== null && pengajuan.nisbahBankPersen !== undefined

  if (!terisi) {
    throw new PelanggaranAturan(
      'BR-06',
      pengajuan.akad === 'MURABAHAH'
        ? 'Margin belum ditetapkan. Tetapkan margin yang berada dalam rentang grade sebelum mengajukan ke approval.'
        : 'Nisbah bank belum ditetapkan. Tetapkan nisbah yang berada dalam rentang grade sebelum mengajukan ke approval.',
    )
  }
}
