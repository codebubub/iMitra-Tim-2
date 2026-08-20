# ADR-NNNN: `<!-- ISI: judul keputusan, bukan judul topik -->`

<!-- Salin berkas ini menjadi docs/adr/NNNN-slug-singkat.md untuk setiap ADR baru.
     Judul yang baik menyatakan keputusan: "Aturan bisnis ditempatkan di lapisan service".
     Judul yang lemah menyatakan topik: "Tentang aturan bisnis". -->

- **Status**: `<!-- ISI: Proposed | Accepted | Superseded oleh ADR-NNNN -->`
- **Tanggal**: `<!-- ISI: YYYY-MM-DD -->`
- **Pengambil keputusan**: `<!-- ISI: nama. Kalau tim berdebat lebih dari 5 menit, Tech Lead
  yang memutuskan (brief §10) — tulis siapa yang memutuskan, bukan "tim". -->`
- **Terkait**: `<!-- ISI: FR/BR/AC terkait, nomor issue, nomor PR, dan DEVLOG-xx kalau ada -->`

## Konteks

<!-- ISI: tekanan dan batasan nyata yang membuat keputusan ini perlu diambil.
     Prompt pertanyaan:
     - Masalah apa yang harus diselesaikan sekarang, dan apa yang terjadi kalau ditunda?
     - Batasan apa yang berlaku? (waktu 9 jam, keahlian anggota, penilai menjalankan
       docker compose up di mesin bersih, aturan brief §7.2)
     - Requirement mana yang bergantung pada keputusan ini?
     Tulis fakta, bukan pendapat. Pendapat masuk di bagian Alasan. -->

## Keputusan

<!-- ISI: satu sampai tiga kalimat, dalam bentuk pernyataan tegas.
     Prompt pertanyaan:
     - Apa yang kami putuskan, dengan kalimat yang bisa diperiksa benar/salahnya terhadap kode?
     - Apa yang secara eksplisit TIDAK termasuk dalam keputusan ini?
     Kalau perlu lebih dari tiga kalimat, ini mungkin dua keputusan. Pecah. -->

## Alasan

<!-- ISI: mengapa opsi ini, dihubungkan ke fakta di bagian Konteks.
     Prompt pertanyaan:
     - Kriteria apa yang kami pakai untuk memilih? (mis. keahlian tim, kecepatan setup,
       dukungan tool AI, kemudahan pengujian)
     - Bukti apa yang kami punya, bukan hanya keyakinan?
     - Requirement mana yang menjadi lebih mudah dipenuhi karena keputusan ini? -->

## Konsekuensi

<!-- ISI: wajib berisi keduanya. ADR tanpa konsekuensi merugikan tidak dipercaya.
     Prompt pertanyaan:
     - Apa yang menjadi lebih mudah?
     - Apa yang menjadi lebih sulit atau lebih mahal?
     - Utang teknis apa yang kami terima secara sadar, dan kapan ia harus dibayar?
     - Apa yang harus diubah kalau keputusan ini ternyata salah? Seberapa mahal? -->

**Menjadi lebih mudah**:
- `<!-- ISI -->`

**Menjadi lebih sulit / risiko yang diterima**:
- `<!-- ISI -->`

**Utang teknis yang diterima sadar**:
- `<!-- ISI: sebutkan juga di README.md bagian 5 kalau berdampak ke fungsionalitas -->`

## Alternatif yang Ditolak

<!-- ISI: minimal dua alternatif, satu baris alasan penolakan per alternatif.
     Kalau salah satu alternatif berasal dari saran AI, sebutkan tool/model-nya dan
     alasan teknis penolakannya — minimal satu ADR di repo ini wajib memuat hal itu
     (brief §9.4, bonus +2). -->

| Alternatif | Sumber usulan | Alasan ditolak |
|---|---|---|
| `<!-- ISI -->` | `<!-- ISI: anggota tim / AI (tool + model) -->` | `<!-- ISI -->` |
| `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |

## Catatan Verifikasi

<!-- ISI: opsional tetapi berguna. Bagaimana Anda akan tahu keputusan ini benar atau salah?
     Contoh: "kalau pada Jumat pagi masih ada dua tempat berbeda yang menghitung margin,
     keputusan ini gagal ditegakkan". -->
