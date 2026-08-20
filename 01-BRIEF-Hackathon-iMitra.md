# BRIEF HACKATHON — **iMitra**
## Sistem Originasi Pembiayaan Mikro Syariah

**Kelas** : Penerapan AI untuk Pemrograman
**Peserta** : Programmer Bank Syariah Nasional
**Tanggal** : Kamis 20 – Jumat 21 Agustus 2026
**Durasi** : ±15 jam jam-dinding · ±9 jam koding bersih
**Format** : 2 tim berkompetisi, brief identik
**Instruktur / Juri** : Muhammad Harum Alrasyid

---

## 0. Baca Ini Dulu — Apa yang Sebenarnya Diuji

Anda semua sudah bisa membangun aplikasi web. Itu bukan yang diuji di sini.

Yang diuji adalah: **apakah Anda bisa memakai AI sebagai alat rekayasa, bukan sebagai mesin tebak kode.**

Bedanya begini. Orang yang memakai AI sebagai mesin tebak akan mengetik "buatkan saya API approval pembiayaan", menempel hasilnya, dan berharap jalan. Orang yang memakai AI sebagai alat rekayasa akan memberi AI spesifikasi yang jelas, batasan arsitektur yang tertulis, dan konteks domain yang benar — lalu memverifikasi keluarannya terhadap acceptance criteria sebelum di-commit.

Tim pertama akan menghasilkan 3.000 baris kode dalam 2 jam dan menghabiskan 7 jam berikutnya untuk mencari tahu kenapa tidak jalan. Tim kedua akan menghasilkan lebih sedikit kode, lebih cepat selesai, dan bisa menjelaskan setiap barisnya.

Rubrik penilaian dirancang supaya tim kedua menang. **Aplikasi yang jalan adalah syarat minimum, bukan pemenang.**

Satu konsekuensi yang perlu Anda terima sekarang: **jejaknya harus ada.** Kalau Anda memakai AI dengan baik tapi tidak mendokumentasikannya, secara penilaian itu sama dengan tidak melakukannya. Dokumentasi bukan pekerjaan tambahan di akhir — ia bagian dari cara kerjanya.

---

## 1. Konteks Produk

### 1.1 Dari mana brief ini datang

Salah satu dari Anda — **Rayvaldo Prawira Manik** — menyusun SRS & SDD untuk **iLoan Commercial**: sistem originasi pembiayaan komersial syariah (murabahah & musyarakah) untuk segmen korporat, dengan alur intake → verifikasi dokumen → SLIK check → risk grading → perhitungan margin → approval berjenjang → notifikasi.

**iMitra adalah produk saudara dari iLoan Commercial** — spine prosesnya sama secara harfiah, tetapi untuk **segmen mikro & UMKM**, dan dengan tiga perbedaan struktural yang membuatnya jadi produk yang berbeda, bukan salinan.

SRS & SDD iLoan Commercial dibagikan kepada Anda sebagai **acuan domain dan acuan format** — silakan pelajari, kutip, dan turunkan. Yang **tidak boleh** adalah memperlakukannya sebagai kode yang tinggal disalin: entitas, alur, dan aturan bisnis iMitra berbeda, dan penilai akan mengecek itu.

### 1.2 Pemetaan iLoan Commercial → iMitra

| iLoan Commercial (acuan) | iMitra (yang Anda bangun) |
|---|---|
| Segmen korporat/komersial | Segmen mikro & UMKM, plafon Rp 5 juta – Rp 500 juta |
| Aktor: Relationship Manager | Aktor: **Account Officer Mikro (AO)** — bekerja di lapangan |
| Nasabah tunggal (badan usaha) | **Nasabah perorangan ATAU kelompok (majelis) 3–10 anggota** |
| Verifikasi dokumen di kantor | Verifikasi dokumen **+ survei lapangan wajib** (geotag + foto + omzet) |
| Risk grading dari laporan keuangan audited | Skoring kelayakan dari **omzet harian, SLIK, dan hasil survei** |
| Approval berjenjang per plafon | Approval berjenjang per plafon (**ambang berbeda**, lihat Tabel 4.1) |
| Handoff ke Core Banking | Handoff ke Core Banking (di luar lingkup rilis ini) |

### 1.3 Tiga pembeda struktural iMitra

Ketiganya bukan hiasan. Ketiganya membuat model data iMitra tidak bisa disalin dari iLoan.

1. **Survei Lapangan (On-The-Spot) wajib.** AO harus merekam kunjungan ke tempat usaha nasabah — koordinat, foto, estimasi omzet harian, kondisi usaha — sebelum aplikasi bisa masuk tahap skoring. Aplikasi tanpa survei valid **tidak bisa** dilanjutkan.

2. **Pembiayaan Kelompok (Majelis) dengan tanggung renteng.** Satu pengajuan bisa mencakup 3–10 anggota. Plafon yang dinilai untuk penentuan level approval adalah **total plafon kelompok**, bukan per anggota. Penolakan satu anggota tidak otomatis menolak kelompok — tetapi mengubah total plafon, dan karena itu bisa mengubah level approval yang diperlukan.

3. **Skoring kelayakan mikro yang transparan.** Berbeda dari iLoan yang mengandalkan grading manual analis, iMitra harus menghitung skor secara terprogram dari parameter yang tersimpan sebagai data (bukan hardcode), dan **menampilkan rincian perhitungannya** kepada analis. Analis boleh menimpa (override) skor sistem, tetapi wajib mengisi alasan.

### 1.4 Di luar lingkup

Jangan bangun ini. Kalau Anda bangun ini, itu bukan nilai tambah — itu scope creep dan akan dinilai sebagai kesalahan prioritas:

- Pencairan (disbursement), akuntansi, jadwal angsuran aktual, penagihan, restrukturisasi
- Integrasi nyata ke Core Banking System atau SLIK produksi (pakai mock, lihat §6)
- Aplikasi mobile native (web responsif cukup; *mobile-first* boleh jadi pilihan desain)
- SSO / Active Directory nyata (pakai autentikasi lokal, lihat §6.3)
- Multi-tenant, multi-currency, multi-bahasa

---

## 2. Aktor & Peran Sistem

| Kode | Aktor | Wewenang |
|---|---|---|
| **AO** | Account Officer Mikro | Membuat & mengubah pengajuan miliknya, upload dokumen, merekam survei lapangan, melihat status |
| **ANL** | Analis Mikro | Verifikasi dokumen, jalankan SLIK check, jalankan/override skoring, hitung margin/nisbah, ajukan ke approval |
| **KCP** | Kepala Cabang Pembantu | Approval level 1 |
| **KC** | Kepala Cabang | Approval level 2 |
| **KOM** | Komite Pembiayaan | Approval level 3 |
| **ADM** | Admin | Kelola pengguna, parameter skoring, ambang approval, rentang margin |

**Aturan pemisahan tugas (wajib, ini kontrol perbankan):** satu pengguna **tidak boleh** menjadi pembuat (maker) dan penyetuju (checker) pada aplikasi yang sama. Sistem harus menolaknya, bukan hanya menyembunyikan tombolnya.

---

## 3. Functional Requirements

Prioritas menentukan penilaian. **P0 adalah batas lulus.** Tim yang mengerjakan P2 sebelum P0 tuntas akan kehilangan nilai, bukan mendapat nilai.

### 3.1 P0 — WAJIB (batas lulus fungsional)

| ID | Requirement | Aktor | Deskripsi |
|---|---|---|---|
| **FR-01** | Autentikasi & Otorisasi Berbasis Peran | Semua | Login dengan kredensial lokal. Setiap endpoint dan setiap elemen UI harus tunduk pada peran. Percobaan akses lintas-peran ditolak di **server**, bukan hanya disembunyikan di UI. |
| **FR-02** | Pengajuan Pembiayaan Mikro | AO | Buat pengajuan: data nasabah (nama, NIK, alamat, jenis usaha), jenis akad (murabahah / musyarakah), plafon diajukan, tenor. Status awal `DRAFT`. Nomor referensi dibangkitkan sistem dengan format `IMT-YYYYMMDD-NNNN`. |
| **FR-03** | Upload & Verifikasi Dokumen | AO / ANL | Upload dokumen wajib: KTP, Kartu Keluarga, Surat Keterangan Usaha. ANL menandai tiap dokumen `VERIFIED` atau `REJECTED` — penolakan **wajib** menyertakan kode alasan. Setelah ditolak, AO dapat mengunggah ulang **hanya dokumen itu**, tanpa mengisi ulang seluruh pengajuan. |
| **FR-04** | Survei Lapangan (OTS) | AO | Rekam survei: koordinat lokasi usaha, minimal 1 foto, estimasi omzet harian, lama usaha berjalan (bulan), catatan kondisi usaha. Satu pengajuan wajib punya minimal satu survei berstatus `VALID` sebelum bisa masuk skoring (BR-03). |
| **FR-05** | SLIK Check | ANL | Panggil layanan SLIK (mock, §6.1), simpan hasil kolektibilitas 1–5, dan terapkan aturan keluaran otomatis pada Tabel 4.2. |
| **FR-06** | Skoring Kelayakan Mikro | ANL | Hitung skor kelayakan (0–100) dan turunkan grade risiko 1–5 dari parameter tersimpan (§4.3). Tampilkan **rincian kontribusi setiap komponen** kepada ANL. ANL boleh override grade dengan alasan wajib; override tercatat di audit trail. |
| **FR-07** | Perhitungan Margin / Nisbah | ANL | Hitung margin (murabahah) atau nisbah bagi hasil (musyarakah) dari plafon, tenor, dan grade risiko. Validasi hasil terhadap rentang yang disetujui per grade (Tabel 4.3). Hasil di luar rentang **diblokir**, tidak hanya diberi peringatan. |
| **FR-08** | Approval Berjenjang | KCP / KC / KOM | Rutekan pengajuan sesuai ambang plafon (Tabel 4.1). Catat setiap keputusan: `APPROVE` / `REJECT` / `RETURN` + alasan + timestamp + identitas penyetuju. `RETURN` mengembalikan ke AO dengan alasan tercatat. |
| **FR-09** | Audit Trail | Sistem | Catat setiap perubahan status, keputusan approval, verifikasi dokumen, override skor, dan login. Bersifat **append-only** — tidak ada endpoint untuk mengubah atau menghapus catatan audit. |

### 3.2 P1 — SEHARUSNYA (nilai penuh butuh ini)

| ID | Requirement | Aktor | Deskripsi |
|---|---|---|---|
| **FR-10** | Pembiayaan Kelompok (Majelis) | AO | Satu pengajuan mencakup 3–10 anggota, masing-masing dengan plafon sendiri. Level approval ditentukan dari **total plafon kelompok**. Menolak satu anggota mengurangi total dan wajib **mengevaluasi ulang** level approval yang diperlukan. |
| **FR-11** | Notifikasi Perubahan Status | Sistem | Notifikasi in-app kepada aktor yang relevan pada setiap perubahan status. Tersimpan sebagai log, bukan hanya toast yang hilang. |
| **FR-12** | Dashboard Pipeline | AO / ANL / Approver | Daftar pengajuan yang bisa difilter per status dan per peran, dengan jumlah per tahap. Approver hanya melihat yang berada di levelnya. |
| **FR-13** | Parameter Terkonfigurasi | ADM | CRUD untuk parameter skoring, ambang approval, dan rentang margin per grade. Mengubah parameter **tidak boleh** memerlukan deploy ulang atau perubahan kode. |

### 3.3 P2 — BOLEH (hanya kalau P0 dan P1 sudah tuntas dan teruji)

| ID | Requirement | Deskripsi |
|---|---|---|
| **FR-14** | Simulasi angsuran murabahah & proyeksi bagi hasil musyarakah |
| **FR-15** | Ekspor daftar pengajuan ke CSV |
| **FR-16** | Mode draft offline untuk AO di lapangan (simpan lokal, sinkron saat online) |
| **FR-17** | Deteksi lokasi palsu (mock location) pada survei lapangan |
| **FR-18** | Laporan Turn-Around Time per tahap dan per petugas |

---

## 4. Aturan Bisnis & Tabel Parameter

Angka-angka di bawah **sudah ditetapkan** — tidak ada `[TBD]`. Ini bagian dari brief; implementasikan apa adanya, tetapi simpan sebagai **data**, bukan konstanta di dalam kode.

### 4.1 Tabel Ambang Approval

| Total plafon | Level yang diperlukan | Jenis |
|---|---|---|
| Rp 5.000.000 – Rp 50.000.000 | KCP | Tunggal |
| > Rp 50.000.000 – Rp 200.000.000 | KCP → KC | Berjenjang 2 |
| > Rp 200.000.000 – Rp 500.000.000 | KCP → KC → KOM | Berjenjang 3 |

**BR-01** Pengajuan di bawah Rp 5.000.000 atau di atas Rp 500.000.000 ditolak sistem pada saat submit, dengan pesan yang menjelaskan batasnya.
**BR-02** Approval harus berurutan. Level 2 tidak dapat memutuskan sebelum level 1 memberi `APPROVE`.

### 4.2 Tabel Keluaran Kolektibilitas SLIK

| Kolektibilitas | Arti | Keluaran sistem |
|---|---|---|
| 1 | Lancar | Lanjut normal |
| 2 | Dalam Perhatian Khusus | Lanjut, **tetapi grade risiko minimal 3** dan wajib catatan analis |
| 3, 4, 5 | Kurang Lancar / Diragukan / Macet | **Penolakan otomatis** oleh sistem, status `REJECTED_SLIK`, tanpa perlu approval |

**BR-03** Pengajuan tidak dapat masuk tahap skoring (FR-06) sebelum: semua dokumen wajib `VERIFIED` **dan** ada minimal satu survei `VALID` **dan** SLIK check sudah dijalankan.
**BR-04** Hasil SLIK berlaku 30 hari. Lewat dari itu, sistem menandai pengajuan sebagai perlu SLIK ulang.

### 4.3 Tabel Rentang Margin / Nisbah per Grade Risiko

| Grade | Rentang skor | Margin murabahah (p.a.) | Nisbah bank musyarakah |
|---|---|---|---|
| 1 — Sangat baik | 85–100 | 11,0 % – 13,0 % | 20 % – 25 % |
| 2 — Baik | 70–84 | 13,0 % – 15,5 % | 25 % – 30 % |
| 3 — Cukup | 55–69 | 15,5 % – 18,0 % | 30 % – 35 % |
| 4 — Perlu perhatian | 40–54 | 18,0 % – 21,0 % | 35 % – 40 % |
| 5 — Berisiko tinggi | < 40 | **Tidak dibiayai** | **Tidak dibiayai** |

**BR-05** Grade 5 tidak dapat diajukan ke approval. Sistem menolak, status `REJECTED_SCORING`.
**BR-06** Margin/nisbah di luar rentang grade-nya diblokir sistem. Tidak ada jalur "lanjutkan saja".

### 4.4 Komponen Skor Kelayakan (FR-06)

Bobot berikut wajib tersimpan sebagai data yang bisa diubah ADM:

| Komponen | Bobot | Cara hitung |
|---|---|---|
| Kapasitas bayar | 35 | Rasio angsuran bulanan terhadap (omzet harian × 25 hari × margin usaha 30 %). ≤ 30 % → skor penuh; > 60 % → skor 0; linear di antaranya |
| Riwayat SLIK | 25 | Kol-1 → 100; Kol-2 → 40; Kol-3-5 → tidak sampai tahap ini |
| Lama usaha | 20 | ≥ 36 bulan → 100; < 6 bulan → 0; linear di antaranya |
| Hasil survei lapangan | 20 | Penilaian ANL atas kondisi usaha, skala 1–5, dikali 20 |

**BR-07** Skor akhir = Σ (skor komponen × bobot) ÷ Σ bobot, dibulatkan ke bilangan bulat terdekat.
**BR-08** Rincian per komponen wajib ditampilkan ke ANL dan disimpan bersama hasil skoring — bukan hanya angka akhirnya. Alasannya: analis harus bisa mempertanggungjawabkan keputusan ke auditor.

### 4.5 Aturan Umum

**BR-09** Satu pengguna tidak boleh menjadi maker dan approver pada pengajuan yang sama. Ditegakkan di server.
**BR-10** Setiap perubahan status wajib punya aktor dan timestamp. Tidak ada perubahan status "oleh sistem" tanpa jejak sebab.
**BR-11** Data NIK dan foto dokumen adalah data pribadi. Tidak boleh muncul di log aplikasi, pesan error, atau URL.
**BR-12** Nomor referensi bersifat unik dan tidak pernah digunakan ulang, termasuk untuk pengajuan yang ditolak.

---

## 5. Acceptance Criteria

Inilah yang akan diuji di demo. Siapkan datanya lebih dulu — Anda tidak akan diberi waktu untuk membuat data saat demo.

| ID | Kriteria | FR terkait |
|---|---|---|
| **AC-01** | AO login, membuat pengajuan Rp 30.000.000 murabahah, mendapat nomor referensi format `IMT-YYYYMMDD-NNNN` | FR-01, FR-02 |
| **AC-02** | AO **tidak dapat** mengakses layar verifikasi dokumen — dan panggilan API langsung ke endpoint verifikasi mengembalikan 403, bukan 200 | FR-01 |
| **AC-03** | ANL menolak dokumen KTP dengan kode alasan; AO mengunggah ulang **hanya** KTP; data pengajuan lain tidak hilang | FR-03 |
| **AC-04** | Pengajuan **tanpa** survei valid ditolak saat mencoba masuk skoring, dengan pesan yang menyebut BR-03 | FR-04, BR-03 |
| **AC-05** | Nasabah dengan SLIK kolektibilitas 4 otomatis berstatus `REJECTED_SLIK` tanpa melalui approval | FR-05, BR-Tabel 4.2 |
| **AC-06** | Nasabah dengan SLIK kolektibilitas 2 dapat lanjut, tetapi grade risikonya tidak pernah lebih baik dari 3 | FR-05, FR-06 |
| **AC-07** | Skoring menampilkan rincian keempat komponen beserta bobot dan skor komponennya | FR-06, BR-08 |
| **AC-08** | ANL override grade dari 2 ke 3; sistem menolak jika alasan kosong; setelah diisi, override tercatat di audit trail dengan identitas ANL | FR-06, FR-09 |
| **AC-09** | Margin 10,0 % untuk grade 1 (di bawah batas 11,0 %) **diblokir** sistem | FR-07, BR-06 |
| **AC-10** | Pengajuan Rp 30.000.000 hanya butuh approval KCP; Rp 120.000.000 butuh KCP lalu KC; KC tidak bisa memutuskan sebelum KCP | FR-08, BR-01, BR-02 |
| **AC-11** | Pengguna yang membuat pengajuan tidak bisa menyetujuinya sendiri, meski perannya memungkinkan | FR-08, BR-09 |
| **AC-12** | Audit trail menampilkan riwayat lengkap satu pengajuan dari `DRAFT` sampai `APPROVED`, urut waktu, dengan aktor di setiap baris | FR-09 |
| **AC-13** | Tidak ada endpoint yang bisa mengubah atau menghapus baris audit trail (tunjukkan dari daftar route, bukan dari kata-kata) | FR-09 |
| **AC-14** | *(P1)* Pengajuan kelompok 4 anggota, total Rp 240.000.000, membutuhkan 3 level. Setelah satu anggota Rp 60.000.000 ditolak, total jadi Rp 180.000.000 dan level yang diperlukan turun menjadi 2 | FR-10 |
| **AC-15** | *(P1)* ADM mengubah bobot komponen "Lama usaha" dari 20 ke 25; skoring berikutnya memakai bobot baru **tanpa** restart aplikasi | FR-13 |

---

## 6. Yang Disediakan & Yang Harus Anda Bangun

### 6.1 Mock SLIK — spesifikasi kontrak (Anda yang bangun)

Anda **wajib** membangun stub layanan SLIK yang berperilaku sesuai kontrak di bawah, dan aplikasi Anda harus memanggilnya **melalui HTTP** — bukan memanggil fungsi lokal. Alasannya: integrasi lintas-layanan adalah bagian dari pekerjaan Anda sehari-hari, dan AI cenderung gagal justru di batas integrasi.

```
POST /slik/inquiry
Content-Type: application/json

Request : { "nik": "3404xxxxxxxxxxxx" }
Response 200:
{
  "nik": "3404xxxxxxxxxxxx",
  "nama": "…",
  "kolektibilitas": 1,
  "jumlahFasilitasAktif": 2,
  "totalBakiDebet": 15000000,
  "tanggalData": "2026-08-20",
  "referenceId": "SLIK-…"
}
Response 404: { "error": "NIK_NOT_FOUND" }
Response 503: { "error": "SERVICE_UNAVAILABLE" }
```

**Wajib ditangani:** timeout, respons 503, dan NIK tidak ditemukan. Sistem tidak boleh crash, dan tidak boleh diam-diam melanjutkan seolah SLIK bersih. Buat stub Anda bisa memaksa 503 (misalnya lewat query param atau NIK khusus) supaya jalur error bisa didemokan — penilai **akan** meminta ini.

### 6.2 Data uji wajib (`fixtures/nasabah-uji.csv`)

Tersedia di template repo. Muat ke mock SLIK Anda. Data ini sengaja mencakup semua cabang aturan, dan demo Anda akan diuji dengan NIK dari daftar ini.

### 6.3 Autentikasi

Autentikasi lokal (username + password ter-hash, session atau JWT). **Jangan** membangun integrasi AD/SSO. Namun rancang lapisan autentikasi sehingga bisa ditukar — dan **catat keputusan itu di ADR**. Ini persis pola yang Anda hadapi di bank: bangun sekarang dengan stub, siap ditukar nanti.

### 6.4 Yang harus Anda bangun dari nol

Semuanya, kecuali yang disebut di atas: model data, backend, frontend, mock SLIK, seed data, test, CI, dan seluruh dokumentasi.

---

## 7. Kebebasan & Batasan Teknis

### 7.1 Bebas

Bahasa, framework, database, ORM, pustaka UI — pilih sendiri. Pertimbangkan apa yang sudah dikenal tim dan apa yang paling didukung oleh tool AI Anda. **Tuliskan alasan pilihan itu di ADR-001.**

### 7.2 Wajib

| # | Ketentuan | Kenapa |
|---|---|---|
| 1 | **Satu perintah untuk menjalankan.** `docker compose up` atau satu skrip yang terdokumentasi di README. Penilai akan menjalankannya di mesin bersih. | Kalau hanya jalan di laptop Anda, ia tidak jalan |
| 2 | **Backend dan frontend terpisah**, berkomunikasi via HTTP/JSON | Batas integrasi harus nyata |
| 3 | **Mock SLIK sebagai layanan terpisah** yang dipanggil via HTTP | Sama |
| 4 | **Skema database dari migrasi**, bukan dari `db.sql` yang di-restore manual | Reproducibility |
| 5 | **Seed data dari skrip**, bisa dijalankan berulang tanpa error | Demo harus bisa direset |
| 6 | **Otorisasi ditegakkan di server** untuk setiap endpoint | AC-02 akan menguji ini secara langsung |
| 7 | **Tidak ada secret di dalam repo.** `.env.example` ya, `.env` tidak | Ini bank |
| 8 | **CI hijau di commit terakhir** — minimal lint + test jalan otomatis | Bukti bahwa test benar-benar dijalankan |

### 7.3 Diskualifikasi kriteria (bukan pengurangan nilai — kegagalan langsung)

- Menyalin kode dari repo/proyek yang sudah ada dan menyebutnya buatan sendiri
- Commit dengan kredensial nyata milik bank, data nasabah nyata, atau dump dari sistem produksi
- Repo yang tidak bisa dijalankan sama sekali oleh penilai di Gate 2

---

## 8. Wajib Kolaborasi & GitHub

Repo publik atau privat dengan instruktur diberi akses. Satu repo per tim.

### 8.1 Struktur repo minimum

```
/
├── README.md                    # Cara jalankan, arsitektur singkat, status FR
├── AGENTS.md                    # Aturan untuk AI agent (lihat §9.2)
├── CLAUDE.md                    # Boleh symlink/salinan AGENTS.md
├── docker-compose.yml
├── .env.example
├── docs/
│   ├── SRS-iMitra.md            # SRS ringkas turunan brief ini, ID FR Anda sendiri
│   ├── SDD-iMitra.md            # Arsitektur, model data, daftar endpoint
│   ├── TRACEABILITY.md          # FR → endpoint → test → PR (lihat §8.4)
│   ├── AI-WORKFLOW.md           # Tool & model apa untuk tugas apa (§9.1)
│   ├── AI-DEVLOG.md             # Jurnal pemakaian AI (§9.3) — artefak paling bernilai
│   ├── DEMO-SCRIPT.md           # Skrip demo AC-01…AC-15, urut, dengan data
│   └── adr/
│       ├── 0001-pilihan-stack.md
│       ├── 0002-….md
│       └── 0003-….md
├── fixtures/
│   └── nasabah-uji.csv
├── backend/
├── frontend/
├── mock-slik/
└── .github/
    ├── workflows/ci.yml
    ├── pull_request_template.md
    └── ISSUE_TEMPLATE/
```

### 8.2 Aturan Git

| Aturan | Detail |
|---|---|
| **Branch `main` dilindungi** | Tidak ada push langsung. Semua lewat PR. Aktifkan branch protection di Settings sebelum commit pertama fitur |
| **Satu issue = satu branch = satu PR** | Nama branch `feat/FR-06-skoring`, `fix/FR-03-reupload` |
| **PR wajib di-review** | Minimal 1 approval dari anggota lain sebelum merge. Tech Lead tidak boleh menyetujui PR-nya sendiri |
| **Conventional commits** | `feat(FR-06): hitung skor kelayakan dari parameter tersimpan` |
| **Setiap PR menyebut issue-nya** | `Closes #12` |
| **Board dipakai, bukan dihias** | Issue bergerak Todo → In Progress → Review → Done secara nyata selama 2 hari, bukan diisi semua di jam terakhir |

### 8.3 Distribusi kerja

Penilai akan menjalankan `git shortlog -sn` dan melihat grafik kontributor. **Repo di mana satu orang menulis lebih dari 50 % commit akan kehilangan nilai kolaborasi**, seberapa bagus pun aplikasinya. Itu bukan tim; itu satu orang dengan enam penonton.

Kalau ada anggota yang kurang nyaman dengan stack yang dipilih, itu tugas Tech Lead untuk mencari pekerjaan yang cocok untuknya — bukan alasan untuk membiarkannya menganggur.

### 8.4 `docs/TRACEABILITY.md`

Tabel ini adalah alat Anda sendiri, bukan formalitas untuk penilai. Isi selama bekerja, bukan di akhir.

| FR | AC | Endpoint | File test | PR | Status |
|---|---|---|---|---|---|
| FR-06 | AC-07, AC-08 | `POST /api/pengajuan/{id}/skoring` | `tests/skoring.test.ts` | #14 | Done |

Kalau ada baris FR tanpa test, Anda sudah tahu di mana risiko Anda sebelum demo. Itu gunanya.

---

## 9. Wajib Artefak AI — **Bobot Terbesar**

Bagian ini menyumbang porsi nilai terbesar. Bacalah dua kali.

### 9.1 `docs/AI-WORKFLOW.md`

Satu halaman menjelaskan **cara tim ini bekerja dengan AI**:

- Tool & model apa yang dipakai untuk tugas apa, dan mengapa. Contoh: "9Router + Claude untuk perancangan model data dan review; Copilot di VSCode untuk pekerjaan mekanis; model X untuk generate test karena lebih patuh pada format"
- Bagaimana konteks diberikan ke AI: apakah SRS dilampirkan? apakah file skema dilampirkan? apakah pakai `AGENTS.md`?
- Pembagian: pekerjaan mana yang diserahkan ke AI, mana yang dikerjakan manual, dan atas dasar apa
- Apa yang **tidak** Anda percayakan ke AI, dan mengapa

Kalau tim memakai tool yang berbeda-beda antar anggota (9Router/OmniRouter, VSCode, Hermes IDE, Antigravity) — bagus, itu justru menarik. Tulis perbandingannya.

### 9.2 `AGENTS.md`

Berkas aturan repo yang dibaca oleh AI agent Anda. Isi minimum:

- Stack dan versi
- Struktur direktori dan di mana kode baru harus diletakkan
- Konvensi penamaan, format commit, gaya error handling
- Aturan bisnis yang tidak boleh dilanggar (rujuk BR-01…BR-12)
- Larangan eksplisit: apa yang **tidak boleh** ditambahkan agent (dependensi baru tanpa persetujuan, mengubah migrasi yang sudah di-merge, dsb.)
- Perintah untuk menjalankan test dan lint

**Wajib: `AGENTS.md` di-commit sebelum commit fitur pertama.** Penilai akan mengecek urutan di `git log`. Dan berkas ini harus **berevolusi** — kalau isinya sama di jam 09.00 hari pertama dan jam 15.00 hari kedua, artinya Anda tidak pernah belajar apa pun dari 9 jam kerja.

### 9.3 `docs/AI-DEVLOG.md` — **artefak paling bernilai**

Minimal **10 entri**, tersebar di kedua hari (bukan 10 entri ditulis pada jam terakhir — timestamp commit akan menunjukkannya). Setiap entri memakai format ini:

```markdown
### [DEVLOG-07] Validasi rentang margin per grade (FR-07)
- **Waktu**: 2026-08-21 10:24
- **Oleh**: <nama>
- **Tool/Model**: <mis. 9Router → Claude Opus>
- **Tugas**: Implementasi pemblokiran margin di luar rentang grade (BR-06)
- **Cara memberi konteks**: melampirkan Tabel 4.3 dari brief + file `margin.service.ts`
  + menyebut secara eksplisit bahwa nilai rentang berasal dari database, bukan konstanta
- **Keluaran AI**: fungsi validasi + 4 unit test
- **Yang salah**: AI menuliskan rentang grade sebagai object literal di dalam service,
  padahal brief mewajibkan parameter tersimpan sebagai data (BR-06 + FR-13).
  Test yang dibuatnya lolos, tapi menguji konstanta itu — jadi test-nya
  ikut salah, dan hijaunya menipu.
- **Cara verifikasi**: menjalankan AC-09 secara manual, lalu mengubah baris
  rentang di database dan menjalankan ulang — hasil tidak berubah, di situ
  masalahnya kelihatan
- **Tindakan**: prompt ulang dengan larangan tegas "no hardcoded ranges,
  read from margin_range table", dan test diubah agar mengubah baris DB
  lebih dulu
- **Pelajaran**: test yang dibuat AI menguji asumsi AI, bukan requirement kita.
  Sejak entri ini, test untuk aturan bisnis kami tulis dari AC, bukan dari kode.
```

Minimal **3 dari 10 entri** harus berupa kasus **AI salah dan Anda menangkapnya**. Kalau tidak ada satu pun, penilai akan menyimpulkan salah satu dari dua hal: Anda tidak memverifikasi, atau Anda tidak jujur. Keduanya merugikan nilai. Dalam 9 jam koding dengan AI, sesuatu **pasti** salah — itu normal, dan menangkapnya adalah keahlian yang sedang dinilai.

### 9.4 `docs/adr/` — minimal 3 ADR

Format singkat: Konteks → Keputusan → Alasan → Konsekuensi → Alternatif yang ditolak.

**Minimal satu ADR harus mencatat keputusan di mana Anda menolak saran AI**, beserta alasannya. Ini bukti bahwa Anda yang memegang kendali arsitektur, bukan sebaliknya.

---

## 10. Peran dalam Tim

Semua peran ikut menulis kode. Dalam 9 jam tidak ada ruang untuk manajer murni.

| Peran | Tanggung jawab | Tim 1 | Tim 2 |
|---|---|---|---|
| **Tech Lead / Integrator** | Arsitektur, pemilik `AGENTS.md`, merge PR, pemutus saat tim berdebat lebih dari 5 menit | 1 | 1 |
| **AI Workflow Officer** | Pemilik `AI-DEVLOG.md` dan `AI-WORKFLOW.md`, menjaga pustaka prompt tim, memastikan setiap orang menyetor entri devlog. Tetap ikut koding | 1 | 1 |
| **Backend Engineer** | Model data, API, aturan bisnis | 2 | 2 |
| **Frontend Engineer** | UI per peran, integrasi API | 2 | 1 |
| **QA / Verification** | Menyusun test dari AC, menjalankan `DEMO-SCRIPT.md`, membuka issue bug, penjaga gerbang sebelum merge | 1 (rangkap) | 1 |
| **DevOps / Release** | docker compose, CI, migrasi, tagging | — | — |
| **Total** | | **7** | **6** |

**Tim 1** punya satu orang lebih. Gunakan kelebihan itu untuk **DevOps / Release** yang berdiri sendiri — bukan untuk menambah orang di fitur yang sama. Menambah orang ketiga di satu fitur di jam ke-7 akan memperlambat, bukan mempercepat.

**Tim 2** rangkap QA + DevOps pada satu orang, atau bagi tugas DevOps ke Tech Lead. Tim 2 punya keunggulan lain: koordinasi 6 orang lebih murah daripada 7.

Tulis pembagian peran di `README.md` pada 30 menit pertama, dan **beri tahu instruktur**. Peran boleh berubah di hari kedua — tapi perubahannya dicatat.

---

## 11. Jadwal & Gate

**Gate bukan presentasi. Gate adalah pemeriksaan.** Anda akan ditanya, dan jawaban "nanti" akan dicatat.

### Kamis 20 Agustus

| Waktu | Kegiatan |
|---|---|
| 09.00 – 09.30 | Opening, aturan main, rilis brief, tanya jawab |
| 09.30 – 09.45 | Baca brief bersama tim, tetapkan peran |
| 09.45 – 11.00 | **Sprint 0**: repo, branch protection, `AGENTS.md`, ADR-001, model data, potong FR jadi issue di board |
| 11.00 – 11.30 | **GATE 1 — Architecture & Plan Review** (12 menit/tim) |
| 11.30 – 12.00 | Build |
| 12.00 – 13.00 | Istirahat |
| 13.00 – 15.30 | Build — target: walking skeleton |
| 15.30 – 16.00 | **GATE 2 — Walking Skeleton Demo** (10 menit/tim) |
| 16.00 | Tutup hari 1 |

### Jumat 21 Agustus

| Waktu | Kegiatan |
|---|---|
| 09.00 – 09.20 | Standup (7 menit/tim) + review board |
| 09.20 – 11.20 | Build — **P0 harus tuntas di akhir sesi ini** |
| 11.20 – 11.40 | **GATE 3 — Feature Freeze Check** |
| 11.40 – 13.15 | Istirahat & Sholat Jumat |
| 13.15 – 15.00 | Hardening, test, dokumentasi (AI-DEVLOG, README, ADR, DEMO-SCRIPT) |
| 15.00 | **CODE FREEZE** — tag `v1.0.0`. Tidak ada merge ke `main` setelah ini |
| 15.00 – 15.15 | Persiapan demo |
| 15.15 – 15.40 | Demo Tim 1 (15 menit demo + 10 menit tanya jawab) |
| 15.40 – 16.05 | Demo Tim 2 |
| 16.05 – 16.30 | **Cross-review** — setiap tim membuka 3 issue nyata di repo tim lawan |
| 16.30 – 16.50 | Pengumuman skor + retrospektif |
| 16.50 – 17.00 | Penutupan |

### Yang wajib ada di setiap gate

**GATE 1 (Kamis 11.00) — Rencana & Arsitektur.** Bawa:
- Diagram arsitektur (boleh di papan tulis, boleh Mermaid — tidak dinilai kecantikannya)
- Model data: entitas dan relasinya, khususnya bagaimana Anda menangani nasabah perorangan **dan** kelompok
- Board berisi issue untuk seluruh FR P0, sudah ada yang di-assign
- `AGENTS.md` sudah di-commit
- ADR-001 pilihan stack, dengan alasan
- Jawaban untuk: **"apa satu hal yang paling mungkin membuat tim ini gagal, dan apa rencana Anda untuk itu?"**

**GATE 2 (Kamis 15.30) — Walking Skeleton.** Wajib jalan di mesin instruktur:
- `docker compose up` (atau skrip di README) berhasil dari clone bersih
- Login sebagai AO
- Buat satu pengajuan, tersimpan di database
- Pengajuan itu tampil di daftar
- Mock SLIK merespons satu panggilan
- CI hijau
- Minimal 3 entri di `AI-DEVLOG.md`

Tim yang gagal Gate 2 tidak didiskualifikasi, tetapi memulai hari kedua dengan defisit yang berat — dan biasanya berarti masalahnya bukan kurang waktu, melainkan keputusan arsitektur yang perlu dibatalkan malam ini. Instruktur akan membantu Anda melihatnya.

**GATE 3 (Jumat 11.20) — Feature Freeze.** Putuskan di depan instruktur:
- FR mana yang **selesai dan teruji** — bukan "sudah dikoding"
- FR mana yang dibuang. Buang secara sadar, tulis di README bagian "Tidak diimplementasikan dan mengapa"
- Sisa waktu dialokasikan ke apa

Fitur setengah jadi yang dibiarkan mengambang bernilai **negatif**. Fitur yang dibuang dengan alasan tertulis bernilai **positif**. Ini keputusan rekayasa, dan Anda dinilai atas kemampuan membuatnya.

### Bekerja di luar jam kelas

Repo tidak dikunci. Tetapi yang dinilai adalah **tag `v1.0.0` pada Jumat 15.00**, dan pengalaman menunjukkan tim yang lembur sampai malam datang di hari kedua dengan kualitas keputusan yang lebih buruk, bukan lebih baik. Commit di luar jam kelas wajib tetap lewat PR dan tetap tercatat di devlog. Silakan pilih sendiri — tapi pilihlah dengan sadar.

---

## 12. Penilaian

Total 100 poin. Rubrik lengkap dengan deskriptor per level akan dibagikan terpisah dan **tidak dirahasiakan** — Anda boleh membacanya sejak jam pertama dan mengoptimalkan terhadapnya. Itu memang tujuannya.

| Aspek | Bobot | Inti pertanyaan penilai |
|---|---|---|
| **Disiplin rekayasa berbantuan AI** | **25** | Apakah AI dipakai dengan spesifikasi dan diverifikasi? Apakah devlog menunjukkan pembelajaran nyata? Apakah `AGENTS.md` berevolusi? |
| **Kelengkapan fungsional** | **25** | Apakah P0 tuntas dan lolos AC? Apakah P1 dikerjakan? Apakah prioritasnya benar? |
| **Kualitas kode & arsitektur** | **15** | Apakah kode selaras dengan SDD sendiri? Apakah aturan bisnis di tempat yang benar? Apakah bisa dijelaskan? |
| **Git & kolaborasi** | **15** | Apakah kerja terdistribusi nyata? Apakah PR benar-benar direview? Apakah board dipakai selama 2 hari? |
| **Testing & verifikasi** | **10** | Apakah test berasal dari AC? Apakah CI hijau dan bermakna? Apakah jalur error diuji? |
| **Demo & komunikasi** | **10** | Apakah demo lancar dan sesuai skrip? Apakah tim bisa menjawab pertanyaan tentang kodenya sendiri? |

### Pengurangan otomatis

| Temuan | Sanksi |
|---|---|
| Secret / kredensial ter-commit (walaupun sudah dihapus di commit berikutnya) | −10 |
| Satu kontributor > 50 % commit | −8 |
| CI merah di tag `v1.0.0` | −5 |
| `AI-DEVLOG.md` ditulis seluruhnya dalam 2 jam terakhir | −8 |
| Fitur setengah jadi mengambang tanpa catatan di README | −5 per fitur, maks −10 |
| Otorisasi hanya disembunyikan di UI (AC-02 gagal) | −8 |

### Bonus

| Temuan | Nilai |
|---|---|
| Entri devlog yang menunjukkan AI salah secara **halus** — dan tim menangkapnya lewat test, bukan kebetulan | +3 (maks +6) |
| ADR yang menolak saran AI dengan alasan teknis yang sahih | +2 |
| Menemukan bug nyata di repo tim lawan saat cross-review, dengan langkah reproduksi | +2 per bug, maks +4 |

### Cara demo dinilai

Instruktur akan menjalankan `DEMO-SCRIPT.md` Anda dan meminta AC secara acak — termasuk **jalur error**: SLIK 503, dokumen ditolak, maker mencoba jadi approver. Siapkan itu. Demo yang hanya menunjukkan jalur bahagia akan kehilangan nilai di dua aspek sekaligus.

Kemudian instruktur akan menunjuk **satu baris kode secara acak** dan meminta orang yang commit-nya menjelaskan: apa yang dilakukan baris ini, mengapa begitu, dan apa yang terjadi kalau dihapus. Kalau jawabannya "itu dari AI", nilai aspek kualitas kode turun. **Anda boleh tidak menulis sendiri setiap baris. Anda tidak boleh tidak memahami baris yang Anda merge.**

---

## 13. Nasihat Praktis

Sepuluh hal yang membedakan tim yang selesai dari tim yang tidak:

1. **Jangan mulai dari kode. Mulai dari model data.** Satu jam di model data menghemat empat jam refactor. AI sangat membantu di sini — mintalah ia mengkritik model Anda, bukan membuatnya.
2. **Walking skeleton sebelum fitur.** Login → buat pengajuan → tampil di daftar → deploy. Tipis, tapi utuh dari ujung ke ujung. Baru setelah itu tambah otot.
3. **`AGENTS.md` lebih dulu, selalu.** Setiap menit yang Anda investasikan di sini terbayar di setiap prompt sesudahnya. Ini leverage tertinggi dalam seluruh hackathon.
4. **Satu FR = satu branch = satu PR.** PR besar tidak bisa direview, dan yang tidak direview akan menyimpan bug AI.
5. **Jangan biarkan dua orang menyentuh file yang sama.** Bagi berdasarkan batas modul, bukan berdasarkan siapa yang sedang senggang.
6. **Kalau AI memberi lebih dari 200 baris sekaligus, curigai.** Minta ia menjelaskan dulu rencananya, setujui rencananya, baru minta kodenya.
7. **Test dari AC, bukan dari kode.** Test yang dibuat AI dari kode yang dibuat AI hanya membuktikan bahwa AI konsisten dengan dirinya sendiri.
8. **Jalur error di jam ke-6, bukan jam ke-9.** Penilai akan mencabut mock SLIK Anda. Itu pasti terjadi.
9. **Commit dokumentasi setiap kali commit kode.** Devlog yang ditulis dari ingatan di jam terakhir isinya kosong, dan itu terlihat.
10. **Jam 14.00 hari kedua, berhenti menambah fitur.** Waktu terbaik yang tersisa dipakai untuk membuat yang sudah ada benar-benar jalan dan bisa didemokan.

Dan satu hal terakhir. Anda punya 9 jam dan AI yang bisa menulis kode lebih cepat dari yang bisa Anda baca. Batasan Anda bukan kecepatan mengetik — batasan Anda adalah **kejelasan berpikir**. Tim yang paling jelas tentang apa yang sedang mereka bangun akan menang, dan itu berlaku juga di pekerjaan Anda hari Senin nanti.

Semoga berhasil.

---

*Dokumen ini adalah brief resmi hackathon. Pertanyaan tentang interpretasi requirement diajukan ke instruktur dan jawabannya akan dibagikan ke kedua tim secara bersamaan.*
