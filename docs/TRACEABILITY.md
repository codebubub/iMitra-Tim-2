# TRACEABILITY — FR → AC → Endpoint → Test → PR

**Tim**: `<!-- ISI: nama tim -->`
**Terakhir diperbarui**: 2026-08-21, dibaca langsung dari repo (bukan dari rencana)
**Dasar pemeriksaan**: `main` = `93b8fa1`, working tree bersih kecuali dokumen
**Bukti test**: seluruh suite dijalankan 2026-08-21 — **32 berkas, 280 test, seluruhnya lolos**

---

## Cara membaca berkas ini

Status di bawah **dibaca dari kode dan dari keluaran runner**, bukan dari niat. Aturannya:

- **Selesai & teruji** = route terdaftar **dan** ada berkas test yang menutup AC-nya **dan**
  test itu lolos saat dijalankan
- **Selesai (tanpa test)** = route terdaftar, test belum ada
- **Belum** = route masih stub, atau berkasnya belum ada

Baris tanpa test adalah **risiko**, bukan kekurangan administrasi.

Rincian pengujian — akun uji, data uji, alur, skenario per AC, jalur error, dan celah yang
masih terbuka — ada di [`docs/TESTING.md`](TESTING.md). Berkas ini hanya memetakan
**apa menutup apa**; TESTING.md yang menjelaskan **bagaimana mengujinya**.

---

## 1. Ringkasan — tiga angka yang menentukan posisi kita

| Pertanyaan | Jawaban hari ini |
|---|---|
| FR P0 selesai **dan** ada test | **9 dari 9** (FR-01 s.d. FR-09) |
| FR P0 belum dikerjakan | **0** |
| FR P1 selesai | **4 dari 4** (FR-10, FR-11, FR-12, FR-13) |
| Berapa yang sudah di `main`? | **Seluruhnya.** Enam branch anggota sudah disatukan |
| AC dengan test otomatis | **15 dari 15**, seluruhnya lolos |
| BR dengan test | **11 penuh + 1 parsial** dari 12 — BR-11 diuji di respons & audit, belum di log |

**Risiko terbesar sekarang bukan lagi fitur yang belum ada, melainkan tiga hal ini**:

1. **BR-11 di log aplikasi belum diuji otomatis** — NIK terbukti tidak bocor ke respons dan
   audit trail, tetapi tidak ada test yang membaca keluaran logger. Ini justru jalur yang
   paling mudah bocor tanpa disadari. (`TESTING.md` celah G-6)
2. **Frontend hanya punya test lapisan `api/`** — 71 test, tidak satu pun me-render komponen.
   Seluruh layar bisa rusak sementara CI tetap hijau. (celah G-8)
3. **`docker compose up` belum diuji dari clone bersih** oleh orang yang bukan penulisnya.

---

## 2. Tabel Traceability

| FR | Judul | P | Pemilik | Endpoint | Berkas test | Status |
|---|---|---|---|---|---|---|
| FR-01 | Autentikasi & Otorisasi | P0 | Firman | `POST /api/auth/login`, `GET /api/auth/me` | `integration/rbac.spec.ts` (6), `integration/pengguna.spec.ts` (10) | ✅ **Selesai & teruji** |
| FR-02 | Pengajuan Mikro | P0 | Dani | `POST /api/pengajuan`, `GET /api/pengajuan`, `GET /:id`, `PATCH /:id`, `POST /:id/submit` | `integration/pengajuan.spec.ts` (8), `unit/margin-plafon.spec.ts` (27) | ✅ **Selesai & teruji** |
| FR-03 | Upload & Verifikasi Dokumen | P0 | Dani | `routes/dokumen.ts` — 4 route | `integration/dokumen.spec.ts` (2), `unit/dokumen.spec.ts` (15) | ✅ **Selesai & teruji** |
| FR-04 | Survei Lapangan | P0 | Dani | `routes/survei.ts` — 3 route | `integration/skoring-prasyarat.spec.ts` (3) | ✅ **Selesai & teruji** |
| FR-05 | SLIK Check | P0 | Alfian | `POST /api/pengajuan/{id}/slik-check`, `GET /{id}/slik` | `integration/slik.spec.ts` (10), `integration/slik-serialisasi.spec.ts` (2), `unit/slik-client.spec.ts` (1) | ✅ **Selesai & teruji** |
| FR-06 | Skoring Kelayakan | P0 | Alfian | `POST /{id}/skoring`, `GET /{id}/skoring`, `GET /{id}/skoring/prasyarat` | `integration/skoring.spec.ts` (8), `unit/skoring.spec.ts` (23), `unit/prasyarat-skoring.spec.ts` (1) | ✅ **Selesai & teruji** |
| FR-06.1 | Override grade oleh ANL | P0 | Alfian | `POST /{id}/skoring/override` | `integration/override.spec.ts` (5) | ✅ **Selesai & teruji** |
| FR-07 | Margin / Nisbah | P0 | Alfian | `POST /{id}/margin`, `GET /{id}/margin` | `integration/margin.spec.ts` (9), `unit/margin.spec.ts` (11) | ✅ **Selesai & teruji** |
| FR-08 | Approval Berjenjang | P0 | Dani | `POST /{id}/ajukan-approval`, `GET /api/approval/antrian`, `POST /{id}/approval` | `integration/approval.spec.ts` (5), `unit/approval.spec.ts` (19) | ✅ **Selesai & teruji** |
| FR-09 | Audit Trail | P0 | Firman | `GET /api/pengajuan/{id}/audit`, `GET /api/audit` | `integration/audit.spec.ts` (8), `integration/audit-readonly.spec.ts` (4) | ✅ **Selesai & teruji** |
| FR-10 | Pembiayaan Kelompok | P1 | Dani | `POST /{id}/anggota`, `PATCH /{id}/anggota/{aid}`, `POST /{id}/anggota/{aid}/tolak` | `integration/kelompok.spec.ts` (2), `unit/approval.spec.ts` | ✅ **Selesai & teruji** |
| FR-11 | Notifikasi | P1 | Firman (BE) + Ray (UI) | `GET /api/notifikasi`, `POST /{id}/baca` | `integration/notifikasi.spec.ts` (7) | ✅ **Selesai & teruji** — UI sudah tersambung |
| FR-12 | Dashboard Pipeline | P1 | Reffa | `GET /api/dashboard/pipeline` | `integration/dashboard.spec.ts` (10) | ✅ **Selesai & teruji** |
| FR-13 | Parameter Terkonfigurasi | P1 | Alfian | `routes/parameter.ts` — 6 route (GET+PUT × 3 tabel) | `integration/parameter-live.spec.ts` (5) | ✅ **Selesai & teruji** |
| FR-14…18 | P2 | P2 | — | — | — | ⛔ **Dibuang** — lihat `README.md` bagian 5 |

**Infrastruktur** (bukan FR, tetapi diperiksa penilai):

| Item | Bukti | Status |
|---|---|---|
| Mock SLIK sesuai kontrak §6.1 | `mock-slik/tests/kontrak.spec.ts` — 8 test lolos | ✅ Selesai & teruji |
| Isolasi database test | `backend/tests/setup-env.ts` mengalihkan ke `DATABASE_URL_TEST` sebelum aplikasi di-import | ✅ Selesai |
| Fixture test bersama | `backend/tests/integration/bantuan.ts` | ✅ Selesai |
| `docker compose up` satu perintah | 5 service, healthcheck berantai | ⚠️ Selesai — **belum diuji dari clone bersih** |
| Migrasi dari berkas | 3 migrasi, 16 tabel + 11 enum | ✅ Selesai |
| Seed idempoten | Dijalankan dua kali, tidak menggandakan | ✅ Selesai & teruji |
| Data siap-demo | 5 pengajuan, AC-06/09/10/12/14 | ✅ Selesai & teruji |
| CI | 6 job: higiene, lint ×3, unit, mock-slik, integrasi | ⚠️ Selesai — **belum pernah hijau di remote** |
| Dokumentasi pengujian | [`docs/TESTING.md`](TESTING.md) — 144 skenario, 12 jalur error | ✅ Selesai |

---

## 2.1 Sebaran test otomatis

Angka dari keluaran runner, bukan dari menghitung blok `it(` — berkas dengan test
terparameter melaporkan lebih banyak.

| Paket | Berkas | Test | Perintah |
|---|---|---|---|
| Backend unit (domain, tanpa database) | 7 | **97** | `npm run test:unit` |
| Backend integrasi (API + database) | 17 | **104** | `node scripts/dengan-env.mjs backend test:integration` |
| Frontend (lapisan `api/`) | 7 | **71** | `cd frontend && npm test` |
| Mock SLIK (kontrak) | 1 | **8** | `cd mock-slik && npm test` |
| **Total** | **32** | **280** | |

---

## 3. Temuan Kontrak dari Sisi Frontend — semuanya sudah ditutup

Kelima temuan ini dicatat 2026-08-20 saat keenam layar analis/approver/admin disambungkan ke
API nyata. Ketiga yang pertama membuat layar **tidak dapat dibuktikan bekerja end-to-end**.
Semuanya kini tertutup, dan masing-masing punya test yang mencegahnya kembali.

| # | Temuan semula | Penutup | Test penjaga |
|---|---|---|---|
| T-1 | `POST/GET /api/pengajuan/{id}/margin` ada di kontrak beku (SDD BAB 5) tetapi `routes/margin.ts` belum ada | `routes/margin.ts` terdaftar lewat `marginRoutes()` di `routes/index.ts` | `integration/margin.spec.ts` (9) |
| T-2 | `POST /{id}/skoring/override` masih `// TODO: implement override logic` — mengembalikan echo tanpa menyimpan | `services/override-skoring.service.ts` menyimpan grade **dan** menulis audit | `integration/override.spec.ts` (5) |
| T-3 | Ketiga `PUT /api/parameter/*` masih echo, tidak menulis ke database — **AC-15 tidak bisa lolos** | `services/parameter-tulis.service.ts` menulis + memvalidasi + mengaudit | `integration/parameter-live.spec.ts` (5) |
| T-4 | `GET /{id}/slik` mengembalikan baris Prisma mentah, termasuk `diperiksaOleh` | DTO ditambahkan | `integration/slik-serialisasi.spec.ts` — "tidak membocorkan identitas pemeriksa ke klien" |
| T-5 | `GET /{id}/skoring` memakai `include: { rincian: true }` tanpa DTO | DTO ditambahkan; rincian dikirim sebagai angka | `integration/skoring.spec.ts` — "empat rincian komponen tersimpan dan terbaca kembali sebagai angka" |

**Yang TIDAK dilakukan sebagai jalan pintas**: tidak ada data tiruan yang ditanam di frontend
untuk menutupi T-1…T-3, dan tidak ada nilai bawaan rentang margin atau bobot yang ditulis di
layar. Menutupi keduanya akan membuat layar terlihat bekerja saat backend belum siap — persis
kegagalan yang paling mahal saat penilai menekan tombol.

---

## 4. Checklist — yang sudah dan yang belum

### ✅ Sudah selesai

- [x] Skema database 16 tabel + 11 enum, dari migrasi
- [x] Seed idempoten: 7 akun, 10 nasabah, 8 parameter, 3 ambang, 5 rentang margin
- [x] Data siap-demo 5 pengajuan (AC-06, 09, 10, 12, 14)
- [x] Mock SLIK sesuai kontrak §6.1, 4 cabang respons, mode paksa untuk demo
- [x] `docker compose` 5 service dengan healthcheck berantai, dua mode database
- [x] CI 6 job termasuk pemindai kredensial
- [x] **Seluruh 13 FR (9 P0 + 4 P1) terimplementasi dan punya test yang lolos**
- [x] **Seluruh 15 AC punya test otomatis**
- [x] Lapisan `domain/` lengkap: 8 modul, 97 unit test
- [x] 16 layar frontend, seluruh peran terlayani
- [x] Enam branch anggota disatukan ke `main`
- [x] Isolasi database test (`setup-env.ts`) + fixture bersama (`bantuan.ts`)
- [x] Dokumen: SRS, SDD, 3 ADR, SETUP, DATABASE, DEMO-SCRIPT, UIUX-STITCH, PEMBAGIAN-TIM, **TESTING**

### ❌ Belum selesai — urut prioritas

**Prioritas 1 — verifikasi yang dinilai:**

- [ ] `docker compose up` diuji **dari clone bersih di direktori baru**, oleh orang yang
      bukan penulisnya
- [ ] CI hijau di `main` — sampai sekarang belum pernah berjalan di remote
- [ ] Seluruh alur F-01 s.d. F-08 dan jalur error E-1 s.d. E-12 ditelusuri manual sekali
      (lihat `TESTING.md` bagian 6 dan 8)

**Prioritas 2 — celah pengujian yang tersisa** (rinciannya di `TESTING.md` bagian 12.2):

- [ ] **G-6** — test redaksi log untuk BR-11 (logger diarahkan ke buffer)
- [ ] **G-8** — test render komponen untuk layar Skoring dan Margin
- [ ] **G-10** — perluas `unit/slik-client.spec.ts` ke cabang 404/503/timeout
- [ ] **G-11** — perintah pembersih schema test

**Prioritas 3 — artefak yang dinilai:**

- [ ] `docs/AI-DEVLOG.md`: **minimal 10 entri, minimal 3 kasus AI salah**, tersebar dua hari
- [ ] `docs/AI-WORKFLOW.md` diisi
- [ ] ADR yang mencatat penolakan saran AI (bonus +2) — kerangkanya ada di ADR-0002
- [ ] `README.md` bagian 1 (nama tim, akun GitHub), bagian 4 (status FR), bagian 5 (yang dibuang)
- [ ] Kolom "Status latihan" di `DEMO-SCRIPT.md` diisi
- [ ] Rotasi password Aiven

---

## 5. Penelusuran Aturan Bisnis

| BR | Ringkasan | Ditegakkan di | Test | Status |
|---|---|---|---|---|
| BR-01 | Plafon Rp 5 jt – Rp 500 jt | `domain/plafon.ts` | `unit/margin-plafon.spec.ts`, `integration/pengajuan.spec.ts` | ✅ |
| BR-02 | Approval berurutan | `domain/approval.ts` | `unit/approval.spec.ts`, `integration/approval.spec.ts` | ✅ |
| BR-03 | Prasyarat skoring | `domain/prasyarat-skoring.ts` | `integration/skoring-prasyarat.spec.ts`, `integration/skoring.spec.ts` (tiap prasyarat terpisah) | ✅ |
| BR-04 | Masa berlaku SLIK 30 hari | `domain/prasyarat-skoring.ts` | `integration/skoring.spec.ts` — "hasil SLIK lebih tua dari masa berlaku ditolak dengan menyebut BR-04" | ✅ |
| BR-05 | Grade 5 tidak dapat diajukan | `domain/grade.ts`, `domain/margin.ts` | `unit/skoring.spec.ts`, `integration/margin.spec.ts` | ✅ |
| BR-06 | Margin di luar rentang diblokir | `domain/margin.ts` | `unit/margin-plafon.spec.ts`, `unit/margin.spec.ts`, `integration/margin.spec.ts` | ✅ |
| BR-07 | Pembulatan sekali di akhir | `domain/skoring.ts` | `unit/skoring.spec.ts` | ✅ |
| BR-08 | Rincian komponen disimpan | `domain/skoring.ts` + `services/skoring.service.ts` | `integration/skoring.spec.ts` — empat rincian tersimpan dan terbaca kembali | ✅ |
| BR-09 | Maker ≠ approver | `domain/approval.ts` | `unit/approval.spec.ts`, `integration/approval.spec.ts` | ✅ |
| BR-10 | Aktor + timestamp tiap perubahan | `services/status.service.ts` | `integration/audit.spec.ts` | ✅ |
| BR-11 | NIK tidak ke log/error/URL | `lib/logger.ts`, `middleware/error.ts` | `integration/audit.spec.ts`, `slik.spec.ts`, `pengajuan.spec.ts` — **respons & audit saja** | ⚠️ **parsial** — log belum diuji (celah G-6) |
| BR-12 | Nomor referensi unik | `domain/nomor-referensi.ts` | `unit/margin-plafon.spec.ts`, `integration/pengajuan.spec.ts` | ✅ |

---

## 6. Ringkasan Risiko

| Pertanyaan | Kamis 15.30 (Gate 2) | Jumat 15.00 |
|---|---|---|
| FR P0 berstatus Done | **6 dari 9** | **9 dari 9** |
| FR P0 tanpa file test | **3** (FR-05, 06, 07) | **0** |
| BR tanpa test | **4** (BR-04, 08, 11, dan BR-06 hanya domain) | **0 tanpa test; 1 parsial** (BR-11 di log) |
| AC dengan test otomatis yang lolos | **belum diukur** | **15 dari 15** |
| Risiko terbesar | Empat FR menumpuk di satu orang, dan tidak satu pun pekerjaan ada di `main` | Verifikasi lingkungan (clone bersih, CI di remote) dan cakupan UI yang tidak terlihat CI |

---

## 7. Riwayat berkas ini

| Tanggal | Perubahan | Dipicu oleh |
|---|---|---|
| 2026-08-20 | Versi awal — dibaca dari `origin/main` `2653b21` + lima branch yang belum di-merge | Gate 2 |
| 2026-08-21 | Diperbarui menyeluruh terhadap `main` `93b8fa1`: seluruh FR selesai & teruji, T-1…T-5 ditutup, tabel BR memakai test nyata, sebaran test dari keluaran runner, risiko digeser dari "fitur belum ada" ke "verifikasi lingkungan & cakupan UI" | Verifikasi ulang saat menyusun [`docs/TESTING.md`](TESTING.md) |
