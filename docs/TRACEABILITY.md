# TRACEABILITY — FR → AC → Endpoint → Test → PR

**Tim**: `<!-- ISI: nama tim -->`
**Terakhir diperbarui**: `<!-- ISI: tanggal & jam -->`

---

## Cara memakai tabel ini sebagai alat deteksi risiko

Tabel ini **alat kerja Anda sendiri**, bukan formalitas untuk penilai (brief §8.4). Ia dipakai
seperti ini:

1. **Baris tanpa "File test" adalah risiko, bukan kekurangan administrasi.** FR yang jalan
   tetapi tidak punya test berarti Anda tidak tahu ia masih jalan setelah PR berikutnya.
   Pada Jumat pagi, baris-baris inilah yang paling mungkin gagal saat demo.
2. **Baris tanpa "Endpoint" pada FR P0 berarti fitur itu belum ada**, seberapa pun ramai
   diskusinya di grup. Isi kolom ini dari daftar route yang benar-benar terdaftar, bukan dari
   rencana.
3. **AC tanpa test otomatis wajib punya baris di `DEMO-SCRIPT.md`.** Kalau tidak ada di
   keduanya, AC itu tidak diverifikasi oleh siapa pun.
4. **Isi selama bekerja, bukan di akhir.** Cara termurah: setiap kali membuka PR, perbarui
   baris FR yang disentuh — itu bagian dari checklist PR.
5. **Pakai ini di Gate 3 (Jumat 11.20)** untuk memutuskan FR mana yang dibuang. Keputusan
   membuang jauh lebih mudah kalau Anda bisa melihat mana yang punya test dan mana yang tidak.

**Cara memakainya 10 menit sebelum demo**: urutkan mental sebagai berikut — P0 tanpa test,
lalu P0 dengan test tetapi status belum Done, lalu P1. Latih demo untuk baris teratas
lebih dulu. Penilai akan meminta AC secara acak, termasuk jalur error.

**Nilai kolom Status yang diizinkan**: `Belum` · `In Progress` · `Done` · `Done (tanpa test)`
· `Dibuang`. Pada tag `v1.0.0` tidak boleh ada lagi `In Progress` — ubah menjadi `Dibuang`
atau `Done (tanpa test)` dan jelaskan di `README.md` bagian 5.

---

## Tabel Traceability

<!-- ISI: kolom Endpoint, File test, PR, dan Status. Kolom FR, Judul, Prioritas, dan
     "AC terkait" sudah pre-isi dari brief §3 dan §5 — jangan diubah, penilai mencocokkannya.
     Kolom Endpoint: daftar endpoint nyata, mis. POST /api/pengajuan, GET /api/pengajuan/{id}.
     Kolom File test: path berkas test, mis. backend/tests/skoring.test.ts.
     Kolom PR: nomor PR, mis. #14. -->

| FR | Judul | Prioritas | AC terkait | Endpoint | File test | PR | Status |
|---|---|---|---|---|---|---|---|
| FR-01 | Autentikasi & Otorisasi Berbasis Peran | P0 | AC-01, AC-02 |  |  |  |  |
| FR-02 | Pengajuan Pembiayaan Mikro | P0 | AC-01 |  |  |  |  |
| FR-03 | Upload & Verifikasi Dokumen | P0 | AC-03 |  |  |  |  |
| FR-04 | Survei Lapangan (OTS) | P0 | AC-04 |  |  |  |  |
| FR-05 | SLIK Check | P0 | AC-05, AC-06 |  |  |  |  |
| FR-06 | Skoring Kelayakan Mikro | P0 | AC-06, AC-07, AC-08 |  |  |  |  |
| FR-07 | Perhitungan Margin / Nisbah | P0 | AC-09 |  |  |  |  |
| FR-08 | Approval Berjenjang | P0 | AC-10, AC-11 |  |  |  |  |
| FR-09 | Audit Trail | P0 | AC-08, AC-12, AC-13 |  |  |  |  |
| FR-10 | Pembiayaan Kelompok (Majelis) | P1 | AC-14 |  |  |  |  |
| FR-11 | Notifikasi Perubahan Status | P1 | — |  |  |  |  |
| FR-12 | Dashboard Pipeline | P1 | — |  |  |  |  |
| FR-13 | Parameter Terkonfigurasi | P1 | AC-15 |  |  |  |  |
| FR-14 | Simulasi angsuran murabahah & proyeksi bagi hasil musyarakah | P2 | — |  |  |  |  |
| FR-15 | Ekspor daftar pengajuan ke CSV | P2 | — |  |  |  |  |
| FR-16 | Mode draft offline untuk AO di lapangan | P2 | — |  |  |  |  |
| FR-17 | Deteksi lokasi palsu (mock location) pada survei lapangan | P2 | — |  |  |  |  |
| FR-18 | Laporan Turn-Around Time per tahap dan per petugas | P2 | — |  |  |  |  |

FR-11 dan FR-12 tidak dirujuk langsung oleh AC mana pun. Itu bukan berarti keduanya tidak
diverifikasi — **tetapkan kriteria verifikasi Anda sendiri** untuk keduanya dan tulis di
`DEMO-SCRIPT.md`, karena penilai tetap akan melihatnya saat demo alur utama.

---

## Penelusuran Aturan Bisnis

<!-- ISI: kolom "Ditegakkan di" dan "Test". BR tanpa test adalah risiko terbesar di sistem
     perbankan, karena pelanggarannya tidak terlihat di jalur bahagia.
     Kolom "Ditegakkan di" harus sama dengan yang tertulis di AGENTS.md bagian 5. -->

| BR | Ringkasan | Ditegakkan di | Test | Status |
|---|---|---|---|---|
| BR-01 | Plafon di luar Rp 5 juta – Rp 500 juta ditolak saat submit |  |  |  |
| BR-02 | Approval berurutan; level 2 menunggu `APPROVE` level 1 |  |  |  |
| BR-03 | Skoring butuh dokumen `VERIFIED` + survei `VALID` + SLIK sudah dijalankan |  |  |  |
| BR-04 | Hasil SLIK berlaku 30 hari |  |  |  |
| BR-05 | Grade 5 tidak dapat diajukan; `REJECTED_SCORING` |  |  |  |
| BR-06 | Margin/nisbah di luar rentang grade diblokir |  |  |  |
| BR-07 | Skor akhir = Σ(skor × bobot) ÷ Σbobot, dibulatkan sekali di akhir |  |  |  |
| BR-08 | Rincian komponen ditampilkan dan disimpan |  |  |  |
| BR-09 | Maker tidak boleh menjadi approver; ditegakkan di server |  |  |  |
| BR-10 | Setiap perubahan status punya aktor + timestamp |  |  |  |
| BR-11 | NIK & foto dokumen tidak muncul di log, pesan error, atau URL |  |  |  |
| BR-12 | Nomor referensi `IMT-YYYYMMDD-NNNN` unik, tidak dipakai ulang |  |  |  |

---

## Ringkasan Risiko (perbarui di setiap gate)

<!-- ISI: hitung dari tabel di atas. Tiga baris ini adalah versi paling berguna dari seluruh
     dokumen ini, dan yang paling cepat menunjukkan posisi tim kepada diri sendiri. -->

| Pertanyaan | Kamis 15.30 (Gate 2) | Jumat 11.20 (Gate 3) | Jumat 15.00 (code freeze) |
|---|---|---|---|
| Berapa FR P0 berstatus Done? |  |  |  |
| Berapa FR P0 tanpa file test? |  |  |  |
| Berapa BR tanpa test? |  |  |  |
| Berapa AC yang sudah pernah dilatih di demo? |  |  |  |
| Risiko terbesar saat ini |  |  |  |
