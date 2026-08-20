import { PelanggaranAturan } from '../lib/errors.js'

/**
 * Batas plafon (BR-01) dan aturan jumlah anggota majelis (FR-10).
 *
 * Batasnya BUKAN konstanta di berkas ini — ia diturunkan dari tabel
 * `ambang_approval`: baris pertama memberi batas bawah, baris terakhir memberi
 * batas atas. Satu sumber untuk dua keperluan, sehingga ADM yang mengubah ambang
 * tidak perlu ingat mengubah validasi submit juga.
 */

export type BatasPlafon = { minimum: number; maksimum: number }

export const MIN_ANGGOTA_MAJELIS = 3
export const MAKS_ANGGOTA_MAJELIS = 10

export function batasDariAmbang(
  ambang: { plafonMin: number; plafonMaks: number }[],
): BatasPlafon {
  if (ambang.length === 0) {
    throw new PelanggaranAturan('BR-01', 'Tabel ambang_approval kosong')
  }
  return {
    minimum: Math.min(...ambang.map((a) => a.plafonMin)),
    maksimum: Math.max(...ambang.map((a) => a.plafonMaks)),
  }
}

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

/**
 * BR-01 — dijalankan saat SUBMIT, bukan saat DRAFT disimpan. AO boleh menyimpan
 * draf setengah jadi di lapangan; yang tidak boleh adalah mengirimkannya.
 *
 * Pesannya menyebut KEDUA batas, karena brief mensyaratkan pesan yang
 * "menjelaskan batasnya" — bukan sekadar menyatakan penolakan.
 */
export function validasiBatasPlafon(totalPlafon: number, batas: BatasPlafon): void {
  if (totalPlafon < batas.minimum) {
    throw new PelanggaranAturan(
      'BR-01',
      `Total plafon ${rupiah(totalPlafon)} di bawah batas minimum ${rupiah(batas.minimum)}. Batas yang berlaku: ${rupiah(batas.minimum)} sampai ${rupiah(batas.maksimum)}.`,
    )
  }
  if (totalPlafon > batas.maksimum) {
    throw new PelanggaranAturan(
      'BR-01',
      `Total plafon ${rupiah(totalPlafon)} di atas batas maksimum ${rupiah(batas.maksimum)}. Batas yang berlaku: ${rupiah(batas.minimum)} sampai ${rupiah(batas.maksimum)}.`,
    )
  }
}

/**
 * FR-10 — majelis 3-10 anggota; perorangan tepat 1.
 *
 * Dipanggil juga saat satu anggota ditolak (AC-14): kelompok yang menyusut di
 * bawah 3 anggota aktif harus dibubarkan, bukan dibiarkan menjadi kelompok yang
 * tidak sah.
 */
export function validasiJumlahAnggota(
  jenisNasabah: 'PERORANGAN' | 'KELOMPOK',
  jumlahAktif: number,
): void {
  if (jenisNasabah === 'PERORANGAN') {
    if (jumlahAktif !== 1) {
      throw new PelanggaranAturan(
        'FR-02',
        'Pengajuan perorangan harus memiliki tepat satu anggota',
      )
    }
    return
  }

  if (jumlahAktif < MIN_ANGGOTA_MAJELIS) {
    throw new PelanggaranAturan(
      'FR-10',
      `Pembiayaan kelompok memerlukan minimal ${MIN_ANGGOTA_MAJELIS} anggota aktif. Bubarkan kelompok jika anggota tersisa kurang dari itu.`,
    )
  }
  if (jumlahAktif > MAKS_ANGGOTA_MAJELIS) {
    throw new PelanggaranAturan(
      'FR-10',
      `Pembiayaan kelompok maksimal ${MAKS_ANGGOTA_MAJELIS} anggota`,
    )
  }
}
