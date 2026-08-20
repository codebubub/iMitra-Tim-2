# PEMBAGIAN TIM — iMitra (6 Orang · 3 Backend · 3 Frontend)

**Tim**: `<!-- ISI: nama tim -->`
**Anggota**: Firman · Eka · Dani · Alfian · Ray · Reffa
**Tanggal**: 2026-08-20
**Dasar**: brief §10 (peran), §8.3 (distribusi kerja), §13 butir 5 (bagi berdasarkan batas modul)

---

## 0. Catatan sebelum tabel dibaca

**Brief §10 untuk tim 6 orang merancang 2 backend + 1 frontend + QA + AI Workflow Officer +
Tech Lead. Kami memilih 3 backend + 3 frontend.** Itu keputusan sadar, dan konsekuensinya
perlu diakui sekarang daripada ditemukan penilai:

| Konsekuensi | Kenapa kami tetap memilihnya | Cara menutupinya |
|---|---|---|
| Tidak ada QA / Verification yang berdiri sendiri | 14 layar untuk 6 peran tidak selesai dengan satu orang frontend. Frontend adalah risiko terbesar tim ini, dan brief §13 butir 10 menegaskan yang tidak bisa didemokan tidak bernilai | **Reffa merangkap QA / Verification**: menjalankan `DEMO-SCRIPT.md`, membuka issue bug, penjaga gerbang sebelum merge. **Test dari AC ditulis oleh pemilik FR-nya**, bukan ditumpuk ke satu orang |
| Tidak ada AI Workflow Officer yang berdiri sendiri | Brief §10 sendiri menyatakan peran ini tetap ikut koding | **Eka merangkap AI Workflow Officer**: pemilik `AI-DEVLOG.md`, `AI-WORKFLOW.md`, `TRACEABILITY.md`, dan memastikan keenam orang menyetor entri |
| Tidak ada DevOps / Release yang berdiri sendiri | Pekerjaan DevOps menumpuk di Sprint 0 dan Kamis pagi, lalu menipis | **Ray merangkap DevOps / Release** dan menuntaskannya sebelum beban fitur naik |
| **Backend menjadi sisi yang lebih ketat**: 3 orang untuk 9 FR P0 + seluruh aturan bisnis + infra, dan salah satunya memegang infra | Ini pertukaran yang kami pilih secara sadar — risiko bergeser dari frontend ke backend | Lihat risiko **R-1** di §5: batas waktunya Kamis 15.30, dan tindakannya Reffa pindah ke backend, bukan sebaliknya |

**Penugasan nama di bawah adalah usulan.** Ray menukarnya dalam 5 menit pertama Sprint 0
setelah tabel keahlian di `docs/adr/0001-pilihan-stack.md` diisi dengan angka nyata. 9 jam
bukan waktu untuk belajar lapisan yang belum pernah disentuh — kenyamanan orangnya menang
atas kerapian tabel ini.

---

## 1. Peran & Kepemilikan

### Backend (3 orang)

| Anggota | Peran | FR utama | Berkas yang **hanya** ia sentuh |
|---|---|---|---|
| **Ray** | Tech Lead / Integrator **+ DevOps / Release** | **FR-01**, **FR-09** | `backend/prisma/` (skema, migrasi, seed), `backend/src/config/`, `src/lib/`, `src/middleware/`, `src/services/status.service.ts`, `src/services/audit.service.ts`, `src/repositories/audit.repo.ts`, `docker-compose.yml`, `.github/`, `AGENTS.md`, `docs/adr/` |
| **Alfian** | Backend — **Risiko & Perhitungan** + pemilik mock SLIK | **FR-05**, **FR-06**, **FR-07**, **FR-13** | `backend/src/domain/skoring.ts`, `domain/margin.ts`, `domain/grade.ts`, `domain/prasyarat-skoring.ts`, `src/clients/slik.client.ts`, `services/slik.service.ts`, `services/skoring.service.ts`, `services/margin.service.ts`, `services/parameter.service.ts`, `repositories/skoring.repo.ts`, `repositories/slik.repo.ts`, `routes/skoring.ts`, `routes/slik.ts`, `routes/parameter.ts`, **`mock-slik/` seluruhnya** |
| **Dani** | Backend — **Alur & Approval** | **FR-02**, **FR-03**, **FR-04**, **FR-08**, **FR-10** | `backend/src/domain/plafon.ts`, `domain/approval.ts`, `domain/nomor-referensi.ts`, `services/pengajuan.service.ts`, `services/dokumen.service.ts`, `services/survei.service.ts`, `services/approval.service.ts`, `repositories/pengajuan.repo.ts`, `routes/pengajuan.ts`, `routes/dokumen.ts`, `routes/survei.ts`, `routes/approval.ts` |

**Kenapa mock SLIK milik Alfian**: ia menulis kliennya, dan jalur error (503, 404, timeout)
hanya bisa diuji kalau orang yang sama mengendalikan kedua sisinya. Penilai **akan**
mencabut mock SLIK (brief §13 butir 8) — orang yang paling siap menghadapinya adalah yang
membangun keduanya.

**Kenapa FR-13 milik Alfian, bukan Ray**: parameter ada untuk melayani skoring dan margin.
AC-15 menguji keduanya sekaligus, dan orang yang menulis pembacanya paling mungkin
memastikan penulisnya benar (ADR-0003).

### Frontend (3 orang)

| Anggota | Peran | Layar yang dimiliki (kode dari `docs/UIUX-STITCH.md`) | Berkas yang **hanya** ia sentuh |
|---|---|---|---|
| **Reffa** | **Frontend Lead** + QA / Verification | Fondasi UI + **S-01** Login · **S-02** Dashboard · **S-04** Detail Pengajuan · **S-12** Audit Trail | `frontend/src/theme.css`, `src/components/` (badge status, kartu, panel galat, kartu statistik, layout, sidebar), `src/App.tsx`, `src/router.tsx`, `src/auth/`, `src/api/client.ts`, `src/pages/Login.tsx`, `Dashboard.tsx`, `DetailPengajuan.tsx`, `AuditTrail.tsx` |
| **Firman** | Frontend — **layar lapangan & dokumen** | **S-03** Buat Pengajuan (termasuk majelis) · **S-05** Upload Dokumen · **S-06** Verifikasi Dokumen · **S-07** Rekam & Nilai Survei · **FR-11** notifikasi | `frontend/src/pages/BuatPengajuan.tsx`, `UploadDokumen.tsx`, `VerifikasiDokumen.tsx`, `Survei.tsx`, `Notifikasi.tsx`, `src/api/pengajuan.ts`, `src/api/dokumen.ts`, `src/api/survei.ts` |
| **Eka** | Frontend — **layar analis, approver, admin** + **AI Workflow Officer** | **S-08** SLIK · **S-09** Skoring · **S-10** Margin · **S-11** Antrian Approval · **S-13** Parameter · **S-14** Kelola Pengguna | `frontend/src/pages/SlikCheck.tsx`, `Skoring.tsx`, `Margin.tsx`, `AntrianApproval.tsx`, `Parameter.tsx`, `KelolaPengguna.tsx`, `src/api/skoring.ts`, `src/api/approval.ts`, `src/api/parameter.ts`, plus `docs/AI-DEVLOG.md`, `docs/AI-WORKFLOW.md`, `docs/TRACEABILITY.md` |

**Reffa memegang fondasi UI lebih dulu.** Sampai `theme.css` dan komponen bersama
(badge status, kartu, panel galat) ada di `main`, Firman dan Eka bekerja dengan tata letak
dari Stitch tanpa menyentuh berkas bersama. Target fondasi selesai: **Kamis 13.00**.

**Aturan yang menjaga pembagian ini bekerja** (brief §13 butir 5):

- Kolom terakhir adalah **batas modul, bukan saran**. Dua orang tidak menyentuh berkas yang
  sama. Butuh perubahan di wilayah orang lain? Buka issue atau minta — jangan edit.
- `backend/prisma/schema.prisma` **hanya** disentuh Ray. Kebutuhan tabel/kolom baru
  disampaikan sebagai permintaan, bukan sebagai PR yang mengubah skema.
- `frontend/src/components/` dan `theme.css` **hanya** disentuh Reffa. Firman dan Eka
  memakai komponennya; kalau butuh varian baru, minta — jangan tambah komponen tandingan.
- `src/api/` dibagi per domain, satu berkas per pemilik layar. Tidak ada `api/index.ts`
  raksasa yang disentuh tiga orang.
- **Test dari AC ditulis pemilik FR-nya**, bukan ditumpuk ke Reffa. Reffa memverifikasi
  bahwa test-nya benar-benar diturunkan dari AC, bukan dari kode.
- `docs/AI-DEVLOG.md` **diisi keenam anggota**, hanya dikurasi Eka. Kolom "Oleh" yang berisi
  satu nama untuk 10 entri adalah temuan negatif (brief §9.3 butir 5).

---

## 2. Peta FR → Backend → Frontend → AC → Test

| FR | Prioritas | Backend | Frontend | AC | Berkas test |
|---|---|---|---|---|---|
| FR-01 Autentikasi & Otorisasi | P0 | **Ray** | Reffa (S-01) | AC-01, AC-02 | `tests/integration/rbac.spec.ts` |
| FR-02 Pengajuan Mikro | P0 | **Dani** | Firman (S-03) | AC-01 | `tests/integration/pengajuan.spec.ts` |
| FR-03 Upload & Verifikasi Dokumen | P0 | **Dani** | Firman (S-05, S-06) | AC-03 | `tests/integration/dokumen.spec.ts` |
| FR-04 Survei Lapangan | P0 | **Dani** | Firman (S-07) | AC-04 | `tests/integration/skoring-prasyarat.spec.ts` |
| FR-05 SLIK Check | P0 | **Alfian** | Eka (S-08) | AC-05, AC-06 | `tests/integration/slik.spec.ts`, `unit/slik-client.spec.ts` |
| FR-06 Skoring Kelayakan | P0 | **Alfian** | Eka (S-09) | AC-06, AC-07, AC-08 | `unit/skoring.spec.ts`, `integration/skoring.spec.ts`, `override.spec.ts` |
| FR-07 Margin / Nisbah | P0 | **Alfian** | Eka (S-10) | AC-09 | `unit/margin.spec.ts`, `integration/margin.spec.ts` |
| FR-08 Approval Berjenjang | P0 | **Dani** | Eka (S-11) | AC-10, AC-11 | `unit/approval.spec.ts`, `integration/approval.spec.ts` |
| FR-09 Audit Trail | P0 | **Ray** | Reffa (S-12) | AC-08, AC-12, AC-13 | `integration/audit.spec.ts`, `audit-readonly.spec.ts` |
| FR-10 Pembiayaan Kelompok | P1 | **Dani** | Firman (S-03) | AC-14 | `integration/kelompok.spec.ts` |
| FR-11 Notifikasi | P1 | Ray (penulisan baris) | **Firman** | kriteria sendiri | `integration/notifikasi.spec.ts` |
| FR-12 Dashboard Pipeline | P1 | Dani (query terfilter peran) | **Reffa** (S-02) | kriteria sendiri | `integration/dashboard.spec.ts` |
| FR-13 Parameter Terkonfigurasi | P1 | **Alfian** | Eka (S-13) | AC-15 | `integration/parameter-live.spec.ts` |
| Mock SLIK (§6.1) | Infra | **Alfian** | — | jalur error E-1, E-2 | `mock-slik/tests/kontrak.spec.ts` |
| docker-compose + CI + migrasi + seed | Infra | **Ray** | — | NFR-01, NFR-09 | dijalankan di CI |
| Kelola Pengguna | Infra | Ray | **Eka** (S-14) | — | — |

**Kontrak API dibekukan Kamis 13.00.** Setelah itu backend boleh mengubah implementasi,
tetapi tidak bentuk respons — kalau perlu berubah, umumkan di grup dan perbarui
`docs/SDD-iMitra.md` BAB 5 di PR yang sama. Tanpa aturan ini, tiga orang frontend akan
menunggu tiga orang backend sepanjang hari kedua.

---

## 3. Rencana per Gate

### Sprint 0 — Kamis 09.45–11.00 (75 menit)

| Anggota | Yang dikerjakan | Selesai berupa |
|---|---|---|
| **Ray** | Repo, undang instruktur + anggota, **branch protection**, isi `AGENTS.md` bagian 2/3/4.1/5.1/7, ADR-0001 | Commit `docs(agents)` **sebelum** commit fitur pertama |
| **Alfian** | Model data di papan tulis bersama Dani, **uji terhadap angka AC-14** (240jt→3 level, 180jt→2 level), lalu scaffolding `mock-slik/` | ERD di SDD BAB 3.1 diperiksa dan dikoreksi (sudah ada — jangan tulis ulang) |
| **Dani** | Model data bersama Alfian, lalu draf `schema.prisma` diserahkan ke Ray | Draf skema |
| **Reffa** | Scaffolding `frontend/` + Dockerfile, tempel Design System (§2 `UIUX-STITCH.md`) ke Stitch, generate S-01 dan S-02 | `npm run dev` hidup, tata letak login + dashboard ada |
| **Firman** | Generate S-03 di Stitch (mobile), siapkan `src/api/` skeleton | Tata letak buat pengajuan |
| **Eka** | Buat 15 issue (9 FR P0 + 4 infra + 2 UI) dengan label, board 4 kolom, assign; tulis **DEVLOG-01** | Board terisi, satu entri devlog sebelum Gate 1 |

**Bawa ke Gate 1 (11.00)**: diagram arsitektur (SDD BAB 2.1), ERD (SDD BAB 3.1), board,
`AGENTS.md` ter-commit, ADR-0001, dan jawaban risiko terbesar — **Ray yang menjawab**,
sudah disepakati sebelumnya.

### Kamis 11.30–15.30 — Walking skeleton

| Anggota | Target Kamis 15.30 |
|---|---|
| **Ray** | Migrasi awal + seed idempoten jalan; login (FR-01) + middleware peran; `docker compose up` hidup dari clone bersih; CI hijau |
| **Alfian** | `mock-slik` melayani 12 baris fixtures + 404 + 503; `slik.client.ts` memanggil via HTTP dan satu panggilan berhasil |
| **Dani** | `POST /api/pengajuan` + `POST /submit` dengan nomor referensi (AC-01) + `GET /api/pengajuan` |
| **Reffa** | **Fondasi UI selesai Kamis 13.00**, lalu login → dashboard → daftar tersambung ke API nyata |
| **Firman** | Form buat pengajuan tersambung, pengajuan tersimpan dan tampil di daftar |
| **Eka** | Kerangka layar SLIK + skoring; **DEVLOG-02 dan DEVLOG-03**; mulai isi `DEMO-SCRIPT.md` |

**Gate 2 (15.30) wajib**: `docker compose up` dari clone bersih, login AO, buat pengajuan,
tampil di daftar, mock SLIK merespons, CI hijau, **≥ 3 entri devlog**.

### Jumat 09.20–11.20 — P0 tuntas

| Anggota | Target Jumat 11.20 |
|---|---|
| **Ray** | FR-09 audit trail penuh + `REVOKE UPDATE, DELETE` + `GET /api/_routes` (AC-12, AC-13) |
| **Alfian** | FR-05 lengkap dengan 4 cabang error (AC-05, AC-06), FR-06 + rincian + override (AC-07, AC-08), FR-07 (AC-09) |
| **Dani** | FR-03 dokumen + versi (AC-03), FR-04 survei, FR-08 approval berjenjang (AC-10, AC-11) |
| **Reffa** | S-04 detail pengajuan (hub semua tab) + S-12 audit trail; review PR frontend Firman & Eka |
| **Firman** | S-05, S-06, S-07 tersambung penuh termasuk unggah ulang satu dokumen |
| **Eka** | S-08 (4 varian hasil SLIK), S-09 (tabel rincian 3 desimal + override), S-10 (varian terblokir) |

**Gate 3 (11.20)**: putuskan FR mana yang selesai-dan-teruji, mana yang dibuang. Tulis di
`README.md` bagian 5 **saat itu juga**, bukan jam 14.55.

### Jumat 13.15–15.00 — Hardening & dokumentasi

| Anggota | Yang dikerjakan |
|---|---|
| **Ray** | Uji `docker compose up` dari clone bersih (**dijalankan Reffa, bukan Ray**), tag `v1.0.0` 15.00, checklist SDD BAB 8.5 |
| **Alfian** | FR-13 + AC-15; **test batas** di 39/40, 54/55, 69/70, 84/85 |
| **Dani** | FR-10 kelompok + AC-14 |
| **Reffa** | Menjalankan seluruh `DEMO-SCRIPT.md` sebagai QA, membuka issue untuk yang gagal; checklist §5 `UIUX-STITCH.md` |
| **Firman** | S-03 varian majelis (total plafon live + level approval) untuk AC-14 |
| **Eka** | S-13 parameter (AC-15); rekap `AI-DEVLOG.md` — pastikan ≥ 10 entri, ≥ 3 kegagalan, dan **keenam nama muncul di kolom Oleh** |

**Code freeze 15.00** — tag `v1.0.0`, tidak ada merge setelah ini.

---

## 4. Branch & Aturan Kerja

### Branch per orang

Enam branch kerja, satu per anggota:

```
ray  ·  alfian  ·  dani  ·  reffa  ·  firman  ·  eka
```

Branch ini adalah **ruang kerja pribadi**, bukan jalur merge. Alurnya:

```
main ──┬── ray    ──┬── feat/FR-01-autentikasi ──► PR ──► main
       ├── alfian ──┼── feat/FR-06-skoring     ──► PR ──► main
       ├── dani   ──┼── feat/FR-08-approval    ──► PR ──► main
       ├── reffa  ──┼── feat/FR-12-dashboard   ──► PR ──► main
       ├── firman ──┼── feat/FR-03-upload      ──► PR ──► main
       └── eka    ──┴── feat/FR-13-parameter   ──► PR ──► main
```

**PR tetap per FR, bukan per orang.** Brief §8.2 menilai "satu issue = satu branch = satu
PR", dan PR yang berisi dua hari kerja satu orang tidak bisa direview — yang tidak direview
akan menyimpan bug AI. Branch pribadi dipakai untuk menyimpan pekerjaan yang belum siap
di-PR, bukan untuk menumpuk sampai Jumat sore.

Sinkron dengan `main` **minimal dua kali sehari** (setelah istirahat siang dan sebelum
tutup hari): `git fetch origin && git rebase origin/main`.

### Aturan kerja

- **Nama branch fitur**: `feat/FR-06-skoring`, `fix/FR-03-reupload`, `docs/agents-larangan-hardcode`.
- **Review silang wajib**, pasangannya ditentukan supaya tidak ada PR menganggur:

  | PR dari | Direview oleh |
  |---|---|
  | Ray | Alfian |
  | Alfian | Dani |
  | Dani | Ray |
  | Reffa | Eka |
  | Firman | Reffa |
  | Eka | Firman |

  Ray tidak menyetujui PR-nya sendiri. Reffa sebagai QA boleh mereview PR mana pun yang
  menyentuh AC.
- **Distribusi commit dipantau.** Ray menjalankan `git shortlog -sn` setiap gate. Kalau satu
  orang mendekati 35 %, pekerjaan digeser — jangan tunggu sampai 50 % (sanksi −8). Dengan 6
  orang, target sehat adalah 12–22 % per orang.
- **Kalau debat lebih dari 5 menit**, Ray memutuskan dan alasannya dicatat (ADR kalau
  arsitektural, komentar issue kalau bukan).
- **Setiap PR yang memakai AI wajib menyebut nomor DEVLOG** di bagian AI pada template PR.
  PR tanpa itu dikembalikan sebelum direview. Ini termasuk pemakaian **Google Stitch**.
- **Jam 14.00 Jumat: berhenti menambah fitur** (brief §13 butir 10).

---

## 5. Risiko Utama dan Rencana Kontinjensi

| # | Risiko | Sinyal | Batas waktu | Tindakan |
|---|---|---|---|---|
| **R-1** | **Backend menjadi leher botol** — 3 orang untuk 9 FR P0 + seluruh aturan bisnis, dan satu di antaranya memegang infra | Kamis 14.00: `POST /api/pengajuan` belum menyimpan ke database | Kamis 15.30 (Gate 2) | Reffa pindah ke backend Jumat 09.20 mengambil FR-04 survei dan FR-12 query dashboard. Fondasi UI sudah selesai Kamis 13.00, jadi Firman dan Eka tidak terhambat |
| **R-2** | Tiga orang frontend bertabrakan di berkas bersama | Konflik merge di `components/` atau `theme.css` lebih dari sekali | Segera | Hanya Reffa yang menyentuh `components/` dan `theme.css`. Firman dan Eka meminta varian komponen, tidak membuat tandingan |
| **R-3** | Frontend menunggu backend sepanjang hari kedua | Ada orang frontend menganggur > 30 menit | Kamis 13.00 | **Kontrak API dibekukan Kamis 13.00** dari SDD BAB 5; frontend memakai data tiruan dari bentuk respons yang sudah disepakati, bukan menunggu endpoint jadi |
| **R-4** | Migrasi bertabrakan karena dua orang mengubah skema | `prisma migrate dev` meminta reset di laptop siapa pun | Segera | Hanya Ray yang menyentuh `schema.prisma` |
| **R-5** | Devlog menumpuk di akhir (sanksi −8) | Kamis 15.30 entri < 3, atau ada nama yang belum pernah muncul di kolom "Oleh" | Setiap gate | Eka mengumpulkan entri lisan 5 menit sebelum tutup hari 1 dan meng-commit-nya bersama pemiliknya |
| **R-6** | Test buatan AI hijau tetapi salah (menguji asumsi AI) | Test aturan bisnis lolos pada percobaan pertama tanpa satu pun kasus batas | Terus-menerus | Nilai harapan pada test aturan bisnis **dihitung manual** lebih dulu; setiap ambang wajib punya test tepat di batas atas dan bawahnya |
| **R-7** | Jalur error SLIK baru dikerjakan di jam terakhir | Jumat 11.20 E-1 dan E-2 belum pernah dilatih | Jumat 11.20 (Gate 3) | Alfian mengerjakan jalur error bersamaan dengan jalur bahagia, bukan setelahnya. Penilai **pasti** mencabut mock SLIK |
| **R-8** | Keluaran Stitch membawa angka bisnis sebagai literal ke `frontend/` | `grep -rE "11[.,]0|Rp 50.000.000|bobot.*35" frontend/src` menemukan sesuatu | Jumat 13.15 | Checklist §5 `docs/UIUX-STITCH.md` dijalankan Reffa; angka bisnis hanya boleh datang dari API |

---

## 6. Daftar Issue yang Dibuat di Sprint 0

Sembilan FR P0 + empat infra + dua UI. Jangan buat issue P2 — ia hanya akan menggoda orang.

| # | Judul issue | Label | Assignee |
|---|---|---|---|
| 1 | `[FR-01] Autentikasi & otorisasi berbasis peran` | `P0` `fitur` | Ray |
| 2 | `[FR-02] Pengajuan pembiayaan mikro + nomor referensi` | `P0` `fitur` | Dani |
| 3 | `[FR-03] Upload & verifikasi dokumen + versi` | `P0` `fitur` | Dani |
| 4 | `[FR-04] Survei lapangan (OTS)` | `P0` `fitur` | Dani |
| 5 | `[FR-05] SLIK check + 4 cabang error` | `P0` `fitur` | Alfian |
| 6 | `[FR-06] Skoring kelayakan + rincian komponen + override` | `P0` `fitur` | Alfian |
| 7 | `[FR-07] Perhitungan & validasi margin/nisbah` | `P0` `fitur` | Alfian |
| 8 | `[FR-08] Approval berjenjang` | `P0` `fitur` | Dani |
| 9 | `[FR-09] Audit trail append-only` | `P0` `fitur` | Ray |
| 10 | `[infra] Mock SLIK sesuai kontrak §6.1 + jalur error 404/503/timeout` | `P0` `fitur` | Alfian |
| 11 | `[infra] docker-compose: db, backend, frontend, mock-slik satu perintah` | `P0` `fitur` | Ray |
| 12 | `[infra] Migrasi awal + seed idempoten (akun, parameter, data demo)` | `P0` `fitur` | Ray |
| 13 | `[infra] Sesuaikan ci.yml ke stack Node/TS + service postgres` | `P0` `fitur` | Ray |
| 14 | `[ui] Fondasi frontend: theme, komponen bersama, layout, router, guard peran` | `P0` `fitur` | Reffa |
| 15 | `[ui] Layar AO mobile-first: buat pengajuan, upload dokumen, survei` | `P0` `fitur` | Firman |

Setiap issue mencantumkan AC dan BR terkait, estimasi (> 3 jam berarti terlalu besar —
pecah), dan **satu** assignee. Dua orang di satu issue berarti issue itu perlu dipecah.
