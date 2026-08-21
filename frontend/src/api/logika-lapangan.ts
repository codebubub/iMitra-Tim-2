/**
 * Logika keputusan murni untuk layar lapangan & dokumen (Ray).
 *
 * KENAPA BERKAS INI ADA: aturan yang diuji AC hidup di sini sebagai fungsi murni
 * — tanpa React, tanpa DOM, tanpa jaringan — supaya bisa diuji dengan vitest
 * tanpa merender apa pun dan tanpa menambah dependensi (RTL/jsdom). Ini mengikuti
 * filosofi yang sama dengan backend (SDD: keputusan sebagai fungsi murni).
 *
 * Komponen layar meng-IMPOR fungsi ini, jadi test menguji kode yang benar-benar
 * dipakai UI, bukan salinannya.
 *
 * CATATAN: tidak ada angka bisnis di sini (batas plafon, ambang approval, bobot).
 * Itu milik server (R-8/#3). Yang ada di sini murni logika UI dari AC.
 */

import type { AnggotaBaru, JenisNasabah } from './pengajuan'
import type { Dokumen, StatusDokumen } from './dokumen'

/* ------------------------------------------------------------------ S-05 */

/**
 * AC-03: hanya dokumen yang DITOLAK yang boleh diunggah ulang. Dokumen yang
 * belum ada juga boleh diunggah (unggah pertama). Dokumen VERIFIED atau MENUNGGU
 * TIDAK punya kontrol unggah — AO mengirim ulang satu dokumen, bukan seluruh
 * pengajuan.
 */
export function bolehUnggahDokumen(dokumen: Pick<Dokumen, 'status'> | undefined): boolean {
  if (!dokumen) return true // slot kosong: unggah pertama
  return dokumen.status === 'REJECTED'
}

/** Kelas badge status dokumen (presentasi konsisten S-05 & S-06). */
export function kelasBadgeDokumen(status: StatusDokumen | 'BELUM'): string {
  if (status === 'VERIFIED') return 'badge badge--sukses'
  if (status === 'REJECTED') return 'badge badge--bahaya'
  if (status === 'MENUNGGU') return 'badge badge--info'
  return 'badge'
}

/* ------------------------------------------------------------------ S-06 */

/**
 * S-06: tombol "Kirim penolakan" hanya aktif jika kode alasan sudah dipilih.
 * `true` = tombol DINONAKTIFKAN. Juga nonaktif saat sedang mengirim.
 */
export function tolakDinonaktifkan(kodeAlasan: string, sedangKirim: boolean): boolean {
  return kodeAlasan.trim() === '' || sedangKirim
}

/* ------------------------------------------------------------------ S-07 */

/**
 * S-07 (AO): survei boleh dikirim jika ada minimal satu foto DAN omzet harian
 * terisi (> 0). Koordinat opsional — AO bisa di lokasi tanpa GPS (fallback
 * manual), jadi gagal ambil koordinat tidak boleh memblokir pengiriman.
 */
export function bolehKirimSurvei(input: { jumlahFoto: number; omzetHarian: number }): boolean {
  return input.jumlahFoto >= 1 && input.omzetHarian > 0
}

/**
 * S-07 (ANL): tombol nilai (VALID/TIDAK VALID) hanya aktif jika skala kondisi
 * usaha 1–5 sudah dipilih. `true` = DINONAKTIFKAN.
 */
export function nilaiSurveiDinonaktifkan(skala: number | null, sedangKirim: boolean): boolean {
  return skala == null || sedangKirim
}

/* ------------------------------------------------------------------ S-03 */

/**
 * Jumlah baris anggota yang dipakai untuk membangun payload: perorangan selalu
 * tepat satu anggota (asumsi A-5), kelompok memakai seluruh baris.
 */
export function anggotaUntukPayload<T>(jenisNasabah: JenisNasabah, baris: T[]): T[] {
  return jenisNasabah === 'KELOMPOK' ? baris : baris.slice(0, 1)
}

/**
 * Total plafon = penjumlahan plafon seluruh baris (aritmetika input, BUKAN
 * parameter bisnis). Level approval TIDAK dihitung di sini — itu milik server.
 */
export function hitungTotalPlafon(plafonPerBaris: number[]): number {
  return plafonPerBaris.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0)
}

/**
 * Validasi bentuk input anggota sebelum dikirim: seluruh field wajib terisi.
 * alamat & jenisUsaha WAJIB karena skema zod route menolak string kosong —
 * memeriksanya di sini mencegah 400 yang membingungkan AO.
 */
export function anggotaLengkap(a: AnggotaBaru): boolean {
  return (
    a.nama.trim() !== '' &&
    /^\d{16}$/.test(a.nik) &&
    a.alamat.trim() !== '' &&
    a.jenisUsaha.trim() !== '' &&
    a.plafonDiajukan > 0
  )
}

/* ---------------------------------------------------------- util bersama */

/** Ambil hanya digit dari input teks (untuk NIK & rupiah). */
export function hanyaDigit(nilai: string): number {
  return Number(nilai.replace(/\D/g, '')) || 0
}

/** Format ribuan untuk tampilan (presentasi, bukan aturan bisnis). */
export function formatRibuan(nilai: string): string {
  const angka = nilai.replace(/\D/g, '')
  return angka ? Number(angka).toLocaleString('id-ID') : ''
}
