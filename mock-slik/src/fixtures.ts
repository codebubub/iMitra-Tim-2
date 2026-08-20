import { readFileSync } from 'node:fs'

/**
 * Satu baris data SLIK, dibaca dari fixtures/nasabah-uji.csv.
 *
 * Berkas CSV di-mount read-only ke container (lihat docker-compose.yml) dan dibaca
 * saat start. Isinya TIDAK disalin ke dalam kode — kalau fixtures berubah, mock ikut
 * berubah tanpa perlu mengubah berkas ini.
 */
export type BarisSlik = {
  nik: string
  nama: string
  kolektibilitas: number
  jumlahFasilitasAktif: number
  totalBakiDebet: number
}

/** NIK khusus dari fixtures yang memaksa cabang error. Jangan diubah. */
export const NIK_PEMICU_404 = '3404999999999999'
export const NIK_PEMICU_503 = '3404000000000503'

/**
 * Pembaca CSV seadanya: cukup untuk berkas fixtures kami, yang hanya memakai tanda
 * kutip pada kolom terakhir (`skenario`). Sengaja tidak memakai pustaka CSV — brief
 * dan AGENTS.md melarang menambah dependensi tanpa alasan kuat.
 */
function pisahBaris(baris: string): string[] {
  const kolom: string[] = []
  let sekarang = ''
  let dalamKutip = false

  for (const ch of baris) {
    if (ch === '"') {
      dalamKutip = !dalamKutip
    } else if (ch === ',' && !dalamKutip) {
      kolom.push(sekarang)
      sekarang = ''
    } else {
      sekarang += ch
    }
  }
  kolom.push(sekarang)
  return kolom.map((k) => k.trim())
}

/**
 * Memuat fixtures menjadi peta NIK -> data. Baris dengan kolektibilitas `-`
 * (NIK pemicu 404 dan 503) sengaja TIDAK dimuat: keduanya memang tidak boleh
 * mengembalikan 200.
 */
export function muatFixtures(path: string): Map<string, BarisSlik> {
  const isi = readFileSync(path, 'utf8')
  const baris = isi.split(/\r?\n/).filter((b) => b.trim().length > 0)
  const header = pisahBaris(baris[0])
  const idx = (nama: string) => header.indexOf(nama)

  const peta = new Map<string, BarisSlik>()

  for (const b of baris.slice(1)) {
    const kolom = pisahBaris(b)
    const kolektibilitas = kolom[idx('kolektibilitas')]
    if (kolektibilitas === '-' || kolektibilitas === '') continue

    const nik = kolom[idx('nik')]
    peta.set(nik, {
      nik,
      nama: kolom[idx('nama')],
      kolektibilitas: Number(kolektibilitas),
      jumlahFasilitasAktif: Number(kolom[idx('jumlah_fasilitas_aktif')]),
      totalBakiDebet: Number(kolom[idx('total_baki_debet')]),
    })
  }

  return peta
}
