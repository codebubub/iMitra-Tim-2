/**
 * Klien API margin / nisbah (FR-07, layar S-10).
 *
 * PEMILIK: Eka. Kontrak: docs/SDD-iMitra.md BAB 5. Backend: Alfian.
 *
 * CATATAN KONTRAK (per 2026-08-20, saat berkas ini ditulis):
 * `POST /api/pengajuan/{id}/margin` ada di kontrak beku BAB 5 tetapi BELUM
 * terdaftar di backend/src/routes/ — tidak ada routes/margin.ts. Layar S-10
 * dibangun terhadap kontrak, bukan terhadap ketiadaan endpoint, dan menangani
 * galatnya secara jujur: bila server menjawab 404/501, layar menampilkannya
 * sebagai galat, BUKAN sebagai "margin tersimpan". Ini dilaporkan ke Alfian
 * sebagai temuan, bukan ditutup dengan data tiruan.
 *
 * ATURAN YANG DIWAKILI BERKAS INI — BR-06:
 * Nilai di luar rentang DIBLOKIR, bukan diberi peringatan. Karena itu di sini
 * TIDAK ADA parameter `paksa`, `abaikanPeringatan`, atau `simpanSebagaiPengecualian`.
 * Kalau suatu saat ada yang menambahkannya, itu pelanggaran BR-06 dan harus
 * ditolak saat review.
 */
import { api } from './client'

export type Akad = 'MURABAHAH' | 'MUSYARAKAH'

/**
 * Rentang yang berlaku untuk satu pengajuan, DIHITUNG SERVER dari tabel
 * rentang_margin dan grade final. Layar menampilkan angka ini apa adanya —
 * tidak ada rentang yang ditulis di frontend (risiko R-8, larangan nomor 3).
 */
export type RentangBerlaku = {
  grade: number
  akad: Akad
  /** null untuk grade yang tidak dibiayai (grade 5, BR-05). */
  min: number | null
  maks: number | null
  dibiayai: boolean
}

export type HasilMargin = {
  pengajuanId: string
  grade: number
  akad: Akad
  /** Terisi untuk MURABAHAH. */
  marginPersen: number | null
  /** Terisi untuk MUSYARAKAH. */
  nisbahBankPersen: number | null
  rentang: RentangBerlaku
}

/** GET /api/pengajuan/{id}/margin — nilai tersimpan + rentang yang berlaku. */
export function ambilMargin(pengajuanId: string): Promise<HasilMargin> {
  return api<HasilMargin>(`/api/pengajuan/${pengajuanId}/margin`)
}

/**
 * POST /api/pengajuan/{id}/margin — tetapkan margin (murabahah) atau nisbah
 * (musyarakah). Di luar rentang → 422 dengan `rule: "BR-06"` (AC-09).
 *
 * Hanya SATU dari dua field diisi, sesuai akad pengajuan.
 */
export function tetapkanMargin(
  pengajuanId: string,
  input: { marginPersen?: number; nisbahBankPersen?: number },
): Promise<HasilMargin> {
  return api<HasilMargin>(`/api/pengajuan/${pengajuanId}/margin`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
