/**
 * Kelas galat aplikasi. Satu-satunya tempat kode HTTP dipetakan adalah
 * middleware/error.ts — kelas di sini hanya membawa maknanya.
 *
 * Aturan yang tidak boleh dilanggar (AGENTS.md bagian 4.3):
 *   - Jangan menelan exception. `catch` kosong dilarang, khususnya di jalur SLIK.
 *   - Pesan galat TIDAK BOLEH memuat NIK, nomor dokumen, atau path berkas (BR-11).
 *     Pakai id internal pengajuan untuk korelasi.
 */

export class GalatAplikasi extends Error {
  constructor(
    readonly kode: string,
    message: string,
    readonly status: number,
    readonly rule?: string,
  ) {
    super(message)
    this.name = new.target.name
  }
}

/** 400 — bentuk input salah. Sebutkan field yang bermasalah. */
export class ValidasiGagal extends GalatAplikasi {
  constructor(message: string, readonly field?: string) {
    super('VALIDASI_GAGAL', message, 400)
  }
}

/** 401 — belum login atau token tidak valid. */
export class TidakTerautentikasi extends GalatAplikasi {
  constructor(message = 'Sesi tidak valid atau sudah berakhir') {
    super('TIDAK_TERAUTENTIKASI', message, 401)
  }
}

/**
 * 403 — sudah login tetapi tidak berwenang. AC-02 menguji ini secara langsung:
 * AO yang memanggil endpoint verifikasi dokumen harus mendapat 403, bukan 200
 * dan bukan 404.
 */
export class AksesDitolak extends GalatAplikasi {
  constructor(message = 'Peran Anda tidak berwenang atas aksi ini') {
    super('AKSES_DITOLAK', message, 403)
  }
}

/** 404 — sumber daya tidak ada. */
export class TidakDitemukan extends GalatAplikasi {
  constructor(message = 'Data tidak ditemukan') {
    super('TIDAK_DITEMUKAN', message, 404)
  }
}

/**
 * 422 — pelanggaran aturan bisnis. Kode BR WAJIB diisi: AC-04 memeriksa bahwa
 * pesan menyebut BR-03, dan AC-09 memeriksa BR-06.
 */
export class PelanggaranAturan extends GalatAplikasi {
  constructor(rule: string, message: string) {
    super('ATURAN_BISNIS_DILANGGAR', message, 422, rule)
  }
}

/** 422 — transisi status yang tidak ada di tabel transisi status.service.ts. */
export class TransisiTidakSah extends GalatAplikasi {
  constructor(dari: string, ke: string) {
    super('TRANSISI_TIDAK_SAH', `Status tidak dapat berpindah dari ${dari} ke ${ke}`, 422)
  }
}

/**
 * 502 — mock SLIK tidak menjawab sebagaimana mestinya. Sengaja BUKAN 500:
 * ini kegagalan sistem lain, dan ANL perlu tahu bedanya.
 */
export class SlikTidakTersedia extends GalatAplikasi {
  constructor(readonly sebab: 'UNAVAILABLE' | 'TIMEOUT') {
    super('SLIK_TIDAK_TERSEDIA', 'Layanan SLIK tidak tersedia. Coba lagi.', 502)
  }
}

/**
 * 500 — parameter yang wajib ada di database ternyata tidak ada. Sengaja gagal
 * keras: melanjutkan dengan nilai tebakan berarti keputusan pembiayaan diambil
 * dari angka yang tidak pernah disetujui siapa pun.
 */
export class KesalahanKonfigurasi extends GalatAplikasi {
  constructor(message: string) {
    super('KONFIGURASI_TIDAK_LENGKAP', message, 500)
  }
}
