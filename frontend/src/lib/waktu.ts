/**
 * Format waktu untuk tampilan.
 *
 * SATU TEMPAT, karena keduanya sempat disalin ke dua halaman sekaligus
 * (Dashboard dan Notifikasi). Salinan kedua adalah cara paling mudah membuat
 * dua layar menampilkan waktu yang sama dengan bunyi berbeda — dan yang paling
 * mudah luput, karena keduanya tetap "benar" jika dilihat sendiri-sendiri.
 *
 * ZONA WAKTU DIPAKSA Asia/Jakarta (asumsi A-7), bukan zona waktu browser.
 * Analis di Makassar dan penilai di Jakarta harus melihat jam yang sama untuk
 * peristiwa yang sama; kalau tidak, audit trail dua orang tidak bisa
 * dibandingkan.
 */

const ZONA = 'Asia/Jakarta'

/** Tanggal dan jam lengkap. Dipakai untuk atribut `title`. */
export function waktuLengkap(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    timeZone: ZONA,
    dateStyle: 'full',
    timeStyle: 'short',
  })
}

/**
 * Waktu relatif untuk peristiwa baru, tanggal untuk yang lama.
 *
 * "3 jam lalu" menjawab "apakah ini masih bergerak?". Setelah lewat seminggu
 * pertanyaannya berubah menjadi "kapan tepatnya?", dan yang menjawabnya tanggal.
 */
export function waktuRelatif(iso: string): string {
  const detik = (Date.now() - new Date(iso).getTime()) / 1000

  // Selisih negatif berarti jam server dan jam laptop berbeda. Menampilkan
  // "dalam -3 detik" hanya membingungkan; "baru saja" jujur dan tidak salah.
  if (detik < 60) return 'baru saja'
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`
  if (detik < 7 * 86400) return `${Math.floor(detik / 86400)} hari lalu`

  return new Date(iso).toLocaleDateString('id-ID', {
    timeZone: ZONA,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
