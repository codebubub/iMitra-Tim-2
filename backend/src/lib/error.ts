import { GalatAplikasi } from './errors.js'

/**
 * LAPISAN KOMPATIBILITAS — jangan dipakai untuk kode baru.
 *
 * Berkas ini ada supaya modul yang ditulis Alfian (`middleware/auth.ts`,
 * `services/slik.service.ts`, `routes/slik.ts`, `routes/skoring.ts`,
 * `routes/parameter.ts`) tetap jalan tanpa perlu ditulis ulang, sementara
 * seluruh repo memakai satu hierarki galat yang sama — yaitu `lib/errors.ts`.
 *
 * `ImitraError` di bawah BUKAN kelas terpisah: ia turunan `GalatAplikasi`,
 * sehingga `middleware/error.ts` menanganinya lewat jalur yang sama, dan
 * bentuk respons API tetap seragam (SDD BAB 5.1).
 *
 * KODE BARU memakai kelas spesifik dari `lib/errors.ts`:
 *   ValidasiGagal · TidakTerautentikasi · AksesDitolak · TidakDitemukan ·
 *   PelanggaranAturan · TransisiTidakSah · SlikTidakTersedia · KesalahanKonfigurasi
 *
 * Alasannya: kelas spesifik membawa kode HTTP dan kode BR-nya sendiri, sehingga
 * pemanggil tidak bisa lupa mengisinya. `ImitraError` menyerahkan itu ke
 * pemanggil, dan yang diserahkan ke pemanggil suatu saat akan salah.
 *
 * Berkas ini dihapus setelah keenam berkas di atas dipindahkan ke kelas spesifik.
 */
export class ImitraError extends GalatAplikasi {
  constructor(kode: string, pesan: string, statusCode = 500, rule?: string) {
    super(kode, pesan, statusCode, rule)
  }

  /** Bentuk respons yang sama dengan yang dihasilkan middleware/error.ts. */
  toJSON(): { error: string; message: string; rule?: string } {
    return {
      error: this.kode,
      message: this.message,
      ...(this.rule ? { rule: this.rule } : {}),
    }
  }

  /** Alias `status`, dipakai kode Alfian sebagai `statusCode`. */
  get statusCode(): number {
    return this.status
  }
}
