# ADR-0002: Plafon disimpan per anggota; total plafon dan level approval dihitung saat dibaca

- **Status**: Accepted
- **Tanggal**: 2026-08-20
- **Pengambil keputusan**: Tech Lead — Firman
- **Terkait**: FR-02, FR-08, FR-10; BR-01, BR-02; **AC-10, AC-14**; `docs/SDD-iMitra.md` BAB 3.1 dan 4.1; DEVLOG-`<!-- ISI: nomor entri saat model data dikritik -->`

---

## Konteks

Brief §1.3 butir 2 menyatakan satu pengajuan bisa mencakup 3–10 anggota, dan bahwa level
approval ditentukan dari **total plafon kelompok**, bukan per anggota. AC-14 menuntut
perilaku yang lebih spesifik lagi, dengan angka:

> Pengajuan kelompok 4 anggota, total Rp 240.000.000, membutuhkan **3 level**. Setelah satu
> anggota Rp 60.000.000 ditolak, total menjadi Rp 180.000.000 dan level yang diperlukan
> turun menjadi **2**.

Rancangan awal kami menyimpan `plafon_diajukan` sebagai satu kolom di tabel `pengajuan`,
persis seperti pada iLoan Commercial yang nasabahnya tunggal. Ketika kami mengujinya
terhadap angka AC-14 di papan tulis, rancangan itu gagal pada langkah kedua: dengan plafon
hanya di tingkat pengajuan, tidak ada tempat menyimpan Rp 60.000.000 milik anggota yang
ditolak, sehingga Rp 180.000.000 hanya bisa **ditulis ulang secara manual**, bukan dihitung.

Tekanan lain yang berlaku saat keputusan ini diambil:

- Migrasi pertama belum ditulis. Mengubah rancangan sekarang berbiaya nol; mengubahnya
  besok berarti membuang migrasi yang sudah dijalankan lima orang.
- Level approval dibaca di banyak tempat: layar detail, antrian approver, validasi
  keputusan, dan dashboard. Kalau ia berupa kolom tersimpan, keempatnya harus disinkronkan.
- Brief §12 memberi bobot 15 untuk "Kualitas kode & arsitektur" dengan pertanyaan
  "apakah aturan bisnis di tempat yang benar".

---

## Keputusan

1. **`plafon_diajukan` disimpan pada `pengajuan_anggota`, tidak pernah pada `pengajuan`.**
2. **Nasabah perorangan adalah pengajuan dengan tepat satu `pengajuan_anggota`.** Tidak ada
   dua jalur kode untuk perorangan dan kelompok.
3. **`total_plafon` dan `level_approval_diperlukan` tidak disimpan sebagai kolom.** Keduanya
   dihitung setiap kali dibaca: total = Σ `plafon_diajukan` anggota berstatus `AKTIF`;
   level = hasil pencocokan total terhadap tabel `ambang_approval`.

Yang **tidak** termasuk keputusan ini: bagaimana anggota ditolak (itu FR-10), dan apakah
kelompok boleh menyusut di bawah 3 anggota (aturannya ada di SRS BAB 3, FR-10).

---

## Alasan

- **AC-14 menjadi konsekuensi, bukan fitur.** Menolak satu anggota hanyalah mengubah
  `status_anggota` menjadi `DITOLAK`. Total dan level berubah dengan sendirinya karena
  keduanya dihitung dari data yang tersisa. Tidak ada kode "evaluasi ulang level" yang harus
  ditulis, dipanggil di tempat yang tepat, dan diingat oleh orang berikutnya.
- **Nilai turunan yang disimpan akan basi persis pada skenario yang diuji penilai.** Kolom
  `level_approval_diperlukan` benar sampai detik anggota ditolak, lalu salah — dan salahnya
  tidak terlihat sampai seseorang membuka layar approval. Ini kelas bug yang lolos jalur
  bahagia dan muncul tepat saat demo.
- **Satu jalur kode untuk perorangan dan kelompok.** Kalau perorangan memakai kolom di
  `pengajuan` dan kelompok memakai tabel anggota, total plafon dihitung di dua tempat, dan
  BR-01 harus divalidasi dua kali dengan dua cara. Dua implementasi satu aturan berarti
  suatu saat keduanya akan berbeda.
- **Biaya kinerjanya nol pada skala ini.** Maksimum 10 anggota per pengajuan; `SUM` atas
  indeks `pengajuan_anggota(pengajuan_id)` tidak terukur dibanding round-trip HTTP.

---

## Konsekuensi

**Menjadi lebih mudah**:

- AC-14 lolos tanpa kode khusus; test-nya hanya perlu menolak satu anggota lalu membaca
  ulang detail pengajuan.
- BR-01 (batas Rp 5 juta – Rp 500 juta) divalidasi terhadap satu nilai — total — apa pun
  jenis nasabahnya.
- Menambah atau mengubah ambang approval cukup dengan mengubah baris `ambang_approval`;
  tidak ada baris pengajuan yang perlu dihitung ulang secara massal.

**Menjadi lebih sulit / risiko yang diterima**:

- Setiap pembacaan pengajuan wajib menyertakan anggotanya. Query yang lupa melakukannya akan
  menghasilkan total `0`. Mitigasi: hanya `repositories/pengajuan.repo.ts` yang boleh
  membaca pengajuan, dan ia selalu menyertakan anggota — tidak ada jalur pembacaan lain.
- Bentuk form pengajuan perorangan menjadi sedikit tidak alami di frontend (satu baris
  anggota untuk satu orang). Diterima: kerumitan berpindah ke UI, tempat yang murah,
  bukan ke aturan bisnis, tempat yang mahal.

**Utang teknis yang diterima sadar**:

- Bila kelak diperlukan laporan lintas-pengajuan berdasarkan total plafon, agregasinya akan
  memerlukan join. Tidak relevan untuk rilis ini karena FR-18 (laporan TAT) dibuang.

---

## Alternatif yang Ditolak

| Alternatif | Sumber usulan | Alasan ditolak |
|---|---|---|
| `plafon_diajukan` sebagai kolom pada `pengajuan`, ditambah tabel anggota hanya untuk majelis | Rancangan awal tim | Gagal pada langkah kedua AC-14: Rp 180.000.000 tidak bisa dihitung dari data tersimpan, hanya bisa ditulis manual. Juga menghasilkan dua jalur kode untuk satu aturan |
| Menyimpan `total_plafon` sebagai kolom yang diperbarui setiap ada perubahan anggota | Rancangan awal tim | Nilai turunan yang disimpan akan basi tepat pada skenario AC-14, dan setiap penulis kode baru harus ingat memperbaruinya. Kebenaran yang bergantung pada ingatan bukan kebenaran |
| Menyimpan `level_approval_diperlukan` sebagai kolom saat pengajuan diajukan ke approval | `<!-- ISI: sumber — anggota tim atau AI (sebutkan tool + model kalau AI) -->` | `<!-- ISI: alasan teknis penolakan. Kalau usulan ini datang dari AI dan Anda menolaknya, ADR inilah yang memenuhi syarat brief §9.4 (bonus +2) — tulis alasannya saat kejadiannya, dan rujuk nomor DEVLOG-nya di bagian Terkait. Jangan diisi kalau tidak benar-benar terjadi. -->` |

---

## Catatan Verifikasi

Keputusan ini gagal ditegakkan kalau salah satu dari ini benar pada Jumat pagi:

- [ ] Ada kolom bernama `total_plafon` atau `level_approval` di skema mana pun
- [ ] Ada lebih dari satu tempat di kode yang menjumlahkan plafon
- [ ] Ada `if (jenisNasabah === 'PERORANGAN')` di lapisan `domain/` atau `services/`
- [ ] AC-14 memerlukan pemanggilan endpoint tambahan untuk "menghitung ulang level"
