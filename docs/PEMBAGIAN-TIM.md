# PEMBAGIAN TIM — iMitra (5 Orang)

**Tim**: `<!-- ISI: nama tim -->`
**Anggota**: Eka Purnamasari · Reffa · Hamdani · Alfian · Muhammad Rayhan Subhi
**Tanggal**: 2026-08-20
**Dasar**: brief §10 (peran), §8.3 (distribusi kerja), §13 butir 5 (bagi berdasarkan batas modul)

---

## 0. Catatan sebelum tabel dibaca

**Brief §10 merancang tim 6–7 orang; kami 5.** Konsekuensinya nyata dan lebih baik diakui
sekarang daripada ditemukan penilai:

| Yang hilang | Konsekuensi | Bagaimana kami menutupinya |
|---|---|---|
| Satu Backend Engineer (brief: 2, kami: 2 — aman) | — | — |
| Satu Frontend Engineer (brief Tim 1: 2, kami: 1) | **Ini leher botol kami.** Satu orang memegang 13 layar untuk 6 peran | Kontrak API dibekukan Kamis siang; Hamdani berpindah ke frontend Jumat 09.20 kalau sinyal di §5 muncul |
| DevOps / Release berdiri sendiri | docker-compose, CI, migrasi, dan tagging menempel ke Tech Lead | Seluruh pekerjaan DevOps dituntaskan di Sprint 0 dan Kamis pagi, sebelum beban fitur naik |
| QA / Verification berdiri sendiri | QA merangkap AI Workflow Officer dan pemilik mock SLIK | mock SLIK adalah layanan terkecil dan justru milik orang yang paling butuh mengendalikannya untuk menguji jalur error |

**Kalau Firman ikut koding (tim menjadi 6)**: ambil peran **Frontend Engineer kedua**,
bukan menambah orang di backend. Reffa memegang layar AO + approver, Firman memegang layar
ANL (dokumen, SLIK, skoring, margin) + layar ADM. Dengan begitu risiko utama di §5 hilang
dan rencana kontinjensi tidak perlu dijalankan.

**Penugasan nama di bawah adalah usulan, bukan keputusan final.** Tech Lead menukarnya dalam
5 menit pertama Sprint 0 setelah tabel keahlian di `docs/adr/0001-pilihan-stack.md`
diisi dengan angka nyata. 9 jam bukan waktu untuk belajar lapisan yang belum pernah
disentuh — kenyamanan orangnya menang atas kerapian tabel ini.

---

## 1. Peran & Kepemilikan

| Anggota | Peran | Modul yang dimiliki | FR utama | Berkas yang **hanya** ia sentuh |
|---|---|---|---|---|
| **Muhammad Rayhan Subhi** | Tech Lead / Integrator **+ DevOps / Release** | Fondasi & infrastruktur | **FR-01**, **FR-09** | `backend/prisma/`, `backend/src/middleware/`, `backend/src/config/`, `backend/src/lib/`, `backend/src/services/status.service.ts`, `backend/src/services/audit.service.ts`, `docker-compose.yml`, `.github/`, `AGENTS.md`, `docs/adr/` |
| **Alfian** | Backend Engineer — **Risiko & Perhitungan** | Semua yang menghasilkan angka | **FR-05**, **FR-06**, **FR-07**, **FR-13** | `backend/src/domain/skoring.ts`, `domain/margin.ts`, `domain/grade.ts`, `domain/prasyarat-skoring.ts`, `clients/slik.client.ts`, `services/slik.service.ts`, `services/skoring.service.ts`, `services/parameter.service.ts`, `routes/skoring.ts`, `routes/slik.ts`, `routes/parameter.ts` |
| **Hamdani** | Backend Engineer — **Alur & Approval** | Siklus hidup pengajuan | **FR-02**, **FR-03**, **FR-04**, **FR-08**, **FR-10** | `backend/src/domain/plafon.ts`, `domain/approval.ts`, `domain/nomor-referensi.ts`, `services/pengajuan.service.ts`, `services/dokumen.service.ts`, `services/survei.service.ts`, `services/approval.service.ts`, `routes/pengajuan.ts`, `routes/dokumen.ts`, `routes/survei.ts`, `routes/approval.ts` |
| **Reffa** | Frontend Engineer | Seluruh UI | **FR-11**, **FR-12** + antarmuka seluruh FR | `frontend/` (seluruhnya) |
| **Eka Purnamasari** | QA / Verification **+ AI Workflow Officer** | Verifikasi, mock SLIK, artefak AI | Mock SLIK (§6.1 brief) + test dari **seluruh** AC | `mock-slik/` (seluruhnya), `backend/tests/`, `docs/DEMO-SCRIPT.md`, `docs/TRACEABILITY.md`, `docs/AI-DEVLOG.md`, `docs/AI-WORKFLOW.md`, `fixtures/` |

**Aturan yang menjaga pembagian ini bekerja** (brief §13 butir 5):

- Kolom terakhir adalah **batas modul, bukan saran**. Dua orang tidak menyentuh berkas yang
  sama. Kalau butuh perubahan di wilayah orang lain, buka issue atau minta — jangan edit.
- `backend/prisma/schema.prisma` **hanya** disentuh Tech Lead. Kebutuhan tabel/kolom baru
  disampaikan sebagai permintaan, bukan sebagai PR yang mengubah skema.
- `repositories/` dimiliki bersama tetapi **satu berkas per agregat**: `pengajuan.repo.ts`
  milik Hamdani, `skoring.repo.ts` dan `slik.repo.ts` milik Alfian, `audit.repo.ts` milik
  Rayhan. Tidak ada berkas repository "umum".
- `docs/AI-DEVLOG.md` **diisi kelima anggota**, hanya dikurasi Eka. Kolom "Oleh" yang berisi
  satu nama untuk 10 entri adalah temuan negatif (brief §9.3 butir 5).

---

## 2. Peta FR → Pemilik → AC → Test

| FR | Prioritas | Pemilik | AC yang membuktikannya | Berkas test |
|---|---|---|---|---|
| FR-01 Autentikasi & Otorisasi | P0 | Rayhan | AC-01, AC-02 | `tests/integration/rbac.spec.ts` |
| FR-02 Pengajuan Mikro | P0 | Hamdani | AC-01 | `tests/integration/pengajuan.spec.ts` |
| FR-03 Upload & Verifikasi Dokumen | P0 | Hamdani | AC-03 | `tests/integration/dokumen.spec.ts` |
| FR-04 Survei Lapangan | P0 | Hamdani | AC-04 | `tests/integration/skoring-prasyarat.spec.ts` |
| FR-05 SLIK Check | P0 | Alfian | AC-05, AC-06 | `tests/integration/slik.spec.ts`, `tests/unit/slik-client.spec.ts` |
| FR-06 Skoring Kelayakan | P0 | Alfian | AC-06, AC-07, AC-08 | `tests/unit/skoring.spec.ts`, `tests/integration/skoring.spec.ts`, `override.spec.ts` |
| FR-07 Margin / Nisbah | P0 | Alfian | AC-09 | `tests/unit/margin.spec.ts`, `tests/integration/margin.spec.ts` |
| FR-08 Approval Berjenjang | P0 | Hamdani | AC-10, AC-11 | `tests/unit/approval.spec.ts`, `tests/integration/approval.spec.ts` |
| FR-09 Audit Trail | P0 | Rayhan | AC-08, AC-12, AC-13 | `tests/integration/audit.spec.ts`, `audit-readonly.spec.ts` |
| FR-10 Pembiayaan Kelompok | P1 | Hamdani | AC-14 | `tests/integration/kelompok.spec.ts` |
| FR-11 Notifikasi | P1 | Reffa (+ Rayhan untuk penulisan baris) | kriteria sendiri (SRS BAB 3) | `tests/integration/notifikasi.spec.ts` |
| FR-12 Dashboard Pipeline | P1 | Reffa | kriteria sendiri (SRS BAB 3) | `tests/integration/dashboard.spec.ts` |
| FR-13 Parameter Terkonfigurasi | P1 | Alfian | AC-15 | `tests/integration/parameter-live.spec.ts` |
| Mock SLIK (§6.1) | Infra | Eka | jalur error E-1, E-2 | `mock-slik/tests/kontrak.spec.ts` |
| docker-compose + CI + migrasi + seed | Infra | Rayhan | NFR-01, NFR-09 | dijalankan di CI |

**Kenapa FR-13 milik Alfian, bukan Rayhan**: parameter ada untuk melayani skoring dan margin.
AC-15 menguji keduanya sekaligus, dan orang yang menulis pembacanya adalah orang yang paling
mungkin memastikan penulisnya benar (ADR-0003).

**Kenapa FR-09 milik Rayhan**: audit trail ditulis oleh `status.service.ts`, dan modul itu
adalah satu-satunya yang boleh mengubah kolom `status` (SDD BAB 1.2 butir 4). Menaruhnya di
tangan orang yang juga memiliki middleware dan skema mencegahnya bocor ke service lain.

---

## 3. Rencana per Gate

### Sprint 0 — Kamis 09.45–11.00 (75 menit)

| Anggota | Yang dikerjakan | Selesai berupa |
|---|---|---|
| Rayhan | Repo dari template, undang instruktur + anggota, **branch protection**, isi `AGENTS.md` bagian 2/3/4.1/5.1/7, ADR-0001 | Commit `docs(agents)` **sebelum** commit fitur pertama |
| Eka | Buat 13 issue (9 FR P0 + 4 infra) dengan label, board 4 kolom, assign | Board terisi, kartu sudah ada yang di-assign |
| Alfian + Hamdani | Model data di papan tulis, **uji terhadap angka AC-14** (240jt→3 level, 180jt→2 level), lalu draf `schema.prisma` | ERD di SDD BAB 3.1 (sudah ada — periksa dan koreksi, jangan tulis ulang) |
| Reffa | Scaffolding `frontend/` + Dockerfile, halaman login statis | `npm run dev` hidup |
| Semua | Minta AI **mengkritik** model data (bukan membuatnya) → tulis **DEVLOG-01** | Satu entri devlog sebelum Gate 1 |

**Bawa ke Gate 1 (11.00)**: diagram arsitektur (SDD BAB 2.1), ERD (SDD BAB 3.1), board,
`AGENTS.md` ter-commit, ADR-0001, dan jawaban risiko terbesar (ADR-0001 bagian
"Rencana kalau ternyata salah" — **Rayhan yang menjawab**, sudah disepakati).

### Kamis 11.30–15.30 — Walking skeleton

| Anggota | Target Kamis 15.30 |
|---|---|
| Rayhan | Migrasi awal + seed idempoten jalan; login (FR-01) + middleware peran; `docker compose up` hidup dari clone bersih; CI hijau |
| Hamdani | `POST /api/pengajuan` + `POST /submit` dengan nomor referensi (AC-01) + daftar pengajuan |
| Alfian | `clients/slik.client.ts` memanggil mock via HTTP, satu panggilan berhasil; `domain/skoring.ts` sudah punya unit test dari §4.4 |
| Reffa | Login → dashboard → form pengajuan → daftar, tersambung ke API nyata |
| Eka | mock-slik melayani 12 baris fixtures + 404 + 503; **DEVLOG-02 dan DEVLOG-03**; mulai isi `DEMO-SCRIPT.md` |

**Gate 2 (15.30) wajib**: `docker compose up` dari clone bersih, login AO, buat pengajuan,
tampil di daftar, mock SLIK merespons, CI hijau, **≥ 3 entri devlog**.

### Jumat 09.20–11.20 — P0 tuntas

| Anggota | Target Jumat 11.20 |
|---|---|
| Rayhan | FR-09 audit trail penuh + `REVOKE UPDATE, DELETE` + `GET /api/_routes` (AC-12, AC-13) |
| Hamdani | FR-03 dokumen + versi (AC-03), FR-04 survei, FR-08 approval berjenjang (AC-10, AC-11) |
| Alfian | FR-05 lengkap dengan 4 cabang error (AC-05, AC-06), FR-06 + rincian + override (AC-07, AC-08), FR-07 (AC-09) |
| Reffa | Layar dokumen, survei, SLIK, skoring, margin, antrian approval, audit |
| Eka | Test dari **AC** dengan nilai harapan **dihitung manual**, bukan disalin dari keluaran kode; `TRACEABILITY.md` diperbarui setiap PR |

**Gate 3 (11.20)**: putuskan FR mana yang selesai-dan-teruji, mana yang dibuang. Tulis di
`README.md` bagian 5 **saat itu juga**, bukan jam 14.55.

### Jumat 13.15–15.00 — Hardening & dokumentasi

| Anggota | Yang dikerjakan |
|---|---|
| Rayhan | Uji `docker compose up` dari clone bersih (dijalankan Eka, bukan Rayhan), tag `v1.0.0` 15.00, checklist SDD BAB 8.5 |
| Alfian | FR-13 + AC-15; **test batas** di 39/40, 54/55, 69/70, 84/85 |
| Hamdani | FR-10 kelompok + AC-14; bantu Reffa kalau layar tertinggal |
| Reffa | Layar parameter ADM; rapikan pesan error supaya kode BR terlihat |
| Eka | Latih **seluruh** 15 AC + 5 jalur error, isi kolom "Status latihan"; rekap `AI-DEVLOG.md`; pastikan ≥ 10 entri dengan ≥ 3 kegagalan |

**Code freeze 15.00** — tag `v1.0.0`, tidak ada merge setelah ini.

---

## 4. Aturan Kerja Bersama

- **Satu issue = satu branch = satu PR.** Nama branch: `feat/FR-06-skoring`,
  `fix/FR-03-reupload`, `docs/agents-larangan-hardcode`.
- **Review silang wajib**, dan pasangannya ditentukan supaya tidak ada PR menganggur:
  Rayhan ↔ Alfian · Hamdani ↔ Reffa · Eka mereview siapa pun yang PR-nya menyentuh AC.
  Tech Lead tidak menyetujui PR-nya sendiri.
- **Distribusi commit dipantau.** Rayhan menjalankan `git shortlog -sn` setiap gate. Kalau
  satu orang mendekati 40 %, pekerjaan digeser — bukan dibiarkan sampai 50 % (sanksi −8).
- **Kalau debat lebih dari 5 menit**, Rayhan memutuskan dan alasannya dicatat (ADR kalau
  arsitektural, komentar issue kalau bukan).
- **Setiap PR yang memakai AI wajib menyebut nomor DEVLOG** di bagian AI pada template PR.
  PR tanpa itu dikembalikan sebelum direview.
- **Jam 14.00 Jumat: berhenti menambah fitur.** Sisa waktu untuk membuat yang sudah ada
  benar-benar jalan (brief §13 butir 10).

---

## 5. Risiko Utama dan Rencana Kontinjensi

| # | Risiko | Sinyal | Batas waktu | Tindakan |
|---|---|---|---|---|
| **R-1** | **Frontend menjadi leher botol** — 1 orang, 13 layar, 6 peran | Kamis 14.00: walking skeleton belum tersambung ujung ke ujung | Kamis 15.30 (Gate 2) | Hamdani pindah ke frontend Jumat 09.20 memegang layar ANL; kontrak API dibekukan Kamis siang supaya perpindahan tidak butuh koordinasi tambahan |
| **R-2** | Migrasi bertabrakan karena dua orang mengubah skema | `prisma migrate dev` meminta reset di laptop siapa pun | Segera | Hanya Rayhan yang menyentuh `schema.prisma`. Yang lain mengajukan permintaan tabel/kolom lewat issue |
| **R-3** | Devlog menumpuk di akhir (sanksi −8) | Kamis 15.30 entri < 3 | Kamis 15.30 | Eka mengumpulkan entri lisan 5 menit sebelum tutup hari 1 dan meng-commit-nya bersama pemiliknya |
| **R-4** | Test buatan AI hijau tetapi salah (menguji asumsi AI) | Test aturan bisnis lolos pada percobaan pertama tanpa satu pun kasus batas | Terus-menerus | Nilai harapan pada test aturan bisnis **dihitung manual** lebih dulu; setiap ambang wajib punya test tepat di batas atas dan bawahnya |
| **R-5** | Satu kontributor > 50 % commit (sanksi −8) | `git shortlog -sn` menunjukkan seseorang > 40 % | Setiap gate | Geser pekerjaan; dokumentasi dan test dikerjakan pemiliknya masing-masing, bukan dikerjakan satu orang di akhir |
| **R-6** | Jalur error SLIK baru dikerjakan di jam terakhir | Jumat 11.20 E-1 dan E-2 belum pernah dilatih | Jumat 11.20 (Gate 3) | Jalur error dikerjakan bersamaan dengan jalur bahagia oleh Alfian, bukan setelahnya. Penilai **pasti** mencabut mock SLIK (brief §13 butir 8) |

---

## 6. Daftar Issue yang Dibuat di Sprint 0

Sembilan FR P0 + empat infra. Jangan buat issue P2 — ia hanya akan menggoda orang.

| # | Judul issue | Label | Assignee |
|---|---|---|---|
| 1 | `[FR-01] Autentikasi & otorisasi berbasis peran` | `P0` `fitur` | Rayhan |
| 2 | `[FR-02] Pengajuan pembiayaan mikro + nomor referensi` | `P0` `fitur` | Hamdani |
| 3 | `[FR-03] Upload & verifikasi dokumen + versi` | `P0` `fitur` | Hamdani |
| 4 | `[FR-04] Survei lapangan (OTS)` | `P0` `fitur` | Hamdani |
| 5 | `[FR-05] SLIK check + 4 cabang error` | `P0` `fitur` | Alfian |
| 6 | `[FR-06] Skoring kelayakan + rincian komponen + override` | `P0` `fitur` | Alfian |
| 7 | `[FR-07] Perhitungan & validasi margin/nisbah` | `P0` `fitur` | Alfian |
| 8 | `[FR-08] Approval berjenjang` | `P0` `fitur` | Hamdani |
| 9 | `[FR-09] Audit trail append-only` | `P0` `fitur` | Rayhan |
| 10 | `[infra] Mock SLIK sesuai kontrak §6.1 + jalur error 404/503/timeout` | `P0` `fitur` | Eka |
| 11 | `[infra] docker-compose: db, backend, frontend, mock-slik satu perintah` | `P0` `fitur` | Rayhan |
| 12 | `[infra] Migrasi awal + seed idempoten (akun, parameter, data demo)` | `P0` `fitur` | Rayhan |
| 13 | `[infra] Sesuaikan ci.yml ke stack Node/TS + service postgres` | `P0` `fitur` | Rayhan |

Setiap issue mencantumkan AC dan BR terkait, estimasi (> 3 jam berarti terlalu besar —
pecah), dan **satu** assignee. Dua orang di satu issue berarti issue itu perlu dipecah.
