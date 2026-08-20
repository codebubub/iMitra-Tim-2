import { AksesDitolak, KesalahanKonfigurasi, PelanggaranAturan } from '../lib/errors.js'

/**
 * Routing dan urutan approval berjenjang (FR-08, BR-01, BR-02, BR-09).
 *
 * Fungsi murni. Level TIDAK PERNAH dibaca dari kolom: ia dihitung ulang dari
 * total plafon anggota AKTIF setiap kali diperlukan (ADR-0002). Itulah yang
 * membuat AC-14 bekerja — menolak satu anggota mengubah total, dan level ikut
 * berubah tanpa ada kode "evaluasi ulang level" yang harus diingat siapa pun.
 */

export type Peran = 'AO' | 'ANL' | 'KCP' | 'KC' | 'KOM' | 'ADM'

export type BarisAmbangApproval = {
  plafonMin: number
  plafonMaks: number
  urutanPeran: Peran[]
}

export type KeputusanTercatat = {
  level: number
  keputusan: 'APPROVE' | 'REJECT' | 'RETURN'
}

export type AnggotaPlafon = {
  plafonDiajukan: number
  statusAnggota: 'AKTIF' | 'DITOLAK'
}

/**
 * Total plafon = Σ plafon anggota AKTIF. Nilai turunan, tidak pernah disimpan.
 * Perorangan punya tepat satu anggota, jadi jalur kodenya sama (asumsi A-5).
 */
export function hitungTotalPlafon(anggota: AnggotaPlafon[]): number {
  return anggota
    .filter((a) => a.statusAnggota === 'AKTIF')
    .reduce((total, a) => total + a.plafonDiajukan, 0)
}

/**
 * Urutan peran yang harus menyetujui, dari total plafon (Tabel 4.1).
 * Batas bersifat inklusif di kedua ujung sesuai baris di database.
 */
export function urutanApprovalUntuk(
  totalPlafon: number,
  ambang: BarisAmbangApproval[],
): Peran[] {
  const baris = ambang.find((a) => totalPlafon >= a.plafonMin && totalPlafon <= a.plafonMaks)
  if (!baris) {
    throw new KesalahanKonfigurasi(
      `Tidak ada baris ambang_approval yang mencakup total plafon ${totalPlafon}. Periksa parameter: rentang tidak boleh berlubang.`,
    )
  }
  return baris.urutanPeran
}

/**
 * Level yang sedang menunggu keputusan, 1-berbasis.
 * Mengembalikan null bila seluruh level sudah APPROVE (pengajuan selesai).
 *
 * REJECT dan RETURN bersifat menghentikan — keduanya tidak menaikkan level.
 */
export function levelBerjalan(keputusan: KeputusanTercatat[], jumlahLevel: number): number | null {
  const disetujui = keputusan
    .filter((k) => k.keputusan === 'APPROVE')
    .map((k) => k.level)
  const tertinggi = disetujui.length > 0 ? Math.max(...disetujui) : 0
  const berikutnya = tertinggi + 1
  return berikutnya > jumlahLevel ? null : berikutnya
}

/**
 * BR-09 — pembuat pengajuan tidak boleh menjadi penyetuju, apa pun perannya.
 *
 * Diperiksa DI SINI, bukan di middleware peran, karena ia membandingkan identitas
 * pembuat objek — bukan peran. Middleware tidak punya informasi itu.
 *
 * Dipanggil service SEBELUM apa pun disimpan (AC-11).
 */
export function pastikanBukanMaker(dibuatOleh: string, aktorId: string): void {
  if (dibuatOleh === aktorId) {
    throw new AksesDitolak(
      'Anda adalah pembuat pengajuan ini dan tidak dapat menyetujuinya (BR-09)',
    )
  }
}

/**
 * BR-02 — approval harus berurutan, dan hanya peran pada level berjalan yang
 * boleh memutuskan.
 *
 * Dua kegagalan yang berbeda dan tidak boleh disamakan:
 *   - peran benar tetapi giliran belum tiba  -> 422 BR-02 (AC-10)
 *   - peran memang tidak ada di jalur ini    -> 403
 */
export function pastikanBolehMemutuskan(
  peranAktor: Peran,
  urutan: Peran[],
  keputusan: KeputusanTercatat[],
): number {
  const level = levelBerjalan(keputusan, urutan.length)
  if (level === null) {
    throw new PelanggaranAturan('BR-02', 'Seluruh level approval sudah memberi keputusan')
  }

  const peranDiharapkan = urutan[level - 1]
  if (peranAktor === peranDiharapkan) return level

  const posisiAktor = urutan.indexOf(peranAktor)
  if (posisiAktor === -1) {
    throw new AksesDitolak(
      `Peran ${peranAktor} tidak berada pada jalur approval pengajuan ini`,
    )
  }

  // Peran ada di jalur, tetapi gilirannya belum tiba. Ini AC-10.
  throw new PelanggaranAturan(
    'BR-02',
    `Menunggu keputusan ${peranDiharapkan} terlebih dahulu`,
  )
}

/** BR-01 — alasan wajib untuk REJECT dan RETURN. */
export function pastikanAlasanLengkap(
  keputusan: 'APPROVE' | 'REJECT' | 'RETURN',
  alasan: string | undefined | null,
): void {
  if (keputusan === 'APPROVE') return
  if ((alasan ?? '').trim().length < 5) {
    throw new PelanggaranAturan(
      'FR-08',
      `Alasan wajib diisi untuk keputusan ${keputusan}`,
    )
  }
}
