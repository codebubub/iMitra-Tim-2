# iMitra — Sistem Originasi Pembiayaan Mikro Syariah

> **Berkas ini adalah TEMPLATE.** Setiap blok `<!-- ISI: ... -->` adalah placeholder yang wajib
> Anda ganti. Jangan biarkan satu pun `<!-- ISI: ... -->` tersisa di tag `v1.0.0` — penilai
> membaca README ini lebih dulu, sebelum menjalankan aplikasi Anda.
>
> Aturan praktis: kalau penilai tidak bisa menjalankan aplikasi Anda hanya dengan membaca
> berkas ini, aplikasi Anda dianggap tidak jalan.

---

## 1. Tim

<!-- ISI: nama tim. Bebas, tapi dipakai konsisten di semua dokumen dan di nama repo. -->

**Nama tim**: `<!-- ISI: nama tim -->`

<!-- ISI: tabel di bawah. Satu baris per anggota. Peran diambil dari §10 brief:
     Tech Lead / Integrator, AI Workflow Officer, Backend Engineer, Frontend Engineer,
     QA / Verification, DevOps / Release. Semua peran ikut menulis kode.
     Kolom "Fokus FR" diisi ID FR yang menjadi tanggung jawab utamanya (mis. FR-05, FR-06).
     Isi tabel ini dalam 30 menit pertama dan beri tahu instruktur. -->

| Nama | Peran | Fokus FR | Akun GitHub |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

<!-- ISI: kalau peran berubah di hari kedua, catat perubahannya di sini beserta alasan
     dan jam perubahannya. Perubahan peran tidak dilarang; perubahan yang tidak dicatat
     yang jadi masalah. -->

**Perubahan peran selama hackathon**: `<!-- ISI: atau tulis "tidak ada" -->`

---

## 2. Cara Menjalankan

<!-- ISI: Target wajib (§7.2 butir 1): penilai melakukan git clone di mesin bersih,
     menjalankan SATU perintah, dan aplikasi hidup. Uji ini sendiri dari direktori
     kosong minimal sekali sebelum Gate 2 dan sekali lagi sebelum code freeze.
     Jangan tulis langkah yang belum pernah Anda jalankan dari clone bersih. -->

### 2.1 Prasyarat

<!-- ISI: daftar prasyarat beserta versi minimum. Contoh format:
     - Docker Engine >= 24 dan Docker Compose v2
     - (kalau tanpa Docker) runtime bahasa X versi Y -->

- `<!-- ISI: prasyarat 1 -->`
- `<!-- ISI: prasyarat 2 -->`

### 2.2 Langkah

```bash
git clone <!-- ISI: URL repo -->
cd <!-- ISI: nama direktori -->
cp .env.example .env
<!-- ISI: satu perintah untuk menjalankan, mis. docker compose up --build -->
```

### 2.3 Alamat layanan setelah jalan

<!-- ISI: sesuaikan port dengan .env.example Anda. -->

| Layanan | URL | Catatan |
|---|---|---|
| Frontend | `<!-- ISI -->` |  |
| Backend API | `<!-- ISI -->` |  |
| Mock SLIK | `<!-- ISI -->` |  |
| Database | `<!-- ISI -->` |  |

### 2.4 Migrasi & seed

<!-- ISI: perintah migrasi dan seed. Wajib idempoten — bisa dijalankan berulang tanpa error
     (§7.2 butir 4 dan 5). Sebutkan juga cara MERESET demo ke kondisi awal, karena penilai
     mungkin meminta demo diulang. -->

```bash
<!-- ISI: perintah migrasi -->
<!-- ISI: perintah seed -->
<!-- ISI: perintah reset -->
```

### 2.5 Akun demo

<!-- ISI: daftar akun hasil seed, satu baris per peran. Password boleh ditulis di sini
     karena ini akun seed non-produksi — tetapi JANGAN pernah menaruh secret nyata
     (JWT secret, kredensial DB produksi, token API) di berkas ini atau di mana pun
     dalam repo. Secret ter-commit = pengurangan -10. -->

| Peran | Username | Password | Dipakai untuk AC |
|---|---|---|---|
| AO | `<!-- ISI -->` | `<!-- ISI -->` |  |
| ANL | `<!-- ISI -->` | `<!-- ISI -->` |  |
| KCP | `<!-- ISI -->` | `<!-- ISI -->` |  |
| KC | `<!-- ISI -->` | `<!-- ISI -->` |  |
| KOM | `<!-- ISI -->` | `<!-- ISI -->` |  |
| ADM | `<!-- ISI -->` | `<!-- ISI -->` |  |

### 2.6 Test & lint

<!-- ISI: perintah persis. Harus sama dengan yang dipakai di .github/workflows/ci.yml
     dan yang tertulis di AGENTS.md. Kalau ketiganya berbeda, salah satunya sudah usang. -->

```bash
<!-- ISI: perintah test -->
<!-- ISI: perintah lint -->
```

---

## 3. Arsitektur Singkat

<!-- ISI: 5-10 baris prosa, bukan lebih. Jelaskan: komponen apa saja, siapa memanggil siapa,
     di mana aturan bisnis ditegakkan, dan bagaimana otorisasi bekerja di server.
     Detail lengkapnya ada di docs/SDD-iMitra.md — jangan duplikasi, cukup rujuk. -->

`<!-- ISI: deskripsi arsitektur -->`

<!-- ISI: diagram arsitektur. Mermaid inline diterima dan disarankan karena ikut ter-render
     di GitHub. Diagram harus benar-benar ADA — tulisan "diagram terlampir" dinilai sebagai
     tidak ada. Hapus contoh di bawah dan gambar arsitektur Anda sendiri. -->

```mermaid
graph LR
  FE[Frontend] --> BE[Backend API]
  BE --> DB[(Database)]
  BE --> SLIK[Mock SLIK]
```

**Stack yang dipilih**: `<!-- ISI: bahasa, framework, database, ORM -->`
Alasan pemilihan ada di [`docs/adr/0001-pilihan-stack.md`](docs/adr/0001-pilihan-stack.md).

**Aturan untuk AI agent**: [`AGENTS.md`](AGENTS.md)

---

## 4. Status Functional Requirements

<!-- ISI: kolom Status dan PR. Kolom FR / Requirement / Prioritas sudah benar sesuai brief §3
     — jangan diubah, penilai mencocokkannya.
     Nilai Status yang diizinkan, pilih satu:
       - Selesai & teruji  : lolos AC terkait, ada test otomatis, sudah di-merge ke main
       - Selesai           : jalan dan di-merge, tetapi belum ada test otomatis
       - Sebagian          : hanya sebagian AC terpenuhi. WAJIB dijelaskan di bagian 5
       - Tidak dikerjakan  : sengaja dibuang. WAJIB dijelaskan di bagian 5
     Jangan pakai "In progress" di tag v1.0.0 — pada saat itu tidak ada lagi yang sedang jalan.
     Kolom PR: nomor PR yang menyelesaikannya, mis. #14, #21.
     Perbarui tabel ini setiap kali PR di-merge, bukan sekali di akhir. -->

### P0 — WAJIB (batas lulus fungsional)

| FR | Requirement | Prioritas | Status | PR |
|---|---|---|---|---|
| FR-01 | Autentikasi & Otorisasi Berbasis Peran | P0 |  |  |
| FR-02 | Pengajuan Pembiayaan Mikro | P0 |  |  |
| FR-03 | Upload & Verifikasi Dokumen | P0 |  |  |
| FR-04 | Survei Lapangan (OTS) | P0 |  |  |
| FR-05 | SLIK Check | P0 |  |  |
| FR-06 | Skoring Kelayakan Mikro | P0 |  |  |
| FR-07 | Perhitungan Margin / Nisbah | P0 |  |  |
| FR-08 | Approval Berjenjang | P0 |  |  |
| FR-09 | Audit Trail | P0 |  |  |

### P1 — SEHARUSNYA (nilai penuh butuh ini)

| FR | Requirement | Prioritas | Status | PR |
|---|---|---|---|---|
| FR-10 | Pembiayaan Kelompok (Majelis) | P1 |  |  |
| FR-11 | Notifikasi Perubahan Status | P1 |  |  |
| FR-12 | Dashboard Pipeline | P1 |  |  |
| FR-13 | Parameter Terkonfigurasi | P1 |  |  |

### P2 — BOLEH (hanya kalau P0 dan P1 tuntas dan teruji)

| FR | Requirement | Prioritas | Status | PR |
|---|---|---|---|---|
| FR-14 | Simulasi angsuran murabahah & proyeksi bagi hasil musyarakah | P2 |  |  |
| FR-15 | Ekspor daftar pengajuan ke CSV | P2 |  |  |
| FR-16 | Mode draft offline untuk AO di lapangan | P2 |  |  |
| FR-17 | Deteksi lokasi palsu (mock location) pada survei lapangan | P2 |  |  |
| FR-18 | Laporan Turn-Around Time per tahap dan per petugas | P2 |  |  |

Penelusuran rinci FR → endpoint → test → PR ada di [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md).

---

## 5. Tidak Diimplementasikan dan Mengapa

> **Bagian ini wajib ada dan wajib terisi.** Ia bukan pengakuan kegagalan — ia bukti bahwa
> tim memutuskan secara sadar.
>
> Kenapa penting: menurut brief §11 (Gate 3) dan §12, **fitur setengah jadi yang dibiarkan
> mengambang tanpa catatan bernilai negatif (−5 per fitur, maksimum −10), sementara fitur
> yang dibuang dengan alasan tertulis bernilai positif.** Membuang FR-14 dengan alasan
> "P0 belum semua teruji, kami pilih memperkuat FR-06" adalah keputusan rekayasa dan
> dinilai sebagai keahlian. Meninggalkan tombol yang tidak berfungsi tanpa penjelasan
> adalah utang yang tidak diakui.
>
> Tulis bagian ini pada Gate 3 (Jumat 11.20), bukan pada Jumat 14.55.

<!-- ISI: satu baris per FR atau bagian FR yang tidak selesai. Isi kolom Keputusan dengan
     "Dibuang" (sengaja tidak dikerjakan) atau "Sebagian" (ada yang jalan, ada yang tidak).
     Untuk "Sebagian", sebutkan dengan tepat apa yang jalan dan apa yang tidak, supaya
     penilai tidak menemukannya sendiri saat demo.
     Alasan harus alasan rekayasa (prioritas, risiko, waktu, dependensi), bukan "kehabisan waktu"
     tanpa keterangan. -->

| FR / Bagian | Keputusan | Apa yang jalan | Apa yang tidak | Alasan | Diputuskan kapan |
|---|---|---|---|---|---|
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |

**Utang teknis yang kami sadari**:

<!-- ISI: hal-hal yang jalan tapi Anda tahu belum benar. Contoh: validasi hanya di frontend
     pada satu form tertentu, indeks database belum ada, penanganan timeout SLIK masih kasar.
     Menyebutkannya lebih dulu lebih baik daripada ditemukan penilai. -->

- `<!-- ISI -->`

---

## 6. Catatan AI Workflow

Tim ini memakai AI sebagai alat rekayasa. Jejaknya ada di tiga tempat:

| Dokumen | Isi |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Aturan repo yang dibaca AI agent: stack, struktur, konvensi, aturan bisnis, larangan |
| [`docs/AI-WORKFLOW.md`](docs/AI-WORKFLOW.md) | Tool dan model apa untuk tugas apa, cara memberi konteks, pembagian AI vs manual |
| [`docs/AI-DEVLOG.md`](docs/AI-DEVLOG.md) | Jurnal pemakaian AI: minimal 10 entri, minimal 3 di antaranya kasus AI salah dan kami menangkapnya |

<!-- ISI: 3-5 baris ringkasan. Bukan menyalin isi ketiga dokumen di atas, tetapi menjawab:
     apa satu pola pemakaian AI yang terbukti paling berguna bagi tim ini selama 2 hari,
     dan apa satu hal yang Anda putuskan untuk TIDAK diserahkan ke AI. Penilai kemungkinan
     besar akan menanyakan ini di sesi tanya jawab, jadi jawaban tertulisnya sebaiknya
     sudah Anda sepakati bersama. -->

`<!-- ISI: ringkasan -->`

**Keputusan arsitektur yang menolak saran AI**: `<!-- ISI: rujuk nomor ADR, mis. docs/adr/0003-....md -->`

---

## 7. Dokumen Lain

| Dokumen | Isi |
|---|---|
| [`docs/SRS-iMitra.md`](docs/SRS-iMitra.md) | Requirement ringkas turunan brief |
| [`docs/SDD-iMitra.md`](docs/SDD-iMitra.md) | Arsitektur, model data, daftar endpoint |
| [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md) | FR → AC → endpoint → test → PR |
| [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md) | Skrip demo AC-01 s.d. AC-15 beserta data uji |
| [`docs/adr/`](docs/adr/) | Architecture Decision Records (minimal 3) |
| [`fixtures/nasabah-uji.csv`](fixtures/nasabah-uji.csv) | Data uji wajib untuk mock SLIK |
| [`SETUP-SPRINT-0.md`](SETUP-SPRINT-0.md) | Checklist Sprint 0 — kerjakan ini lebih dulu |
