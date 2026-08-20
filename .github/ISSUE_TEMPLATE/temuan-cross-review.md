---
name: Temuan Cross-Review
about: Temuan dari sesi cross-review antar tim (Jumat 16.05-16.30) — dibuka di repo tim lawan
title: "[CROSS-REVIEW] "
labels: cross-review
assignees: ''
---

<!-- Dipakai pada sesi cross-review Jumat 16.05-16.30. Setiap tim membuka 3 issue nyata di
     repo tim lawan.

     Aturan sesi ini:
     - Temuan yang bernilai adalah temuan yang bisa direproduksi. Brief §12 memberi bonus
       +2 per bug nyata yang ditemukan dengan langkah reproduksi (maksimum +4).
     - Pendapat tentang gaya kode, pilihan framework, atau selera UI bukan temuan.
       Kalau tidak ada langkah reproduksi dan tidak ada aturan yang dilanggar, jangan
       dibuka sebagai issue.
     - Tulis dengan nada yang sama seperti Anda ingin menerima temuan di repo Anda sendiri.
       Ini review kode antar kolega, bukan kompetisi menjatuhkan. -->

## Ringkasan temuan

<!-- ISI: satu kalimat. -->

## Severity

<!-- ISI: pilih satu dan hapus sisanya. Severity yang dinaikkan tanpa dasar akan diturunkan
     oleh instruktur saat verifikasi. -->

- [ ] **Blocker** — aplikasi tidak bisa dijalankan, atau AC P0 tidak bisa dieksekusi sama sekali
- [ ] **Mayor** — AC gagal, aturan bisnis (BR-xx) dilanggar, atau otorisasi bisa ditembus
- [ ] **Minor** — perilaku salah dengan dampak terbatas, atau ketidaksesuaian dengan SDD sendiri
- [ ] **Catatan** — bukan bug, tetapi risiko yang layak diketahui pemilik repo

## Kategori

<!-- ISI: pilih satu. -->

- [ ] Aturan bisnis (sebutkan BR-xx)
- [ ] Otorisasi / keamanan (mis. endpoint mengembalikan 200 padahal seharusnya 403)
- [ ] Data pribadi (BR-11: NIK atau foto muncul di log, pesan error, atau URL)
- [ ] Jalur error integrasi SLIK (timeout, 503, 404 ditangani salah)
- [ ] Audit trail (bisa diubah atau dihapus, atau tidak mencatat aktor/timestamp)
- [ ] Parameter di-hardcode padahal wajib dari data (FR-13, AC-15)
- [ ] Ketidaksesuaian antara kode dan dokumen sendiri (SRS/SDD/README)
- [ ] Lain-lain

## Aturan / kriteria yang dilanggar

<!-- ISI: rujuk ID persis dari brief: AC-xx, BR-xx, FR-xx, atau ketentuan wajib §7.2.
     Temuan tanpa rujukan sulit diverifikasi instruktur. -->

- **AC / BR / FR**:
- **Kutipan aturannya**:

## Langkah reproduksi

<!-- ISI: wajib. Langkah yang bisa diikuti pemilik repo di mesinnya sendiri, dari kondisi
     setelah seed. Sebutkan akun/peran dan NIK dari fixtures/nasabah-uji.csv. -->

1.
2.
3.

**Akun / peran**: <!-- ISI -->
**Data yang dipakai**: <!-- ISI: NIK dari fixtures, plafon, tenor, akad -->

## Hasil yang diharapkan vs aktual

- **Diharapkan** (menurut AC/BR yang dirujuk di atas): <!-- ISI -->
- **Aktual**: <!-- ISI: sertakan kode HTTP dan isi respons kalau ini bug API. Sensor data
  pribadi sebelum menempel log -->

## Lokasi di kode

<!-- ISI: berkas dan baris, kalau bisa ditemukan. Tautan permalink GitHub ke baris tersebut
     (tekan 'y' di GitHub untuk mendapat tautan yang menunjuk commit tetap) sangat membantu.
     Kalau tidak menemukan lokasinya, tulis "tidak ditemukan" — temuan tetap sah selama
     langkah reproduksinya jelas. -->

- **Berkas**:
- **Baris**:
- **Commit / tag yang diperiksa**: <!-- ISI: sebaiknya tag v1.0.0 -->

## Saran perbaikan (opsional)

<!-- ISI: kalau ada. Satu atau dua baris. Ini issue di repo orang lain — saran, bukan perintah. -->

## Tim penemu

- **Tim**: <!-- ISI: nama tim penemu -->
- **Ditemukan oleh**: <!-- ISI: nama anggota -->
- **Waktu**: <!-- ISI -->
- **Cara menemukan**: <!-- ISI: mis. "membaca daftar route dan mencoba endpoint verifikasi
  sebagai AO", atau "menjalankan DEMO-SCRIPT tim lawan pada baris AC-06". Berguna bagi kedua
  tim di retrospektif -->

---

<!-- Untuk pemilik repo: kalau temuan ini valid, jangan menutupnya tanpa keterangan.
     Balas dengan konfirmasi dan, kalau tidak sempat diperbaiki sebelum penilaian,
     catat di README.md bagian "Tidak diimplementasikan dan mengapa" atau sebagai
     utang teknis yang disadari. -->
