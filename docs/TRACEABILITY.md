# TRACEABILITY — FR → AC → Endpoint → Test → PR

**Tim**: `<!-- ISI: nama tim -->`
**Terakhir diperbarui**: 2026-08-20, dibaca langsung dari repo (bukan dari rencana)
**Dasar pemeriksaan**: `origin/main` = `2653b21`, plus lima branch yang belum di-merge

---

## Cara membaca berkas ini

Status di bawah **dibaca dari kode**, bukan dari niat. Aturannya:

- **Selesai** = route terdaftar **dan** ada berkas test yang menutup AC-nya
- **Selesai (tanpa test)** = route terdaftar, test belum ada
- **Belum** = route masih stub `501 BELUM_DIIMPLEMENTASI`, atau berkasnya belum ada
- **Kolom "Di branch"** penting: hampir semua pekerjaan **belum di-merge ke `main`**.
  Selama itu, `main` tidak bisa menjalankan sebagian besar FR

Baris tanpa test adalah **risiko**, bukan kekurangan administrasi. Pada Jumat pagi, baris
itulah yang paling mungkin gagal saat demo.

---

## 1. Ringkasan — tiga angka yang menentukan posisi kita

| Pertanyaan | Jawaban hari ini |
|---|---|
| FR P0 selesai **dan** ada test | **6 dari 9** (FR-01, 02, 03, 04, 08, 09) |
| FR P0 belum dikerjakan sama sekali | **3** — FR-05, FR-06, FR-07 |
| FR P1 selesai | **1 dari 4** (FR-10). FR-11 backend selesai, UI belum tersambung |
| Berapa yang sudah di `main`? | **Nol FR fitur.** `main` hanya berisi fondasi |
| BR tanpa test | 4 dari 12 — BR-03 (parsial), BR-04, BR-06, BR-08 |

**Risiko terbesar**: FR-05, FR-06, FR-07, dan FR-13 semuanya milik satu orang, dan keempatnya
masih stub. Di antara mereka ada **enam AC**: AC-05, AC-06, AC-07, AC-08, AC-09, AC-15.

---

## 2. Tabel Traceability

| FR | Judul | P | Pemilik | Endpoint | File test | Di branch | Status |
|---|---|---|---|---|---|---|---|
| FR-01 | Autentikasi & Otorisasi | P0 | Firman | `POST /api/auth/login`, `GET /api/auth/me` | `integration/rbac.spec.ts` | `firman` | ✅ **Selesai & teruji** |
| FR-02 | Pengajuan Mikro | P0 | Dani | `POST /api/pengajuan`, `GET /api/pengajuan`, `GET /:id`, `POST /:id/submit` | `unit/margin-plafon.spec.ts` (BR-01, BR-12) | `dani` | ✅ **Selesai & teruji** |
| FR-03 | Upload & Verifikasi Dokumen | P0 | Dani | `routes/dokumen.ts` | `integration/dokumen.spec.ts`, `unit/dokumen.spec.ts` | `dani` | ✅ **Selesai & teruji** |
| FR-04 | Survei Lapangan | P0 | Dani | `routes/survei.ts` | `integration/skoring-prasyarat.spec.ts` | `dani` | ✅ **Selesai & teruji** |
| FR-05 | SLIK Check | P0 | Alfian | `routes/slik.ts` — **2 stub 501** | `unit/slik-client.spec.ts` (klien saja) | — | ❌ **Belum** |
| FR-06 | Skoring Kelayakan | P0 | Alfian | `routes/skoring.ts` — **3 stub 501** | `unit/skoring.spec.ts` (domain saja, 23 test) | — | ❌ **Belum** — domain siap, service & route belum |
| FR-07 | Margin / Nisbah | P0 | Alfian | **`routes/margin.ts` belum ada** | `unit/margin-plafon.spec.ts` (domain saja) | — | ❌ **Belum** |
| FR-08 | Approval Berjenjang | P0 | Dani | `routes/approval.ts` | `integration/approval.spec.ts`, `unit/approval.spec.ts` | `dani` | ✅ **Selesai & teruji** |
| FR-09 | Audit Trail | P0 | Firman | `GET /api/pengajuan/:id/audit`, `GET /api/audit` | `integration/audit.spec.ts`, `audit-readonly.spec.ts` | `firman` | ✅ **Selesai & teruji** |
| FR-10 | Pembiayaan Kelompok | P1 | Dani | `POST /api/pengajuan/:id/anggota` | `integration/kelompok.spec.ts` | `dani` | ✅ **Selesai & teruji** |
| FR-11 | Notifikasi | P1 | Firman (BE) + Ray (UI) | `GET /api/notifikasi`, `POST /:id/baca` | `integration/notifikasi.spec.ts` | `firman` + `feat/FR-02-…` | ⚠️ **BE selesai, UI belum tersambung** |
| FR-12 | Dashboard Pipeline | P1 | Reffa | belum ada | belum ada | — | ❌ **Belum** |
| FR-13 | Parameter Terkonfigurasi | P1 | Alfian | `routes/parameter.ts` — **6 stub 501** | belum ada | — | ❌ **Belum** |
| FR-14…18 | P2 | P2 | — | — | — | — | ⛔ **Dibuang** — lihat `README.md` bagian 5 |

**Infrastruktur** (bukan FR, tetapi diperiksa penilai):

| Item | Bukti | Status |
|---|---|---|
| Mock SLIK sesuai kontrak §6.1 | `mock-slik/tests/kontrak.spec.ts` — 8 test lolos | ✅ Selesai & teruji |
| `docker compose up` satu perintah | 5 service, healthcheck berantai | ✅ Selesai — **belum diuji dari clone bersih** |
| Migrasi dari berkas | 3 migrasi, 16 tabel + 11 enum | ✅ Selesai |
| Seed idempoten | Dijalankan dua kali, tidak menggandakan | ✅ Selesai & teruji |
| Data siap-demo | 5 pengajuan, AC-06/09/10/12/14 | ✅ Selesai & teruji |
| CI | 6 job: higiene, lint ×3, unit, mock-slik, integrasi | ✅ Selesai — **belum pernah hijau di remote** |
| Database bersama tim | 14 schema Aiven, dimigrasi + di-seed | ✅ Selesai |

---

## 3. Status per orang

| Orang | Ditugaskan | Selesai | Belum | Branch |
|---|---|---|---|---|
| **Dani** | FR-02, 03, 04, 08, 10 | **5 dari 5**, semuanya bertest | — | `dani`, 4 commit |
| **Firman** | FR-01, 09, 11 + infra | **3 dari 3** + seluruh infra & dokumen | — | `firman`, 11 commit |
| **Ray** | S-03, 05, 06, 07 + FR-11 UI | **5 layar dari 5**, 1.953 baris | Belum tersambung ke `main` | `feat/FR-02-buat-pengajuan`, 3 commit, **sudah di-rebase** |
| **Alfian** | FR-05, 06, 07, 13 + mock SLIK | mock SLIK (klien) | **4 FR — keempatnya masih stub** | `alfian`, 1 commit — **isinya frontend, bukan FR miliknya** |
| **Reffa** | Fondasi UI, S-01, 02, 04, 12, QA | — | Semuanya | `reffa`, 0 commit |
| **Eka** | S-08…11, 13, 14 + AI Workflow | **6 layar dari 6** + 5 modul `api/` | Belum tersambung ke `main`; tidak ada test layar | `eka`, 1 commit |

---

## 3.1 Temuan kontrak dari sisi frontend (Eka, layar S-08…S-14)

Ditemukan saat menyambungkan keenam layar ke API nyata. Dicatat di sini karena
ketiganya membuat layar **tidak dapat dibuktikan bekerja end-to-end**, dan itu
harus terlihat sebelum demo, bukan saat demo.

| # | Temuan | Dampak pada layar | Pemilik backend |
|---|---|---|---|
| T-1 | `POST/GET /api/pengajuan/{id}/margin` ada di kontrak beku (SDD BAB 5) tetapi **`routes/margin.ts` belum ada** dan tidak terdaftar di `routes/index.ts` | **S-10 belum dapat diuji end-to-end.** Layar dibangun terhadap kontrak; bila server menjawab 404, layar menampilkannya sebagai galat — bukan sebagai "margin tersimpan" | Alfian (FR-07) |
| T-2 | `POST /api/pengajuan/{id}/skoring/override` masih `// TODO: implement override logic` — mengembalikan echo `{ gradeFinal, alasan }` tanpa menyimpan | **Panel override S-09 mengirim data yang tidak disimpan.** Tidak ada indikasi kegagalan bagi ANL, karena server menjawab 200 | Alfian (FR-06) |
| T-3 | Ketiga `PUT /api/parameter/*` masih `// TODO: implement update logic` — mengembalikan echo, tidak menulis ke database | **AC-15 belum dapat lolos.** S-13 dapat mengirim bobot baru dan menerima 200, tetapi perhitungan berikutnya memakai nilai lama | Alfian (FR-13) |
| T-4 | `GET /api/pengajuan/{id}/slik` mengembalikan baris `hasil_slik` mentah dari Prisma, termasuk kolom `diperiksaOleh`; belum ada DTO | S-08 hanya memakai field yang dibutuhkan, tetapi bentuk respons dapat berubah tanpa peringatan saat DTO ditambahkan | Alfian (FR-05) |
| T-5 | `GET /api/pengajuan/{id}/skoring` memakai `include: { rincian: true }` tanpa DTO; `snapshotParameter` dikirim apa adanya sebagai `jsonb` | S-09 menampilkan rincian dengan aman, tetapi `snapshotParameter` bertipe `unknown` di frontend dan belum dirender | Alfian (FR-06) |

**Yang TIDAK dilakukan sebagai jalan pintas**: tidak ada data tiruan yang
ditanam di frontend untuk menutupi T-1…T-3, dan tidak ada nilai bawaan rentang
margin atau bobot yang ditulis di layar. Menutupi keduanya akan membuat layar
terlihat bekerja saat backend belum siap — persis kegagalan yang paling mahal
saat penilai menekan tombol.

---

## 4. Checklist — yang sudah dan yang belum

### ✅ Sudah selesai

- [x] Skema database 16 tabel + 11 enum, dari migrasi
- [x] Seed idempoten: 7 akun, 10 nasabah, 8 parameter, 3 ambang, 5 rentang margin
- [x] Data siap-demo 5 pengajuan (AC-06, 09, 10, 12, 14)
- [x] 14 schema Aiven dimigrasi dan di-seed untuk 6 orang + CI + demo
- [x] Mock SLIK sesuai kontrak §6.1, 4 cabang respons, mode paksa untuk demo
- [x] `docker compose` 5 service dengan healthcheck berantai, dua mode database
- [x] CI 6 job termasuk pemindai kredensial
- [x] FR-01 Autentikasi & otorisasi fail-closed
- [x] FR-02 Pengajuan + nomor referensi `IMT-YYYYMMDD-NNNN`
- [x] FR-03 Upload & verifikasi dokumen berversi
- [x] FR-04 Survei lapangan + prasyarat BR-03
- [x] FR-08 Approval berjenjang (BR-02, BR-09)
- [x] FR-09 Audit trail append-only, **ditegakkan trigger database**
- [x] FR-10 Pembiayaan kelompok + evaluasi ulang level
- [x] FR-11 Notifikasi (backend)
- [x] Lapisan `domain/` lengkap: 71 unit test lolos
- [x] 5 layar frontend AO & dokumen (Ray)
- [x] Dokumen: SRS, SDD, 3 ADR, SETUP, DATABASE, DEMO-SCRIPT, UIUX-STITCH, PEMBAGIAN-TIM

### ❌ Belum selesai — urut prioritas

**Prioritas 1 — P0 yang belum ada sama sekali (Alfian):**

- [ ] **FR-05 SLIK Check** — `routes/slik.ts` masih 2 stub 501 → menutup **AC-05, AC-06**
- [ ] **FR-06 Skoring** — `routes/skoring.ts` masih 3 stub 501 → menutup **AC-07, AC-08**
      Domain sudah siap dan bertest; yang kurang service + route
- [ ] **FR-07 Margin** — `routes/margin.ts` **belum ada** → menutup **AC-09**
      Domain sudah siap dan bertest

**Prioritas 2 — merge yang tertahan:**

- [ ] Merge `dani` (5 FR) lewat PR
- [ ] Merge `firman` (3 FR + infra) lewat PR
- [ ] Merge `feat/FR-02-buat-pengajuan` (5 layar Ray) lewat PR — **sudah di-rebase, siap**
- [ ] Selesaikan tabrakan branch `alfian`: berisi stub layar milik Ray dan Eka

**Prioritas 3 — P1:**

- [ ] **FR-13 Parameter** — 6 stub 501 → menutup **AC-15**
- [ ] **FR-12 Dashboard Pipeline** — belum ada (Reffa)
- [ ] Fondasi UI: `theme.css`, komponen bersama, layout, guard peran (Reffa)
- [ ] Layar S-01 Login, S-02 Dashboard, S-04 Detail, S-12 Audit (Reffa)
- [ ] Layar S-08 SLIK, S-09 Skoring, S-10 Margin, S-11 Antrian, S-13 Parameter, S-14 Pengguna (Eka)
- [ ] FR-11 UI tersambung ke backend

**Prioritas 4 — verifikasi & artefak yang dinilai:**

- [ ] `docker compose up` diuji **dari clone bersih di direktori baru**, oleh orang yang
      bukan penulisnya
- [ ] CI hijau di `main` — sampai sekarang belum pernah berjalan di remote
- [ ] `docs/AI-DEVLOG.md`: **minimal 10 entri, minimal 3 kasus AI salah**, tersebar dua hari
- [ ] `docs/AI-WORKFLOW.md` diisi
- [ ] ADR yang mencatat penolakan saran AI (bonus +2) — kerangkanya ada di ADR-0002
- [ ] `README.md` bagian 4 (status FR) dan bagian 5 (yang dibuang) diisi di Gate 3
- [ ] Rotasi password Aiven
- [ ] Kolom "Status latihan" di `DEMO-SCRIPT.md` diisi

---

## 5. Penelusuran Aturan Bisnis

| BR | Ringkasan | Ditegakkan di | Test | Status |
|---|---|---|---|---|
| BR-01 | Plafon Rp 5 jt – Rp 500 jt | `domain/plafon.ts` | `unit/margin-plafon.spec.ts` | ✅ |
| BR-02 | Approval berurutan | `domain/approval.ts` | `unit/approval.spec.ts`, `integration/approval.spec.ts` | ✅ |
| BR-03 | Prasyarat skoring | `domain/prasyarat-skoring.ts` | `integration/skoring-prasyarat.spec.ts` | ⚠️ ditegakkan, jalur skoring belum ada |
| BR-04 | Masa berlaku SLIK 30 hari | `domain/prasyarat-skoring.ts` | **belum** | ❌ |
| BR-05 | Grade 5 tidak dapat diajukan | `domain/grade.ts` | `unit/skoring.spec.ts` | ⚠️ domain saja |
| BR-06 | Margin di luar rentang diblokir | `domain/margin.ts` | `unit/margin-plafon.spec.ts` | ⚠️ domain saja, endpoint belum ada |
| BR-07 | Pembulatan sekali di akhir | `domain/skoring.ts` | `unit/skoring.spec.ts` | ✅ |
| BR-08 | Rincian komponen disimpan | `domain/skoring.ts` + skema | **belum** | ❌ endpoint belum ada |
| BR-09 | Maker ≠ approver | `domain/approval.ts` | `unit/approval.spec.ts`, `integration/approval.spec.ts` | ✅ |
| BR-10 | Aktor + timestamp tiap perubahan | `services/status.service.ts` | `integration/audit.spec.ts` | ✅ |
| BR-11 | NIK tidak ke log/error/URL | `lib/logger.ts` | **belum** | ❌ |
| BR-12 | Nomor referensi unik | `domain/nomor-referensi.ts` | `unit/margin-plafon.spec.ts` | ✅ |

---

## 6. Ringkasan Risiko

| Pertanyaan | Kamis 15.30 (Gate 2) | Jumat 11.20 (Gate 3) | Jumat 15.00 |
|---|---|---|---|
| FR P0 berstatus Done | **6 dari 9** | | |
| FR P0 tanpa file test | **3** (FR-05, 06, 07) | | |
| BR tanpa test | **4** (BR-04, 08, 11, dan BR-06 hanya domain) | | |
| AC yang sudah dilatih di demo | **0** | | |
| Risiko terbesar | Empat FR menumpuk di satu orang, dan tidak satu pun pekerjaan ada di `main` | | |
