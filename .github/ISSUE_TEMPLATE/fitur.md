---
name: Fitur
about: Satu FR atau satu bagian FR yang bisa diselesaikan dalam satu PR
title: "[FR-xx] "
labels: fitur
assignees: ''
---

<!-- Satu issue = satu branch = satu PR. Kalau issue ini terasa butuh lebih dari satu PR,
     pecah menjadi beberapa issue sekarang, bukan nanti. -->

## FR ID

<!-- ISI: mis. FR-06. Kalau ini sub-bagian, tulis FR-06 (bagian: rincian komponen skor). -->

- **FR**:
- **Prioritas**: <!-- ISI: P0 / P1 / P2. P2 tidak dikerjakan sebelum P0 dan P1 tuntas dan teruji -->
- **Aktor**: <!-- ISI: AO / ANL / KCP / KC / KOM / ADM / Sistem -->

## AC terkait

<!-- ISI: ID AC dari brief §5, mis. AC-07, AC-08. Kalau tidak ada AC yang merujuk FR ini
     (FR-11 dan FR-12), tulis kriteria verifikasi Anda sendiri di sini — issue tanpa kriteria
     verifikasi tidak bisa dinyatakan selesai oleh siapa pun. -->

-

## Aturan bisnis yang harus ditegakkan

<!-- ISI: ID BR dari brief §4, mis. BR-07, BR-08. Sebutkan juga di mana nilai parameternya
     dibaca (nama tabel), supaya tidak ada yang meng-hardcode. -->

-

## Deskripsi

<!-- ISI: apa yang harus ada setelah issue ini selesai. Tulis dari sudut pandang perilaku
     sistem, bukan daftar berkas yang akan dibuat. -->

## Definition of Done

<!-- Centang saat benar-benar selesai. Issue tidak dipindahkan ke Done sebelum semuanya
     tercentang. -->

- [ ] Implementasi selesai dan di-merge ke `main` lewat PR yang direview
- [ ] AC terkait lolos, diverifikasi manual minimal sekali
- [ ] Ada test otomatis yang diturunkan dari AC (bukan dari kode)
- [ ] Test batas ada kalau menyentuh ambang (plafon, skor/grade, rentang margin)
- [ ] Otorisasi server-side diperiksa untuk endpoint yang terlibat
- [ ] Tidak ada parameter bisnis yang di-hardcode
- [ ] `docs/TRACEABILITY.md` diperbarui (endpoint, file test, PR, status)
- [ ] Tabel status FR di `README.md` diperbarui
- [ ] Ada baris di `docs/DEMO-SCRIPT.md` kalau AC ini akan didemokan
- [ ] Entri `docs/AI-DEVLOG.md` dibuat kalau AI dipakai
- [ ] CI hijau

## Estimasi

- **Estimasi waktu**: <!-- ISI: dalam jam atau setengah jam. Estimasi > 3 jam biasanya berarti
  issue ini terlalu besar untuk 9 jam koding — pecah -->
- **Assignee**: <!-- ISI: satu orang. Dua orang di satu issue berarti issue ini perlu dipecah -->
- **Bergantung pada issue**: <!-- ISI: nomor issue yang harus selesai lebih dulu, atau "tidak ada" -->
- **Target selesai**: <!-- ISI: mis. Kamis 15.00 (sebelum Gate 2) / Jumat 11.20 (sebelum Gate 3) -->

## Catatan teknis

<!-- ISI: opsional. Endpoint yang direncanakan, tabel yang disentuh, berkas yang akan diubah.
     Berguna untuk menghindari dua orang menyentuh berkas yang sama (brief §13 butir 5). -->
