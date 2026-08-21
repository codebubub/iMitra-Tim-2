# AGENTS.md — Aturan untuk AI Agent di Repo iMitra

> ## WAJIB DIBACA SEBELUM MENGISI
>
> **1. Berkas ini WAJIB di-commit sebelum commit fitur pertama.** Penilai akan menjalankan
> `git log --reverse --oneline` dan memeriksa urutannya. Kalau commit fitur pertama muncul
> lebih dulu, nilai aspek "Disiplin rekayasa berbantuan AI" (bobot 25) turun.
>
> **2. Berkas ini WAJIB berevolusi.** Kalau isinya sama pada Kamis 09.00 dan Jumat 15.00,
> artinya tidak ada satu pun pelajaran dari 9 jam kerja yang masuk ke sini. Setiap kali
> AI melanggar sesuatu, larangannya ditambahkan ke berkas ini — itu mekanisme belajarnya.
> Targetkan minimal 4 commit yang menyentuh berkas ini, tersebar di kedua hari.
> Commit-nya berupa `docs(agents): larang X setelah kejadian DEVLOG-05`, bukan satu commit
> besar di akhir.
>
> **3. Berkas ini adalah satu-satunya sumber aturan.** `CLAUDE.md`, `.cursorrules`, dan
> `.github/copilot-instructions.md` hanya menunjuk ke sini. Jangan menyalin isinya
> ke tempat lain — salinan akan langsung usang.
>
> **4. Pemilik berkas: Tech Lead.** Siapa pun boleh mengusulkan perubahan lewat PR,
> tetapi Tech Lead yang memutuskan.
>
> ### Cara membaca penanda di berkas ini
>
> | Penanda | Arti |
> |---|---|
> | `<!-- ISI: ... -->` | Placeholder. Wajib Anda ganti dengan isi nyata. |
> | Bagian 5 (Aturan Bisnis) | **Sudah pre-isi dari brief.** Jangan ubah nilai ambangnya; lengkapi saja kolom lokasi penegakan. |
> | Bagian 6 (Larangan) | Sudah pre-isi dengan larangan dasar. Tambahkan larangan Anda sendiri di bawahnya. |

**Riwayat perubahan berkas ini** (isi setiap kali berubah — ini bukti evolusi):

| Tanggal & jam | Oleh | Perubahan | Dipicu oleh |
|---|---|---|---|
| 2026-08-20 09:45 | Tech Lead | Versi awal dari template hackathon | — |
| 2026-08-20 10:30 | Tech Lead | Isi bagian 2 (stack Node/TS/Fastify/Prisma/React), bagian 3 (struktur direktori + aturan lapisan), bagian 4.1 (konvensi + 15 nilai enum status), bagian 5.1 (nama tabel parameter + 4 parameter asumsi), bagian 7 (perintah test & lint) | ADR-0001, ADR-0002, ADR-0003 |
| 2026-08-20 13:50 | Firman | Isi bagian 4.3 (bentuk galat, 422 untuk BR, 502 untuk SLIK), lokasi penegakan BR-01/10/11/12, dan larangan 16–19 | FR-01, FR-09; temuan lapis ke-3 AC-13 tidak berfungsi |
| 2026-08-21 16:20 | Firman | Bagian 4.2: larangan mutlak push ke `main` diganti izin bersyarat (harus diminta Tech Lead di sesi itu + wajib hijau lebih dulu). Larangan commit atas nama orang lain **tidak** dilonggarkan | Aturan tidak cocok dengan praktik: integrasi memang lewat merge langsung ke `main`, dan `main` tidak diproteksi di GitHub |
| `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI: larangan baru setelah AI melanggar sesuatu -->` | `<!-- ISI: DEVLOG-xx -->` |

---

## 1. Konteks Proyek

**iMitra** adalah sistem originasi pembiayaan mikro syariah untuk Bank Syariah Nasional.
Alurnya: pengajuan oleh Account Officer → verifikasi dokumen → survei lapangan → SLIK check
→ skoring kelayakan → perhitungan margin/nisbah → approval berjenjang → audit trail.

Ini aplikasi perbankan. Konsekuensinya bagi agent:

- Aturan bisnis bukan saran. Angka ambang berasal dari brief dan dari tabel parameter di
  database, bukan dari asumsi model.
- Setiap perubahan status wajib punya aktor dan timestamp. Tidak ada mutasi diam-diam.
- Data pribadi (NIK, foto dokumen) tidak boleh keluar ke log, pesan error, atau URL.
- Otorisasi ditegakkan di server. Menyembunyikan tombol di UI bukan otorisasi.

**Aktor sistem** (kode peran ini dipakai persis seperti ini di kode, database, dan UI):

| Kode | Aktor | Wewenang |
|---|---|---|
| `AO` | Account Officer Mikro | Buat/ubah pengajuan miliknya, upload dokumen, rekam survei, lihat status |
| `ANL` | Analis Mikro | Verifikasi dokumen, SLIK check, skoring & override, hitung margin, ajukan ke approval |
| `KCP` | Kepala Cabang Pembantu | Approval level 1 |
| `KC` | Kepala Cabang | Approval level 2 |
| `KOM` | Komite Pembiayaan | Approval level 3 |
| `ADM` | Admin | Kelola pengguna, parameter skoring, ambang approval, rentang margin |

**Di luar lingkup — jangan dibangun, jangan disarankan**: disbursement, akuntansi, jadwal
angsuran aktual, penagihan, restrukturisasi, integrasi nyata ke Core Banking atau SLIK
produksi, aplikasi mobile native, SSO/Active Directory nyata, multi-tenant, multi-currency,
multi-bahasa. Kalau agent menawarkan salah satunya, tolak — itu scope creep dan dinilai
sebagai kesalahan prioritas.

**Dokumen rujukan yang wajib agent hormati** (lampirkan yang relevan saat memberi konteks):

- `docs/SRS-iMitra.md` — requirement
- `docs/SDD-iMitra.md` — arsitektur, model data, daftar endpoint
- `docs/adr/` — keputusan arsitektur yang sudah diambil. Agent tidak boleh mengusulkan
  hal yang bertentangan dengan ADR yang sudah `Accepted` tanpa ADR baru yang membatalkannya.

---

## 2. Stack & Versi

Alasan pemilihan ada di [`docs/adr/0001-pilihan-stack.md`](docs/adr/0001-pilihan-stack.md).
Nilai di tabel ini harus sama persis dengan tabel Keputusan di ADR itu dan dengan
`docs/SDD-iMitra.md` BAB 1.3 — kalau berbeda, salah satunya sudah usang.

| Lapisan | Teknologi | Versi | Catatan |
|---|---|---|---|
| Bahasa backend | TypeScript di Node.js | Node 20 LTS · TS 5.4 | `"type": "module"`, target ES2022 |
| Framework backend | Fastify | 4.26 | Test integrasi memakai `app.inject()`, bukan port nyata |
| Bahasa/framework frontend | React + Vite | React 18.2 · Vite 5.2 | TanStack Query 5 untuk data, React Router 6 untuk route |
| Database | PostgreSQL | 16 (`postgres:16-alpine`) | Uang disimpan `bigint`, skor `numeric` — **jangan pakai `float` untuk keduanya** |
| ORM / query layer | Prisma Client | 5.14 | Hanya dipakai di `repositories/` |
| Tool migrasi | Prisma Migrate | 5.14 | `migrate dev` lokal, `migrate deploy` di container |
| Test runner | Vitest + Supertest | Vitest 1.6 | `test:unit` tanpa database, `test:integration` dengan database |
| Linter / formatter | ESLint + Prettier | ESLint 8.57 | Aturan batas lapisan ditegakkan lewat `import/no-restricted-paths` |
| Validasi input | Zod | 3.23 | Di batas route saja; service menerima tipe hasil parsing |
| Mock SLIK | TypeScript + Fastify | Node 20 LTS | Layanan terpisah, dipanggil via HTTP |
| Runtime | Docker Compose | v2 | Tanpa kunci `version:` di `docker-compose.yml` |

**Batasan versi yang tidak boleh diubah agent**:

- Jangan naikkan versi mayor Prisma — migrasi sudah dibuat untuk 5.x.
- Jangan ganti Fastify ke Express: seluruh test integrasi bergantung pada `app.inject()`.
- Jangan tambah dependensi baru tanpa persetujuan Tech Lead (bagian 6 butir 1). Kebutuhan
  yang sering muncul sudah tersedia: tanggal → API bawaan, HTTP keluar → `fetch` bawaan
  Node 20, validasi → Zod, uang → `bigint`.

---

## 3. Struktur Direktori & Di Mana Kode Baru Diletakkan

```
/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # SATU sumber skema. Hanya Tech Lead yang menyentuhnya
│   │   ├── migrations/          # Hasil `prisma migrate`, ikut di-commit
│   │   └── seed.ts              # Idempoten (upsert), aman dijalankan berulang
│   ├── src/
│   │   ├── domain/              # ATURAN BISNIS. Fungsi murni, tanpa Prisma/HTTP/env
│   │   ├── services/            # Orkestrasi, transaksi, penulisan audit
│   │   ├── repositories/        # Satu-satunya tempat Prisma dipakai. Satu berkas per agregat
│   │   ├── routes/              # Fastify route + skema Zod. Tanpa keputusan bisnis
│   │   ├── middleware/          # auth.ts, rbac.ts, error.ts
│   │   ├── clients/             # slik.client.ts — HTTP keluar, timeout, pemetaan galat
│   │   ├── config/              # Satu-satunya tempat process.env dibaca
│   │   └── lib/                 # logger.ts (redaksi BR-11), kelas galat, util waktu
│   └── tests/
│       ├── unit/                # domain/ saja, tanpa database
│       └── integration/         # app.inject() + database test
├── frontend/
│   └── src/
│       ├── pages/               # Satu berkas per layar (lihat SDD BAB 6.1)
│       ├── components/          # Komponen yang dipakai ulang. TANPA aturan bisnis
│       ├── api/                 # Klien HTTP + tipe respons
│       └── auth/                # Guard route per peran (kenyamanan, BUKAN otorisasi)
├── mock-slik/
│   └── src/                     # Fastify, membaca fixtures/nasabah-uji.csv saat start
├── docs/
├── fixtures/
└── docker-compose.yml
```

**Aturan penempatan (agent wajib mengikuti ini, bukan menebak)**:

| Jenis kode | Lokasi | Jangan taruh di |
|---|---|---|
| Aturan bisnis / perhitungan (skoring, margin, routing approval) | `backend/src/domain/` | route handler, komponen UI, middleware, repository |
| Endpoint / route handler | `backend/src/routes/` | — |
| Orkestrasi kasus penggunaan + transaksi | `backend/src/services/` | route handler |
| Akses database / repository | `backend/src/repositories/` | service, route, `domain/` |
| Migrasi skema | `backend/prisma/migrations/` | mana pun selain direktori migrasi |
| Seed data | `backend/prisma/seed.ts` | migrasi, test |
| Test unit | `backend/tests/unit/` | — |
| Test integrasi / API | `backend/tests/integration/` | — |
| Komponen UI | `frontend/src/components/`, layar di `frontend/src/pages/` | — |
| Pemanggil HTTP ke mock SLIK (client + penanganan error) | `backend/src/clients/slik.client.ts` | dipanggil langsung dari route handler, atau dari `domain/` |
| Konfigurasi / pembacaan env | `backend/src/config/env.ts` | tersebar di seluruh kode |
| Perubahan status pengajuan | `backend/src/services/status.service.ts` — **satu-satunya modul yang boleh menulis kolom `status`** | service mana pun yang lain |

**Aturan lapisan** (ditegakkan lint lewat `import/no-restricted-paths`):

- Arah ketergantungan hanya ke bawah: `routes/ → services/ → { domain/, repositories/, clients/ }`.
- `domain/` **tidak boleh** mengimpor Prisma, Fastify, `process.env`, atau memanggil
  `Date.now()` tanpa injeksi. Ia menerima parameter sebagai argumen dan mengembalikan hasil.
  Konsekuensi: setiap BR bisa diuji tanpa menyalakan server.
- `routes/` tidak boleh menyentuh Prisma dan tidak boleh memutuskan apa pun. Kalau sebuah
  route handler memuat `if` yang membandingkan angka bisnis, kode itu salah tempat.
- `repositories/` tidak boleh memanggil `domain/` maupun `services/`.
- Parameter bisnis dibaca service dari database **pada setiap pemanggilan**, tidak di-cache
  di proses (ADR-0003), lalu diteruskan ke `domain/` sebagai argumen.

---

## 4. Konvensi

### 4.1 Penamaan

| Objek | Konvensi | Contoh |
|---|---|---|
| Tabel database | `snake_case`, tunggal, istilah domain Indonesia | `pengajuan`, `pengajuan_anggota`, `hasil_skoring`, `rincian_komponen_skor` |
| Kolom database | `snake_case` | `plafon_diajukan`, `kondisi_usaha_skala`, `status_panggilan` |
| Kelas / tipe | `PascalCase` | `HasilSkoring`, `PelanggaranAturan`, `PenyediaIdentitas` |
| Fungsi / method | `camelCase`, kata kerja di depan | `hitungSkorAkhir`, `validasiMargin`, `periksaPrasyarat` |
| Berkas | `kebab-case.ts`, dengan sufiks lapisan | `skoring.service.ts`, `pengajuan.repo.ts`, `slik.client.ts`, `prasyarat-skoring.ts` |
| Komponen React | `PascalCase.tsx` | `RincianSkor.tsx`, `AntrianApproval.tsx` |
| Endpoint | jamak, `kebab-case`, id sebagai path param | `POST /api/pengajuan/{id}/slik-check`, `GET /api/approval/antrian` |
| Enum status | `SCREAMING_SNAKE_CASE` | `MENUNGGU_APPROVAL_L1`, `REJECTED_SLIK` |
| Berkas test | `<subjek>.spec.ts` | `skoring.spec.ts`, `rbac.spec.ts` |
| Branch | `feat/FR-NN-slug`, `fix/FR-NN-slug` | `feat/FR-06-skoring`, `fix/FR-03-reupload` |

**Bahasa dalam kode**: **istilah domain dalam Bahasa Indonesia** (`pengajuan`, `nasabah`,
`survei`, `plafon`, `nisbah`, `skoring`, `dokumen`, `anggota`); **sisanya Bahasa Inggris**
(`service`, `repository`, `middleware`, `router`, `client`, `config`). Nilai enum memakai
istilah brief apa adanya, termasuk yang berbahasa Inggris (`DRAFT`, `APPROVED`).

Yang **dilarang**: memakai dua kata untuk satu konsep. `pengajuan` di satu berkas dan
`application` di berkas lain akan membuat agent membuat dua entitas untuk satu hal. Kalau
agent menghasilkan `LoanApplication`, `Applicant`, atau `creditScore`, ganti sebelum commit.

**Status pengajuan (enum wajib)** — 15 nilai, diagram transisinya di
`docs/SRS-iMitra.md` bagian 3.2. Empat nilai pertama berasal dari brief dan **tidak boleh
diganti namanya**; sebelas sisanya adalah status transisi milik kami:

`DRAFT` · `SUBMITTED` · `VERIFIKASI_DOKUMEN` · `DOKUMEN_DITOLAK` · `SLIK_OK` · `SLIK_GAGAL` ·
`REJECTED_SLIK` · `SKORED` · `REJECTED_SCORING` · `MENUNGGU_APPROVAL_L1` ·
`MENUNGGU_APPROVAL_L2` · `MENUNGGU_APPROVAL_L3` · `APPROVED` · `REJECTED` · `DIKEMBALIKAN`

Terminal: `REJECTED_SLIK`, `REJECTED_SCORING`, `APPROVED`, `REJECTED`.

Enum lain: dokumen `MENUNGGU`/`VERIFIED`/`REJECTED` · survei `DRAFT`/`VALID`/`TIDAK_VALID` ·
keputusan approval `APPROVE`/`REJECT`/`RETURN` · anggota `AKTIF`/`DITOLAK` ·
panggilan SLIK `OK`/`NOT_FOUND`/`UNAVAILABLE`/`TIMEOUT` · akad `MURABAHAH`/`MUSYARAKAH` ·
kode alasan penolakan dokumen `BURAM`/`TIDAK_TERBACA`/`KADALUARSA`/`TIDAK_SESUAI_PEMOHON`/`BUKAN_JENIS_DOKUMEN`.

**Agent tidak boleh menambah nilai enum baru** tanpa memperbarui daftar ini **dan**
`docs/SRS-iMitra.md` bagian 3.2 **dan** `docs/SDD-iMitra.md` BAB 4.1.

**Format nomor referensi pengajuan**: `IMT-YYYYMMDD-NNNN` (contoh: `IMT-20260820-0007`).
Unik dan tidak pernah dipakai ulang, termasuk untuk pengajuan yang ditolak (BR-12).
Agent tidak boleh mengubah format ini atau membangkitkannya di sisi frontend.

### 4.2 Commit

Conventional commits, dengan ID FR di dalam scope:

```
feat(FR-06): hitung skor kelayakan dari parameter tersimpan
fix(FR-03): pertahankan data pengajuan saat re-upload satu dokumen
test(FR-07): tambah kasus AC-09 margin di bawah batas grade 1
docs(agents): larang hardcode rentang margin setelah DEVLOG-07
chore(ci): sesuaikan workflow ke stack terpilih
```

Aturan tambahan:

- Setiap PR menyebut issue-nya: `Closes #12`.
- Satu issue = satu branch = satu PR — **untuk pekerjaan fitur milik anggota**.
- **Agent tidak boleh membuat commit atas nama orang lain.** Ini tidak dilonggarkan:
  jejak siapa menulis apa adalah dasar seluruh penilaian dan seluruh audit.
- **Agent boleh `git push` ke `main` hanya bila Tech Lead memintanya secara eksplisit
  di sesi itu juga.** Tidak ada izin yang berlaku terus-menerus: permintaan di satu
  sesi tidak menjadi izin untuk sesi berikutnya. Tanpa permintaan itu, agent berhenti
  di commit lokal atau mendorong ke branch, lalu melapor.
- **Sebelum push ke `main`, agent wajib membuktikan hijau lebih dulu** — typecheck,
  lint, dan test pada paket yang tersentuh. Push yang membuat `main` merah lebih mahal
  daripada push yang tertunda; CI merah di tag `v1.0.0` dikenai pengurangan −5.
- Kalau perubahan berasal dari sesi AI, PR wajib menyebut nomor entri devlog
  (`DEVLOG-xx`) di bagian AI pada template PR.

> **Kenapa larangan mutlak sebelumnya dilonggarkan.** Berkas ini semula menyatakan
> `main` dilindungi dan agent tidak boleh mendorong ke sana sama sekali. Praktik nyata
> tim berbeda: integrasi dilakukan dengan merge langsung ke `main` dari branch per
> anggota, `main` tidak pernah benar-benar diproteksi di GitHub, dan Tech Lead memang
> meminta agent melakukan push itu. Aturan yang rutin dilanggar lebih buruk daripada
> tidak ada aturan — ia melatih orang mengabaikan seluruh berkas ini. Yang ditahan
> sekarang bukan push-nya, melainkan **push tanpa diminta** dan **push tanpa bukti
> hijau**, karena dua itulah yang benar-benar merusak.

### 4.3 Error Handling

<!-- ISI: sesuaikan dengan stack. Yang wajib ada, apa pun stack-nya: bentuk respons error
     yang seragam, kode HTTP yang benar, dan larangan membocorkan data pribadi. -->

Bentuk respons error yang seragam untuk seluruh API:

```json
{
  "error": "ATURAN_BISNIS_DILANGGAR",
  "message": "margin 10.00% di luar rentang grade 1 (11.00% - 13.00%)",
  "rule": "BR-06"
}
```

| Situasi | Kode HTTP | Catatan |
|---|---|---|
| Belum login / token tidak valid | 401 | |
| Login tetapi peran tidak berwenang | **403** | AC-02 menguji ini secara langsung. Bukan 200, bukan 404 |
| Validasi input gagal | 400 | Sebutkan field yang salah |
| Pelanggaran aturan bisnis (BR-xx) | **422** | Pesan wajib menyebut kode BR-nya. Dipilih, bukan 409, karena bentuk permintaannya benar — yang ditolak adalah maknanya. 409 kami sisakan untuk konflik keadaan yang sesungguhnya |
| Sumber daya tidak ada | 404 | |
| Mock SLIK tidak tersedia / timeout | **502** | **Tidak boleh** dianggap SLIK bersih. 502 dan bukan 500: ini kegagalan sistem lain, dan ANL berhak tahu bedanya (`lib/errors.ts` → `SlikTidakTersedia`) |
| Galat tak terduga | 500 | Tanpa stack trace ke klien |

Aturan yang tidak boleh dilanggar agent:

- **Jangan menelan exception.** `catch` yang kosong atau yang hanya mencatat log lalu
  melanjutkan alur normal dilarang, khususnya di jalur SLIK.
- **Jangan pakai nilai default diam-diam.** Kalau SLIK gagal, jangan mengisi
  kolektibilitas dengan `1` atau `null` lalu melanjutkan. Pengajuan berhenti dan
  statusnya mencerminkan kegagalan itu.
- **Jangan menulis NIK, nomor dokumen, atau path foto ke log dan pesan error** (BR-11).
  Pakai id internal pengajuan untuk korelasi.
- Pesan error yang berasal dari pelanggaran aturan bisnis wajib menyebut kode BR-nya,
  karena AC-04 secara eksplisit meminta pesan yang menyebut BR-03.

### 4.4 Contoh Baik vs Buruk (standar untuk seluruh repo)

Contoh ini memakai pseudocode agar berlaku untuk stack apa pun. Yang dinilai bukan
sintaksnya, tetapi di mana keputusan diambil dan dari mana angkanya datang.

**BURUK — jangan terima keluaran agent seperti ini:**

```
fungsi hitungMargin(plafon, tenor, grade):
    # rentang ditulis langsung di kode
    rentang = { 1: [11.0, 13.0], 2: [13.0, 15.5], 3: [15.5, 18.0] }
    margin = ...
    jika margin di luar rentang[grade]:
        catatLog("margin di luar rentang untuk NIK " + nasabah.nik)   # membocorkan NIK
        kembalikan { ok: true, peringatan: "margin di luar rentang" }  # tetap lanjut
```

Empat pelanggaran sekaligus:
1. Rentang margin di-hardcode, padahal wajib berupa data yang bisa diubah ADM (FR-13, BR-06).
2. NIK masuk ke log (BR-11).
3. Pelanggaran aturan hanya jadi peringatan, padahal wajib memblokir (BR-06).
4. Tidak ada grade 4 dan 5, sehingga grade 5 lolos padahal harus ditolak (BR-05).

**BAIK — standar yang kita pakai:**

```
fungsi hitungMargin(pengajuan, grade):
    jika grade == 5:
        lempar PelanggaranAturan("BR-05", "grade 5 tidak dapat diajukan ke approval")

    rentang = repositoriParameter.ambilRentangMargin(grade, akad)   # dari database
    jika rentang tidak ada:
        lempar KesalahanKonfigurasi("rentang margin grade " + grade + " belum diatur")

    margin = ...
    jika margin < rentang.min atau margin > rentang.maks:
        lempar PelanggaranAturan("BR-06",
            "margin " + margin + "% di luar rentang grade " + grade)   # tanpa data pribadi

    kembalikan margin
```

Dan test-nya ditulis dari AC-09, bukan dari kode di atas — termasuk satu test yang
**mengubah baris rentang di database lebih dulu** lalu memastikan hasilnya berubah.
Test yang hanya memanggil fungsi dengan nilai tetap tidak membuktikan bahwa parameter
benar-benar dibaca dari data.

---

## 5. Aturan Bisnis yang Tidak Boleh Dilanggar

> **Bagian ini sudah pre-isi dari brief §4 dan tidak boleh diubah nilainya.** Ia ada di sini
> supaya bisa dilampirkan ke agent sebagai satu blok. Yang Anda lengkapi hanya kolom
> **"Ditegakkan di"** — path berkas tempat aturan itu benar-benar hidup. Kolom itu sekaligus
> berfungsi sebagai deteksi dini: BR tanpa lokasi penegakan berarti aturan itu belum ada
> di kode mana pun.

| BR | Aturan (ringkas) | Ditegakkan di |
|---|---|---|
| **BR-01** | Plafon < Rp 5.000.000 atau > Rp 500.000.000 ditolak saat submit, dengan pesan yang menjelaskan batas | `backend/src/domain/plafon.ts` (`validasiBatasPlafon`), dipanggil `services/pengajuan.service.ts` saat submit |
| **BR-02** | Approval harus berurutan: level 2 tidak dapat memutuskan sebelum level 1 memberi `APPROVE` | `<!-- ISI -->` |
| **BR-03** | Skoring baru boleh jalan jika semua dokumen wajib `VERIFIED` **dan** ada minimal satu survei `VALID` **dan** SLIK check sudah dijalankan | `<!-- ISI -->` |
| **BR-04** | Hasil SLIK berlaku 30 hari; lewat itu pengajuan ditandai perlu SLIK ulang | `<!-- ISI -->` |
| **BR-05** | Grade 5 tidak dapat diajukan ke approval; status menjadi `REJECTED_SCORING` | `<!-- ISI -->` |
| **BR-06** | Margin/nisbah di luar rentang grade-nya **diblokir**, bukan diberi peringatan. Tidak ada jalur "lanjutkan saja" | `<!-- ISI -->` |
| **BR-07** | Skor akhir = Σ (skor komponen × bobot) ÷ Σ bobot, dibulatkan ke bilangan bulat terdekat | `<!-- ISI -->` |
| **BR-08** | Rincian tiap komponen skor wajib ditampilkan ke ANL **dan disimpan** bersama hasil skoring, bukan hanya angka akhir | `<!-- ISI -->` |
| **BR-09** | Satu pengguna tidak boleh menjadi maker dan approver pada pengajuan yang sama; ditegakkan di **server** | `<!-- ISI -->` |
| **BR-10** | Setiap perubahan status wajib punya aktor dan timestamp; tidak ada perubahan "oleh sistem" tanpa jejak sebab | `backend/src/services/status.service.ts` (`ubahStatus` — satu-satunya penulis kolom `status`; menulis status dan audit dalam satu transaksi yang tidak bisa dipisah) |
| **BR-11** | NIK dan foto dokumen adalah data pribadi: tidak boleh muncul di log aplikasi, pesan error, atau URL | `backend/src/lib/logger.ts` (redaksi di serializer, bukan di pemanggil) + `middleware/error.ts` (galat tak terduga selalu memakai pesan generik) |
| **BR-12** | Nomor referensi `IMT-YYYYMMDD-NNNN` unik dan tidak pernah dipakai ulang, termasuk untuk pengajuan yang ditolak | `backend/src/domain/nomor-referensi.ts` + baris terkunci `urutan_referensi` di `services/pengajuan.service.ts` (penghitung hanya naik) |

### 5.1 Tabel parameter — wajib sebagai data, bukan konstanta

Ketiga tabel berikut **wajib tersimpan di database** dan bisa diubah ADM tanpa deploy ulang
(FR-13, AC-15). Agent dilarang menuliskan angka-angka ini sebagai konstanta di dalam kode,
termasuk sebagai nilai default, termasuk di dalam test.

**Ambang approval** (dinilai dari **total plafon**; untuk kelompok/majelis: total plafon kelompok):

| Total plafon | Level | Jenis |
|---|---|---|
| Rp 5.000.000 – Rp 50.000.000 | KCP | Tunggal |
| > Rp 50.000.000 – Rp 200.000.000 | KCP → KC | Berjenjang 2 |
| > Rp 200.000.000 – Rp 500.000.000 | KCP → KC → KOM | Berjenjang 3 |

**Keluaran kolektibilitas SLIK:**

| Kolektibilitas | Keluaran sistem |
|---|---|
| 1 | Lanjut normal |
| 2 | Lanjut, **tetapi grade risiko minimal 3** dan wajib catatan analis |
| 3, 4, 5 | **Penolakan otomatis**, status `REJECTED_SLIK`, tanpa melalui approval |

**Rentang margin / nisbah per grade:**

| Grade | Rentang skor | Margin murabahah (p.a.) | Nisbah bank musyarakah |
|---|---|---|---|
| 1 — Sangat baik | 85–100 | 11,0 % – 13,0 % | 20 % – 25 % |
| 2 — Baik | 70–84 | 13,0 % – 15,5 % | 25 % – 30 % |
| 3 — Cukup | 55–69 | 15,5 % – 18,0 % | 30 % – 35 % |
| 4 — Perlu perhatian | 40–54 | 18,0 % – 21,0 % | 35 % – 40 % |
| 5 — Berisiko tinggi | < 40 | Tidak dibiayai | Tidak dibiayai |

**Komponen skor kelayakan** (bobot wajib bisa diubah ADM):

| Komponen | Bobot | Cara hitung |
|---|---|---|
| Kapasitas bayar | 35 | Rasio angsuran bulanan terhadap (omzet harian × 25 hari × margin usaha 30 %). ≤ 30 % → skor penuh; > 60 % → skor 0; linear di antaranya |
| Riwayat SLIK | 25 | Kol-1 → 100; Kol-2 → 40; Kol-3-5 → tidak sampai tahap ini |
| Lama usaha | 20 | ≥ 36 bulan → 100; < 6 bulan → 0; linear di antaranya |
| Hasil survei lapangan | 20 | Penilaian ANL atas kondisi usaha, skala 1–5, dikali 20 |

**Nama tabel parameter di database kami** — pakai nama ini persis, jangan menebak:

| Isi | Nama tabel | Dibaca oleh |
|---|---|---|
| Bobot & aturan komponen skor | `parameter_skoring` | `services/skoring.service.ts` pada **setiap** pemanggilan |
| Ambang approval per plafon | `ambang_approval` | `services/approval.service.ts` **setiap kali level dihitung**, termasuk saat membaca detail |
| Rentang margin/nisbah per grade | `rentang_margin` | `services/skoring.service.ts` (menurunkan grade dari skor) dan `services/margin.service.ts` (validasi BR-06) |

Tabel `parameter_skoring` juga memuat empat parameter turunan asumsi tim
(`docs/SRS-iMitra.md` bagian 2.5) — perlakukan sama seperti bobot, yaitu **data, bukan
konstanta**:

| Kode | Nilai awal | Asal |
|---|---|---|
| `MARGIN_REFERENSI_SKORING` | 15.5 (% p.a.) | A-1 — margin belum diketahui saat skoring, jadi angsuran dihitung dengan margin referensi |
| `HARI_KERJA_PER_BULAN` | 25 | A-2 — dari §4.4 |
| `MARGIN_USAHA_PERSEN` | 30 | A-2 — dari §4.4 |
| `SLIK_MASA_BERLAKU_HARI` | 30 | A-8 — BR-04. **Bukan** variabel env |

**Cara agent membaca parameter**: service membacanya dari database lalu **meneruskannya
sebagai argumen** ke fungsi di `domain/`. Fungsi `domain/` tidak pernah membaca database
sendiri, dan tidak pernah punya nilai default untuk parameter (ADR-0003).

### 5.2 Kontrak mock SLIK (tidak boleh diubah agent)

```
POST /slik/inquiry
Request  : { "nik": "3404xxxxxxxxxxxx" }
200      : { "nik", "nama", "kolektibilitas", "jumlahFasilitasAktif",
             "totalBakiDebet", "tanggalData", "referenceId" }
404      : { "error": "NIK_NOT_FOUND" }
503      : { "error": "SERVICE_UNAVAILABLE" }
```

Dipanggil **via HTTP**, bukan sebagai fungsi lokal. Wajib menangani timeout, 503, dan 404.
Mock harus bisa dipaksa mengembalikan 503 supaya jalur error bisa didemokan — data uji
di `fixtures/nasabah-uji.csv` sudah menyediakan NIK pemicunya.

---

## 6. Larangan Eksplisit untuk Agent

> Pre-isi di bawah adalah dasar. **Tambahkan larangan baru setiap kali agent melakukan
> kesalahan yang sama dua kali** — itu inti dari berkas ini. Rujuk nomor DEVLOG-nya
> supaya jelas larangan ini datang dari pengalaman, bukan dari salinan template.

Agent **tidak boleh**:

1. Menambah dependensi/pustaka baru tanpa persetujuan Tech Lead. Kalau perlu, usulkan
   dulu beserta alasan dan alternatifnya; jangan langsung ubah manifest paket.
2. Mengubah atau menghapus migrasi yang sudah di-merge ke `main`. Perubahan skema
   selalu berupa migrasi baru.
3. Menuliskan angka ambang, bobot, atau rentang dari bagian 5 sebagai konstanta di kode
   (termasuk sebagai nilai default dan di dalam test).
4. Mengubah format nomor referensi `IMT-YYYYMMDD-NNNN`, atau membangkitkannya di frontend.
5. Menambah nilai enum status baru tanpa memperbarui bagian 4.1 dan `docs/SDD-iMitra.md`.
6. Melakukan otorisasi hanya di frontend. Setiap endpoint memeriksa peran di server.
7. Menghapus atau melemahkan test yang gagal supaya CI hijau. Test yang gagal berarti
   kode atau requirement yang salah, bukan test-nya.
8. Membuat endpoint yang bisa `UPDATE` atau `DELETE` baris audit trail. Audit trail
   append-only (FR-09, AC-13).
9. Menulis NIK, nomor dokumen, atau path foto ke log, pesan error, atau URL (BR-11).
10. Membuat berkas `.env`, menaruh nilai secret nyata di berkas apa pun, atau menulis
    kredensial di kode. Hanya `.env.example` dengan nilai placeholder.
11. Melakukan `git push` ke `main`, `git push --force`, atau merge PR-nya sendiri.
12. Membangun apa pun dari daftar "di luar lingkup" di bagian 1, walaupun terasa mudah.
13. Menghasilkan lebih dari ~200 baris kode dalam satu keluaran. Kalau tugasnya besar,
    ajukan rencana bertahap lebih dulu, tunggu persetujuan, baru tulis kode.
14. Mengubah `docker-compose.yml`, `ci.yml`, atau `AGENTS.md` sebagai efek samping dari
    tugas fitur. Ketiganya diubah lewat PR terpisah.
15. Menganggap kegagalan SLIK sebagai SLIK bersih, atau mengisi kolektibilitas dengan
    nilai default saat panggilan gagal.

<!-- ISI: larangan tambahan dari pengalaman tim. Format:
     16. <larangan> — ditambahkan setelah DEVLOG-xx, karena <apa yang terjadi>. -->

16. **Menganggap `REVOKE UPDATE, DELETE` sebagai penjagaan yang mengikat.** REVOKE tidak
    berpengaruh terhadap PEMILIK tabel, dan peran aplikasi kami (`imitra_app`) adalah
    pemilik `audit_trail` di compose maupun di CI — karena dialah yang menjalankan migrasi.
    Lapis ke-3 AC-13 sempat lolos review dalam keadaan tidak berfungsi sama sekali.
    Penjagaan append-only sekarang berupa TRIGGER (migrasi `20260820134500`), yang berlaku
    untuk semua peran. Aturan umumnya: **penjagaan di database wajib punya test yang
    benar-benar menembak database**, bukan hanya membaca kodenya
    (`tests/integration/audit-readonly.spec.ts`).

17. **Menghapus baris `pengajuan` di dalam test untuk membersihkan data.** Trigger
    append-only menolak UPDATE atas `audit_trail`, dan menghapus `pengajuan` memaksa
    PostgreSQL meng-UPDATE `audit_trail.pengajuan_id` menjadi NULL — jadi penghapusannya
    gagal. Itu disengaja: jejak keputusan pembiayaan tidak ikut terhapus bersama datanya.
    Bersihkan dengan `prisma migrate reset`, dan buat data uji memakai NIK/username yang
    unik per jalannya test (lihat `nikUji()` di `tests/integration/audit.spec.ts`).

18. **Membuat `new PrismaClient()` di luar `lib/prisma.ts`.** Setiap instance membuka pool
    koneksi sendiri. Anggaran kami 20 koneksi TOTAL untuk enam orang
    (`docs/DATABASE.md` bagian 2), dan gejala kehabisannya muncul di laptop ORANG LAIN,
    jauh dari sebabnya. Alasan yang sama membuat test integrasi berjalan berurutan
    (`fileParallelism: false` di `vitest.config.ts`).

19. **Menulis test yang hanya menguji jalur gagal.** Pola tanggal pada `GET /api/audit`
    sempat kehilangan escape-nya (`\d` menjadi `d`), sehingga SELURUH tanggal yang sah
    ditolak — dan test "tanggal salah ditolak" tetap hijau, karena tanggal salah memang
    ikut ditolak. Setiap validasi wajib punya pasangan test: satu yang ditolak, satu yang
    DITERIMA.

---

## 7. Perintah Test & Lint

Perintah di bawah harus **identik** dengan `.github/workflows/ci.yml` dan `README.md`
bagian 2.6. Kalau ketiganya berbeda, salah satunya sudah usang — perbaiki, jangan diamkan.
Dijalankan dari direktori `backend/` kecuali disebut lain.

```bash
# Instalasi dependensi (semua layanan, dari root)
npm ci --prefix backend && npm ci --prefix frontend && npm ci --prefix mock-slik

# Migrasi (lingkungan test)
DATABASE_URL=$DATABASE_URL_TEST npx prisma migrate deploy

# Seed data uji — idempoten, aman dijalankan dua kali
DATABASE_URL=$DATABASE_URL_TEST npm run seed

# Test unit (domain/ saja, tanpa database)
npm run test:unit

# Test integrasi / API (butuh database test yang sudah dimigrasi + di-seed)
npm run test:integration

# Lint
npm run lint

# Format
npm run format

# Semua sekaligus, sama seperti yang dijalankan CI
npm run ci        # = lint && test:unit && test:integration
```

**Menjalankan seluruh sistem** (dari root repo):

```bash
cp .env.example .env
docker compose up --build          # migrasi + seed jalan otomatis
docker compose down -v             # reset demo ke kondisi seed
```

**Database** — dua mode, dipilih dari `.env`, rincian di
[`docs/DATABASE.md`](docs/DATABASE.md):

- `COMPOSE_PROFILES=lokal` → PostgreSQL container. **Bawaan `.env.example`**, dan inilah
  yang dipakai penilai dari clone bersih.
- `COMPOSE_PROFILES=` kosong → PostgreSQL bersama tim (Aiven), satu **schema per orang**.

Yang wajib agent ketahui tentang ini:

- **Jangan pernah menulis kredensial database ke berkas mana pun**, termasuk `.env.example`,
  `docker-compose.yml`, komentar kode, atau contoh di dokumentasi. Host, port, dan username
  boleh; password tidak. Ini bagian 6 butir 10, dan CI menggagalkan build kalau menemukannya.
- **Jangan menghapus service `db` dari `docker-compose.yml`** walaupun tim memakai Aiven.
  Tanpa service itu penilai tidak bisa menjalankan repo sama sekali — kriteria diskualifikasi.
- **Jangan menjalankan `prisma migrate dev`** terhadap schema bersama. Migrasi baru hanya
  dibuat Tech Lead; anggota lain memakai `prisma migrate deploy`.
- **Jangan menghapus `connection_limit` dari URL.** Kuota 20 koneksi dibagi enam orang.

**Aturan Definition of Done untuk agent**: perubahan dianggap selesai hanya jika lint bersih,
seluruh test lolos, dan ada minimal satu test yang berasal dari AC terkait — bukan test yang
diturunkan dari kode yang baru saja ditulis.

**Sebelum membuka PR**, pastikan:

- Test dan lint lolos secara lokal, bukan hanya "seharusnya lolos".
- `docs/TRACEABILITY.md` diperbarui untuk FR yang disentuh.
- Ada entri `docs/AI-DEVLOG.md` kalau AI dipakai, dan nomornya disebut di deskripsi PR.
- Tabel status FR di `README.md` diperbarui kalau statusnya berubah.
