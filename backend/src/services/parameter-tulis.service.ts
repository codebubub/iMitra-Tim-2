import type { Peran } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { PelanggaranAturan } from '../lib/errors.js'
import { tulisAudit, AKSI } from './audit.service.js'
import type { PenggunaToken } from '../middleware/rbac.js'

/**
 * Penulisan parameter oleh ADM (FR-13, AC-15).
 *
 * KENAPA BERKAS INI ADA. Ketiga endpoint PUT sebelumnya berisi
 * `// TODO: implement update logic` dan mengembalikan ECHO dari input —
 * jawabannya 200, tetapi tidak ada satu baris pun yang tersimpan. Itu kelas
 * kegagalan yang paling mahal: layar ADM menampilkan "tersimpan", ADM percaya,
 * dan perhitungan berikutnya tetap memakai nilai lama. Tidak ada tanda apa pun
 * bahwa sesuatu salah sampai seseorang membandingkan angkanya.
 *
 * AC-15 justru menguji tepat hal ini: bobot "Lama usaha" diubah 20 → 25, lalu
 * skoring BERIKUTNYA harus memakai bobot baru tanpa restart. Karena parameter
 * dibaca dari database pada setiap pemanggilan (ADR-0003), yang kurang memang
 * hanya penulisannya.
 *
 * VALIDASI DI SINI BUKAN FORMALITAS. Angka-angka ini menentukan grade nasabah
 * dan level approval; parameter yang tidak masuk akal menghasilkan keputusan
 * pembiayaan yang tidak masuk akal, dan tidak ada lapisan lain yang akan
 * menangkapnya.
 */

export type BobotBaru = { kode: string; bobot: number }

const KODE_KOMPONEN_WAJIB = [
  'KAPASITAS_BAYAR',
  'RIWAYAT_SLIK',
  'LAMA_USAHA',
  'HASIL_SURVEI',
] as const

export async function ubahBobotKomponen(aktor: PenggunaToken, masukan: BobotBaru[]) {
  if (masukan.length === 0) {
    throw new PelanggaranAturan('FR-13', 'Tidak ada parameter yang diubah')
  }
  for (const b of masukan) {
    if (b.bobot < 0) {
      throw new PelanggaranAturan('FR-13', `Bobot ${b.kode} tidak boleh negatif`)
    }
  }

  // Σ bobot > 0 diperiksa terhadap keadaan SESUDAH perubahan, bukan hanya
  // terhadap yang dikirim: mengirim satu bobot 0 sah, mengosongkan semuanya
  // tidak — skor akhir dibagi Σ bobot (BR-07).
  const semua = await prisma.parameterSkoring.findMany({
    where: { kode: { in: [...KODE_KOMPONEN_WAJIB] } },
  })
  const sesudah = new Map(semua.map((p) => [p.kode, Number(p.bobot ?? 0)]))
  for (const b of masukan) sesudah.set(b.kode, b.bobot)
  const total = [...sesudah.values()].reduce((s, n) => s + n, 0)
  if (total <= 0) {
    throw new PelanggaranAturan(
      'BR-07',
      'Total bobot komponen harus lebih besar dari 0; skor akhir dibagi total bobot',
    )
  }

  return prisma.$transaction(async (tx) => {
    const diubah: { kode: string; sebelum: number | null; sesudah: number }[] = []

    for (const b of masukan) {
      const lama = await tx.parameterSkoring.findUnique({ where: { kode: b.kode } })
      if (!lama) throw new PelanggaranAturan('FR-13', `Parameter ${b.kode} tidak dikenal`)

      await tx.parameterSkoring.update({
        where: { kode: b.kode },
        data: { bobot: b.bobot, diubahOleh: aktor.id },
      })
      diubah.push({ kode: b.kode, sebelum: lama.bobot === null ? null : Number(lama.bobot), sesudah: b.bobot })
    }

    // Setiap perubahan parameter masuk audit trail (FR-13). Nilai sebelum dan
    // sesudah keduanya dicatat, karena auditor perlu tahu keputusan lama
    // dihitung dengan angka yang mana.
    await tulisAudit(tx, {
      aktorId: aktor.id,
      aktorPeran: aktor.peran,
      aksi: AKSI.UBAH_PARAMETER,
      metadata: { kelompok: 'parameter_skoring', diubah, totalBobotSesudah: total },
    })

    return { diubah, totalBobot: total }
  })
}

export type AmbangBaru = { plafonMin: number; plafonMaks: number; urutanPeran: string[] }

export async function ubahAmbangApproval(aktor: PenggunaToken, masukan: AmbangBaru[]) {
  if (masukan.length === 0) {
    throw new PelanggaranAturan('FR-13', 'Tabel ambang approval tidak boleh kosong')
  }

  const urut = [...masukan].sort((a, b) => a.plafonMin - b.plafonMin)
  for (const [i, a] of urut.entries()) {
    if (a.plafonMin > a.plafonMaks) {
      throw new PelanggaranAturan('FR-13', 'Plafon minimum tidak boleh melebihi maksimum')
    }
    if (a.urutanPeran.length === 0) {
      throw new PelanggaranAturan('FR-13', 'Setiap ambang harus punya minimal satu level approval')
    }
    // Berlubang atau tumpang tindih berarti ada nilai plafon yang tidak punya
    // jalur approval — dan itu baru ketahuan saat ada pengajuan yang jatuh di
    // celahnya, biasanya saat demo.
    const berikut = urut[i + 1]
    if (berikut && berikut.plafonMin !== a.plafonMaks + 1) {
      throw new PelanggaranAturan(
        'FR-13',
        `Rentang plafon berlubang atau tumpang tindih antara ${a.plafonMaks} dan ${berikut.plafonMin}`,
      )
    }
  }

  return prisma.$transaction(async (tx) => {
    // Tabel ini kecil (3 baris) dan tidak dirujuk baris lain lewat foreign key,
    // jadi diganti seluruhnya. Itu lebih jujur daripada mencocokkan baris satu
    // per satu dengan id yang tidak punya arti bisnis.
    await tx.ambangApproval.deleteMany({})
    await tx.ambangApproval.createMany({
      data: urut.map((a) => ({
        plafonMin: BigInt(a.plafonMin),
        plafonMaks: BigInt(a.plafonMaks),
        urutanPeran: a.urutanPeran as Peran[],
        diubahOleh: aktor.id,
      })),
    })

    await tulisAudit(tx, {
      aktorId: aktor.id,
      aktorPeran: aktor.peran,
      aksi: AKSI.UBAH_PARAMETER,
      metadata: {
        kelompok: 'ambang_approval',
        baris: urut.map((a) => ({ min: a.plafonMin, maks: a.plafonMaks, level: a.urutanPeran })),
      },
    })

    return { jumlahBaris: urut.length }
  })
}

export type RentangBaru = {
  grade: number
  skorMin: number
  skorMaks: number
  marginMin: number | null
  marginMaks: number | null
  nisbahMin: number | null
  nisbahMaks: number | null
  dibiayai: boolean
}

export async function ubahRentangMargin(aktor: PenggunaToken, masukan: RentangBaru[]) {
  if (masukan.length === 0) {
    throw new PelanggaranAturan('FR-13', 'Tabel rentang margin tidak boleh kosong')
  }

  for (const r of masukan) {
    if (r.skorMin > r.skorMaks) {
      throw new PelanggaranAturan('FR-13', `Grade ${r.grade}: skor minimum melebihi maksimum`)
    }
    if (r.marginMin !== null && r.marginMaks !== null && r.marginMin > r.marginMaks) {
      throw new PelanggaranAturan('BR-06', `Grade ${r.grade}: margin minimum melebihi maksimum`)
    }
    if (r.nisbahMin !== null && r.nisbahMaks !== null && r.nisbahMin > r.nisbahMaks) {
      throw new PelanggaranAturan('BR-06', `Grade ${r.grade}: nisbah minimum melebihi maksimum`)
    }
    if (r.dibiayai && (r.marginMin === null || r.marginMaks === null)) {
      throw new PelanggaranAturan(
        'BR-06',
        `Grade ${r.grade} ditandai dibiayai tetapi rentang marginnya kosong`,
      )
    }
  }

  // Rentang skor dipakai JUGA untuk menurunkan grade dari skor. Lubang di antara
  // dua grade berarti ada skor yang tidak punya grade sama sekali, dan skoring
  // akan melempar KesalahanKonfigurasi di tengah pekerjaan analis.
  const urut = [...masukan].sort((a, b) => a.skorMin - b.skorMin)
  for (const [i, r] of urut.entries()) {
    const berikut = urut[i + 1]
    if (berikut && berikut.skorMin !== r.skorMaks + 1) {
      throw new PelanggaranAturan(
        'FR-13',
        `Rentang skor berlubang atau tumpang tindih antara ${r.skorMaks} dan ${berikut.skorMin}`,
      )
    }
  }

  return prisma.$transaction(async (tx) => {
    for (const r of masukan) {
      await tx.rentangMargin.update({
        where: { grade: r.grade },
        data: {
          skorMin: r.skorMin,
          skorMaks: r.skorMaks,
          marginMin: r.marginMin,
          marginMaks: r.marginMaks,
          nisbahMin: r.nisbahMin,
          nisbahMaks: r.nisbahMaks,
          dibiayai: r.dibiayai,
          diubahOleh: aktor.id,
        },
      })
    }

    await tulisAudit(tx, {
      aktorId: aktor.id,
      aktorPeran: aktor.peran,
      aksi: AKSI.UBAH_PARAMETER,
      metadata: { kelompok: 'rentang_margin', grade: masukan.map((r) => r.grade) },
    })

    return { jumlahBaris: masukan.length }
  })
}
