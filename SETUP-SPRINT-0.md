# SETUP SPRINT 0 — Checklist Berurutan

**Waktu**: Kamis 20 Agustus, **09.45 – 11.00** (75 menit)
**Berakhir dengan**: GATE 1 — Architecture & Plan Review pukul 11.00 (12 menit per tim)

Checklist ini berurutan: langkah berikutnya mengandalkan langkah sebelumnya. Total estimasi
**73 menit** dari 75 menit yang tersedia — tidak ada cadangan waktu, jadi kerjakan paralel di
tempat yang ditandai **[paralel]** dan jangan berdebat lebih dari 5 menit untuk satu keputusan
(Tech Lead yang memutuskan, brief §10).

**Pembagian paralel yang disarankan:**

| Orang | Mengerjakan |
|---|---|
| Tech Lead | Langkah 1, 2, 3, 8 (AGENTS.md), 9 (ADR-0001) |
| DevOps / Release (atau Tech Lead di Tim 2) | Langkah 4, 5, 6, 11 (ci.yml), 12 |
| QA / Verification | Langkah 10 (issue untuk semua FR P0), 7 |
| Backend + Frontend Engineer | Model data di papan tulis (langkah 7), lalu mulai menyiapkan Dockerfile |

**Tiga hal yang paling sering dilupakan tim** (dan langsung terlihat di Gate 1):

1. **Branch protection diaktifkan setelah commit fitur pertama** — sudah terlambat. Penilai
   memeriksa `git log`: kalau ada commit langsung ke `main` setelah commit awal, aturannya
   tidak pernah benar-benar berlaku. Kerjakan langkah 4 **sebelum** menulis kode apa pun.
2. **`AGENTS.md` di-commit setelah kode** — brief §9.2 menyatakan urutan ini diperiksa di
   `git log`. Ini pengurangan nilai yang paling mudah dihindari, dan paling sering terjadi.
3. **Instruktur belum diundang ke repo** — tim baru menyadarinya saat Gate 2, ketika penilai
   tidak bisa membuka repo. Kerjakan langkah 2 di menit pertama.

---

## Langkah 1 — Buat repo dari template (5 menit)

- [ ] Satu orang (Tech Lead) membuat repo. Bukan tujuh orang membuat tujuh repo.
- [ ] Nama repo: `<!-- ISI: mis. imitra-tim-1 -->`
- [ ] Visibilitas: privat (dengan instruktur diberi akses) atau publik — keduanya boleh
- [ ] Salin seluruh isi template ini ke repo, termasuk berkas tersembunyi:
      `.github/`, `.gitignore`, `.env.example`
- [ ] Commit awal: `chore: inisialisasi repo dari template hackathon`
- [ ] Verifikasi `.github/` benar-benar terkirim (paling sering hilang karena diawali titik):

```bash
git ls-files | grep -c '^\.github/'   # harus 6
```

**Jangan** menyalin `.env` dari mana pun. Berkas itu tidak boleh ada di repo.

---

## Langkah 2 — Undang instruktur dan seluruh anggota (3 menit) **[kerjakan sekarang, bukan nanti]**

- [ ] Settings → Collaborators → Add people
- [ ] Undang **instruktur** (Muhammad Harum Alrasyid) dengan akses minimal **Read**;
      **Write** lebih baik supaya ia bisa membuka issue saat cross-review
- [ ] Undang seluruh anggota tim dengan akses **Write**
- [ ] Pastikan setiap anggota **menerima** undangannya sekarang. Undangan yang belum diterima
      berarti orang itu tidak bisa push, dan itu baru ketahuan pada jam ketiga
- [ ] Konfirmasi ke instruktur bahwa repo sudah bisa dibuka

---

## Langkah 3 — Tetapkan peran dan tulis di README (5 menit)

- [ ] Isi tabel tim di `README.md` bagian 1: nama, peran, fokus FR, akun GitHub
- [ ] Peran diambil dari brief §10: Tech Lead / Integrator, AI Workflow Officer,
      Backend Engineer (2), Frontend Engineer (2 untuk Tim 1 / 1 untuk Tim 2),
      QA / Verification, DevOps / Release
- [ ] Tim 1 (7 orang): jadikan DevOps / Release peran yang **berdiri sendiri**
- [ ] Tim 2 (6 orang): rangkap QA + DevOps pada satu orang, atau DevOps ke Tech Lead
- [ ] Beri tahu instruktur pembagian perannya (brief §10 mewajibkan ini)
- [ ] Commit: `docs(readme): tetapkan peran tim`

---

## Langkah 4 — Aktifkan branch protection (7 menit) **[sebelum kode apa pun]**

Langkah persis di UI GitHub:

- [ ] Buka **Settings** (tab paling kanan di halaman repo)
- [ ] Sidebar kiri → **Branches**
- [ ] Klik **Add branch protection rule** (pada repo baru tampil sebagai
      **Add classic branch protection rule**; kalau UI Anda menampilkan
      **Add ruleset**, ikuti alur ruleset — nama opsinya sama)
- [ ] **Branch name pattern**: `main`
- [ ] Centang **Require a pull request before merging**
  - [ ] **Require approvals** → set **1**
  - [ ] Centang **Dismiss stale pull request approvals when new commits are pushed**
- [ ] Centang **Require status checks to pass before merging**
  - [ ] Centang **Require branches to be up to date before merging**
  - [ ] Pada kotak pencarian status check, cari dan pilih **CI**
        (nama job gerbang akhir di `.github/workflows/ci.yml`).
        **Catatan**: status check hanya muncul di daftar setelah workflow pernah
        berjalan sekali. Kalau belum muncul, lanjutkan langkah lain dulu dan kembali
        ke sini setelah PR pertama — jangan biarkan terlupa.
- [ ] Centang **Require conversation resolution before merging**
- [ ] **Jangan** centang **Allow force pushes** dan **Allow deletions**
- [ ] **Include administrators** / **Do not allow bypassing the above settings**:
      centang. Kalau tidak, Tech Lead tetap bisa push langsung ke `main` — dan dalam
      tekanan jam terakhir, itu pasti terjadi
- [ ] Klik **Create** / **Save changes**
- [ ] Verifikasi bahwa aturannya benar-benar hidup:

```bash
git commit --allow-empty -m "test: pastikan push langsung ke main ditolak"
git push origin main     # HARUS ditolak
git reset --hard HEAD~1
```

Kalau push itu berhasil, branch protection belum aktif. Perbaiki sekarang.

**Aturan Git yang berlaku sejak titik ini** (brief §8.2):
satu issue = satu branch = satu PR · nama branch `feat/FR-06-skoring` ·
minimal 1 approval dari anggota lain · Tech Lead tidak menyetujui PR-nya sendiri ·
conventional commits · setiap PR menyebut `Closes #NN`.

---

## Langkah 5 — Buat labels (4 menit) **[paralel]**

Issues → Labels → New label. Buat minimal ini:

- [ ] `P0` (merah) — wajib, batas lulus fungsional
- [ ] `P1` (kuning) — seharusnya
- [ ] `P2` (abu-abu) — boleh, hanya kalau P0 & P1 tuntas
- [ ] `fitur`
- [ ] `bug`
- [ ] `cross-review` — dipakai pada sesi Jumat 16.05
- [ ] `blocked` — menandai issue yang tertahan oleh issue lain
- [ ] `FR-01` … `FR-18` — **opsional**. Berguna untuk filter, tetapi 18 label memakan
      waktu 10 menit untuk dibuat manual. Alternatif yang lebih cepat: cukup tulis ID FR
      di judul issue (`[FR-06] Skoring kelayakan`) dan andalkan pencarian

---

## Langkah 6 — Buat project board dengan 4 kolom (5 menit) **[paralel]**

- [ ] Tab **Projects** → **New project** → template **Board**
- [ ] Nama: `<!-- ISI: mis. iMitra Tim 1 -->`
- [ ] Buat tepat 4 kolom, dengan nama persis ini: **Todo** · **In Progress** · **Review** · **Done**
- [ ] Hubungkan repo ke project (Settings project → Manage access / atau tambahkan repo)
- [ ] Aktifkan otomatisasi bawaan kalau tersedia (Workflows): issue baru masuk **Todo**,
      PR merged memindahkan ke **Done**

**Peringatan yang paling sering diabaikan**: brief §8.2 menyatakan "board dipakai, bukan
dihias". Penilai melihat **kapan** kartu bergerak, bukan hanya posisi akhirnya. Board yang
seluruh kartunya berpindah ke Done pada Jumat 14.50 lebih merugikan daripada board yang
setengah terisi tetapi bergerak sepanjang dua hari. Pindahkan kartu **saat** Anda mulai
mengerjakannya, bukan setelah selesai.

---

## Langkah 7 — Model data di papan tulis (10 menit) **[paralel, seluruh tim]**

Brief §13 butir 1: jangan mulai dari kode, mulai dari model data. Satu jam di model data
menghemat empat jam refactor — dan Anda hanya punya 10 menit di sini, jadi fokus pada yang
paling mahal kalau salah.

- [ ] Gambar entitas dan relasinya di papan tulis
- [ ] Jawab secara eksplisit: **bagaimana satu pengajuan mewakili nasabah perorangan
      MAUPUN kelompok 3–10 anggota?** Ini pertanyaan yang akan ditanyakan di Gate 1
- [ ] Uji rancangan Anda terhadap AC-14 dengan angka: 4 anggota × Rp 60.000.000 =
      Rp 240.000.000 → 3 level; satu anggota ditolak → Rp 180.000.000 → 2 level.
      Apakah skema Anda bisa menghasilkan kedua angka itu **hanya** dari data tersimpan?
- [ ] Pastikan ada tempat untuk: rincian komponen skor (BR-08), audit trail append-only
      (FR-09), dan tabel parameter yang bisa diubah ADM (FR-13)
- [ ] Foto papan tulisnya dan simpan ke repo, atau langsung tulis sebagai Mermaid `erDiagram`
      di `docs/SDD-iMitra.md` BAB 3.1
- [ ] Pakai AI untuk **mengkritik** model ini, bukan membuatnya — dan catat sesi itu sebagai
      entri devlog pertama Anda

---

## Langkah 8 — Isi `AGENTS.md` (12 menit) **[Tech Lead; WAJIB sebelum commit fitur pertama]**

Ini langkah dengan leverage tertinggi di seluruh hackathon (brief §13 butir 3). Bagian 5
(aturan bisnis BR-01…BR-12 dan tabel parameter) **sudah pre-isi** — Anda tidak perlu
menulisnya lagi.

Yang wajib Anda isi sekarang:

- [ ] Bagian 2 — Stack & versi (hasil langkah 9; kalau ADR belum selesai, isi setelahnya)
- [ ] Bagian 3 — Struktur direktori dan **di mana kode baru diletakkan**, termasuk kolom
      "Jangan taruh di"
- [ ] Bagian 4.1 — Konvensi penamaan dan bahasa dalam kode
- [ ] Bagian 5 — kolom "Ditegakkan di" boleh menyusul, tetapi nama tabel parameter
      (bagian 5.1) diisi sekarang
- [ ] Bagian 7 — Perintah test & lint (harus sama dengan `README.md` bagian 2.6 dan `ci.yml`)
- [ ] Isi baris pertama tabel "Riwayat perubahan berkas ini"
- [ ] Commit sendiri, terpisah dari kode: `docs(agents): aturan awal untuk AI agent`

- [ ] **Verifikasi urutan commit** (yang diperiksa penilai):

```bash
git log --reverse --oneline | head -10
```

`AGENTS.md` harus muncul sebelum commit fitur pertama.

**Ingat**: berkas ini wajib **berevolusi**. Setiap kali AI melanggar sesuatu, tambahkan
larangannya di bagian 6 dan commit. Target minimal 4 commit yang menyentuh berkas ini,
tersebar di kedua hari.

---

## Langkah 9 — Tulis ADR-0001 pilihan stack (10 menit) **[Tech Lead]**

Kerangkanya sudah ada di `docs/adr/0001-pilihan-stack.md` dengan prompt pertanyaan di setiap
bagian. Jawab pertanyaannya, hapus prompt-nya.

- [ ] Isi tabel keahlian tim dengan **fakta**, bukan perkiraan optimis. 9 jam bukan waktu
      untuk belajar framework baru
- [ ] Isi tabel Keputusan (bahasa, framework, database, ORM, migrasi, test runner, linter)
- [ ] Isi Alasan, Konsekuensi (termasuk yang merugikan), dan **minimal dua Alternatif yang
      ditolak** beserta alasannya
- [ ] Isi bagian **Lapisan Autentikasi** — brief §6.3 secara khusus meminta keputusan ini
      dicatat di ADR
- [ ] Isi bagian "Rencana kalau ternyata salah". Ini jawaban Anda untuk pertanyaan Gate 1:
      "apa satu hal yang paling mungkin membuat tim ini gagal, dan apa rencana Anda untuk itu?"
- [ ] Salin versi dan nama teknologi ke `AGENTS.md` bagian 2 agar konsisten
- [ ] Commit: `docs(adr): ADR-0001 pilihan stack`

---

## Langkah 10 — Buat issue untuk semua FR P0 (8 menit) **[paralel, QA + Tech Lead]**

Pakai template `.github/ISSUE_TEMPLATE/fitur.md`. Minimal 9 issue, satu per FR P0:

- [ ] `[FR-01] Autentikasi & otorisasi berbasis peran` — label `P0`
- [ ] `[FR-02] Pengajuan pembiayaan mikro` — label `P0`
- [ ] `[FR-03] Upload & verifikasi dokumen` — label `P0`
- [ ] `[FR-04] Survei lapangan (OTS)` — label `P0`
- [ ] `[FR-05] SLIK check` — label `P0`
- [ ] `[FR-06] Skoring kelayakan mikro` — label `P0`
- [ ] `[FR-07] Perhitungan margin / nisbah` — label `P0`
- [ ] `[FR-08] Approval berjenjang` — label `P0`
- [ ] `[FR-09] Audit trail` — label `P0`

Untuk setiap issue:

- [ ] Isi AC terkait dan BR terkait (kolomnya ada di template)
- [ ] Beri estimasi. Estimasi > 3 jam berarti issue terlalu besar — pecah sekarang
- [ ] Assign ke **satu** orang. Dua orang di satu issue berarti issue itu perlu dipecah
- [ ] Masukkan ke kolom **Todo** di board

Tambahkan juga issue infrastruktur yang tidak berupa FR (sering terlupa dan selalu
memakan waktu):

- [ ] `[infra] Mock SLIK sesuai kontrak §6.1 + jalur error 404/503/timeout`
- [ ] `[infra] docker-compose: db, backend, frontend, mock-slik jalan dengan satu perintah`
- [ ] `[infra] Migrasi awal + seed idempoten (pengguna per peran, parameter, data SLIK)`
- [ ] `[infra] Sesuaikan ci.yml ke stack terpilih`

Brief §3 menegaskan: tim yang mengerjakan P2 sebelum P0 tuntas **kehilangan** nilai. Jangan
buat issue P2 sekarang; ia hanya akan menggoda orang.

---

## Langkah 11 — Sesuaikan `ci.yml` ke stack (6 menit) **[DevOps]**

- [ ] Buka `.github/workflows/ci.yml` dan baca blok peringatan di atas
- [ ] Ganti versi runtime pada job stack Anda (Node 20 / Go stable / Python 3.12 /
      .NET 8 / Java 21) agar sama dengan `AGENTS.md` bagian 2
- [ ] Hapus job untuk stack yang tidak Anda pakai — job yang tidak relevan hanya
      memperlambat dan membingungkan
- [ ] Pastikan perintah lint dan test **identik** dengan `AGENTS.md` bagian 7 dan
      `README.md` bagian 2.6
- [ ] Kalau test integrasi memerlukan database, tambahkan service postgres pada job itu
      beserta langkah migrasi + seed
- [ ] Push dan pastikan workflow **benar-benar berjalan** (tab Actions). CI yang belum
      pernah jalan tidak bisa dijadikan required status check di langkah 4
- [ ] Kembali ke langkah 4 dan daftarkan status check **CI** kalau tadi belum muncul

Ingat: CI merah di tag `v1.0.0` dikenai pengurangan **−5**, dan CI yang hijau tanpa
menjalankan test apa pun dinilai sama dengan tidak ada CI.

---

## Langkah 12 — Commit pertama dan PR pertama (5 menit)

- [ ] Pastikan seluruh dokumen Sprint 0 sudah ter-commit ke `main`
      (`AGENTS.md`, `docs/adr/0001-pilihan-stack.md`, `README.md` bagian tim)
- [ ] Buat branch pertama untuk pekerjaan fitur:

```bash
git checkout -b feat/FR-01-autentikasi
```

- [ ] Buat PR pertama walaupun masih kecil, lalu lewati seluruh alurnya: review oleh anggota
      lain → CI hijau → merge. **Uji alurnya sekarang**, bukan pada Jumat siang ketika
      antrean PR menumpuk
- [ ] Pastikan template PR benar-benar muncul saat PR dibuat. Kalau tidak muncul, periksa
      letak berkas: `.github/pull_request_template.md`
- [ ] Pindahkan kartu issue dari Todo ke In Progress di board

---

## Verifikasi akhir sebelum Gate 1 (11.00)

Yang wajib bisa Anda tunjukkan (brief §11):

- [ ] **Diagram arsitektur** — papan tulis atau Mermaid, tidak dinilai kecantikannya
- [ ] **Model data**: entitas dan relasinya, khususnya penanganan nasabah perorangan
      **dan** kelompok
- [ ] **Board** berisi issue untuk seluruh FR P0, sudah ada yang di-assign
- [ ] **`AGENTS.md` sudah di-commit** — dan urutannya benar di `git log`
- [ ] **ADR-0001** pilihan stack, dengan alasan
- [ ] Jawaban tim untuk: **"apa satu hal yang paling mungkin membuat tim ini gagal, dan apa
      rencana Anda untuk itu?"** — satu orang yang menjawab, sudah disepakati sebelumnya
- [ ] Branch protection aktif dan sudah diuji
- [ ] Instruktur bisa membuka repo

**Bonus yang murah**: kalau langkah 7 dilakukan dengan bantuan AI, tulis entri
`DEVLOG-01` sekarang, sebelum Gate 1. Ia hanya butuh 5 menit dan menjadi bukti bahwa devlog
Anda tumbuh sejak jam pertama — brief mengurangi **−8** untuk devlog yang seluruhnya ditulis
di dua jam terakhir.

---

## Setelah Sprint 0 — target berikutnya

| Waktu | Target |
|---|---|
| Kamis 11.30 – 15.30 | Walking skeleton: login → buat pengajuan → tampil di daftar → mock SLIK merespons → CI hijau → minimal 3 entri devlog |
| Kamis 15.30 | **GATE 2** — `docker compose up` harus jalan di mesin instruktur dari clone bersih |
| Jumat 09.20 – 11.20 | P0 tuntas |
| Jumat 11.20 | **GATE 3** — putuskan FR mana yang dibuang, tulis di `README.md` bagian 5 |
| Jumat 13.15 – 15.00 | Hardening, test, dokumentasi (AI-DEVLOG, README, ADR, DEMO-SCRIPT) |
| Jumat 15.00 | **CODE FREEZE** — tag `v1.0.0`, tidak ada merge setelah ini |
