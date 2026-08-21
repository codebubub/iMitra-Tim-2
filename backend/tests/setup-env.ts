/**
 * Mengarahkan test ke schema TEST sebelum satu pun modul aplikasi di-import.
 *
 * `docs/SETUP.md` bagian 5 menyatakan test integrasi memakai `DATABASE_URL_TEST`
 * (schema `test_<nama>`) supaya test tidak menyentuh data kerja. Yang menegakkan
 * janji itu tidak pernah ada: backend hanya membaca `DATABASE_URL`, jadi test
 * selama ini menulis ke schema kerja — dokumen dan kelakuan berbeda, dan yang
 * kalah adalah data orang.
 *
 * URUTANNYA PENTING. `src/config/env.ts` dan `src/lib/prisma.ts` membaca
 * variabel lingkungan SAAT DI-IMPORT. Berkas ini terdaftar sebagai `setupFiles`
 * vitest, yang dijalankan sebelum berkas test (dan karenanya sebelum aplikasi)
 * di-import — satu-satunya titik yang masih sempat mengubahnya.
 *
 * Kalau `DATABASE_URL_TEST` tidak diisi, test tetap jalan memakai `DATABASE_URL`
 * seperti sebelumnya. Menggagalkan seluruh test karena satu variabel opsional
 * akan membuat orang mematikan berkas ini, bukan mengisi variabelnya.
 */
const urlTest = process.env.DATABASE_URL_TEST

if (urlTest && urlTest.trim() !== '') {
  process.env.DATABASE_URL = urlTest
}
