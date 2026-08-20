import { prisma } from '../lib/prisma.js'
import { PelanggaranAturan, TidakDitemukan, ValidasiGagal } from '../lib/errors.js'
import { hashPassword } from './auth.service.js'
import { tulisAudit, AKSI } from './audit.service.js'
import * as repo from '../repositories/pengguna.repo.js'
import type { PenggunaAman } from '../repositories/pengguna.repo.js'
import type { PenggunaToken } from '../middleware/rbac.js'
import type { Peran } from '../domain/approval.js'

/**
 * Kelola pengguna (FR-01, layar S-14). HANYA ADM — ditegakkan di route lewat
 * config.peran, dan dua penjagaan tambahan di bawah ditegakkan DI SINI karena
 * keduanya perlu membaca data:
 *
 *   1. ADM tidak dapat menonaktifkan atau menurunkan perannya SENDIRI.
 *   2. Admin aktif terakhir tidak dapat dinonaktifkan atau diturunkan perannya.
 *
 * Kenapa dua-duanya ada. Yang pertama mencegah kesalahan yang paling mudah
 * dilakukan (salah klik pada baris sendiri). Yang kedua mencegah kesalahan yang
 * paling mahal: dua admin yang saling menonaktifkan akan mengunci seluruh tim
 * keluar dari pengelolaan parameter (FR-13), dan satu-satunya jalan keluarnya
 * adalah akses langsung ke database. Keduanya bukan aturan bisnis dari brief,
 * melainkan syarat agar sistem tetap dapat dikelola — karena itu kode alasannya
 * FR-01, bukan BR-xx.
 */

/**
 * Username dipakai untuk login; dibatasi supaya tidak ada spasi tersembunyi.
 *
 * Batas bawahnya 2 karakter, bukan 3, karena akun seed memang bernama `ao`,
 * `kc`, dan `adm`. Aturan yang menolak nama akun yang sudah dipakai sistemnya
 * sendiri adalah aturan yang salah, bukan akun yang salah.
 */
const POLA_USERNAME = /^[a-z0-9][a-z0-9._-]{1,31}$/
const PANJANG_SANDI_MIN = 8

export type MasukanBuatPengguna = {
  username: string
  nama: string
  peran: Peran
  password: string
}

export type MasukanUbahPengguna = {
  nama?: string
  peran?: Peran
  aktif?: boolean
  password?: string
}

function validasiSandi(password: string): void {
  if (password.length < PANJANG_SANDI_MIN) {
    throw new ValidasiGagal(
      `Kata sandi minimal ${PANJANG_SANDI_MIN} karakter`,
      'password',
    )
  }
}

export async function daftarPengguna(filter: {
  peran?: Peran
  aktif?: boolean
}): Promise<PenggunaAman[]> {
  return repo.daftar(filter)
}

export async function buatPengguna(
  aktor: PenggunaToken,
  masukan: MasukanBuatPengguna,
): Promise<PenggunaAman> {
  if (!POLA_USERNAME.test(masukan.username)) {
    throw new ValidasiGagal(
      'Username harus 3-32 karakter, huruf kecil/angka, boleh titik, garis bawah, dan strip',
      'username',
    )
  }
  validasiSandi(masukan.password)

  // Diperiksa lebih dulu supaya pesannya jelas; batasan UNIQUE di database tetap
  // menjadi penentu akhir bila dua ADM menambah username yang sama bersamaan.
  if (await repo.ambilLewatUsername(masukan.username)) {
    throw new ValidasiGagal(`Username ${masukan.username} sudah dipakai`, 'username')
  }

  const passwordHash = await hashPassword(masukan.password)

  return prisma.$transaction(async (tx) => {
    const dibuat = await repo.buat(
      { username: masukan.username, nama: masukan.nama, peran: masukan.peran, passwordHash },
      tx,
    )
    await tulisAudit(tx, {
      aktorId: aktor.id,
      aktorPeran: aktor.peran,
      aksi: AKSI.BUAT_PENGGUNA,
      // Tanpa kata sandi dan tanpa hash-nya. Username bukan data pribadi nasabah,
      // dan tanpa itu baris audit ini tidak bisa dibaca siapa pun (BR-10).
      metadata: { penggunaId: dibuat.id, username: dibuat.username, peran: dibuat.peran },
    })
    return dibuat
  })
}

export async function ubahPengguna(
  aktor: PenggunaToken,
  id: string,
  masukan: MasukanUbahPengguna,
): Promise<PenggunaAman> {
  const sebelum = await repo.ambil(id)
  if (!sebelum) throw new TidakDitemukan('Pengguna tidak ditemukan')

  if (masukan.password !== undefined) validasiSandi(masukan.password)

  const menonaktifkan = masukan.aktif === false && sebelum.aktif
  const menurunkanDariAdm =
    masukan.peran !== undefined && masukan.peran !== 'ADM' && sebelum.peran === 'ADM'

  if ((menonaktifkan || menurunkanDariAdm) && sebelum.id === aktor.id) {
    throw new PelanggaranAturan(
      'FR-01',
      'Anda tidak dapat menonaktifkan atau menurunkan peran akun Anda sendiri',
    )
  }

  if ((menonaktifkan || menurunkanDariAdm) && sebelum.peran === 'ADM') {
    const adminAktif = await repo.hitungAdminAktif()
    if (adminAktif <= 1) {
      throw new PelanggaranAturan(
        'FR-01',
        'Admin aktif terakhir tidak dapat dinonaktifkan atau diturunkan perannya',
      )
    }
  }

  const passwordHash =
    masukan.password === undefined ? undefined : await hashPassword(masukan.password)

  return prisma.$transaction(async (tx) => {
    const sesudah = await repo.ubah(
      id,
      { nama: masukan.nama, peran: masukan.peran, aktif: masukan.aktif, passwordHash },
      tx,
    )

    // Yang dicatat adalah APA yang berubah, bukan seluruh isi baris — dan
    // kata sandi hanya dicatat sebagai fakta "diatur ulang", tidak pernah nilainya.
    const perubahan: Record<string, unknown> = { penggunaId: id, username: sesudah.username }
    if (masukan.nama !== undefined && masukan.nama !== sebelum.nama) perubahan.nama = 'diubah'
    if (masukan.peran !== undefined && masukan.peran !== sebelum.peran) {
      perubahan.peran = { dari: sebelum.peran, ke: sesudah.peran }
    }
    if (masukan.aktif !== undefined && masukan.aktif !== sebelum.aktif) {
      perubahan.aktif = { dari: sebelum.aktif, ke: sesudah.aktif }
    }
    if (masukan.password !== undefined) perubahan.password = 'diatur ulang'

    await tulisAudit(tx, {
      aktorId: aktor.id,
      aktorPeran: aktor.peran,
      aksi: AKSI.UBAH_PENGGUNA,
      metadata: perubahan,
    })
    return sesudah
  })
}
