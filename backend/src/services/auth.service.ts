import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { env } from '../config/env.js'
import { TidakTerautentikasi } from '../lib/errors.js'
import { buatToken, type PenggunaToken } from '../middleware/rbac.js'
import { tulisAudit, AKSI } from './audit.service.js'
import type { Peran } from '../domain/approval.js'

/**
 * Autentikasi lokal (FR-01, brief 6.3).
 *
 * LAPISAN YANG BISA DITUKAR (ADR-0001): seluruh verifikasi kredensial berada di
 * balik antarmuka `PenyediaIdentitas`. Menukar ke LDAP/OIDC berarti menambah satu
 * implementasi dan mengubah satu baris perakitan — route, middleware, service
 * lain, dan seluruh frontend tidak berubah, karena tidak satu pun di antaranya
 * tahu dari mana kredensial diverifikasi.
 *
 * JANGAN membangun integrasi AD/SSO sungguhan (brief 1.4 — di luar lingkup).
 */

export type ProfilPengguna = { id: string; nama: string; peran: Peran; username: string }

export interface PenyediaIdentitas {
  autentikasi(username: string, password: string): Promise<ProfilPengguna | null>
}

export class PenyediaIdentitasLokal implements PenyediaIdentitas {
  async autentikasi(username: string, password: string): Promise<ProfilPengguna | null> {
    const pengguna = await prisma.pengguna.findUnique({ where: { username } })
    if (!pengguna || !pengguna.aktif) {
      // Tetap jalankan hash pembanding supaya waktu respons untuk "user tidak
      // ada" dan "password salah" tidak berbeda secara mencolok.
      await bcrypt.compare(password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinv')
      return null
    }

    const cocok = await bcrypt.compare(password, pengguna.passwordHash)
    if (!cocok) return null

    return {
      id: pengguna.id,
      nama: pengguna.nama,
      peran: pengguna.peran as Peran,
      username: pengguna.username,
    }
  }
}

const penyedia: PenyediaIdentitas = new PenyediaIdentitasLokal()

export type HasilLogin = { token: string; pengguna: ProfilPengguna }

/**
 * Login sukses DAN gagal keduanya masuk audit trail (FR-09).
 *
 * Pesan galat sengaja tidak membedakan "username tidak ada" dari "password
 * salah": membedakannya hanya berguna bagi orang yang sedang menebak akun.
 */
export async function login(username: string, password: string): Promise<HasilLogin> {
  const profil = await penyedia.autentikasi(username, password)

  if (!profil) {
    await tulisAudit(prisma, {
      aktorId: null,
      aktorPeran: '-',
      aksi: AKSI.LOGIN_GAGAL,
      metadata: { username },
    })
    throw new TidakTerautentikasi('Nama pengguna atau kata sandi salah')
  }

  await tulisAudit(prisma, {
    aktorId: profil.id,
    aktorPeran: profil.peran,
    aksi: AKSI.LOGIN,
    metadata: {},
  })

  const isiToken: PenggunaToken = { id: profil.id, peran: profil.peran, nama: profil.nama }
  return { token: buatToken(isiToken), pengguna: profil }
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.passwordHashCost)
}
