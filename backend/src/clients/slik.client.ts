import { env } from '../config/env.js'
import { logger } from '../lib/logger.js'

/**
 * Klien HTTP ke mock SLIK (FR-05, brief 6.1).
 *
 * DIPANGGIL VIA HTTP, bukan sebagai fungsi lokal — brief 7.2 butir 3 mewajibkan
 * ini, dan alasannya disebut terang-terangan di brief: AI cenderung gagal justru
 * di batas integrasi.
 *
 * TIGA LARANGAN YANG TIDAK BOLEH DILANGGAR DI BERKAS INI:
 *
 *   1. Jangan mengembalikan kolektibilitas saat panggilan gagal. Tidak ada
 *      `?? 1`, tidak ada `|| 0`, tidak ada nilai default. Kegagalan SLIK BUKAN
 *      SLIK bersih.
 *   2. Jangan menelan exception. Setiap cabang mengembalikan hasil bertanda
 *      yang harus ditangani pemanggil — bukan `catch {}` lalu lanjut.
 *   3. Jangan menulis NIK ke log atau ke pesan galat (BR-11). Korelasi memakai
 *      id pengajuan yang diteruskan pemanggil.
 *
 * Penilai AKAN mencabut mock SLIK saat demo. Berkas inilah yang menentukan apa
 * yang terjadi saat itu.
 */

export type HasilInquirySukses = {
  status: 'OK'
  nik: string
  nama: string
  kolektibilitas: number
  jumlahFasilitasAktif: number
  totalBakiDebet: number
  tanggalData: string
  referenceId: string
}

export type HasilInquiryGagal = {
  status: 'NOT_FOUND' | 'UNAVAILABLE' | 'TIMEOUT'
  /** Sengaja tidak ada field kolektibilitas di sini — supaya tidak bisa dibaca. */
}

export type HasilInquiry = HasilInquirySukses | HasilInquiryGagal

export async function inquirySlik(nik: string, korelasi: string): Promise<HasilInquiry> {
  const url = `${env.slikBaseUrl}${env.slikInquiryPath}`
  const kontrol = new AbortController()
  const pewaktu = setTimeout(() => kontrol.abort(), env.slikTimeoutMs)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nik }),
      signal: kontrol.signal,
    })

    if (res.status === 404) {
      logger.info({ korelasi, slik: 'NOT_FOUND' }, 'SLIK: NIK tidak ditemukan')
      return { status: 'NOT_FOUND' }
    }

    if (res.status === 503) {
      logger.warn({ korelasi, slik: 'UNAVAILABLE' }, 'SLIK: layanan tidak tersedia')
      return { status: 'UNAVAILABLE' }
    }

    if (!res.ok) {
      // Status tak terduga diperlakukan seperti tidak tersedia — BUKAN seperti
      // sukses. Diam-diam melanjutkan adalah kegagalan yang paling mahal di sini.
      logger.warn({ korelasi, httpStatus: res.status }, 'SLIK: status tak terduga')
      return { status: 'UNAVAILABLE' }
    }

    const body = (await res.json()) as Omit<HasilInquirySukses, 'status'>

    if (typeof body?.kolektibilitas !== 'number') {
      logger.warn({ korelasi }, 'SLIK: respons 200 tanpa kolektibilitas')
      return { status: 'UNAVAILABLE' }
    }

    logger.info(
      { korelasi, kolektibilitas: body.kolektibilitas },
      'SLIK: inquiry berhasil',
    )
    return { status: 'OK', ...body }
  } catch (err) {
    const abort = err instanceof Error && err.name === 'AbortError'
    logger.warn(
      { korelasi, slik: abort ? 'TIMEOUT' : 'UNAVAILABLE' },
      abort ? 'SLIK: timeout' : 'SLIK: gagal terhubung',
    )
    return { status: abort ? 'TIMEOUT' : 'UNAVAILABLE' }
  } finally {
    clearTimeout(pewaktu)
  }
}
