/**
 * Util konversi berkas untuk unggahan (FR-03 dokumen, FR-04 survei).
 *
 * PEMILIK: Ray. Kontrak backend menerima konten berkas sebagai base64 di dalam
 * JSON (bukan multipart) — lihat routes/dokumen.ts dan routes/survei.ts — jadi
 * layar mengubah `File` menjadi base64 murni sebelum mengirim. Dipisah ke berkas
 * kecil ini supaya bisa dipakai ulang oleh dokumen & survei tanpa menyentuh
 * `api/client.ts` yang dimiliki Reffa.
 */

/**
 * Ubah `File` menjadi string base64 TANPA prefix data-URL
 * (`data:<mime>;base64,`). Server menerima base64 telanjang dan menyimpan MIME
 * secara terpisah, jadi prefix-nya dibuang di sini.
 */
export function fileKeBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Gagal membaca berkas'))
    reader.onload = () => {
      const hasil = String(reader.result)
      const koma = hasil.indexOf(',')
      resolve(koma >= 0 ? hasil.slice(koma + 1) : hasil)
    }
    reader.readAsDataURL(file)
  })
}
