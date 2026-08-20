<!-- Template PR iMitra. Hapus baris petunjuk (yang di dalam komentar) kalau mengganggu,
     tetapi jangan hapus judul bagiannya. PR yang bagian AI-nya kosong akan diminta
     dilengkapi sebelum di-review. -->

## Issue terkait

Closes #<!-- ISI: nomor issue -->

<!-- Satu issue = satu branch = satu PR. Kalau PR ini tidak punya issue, buat issue-nya
     lebih dulu — board harus mencerminkan pekerjaan nyata. -->

## FR / AC yang dikerjakan

- **FR**: <!-- ISI: mis. FR-06 -->
- **AC yang dipenuhi**: <!-- ISI: mis. AC-07, AC-08 -->
- **BR yang ditegakkan**: <!-- ISI: mis. BR-07, BR-08. Tulis "tidak ada" kalau memang tidak ada -->
- **Prioritas**: <!-- ISI: P0 / P1 / P2 -->

## Ringkasan perubahan

<!-- ISI: 3-6 baris. Apa yang berubah dan mengapa, bukan daftar berkas — daftar berkas sudah
     ada di tab Files changed. Kalau ada keputusan desain yang diambil di PR ini, sebutkan
     (dan kalau keputusannya besar, buat ADR). -->

## Cara menguji

<!-- ISI: langkah yang bisa dijalankan reviewer, bukan "jalankan test". Sebutkan akun yang
     dipakai, NIK dari fixtures/nasabah-uji.csv kalau relevan, dan hasil yang diharapkan.
     Reviewer wajib bisa memverifikasi tanpa bertanya. -->

1.
2.
3.

**Perintah test yang relevan**:

```bash
<!-- ISI -->
```

## Bagian AI

<!-- Bagian ini wajib. Brief §9 menempatkan disiplin rekayasa berbantuan AI pada bobot
     terbesar, dan jejaknya dikumpulkan dari sini. -->

- **Apakah AI dipakai di PR ini?** <!-- ISI: Ya / Tidak -->
- **Tool & model**: <!-- ISI: mis. 9Router -> Claude Opus; VSCode + Copilot; Hermes IDE; Antigravity -->
- **Untuk bagian apa**: <!-- ISI: mis. draf service + 4 unit test; hanya boilerplate DTO -->
- **Entri devlog**: DEVLOG-<!-- ISI: nomor. Wajib ada kalau AI dipakai. Kalau belum dibuat,
  buat dulu sebelum meminta review -->
- **Apa yang diverifikasi manual**: <!-- ISI: sebutkan langkah konkret. "Sudah dibaca dan
  kelihatan benar" bukan verifikasi. Contoh yang memadai: menjalankan AC-09 lewat API,
  mengubah baris parameter di database dan menjalankan ulang untuk memastikan nilai dibaca
  dari data, memeriksa log tidak memuat NIK -->
- **Apa yang AI salah (kalau ada)**: <!-- ISI: kalau ada, pastikan ada di devlog -->

## Checklist self-review

<!-- Centang hanya yang benar-benar sudah dilakukan. Reviewer akan memeriksa acak. -->

- [ ] Test lolos secara lokal (bukan "seharusnya lolos") dan CI hijau di PR ini
- [ ] Lint bersih
- [ ] Ada minimal satu test yang diturunkan dari **AC**, bukan dari kode yang baru ditulis
- [ ] Test batas ditambahkan kalau perubahan menyentuh ambang (plafon, skor/grade, rentang margin)
- [ ] Tidak ada secret, kredensial, token, atau berkas `.env` yang ter-commit
- [ ] Otorisasi ditegakkan di **server** untuk endpoint baru/berubah, bukan hanya di UI
- [ ] Tidak ada NIK, nomor dokumen, atau path foto di log, pesan error, atau URL (BR-11)
- [ ] Migrasi disertakan kalau skema berubah, dan **tidak** mengubah migrasi yang sudah di-merge
- [ ] Seed masih idempoten (dijalankan dua kali tanpa error) kalau seed disentuh
- [ ] Tidak ada parameter bisnis yang di-hardcode (ambang approval, bobot skor, rentang
      margin, batas plafon) — semuanya dibaca dari tabel parameter
- [ ] Tidak ada dependensi baru; atau ada, dan sudah disetujui Tech Lead (sebutkan di mana)
- [ ] `docs/TRACEABILITY.md` diperbarui untuk FR yang disentuh
- [ ] Tabel status FR di `README.md` diperbarui kalau statusnya berubah
- [ ] `AGENTS.md` diperbarui kalau PR ini memunculkan aturan baru untuk agent
- [ ] Ukuran PR masih bisa direview (kalau > 400 baris, jelaskan mengapa tidak bisa dipecah)

## Permintaan untuk reviewer

<!-- ISI: sebutkan apa yang paling Anda ingin diperiksa. Ini menghemat waktu reviewer dan
     menaikkan mutu review. Contoh: "tolong periksa apakah pembulatan di service skoring
     benar-benar hanya sekali di akhir (BR-07)", atau "tolong coba akses endpoint ini
     sebagai AO dan pastikan 403". -->

- Fokus review:
- Bagian yang saya sendiri tidak yakin:
- Reviewer yang diminta: @<!-- ISI: minimal 1 anggota lain. Pembuat PR tidak boleh menyetujui PR-nya sendiri -->
