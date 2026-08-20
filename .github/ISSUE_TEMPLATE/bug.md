---
name: Bug
about: Perilaku yang salah pada fitur yang sudah ada
title: "[BUG] "
labels: bug
assignees: ''
---

## Ringkasan

<!-- ISI: satu kalimat. Apa yang salah, di mana. -->

## Langkah reproduksi

<!-- ISI: langkah yang bisa diikuti orang lain sampai bug muncul. Sertakan akun/peran yang
     dipakai dan NIK dari fixtures/nasabah-uji.csv kalau relevan. Bug tanpa langkah
     reproduksi akan dikembalikan, bukan dikerjakan. -->

1.
2.
3.

**Akun / peran yang dipakai**: <!-- ISI: AO / ANL / KCP / KC / KOM / ADM -->
**Data yang dipakai**: <!-- ISI: NIK dari fixtures, plafon, tenor, akad -->

## Hasil yang diharapkan

<!-- ISI: sebutkan dasarnya — AC-xx atau BR-xx. Kalau tidak ada dasarnya di brief, sebutkan
     asumsi yang dipakai; mungkin ini bukan bug, melainkan requirement yang belum jelas. -->

## Hasil aktual

<!-- ISI: apa yang benar-benar terjadi. Sertakan kode HTTP dan isi respons kalau ini bug API.
     JANGAN menempelkan log yang memuat NIK atau data pribadi (BR-11) — sensor bagian itu. -->

## Bukti

<!-- ISI: potongan log yang sudah disensor, tangkapan layar, atau respons API. -->

## Dampak

- **Severity**: <!-- ISI: Blocker (demo tidak bisa jalan) / Mayor (AC gagal) / Minor (kosmetik) -->
- **AC yang gagal karena bug ini**: <!-- ISI: mis. AC-09. Tulis "tidak ada" kalau tidak ada -->
- **FR terkait**: <!-- ISI -->

## Apakah bug ini berasal dari kode hasil AI?

<!-- ISI: jawab jujur. Ini bukan untuk menyalahkan siapa pun — pola kegagalan AI adalah
     bahan penilaian yang paling bernilai, dan jawaban "ya" di sini adalah bahan mentah untuk
     entri AI-DEVLOG.md. -->

- **Dari kode AI?** <!-- ISI: Ya / Tidak / Tidak tahu -->
- **Kalau ya — tool/model**: <!-- ISI -->
- **Kalau ya — entri devlog terkait**: DEVLOG-<!-- ISI: nomor, atau "belum dibuat" -->
- **Kenapa lolos review**: <!-- ISI: kalau ya. Ini bagian yang paling berguna: apakah test-nya
  hijau padahal salah? apakah reviewer tidak menjalankan langkahnya? -->
- **Perlu aturan baru di `AGENTS.md`?** <!-- ISI: Ya (sebutkan aturannya) / Tidak -->

## Lingkungan

- **Ditemukan di**: <!-- ISI: lokal / branch mana / commit atau tag mana -->
- **Ditemukan oleh**: <!-- ISI: nama -->
- **Waktu**: <!-- ISI -->
