# ADR-0001: Kami memakai Node.js + TypeScript + Fastify + PostgreSQL + React/Vite

- **Status**: Accepted
- **Tanggal**: 2026-08-20
- **Pengambil keputusan**: Tech Lead — Firman, dengan masukan seluruh anggota
- **Terkait**: seluruh FR; brief §7.1, §7.2; `AGENTS.md` bagian 2; `docs/SDD-iMitra.md` BAB 1.3

---

## Konteks

Dalam **9 jam koding bersih dengan 5 orang** kami harus mengirimkan: backend dengan 30+
endpoint, frontend dengan 13 layar untuk 6 peran, mock SLIK sebagai layanan terpisah,
database dengan 14 tabel beserta migrasi dan seed idempoten, test dari 15 acceptance
criteria, CI, dan `docker compose up` yang jalan di mesin penilai yang belum pernah melihat
repo ini.

Fakta yang mengikat pilihan:

1. **Waktu.** 9 jam bukan waktu untuk mempelajari framework baru. Stack yang membuat satu
   orang berhenti membaca dokumentasi selama satu jam berarti kehilangan 11 % kapasitas tim.
2. **Satu bahasa untuk tiga layanan.** Backend, frontend, dan mock SLIK adalah tiga hal
   yang harus dibangun. Bahasa yang sama untuk ketiganya berarti satu toolchain, satu
   konfigurasi lint, satu perintah test — dan anggota bisa berpindah antar layanan tanpa
   ganti konteks.
3. **Brief §7.2 butir 4 dan 5** mewajibkan skema dari migrasi dan seed dari skrip yang
   idempoten. Tool migrasi harus sudah matang, bukan skrip SQL buatan sendiri.
4. **Brief §7.2 butir 1** mewajibkan satu perintah dari mesin bersih. Image dasar harus
   kecil dan build harus cepat; kami tidak punya waktu menunggu build 8 menit setiap iterasi.
5. **Kualitas keluaran AI.** Ini kelas tentang memakai AI sebagai alat rekayasa. Stack yang
   jarang muncul di data latihan model berarti keluaran AI lebih sering salah dan biaya
   verifikasi kami naik — padahal verifikasi itulah yang dinilai, bukan pengetikan.
6. **Docker.** Kelima laptop menjalankan Docker Desktop / Docker Engine ≥ 24.

**Keahlian tim** (fakta, bukan perkiraan optimis — isi kolom ini dengan jujur di menit
pertama Sprint 0; kalau angkanya tidak seperti dugaan, keputusan ini yang harus berubah,
bukan angkanya):

| Kandidat stack | Mahir | Pernah pakai | Belum pernah |
|---|---|---|---|
| Node + TypeScript | `<!-- ISI: jumlah -->` | `<!-- ISI -->` | `<!-- ISI -->` |
| React | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |
| PostgreSQL | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |
| Java / Spring Boot | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |
| Python / FastAPI | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |

---

## Keputusan

| Lapisan | Pilihan | Versi |
|---|---|---|
| Bahasa & framework backend | Node.js + TypeScript + **Fastify** | Node 20 LTS · TS 5.4 · Fastify 4.26 |
| Bahasa & framework frontend | **React + Vite** + TanStack Query + React Router | React 18.2 · Vite 5.2 |
| Database | **PostgreSQL** | 16 (`postgres:16-alpine`) |
| ORM / query layer | **Prisma Client** | 5.14 |
| Tool migrasi | **Prisma Migrate** (`migrate dev` / `migrate deploy`) | 5.14 |
| Test runner | **Vitest** + Supertest | Vitest 1.6 |
| Linter / formatter | **ESLint** + Prettier | ESLint 8.57 |
| Validasi input | **Zod** | 3.23 |
| Bahasa mock SLIK | Node.js + TypeScript + Fastify | Node 20 LTS |
| Orkestrasi lokal | Docker Compose | v2 |

**Cara menjalankan yang dijanjikan ke penilai**:

```bash
git clone <repo> && cd <repo> && cp .env.example .env && docker compose up
```

**Yang secara eksplisit tidak termasuk keputusan ini**: pustaka komponen UI (diputuskan
Frontend Engineer sendiri, dengan syarat tidak menambah dependensi berat); strategi caching
(belum diperlukan, dan ADR-0003 justru melarangnya untuk parameter bisnis); pemilihan
pustaka tanggal.

---

## Alasan

| Kriteria | Bobot bagi kami | Kenapa pilihan ini menang |
|---|---|---|
| Keahlian tim | **Tertinggi** | Satu bahasa (TypeScript) untuk backend, frontend, dan mock SLIK berarti tidak ada anggota yang terkunci di satu layanan. Anggota yang selesai lebih cepat bisa membantu layanan lain tanpa mempelajari toolchain baru — dengan 5 orang, fleksibilitas ini bernilai lebih dari kecepatan runtime |
| Kecepatan sampai walking skeleton (Gate 2, Kamis 15.30) | Tinggi | `prisma migrate dev` menghasilkan skema + klien bertipe dari satu berkas `schema.prisma`. Login → buat pengajuan → tampil di daftar bisa selesai tanpa menulis satu baris SQL manual. Vite dev server hidup dalam hitungan detik |
| Dukungan tool AI yang tim pakai | Tinggi | TypeScript + Fastify/Express + Prisma + React adalah kombinasi yang paling banyak muncul di data latihan model. Keluaran AI lebih sering benar pada percobaan pertama, sehingga waktu kami terpakai untuk **memverifikasi** — yang dinilai — bukan untuk memperbaiki sintaks yang mengarang |
| Kemudahan menulis test dari AC | Tinggi | Fastify punya `app.inject()` yang menjalankan request tanpa membuka port, sehingga test integrasi cepat dan bisa dijalankan paralel di CI. Aturan bisnis di `domain/` sebagai fungsi murni bisa diuji tanpa database sama sekali |
| Ketegasan tipe pada aturan bisnis | Tinggi | Grade, status, peran, dan keputusan approval semuanya berupa union type. TypeScript menolak nilai status yang tidak ada di daftar saat compile — satu kelas bug yang tidak perlu diuji karena tidak bisa terjadi |
| Kemudahan dijalankan di mesin bersih | Sedang | `node:20-alpine` kecil dan build cepat. Tidak ada JVM warm-up, tidak ada wheel Python yang perlu dikompilasi di image |

Bukti konkret yang kami pakai, bukan keyakinan: `.env.example` bawaan template sudah
mengasumsikan `VITE_API_BASE_URL`, `DATABASE_URL` bergaya `postgres://`, dan
`PASSWORD_HASH_COST` bergaya bcrypt — artinya penyusun template pun membayangkan stack ini,
dan kami tidak perlu menulis ulang berkas konfigurasi yang sudah benar.

---

## Konsekuensi

**Menjadi lebih mudah**:

- Satu perintah `npm run lint` dan `npm run test` berlaku di tiga direktori, sehingga
  `AGENTS.md` bagian 7, `README.md` bagian 2.6, dan `ci.yml` mudah dijaga tetap identik.
- Tipe Prisma dipakai langsung sebagai tipe repository, jadi tidak ada lapisan pemetaan
  manual yang harus ditulis dan diuji.
- Anggota bisa berpindah antar layanan tanpa ganti konteks — penting karena kami hanya 5
  orang dan brief §8.3 mengurangi nilai bila satu orang menulis > 50 % commit.

**Menjadi lebih sulit / risiko yang kami terima**:

- **Prisma menyembunyikan SQL.** Query yang tidak efisien tidak langsung terlihat. Mitigasi:
  NFR-07 menetapkan angka yang diukur, dan indeks dibuat sejak migrasi pertama, bukan
  ditambal belakangan.
- **`prisma migrate dev` bisa meminta reset database** kalau riwayat migrasi menyimpang.
  Mitigasi: hanya Tech Lead yang membuat migrasi (`CODEOWNERS`), dan container memakai
  `migrate deploy` yang tidak pernah mereset.
- **JavaScript memakai floating point.** BR-07 menuntut pembulatan hanya sekali di akhir;
  akumulasi galat floating point bisa menggeser skor tepat di batas grade. Mitigasi: skor
  komponen disimpan `NUMERIC(6,3)` di database, dan test batas ditulis tepat di 39/40,
  54/55, 69/70, 84/85 (lihat SRS BAB 7, AC-09 dan AC-10).
- **Nilai rupiah** disimpan `bigint`, bukan `number` — `Number.MAX_SAFE_INTEGER` cukup untuk
  Rp 500 juta, tetapi kami tetap memakai `bigint` supaya tidak ada anggota yang tergoda
  memakai `float` untuk uang.

**Utang teknis yang diterima sadar**:

- Tidak ada pencabutan token (blacklist JWT). Token berumur 8 jam; untuk demo ini memadai,
  untuk produksi tidak. Dicatat di SDD BAB 7 dan `README.md` bagian 5.
- Frontend memakai `localStorage` untuk token, bukan cookie `HttpOnly`. Alasan: mempercepat
  test integrasi dan menghindari kerumitan CSRF dalam 9 jam. Ini pilihan yang **tidak**
  akan kami ambil di produksi.

**Rencana kalau ternyata salah** — jawaban kami untuk pertanyaan Gate 1 *"apa satu hal yang
paling mungkin membuat tim ini gagal, dan apa rencana Anda untuk itu?"*:

- **Risiko terbesar kami bukan stack — melainkan backend menjadi leher botol.** Kami
  memilih 3 backend + 3 frontend (lihat `docs/PEMBAGIAN-TIM.md` bagian 0), sehingga sembilan
  FR P0 beserta seluruh aturan bisnis dipegang tiga orang — dan satu di antaranya juga
  memegang infra. Kalau infra molor, dua orang menanggung seluruh aturan bisnis.
- **Sinyal bahwa keputusan ini salah**: pada **Kamis 14.00** walking skeleton (login → buat
  pengajuan → tampil di daftar) belum jalan ujung ke ujung, atau `POST /api/pengajuan`
  belum menyimpan ke database.
- **Yang akan kami lakukan**: Reffa (Frontend Lead, merangkap QA) berpindah ke backend mulai
  Jumat 09.20 dan mengambil FR-04 survei serta query terfilter peran untuk FR-12. Itu
  memungkinkan karena fondasi UI ditargetkan selesai **Kamis 13.00**, sehingga Ray dan Eka
  tidak terhambat oleh kepergiannya. Kontrak API dibekukan Kamis 13.00 supaya perpindahan
  ini tidak memerlukan koordinasi tambahan.
- **Batas waktu memutuskan**: **Kamis 15.30 di Gate 2.** Kalau walking skeleton belum jalan
  di depan instruktur, perpindahan itu diputuskan malam itu juga, bukan Jumat siang.

---

## Lapisan Autentikasi

Brief §6.3 meminta keputusan ini dicatat di ADR secara khusus.

- **Mekanisme**: **JWT HS256**, bukan session server-side. Alasan: backend tanpa state
  membuat test integrasi bisa berjalan paralel tanpa berbagi penyimpanan session, dan tidak
  ada komponen tambahan (Redis) yang perlu dihidupkan di `docker compose`.
- **Hashing password**: **bcrypt** dengan cost dari `PASSWORD_HASH_COST` (10 di lingkungan
  demo). Nilai rendah dipilih sadar supaya seed 6+ akun dan test tidak menjadi lambat; di
  produksi nilai ini naik, dan karena ia parameter env, kenaikannya tidak menyentuh kode.
- **Batas yang memungkinkan penukaran ke AD/SSO nanti**: satu antarmuka —

  ```ts
  interface PenyediaIdentitas {
    autentikasi(username: string, password: string): Promise<ProfilPengguna | null>
  }
  ```

  Implementasi saat ini `PenyediaIdentitasLokal` (bcrypt terhadap tabel `pengguna`).
  Menukar ke LDAP/OIDC berarti menambah satu implementasi baru dan mengubah **satu baris**
  perakitan di `app.ts`. Yang **tidak** berubah: route, service, middleware peran, dan
  seluruh frontend — karena tidak satu pun di antaranya tahu dari mana kredensial
  diverifikasi.
- **Yang harus berubah kalau penukaran benar-benar terjadi**: sumber peran. Saat ini peran
  disimpan di kolom `pengguna.peran`; pada AD/SSO peran datang dari klaim token penyedia.
  Karena itu peran dibaca lewat satu fungsi `peranDari(profil)`, bukan diakses langsung
  dari baris database di banyak tempat.
- **Bagaimana peran dibaca di server pada setiap request**: `middleware/auth.ts` memverifikasi
  tanda tangan JWT dan menaruh `{ id, peran }` di `request.pengguna`;
  `middleware/rbac.ts` membandingkannya dengan daftar peran yang **wajib dideklarasikan**
  pada setiap route. Route yang tidak mendeklarasikan peran menggagalkan proses saat start
  (fail-closed) — sehingga endpoint baru tidak bisa lolos tanpa otorisasi karena lupa.
  AC-02 menguji ini langsung dengan panggilan API sebagai AO ke endpoint verifikasi dokumen.

---

## Alternatif yang Ditolak

| Alternatif | Sumber usulan | Alasan ditolak |
|---|---|---|
| **Java 21 + Spring Boot 3 + Flyway** | Anggota tim (stack sehari-hari di bank) | Paling dekat dengan pekerjaan nyata kami, tetapi waktu build image dan warm-up JVM memotong siklus iterasi, dan bahasanya berbeda dari frontend sehingga tidak ada anggota yang bisa berpindah antar layanan. Dengan 5 orang, kehilangan fleksibilitas itu lebih mahal daripada keuntungan familiaritas |
| **Python 3.12 + FastAPI + SQLAlchemy/Alembic** | Anggota tim | Cepat sampai walking skeleton dan validasi Pydantic bagus, tetapi dua bahasa untuk backend dan frontend; dan pengetikan dinamis membuat 15 nilai status pengajuan tidak terjaga saat compile — persis kelas kesalahan yang paling mahal di sistem ini |
| **Go + Chi + sqlc** | Anggota tim | Container terkecil dan startup tercepat, tetapi boilerplate per endpoint paling banyak. Dengan 30+ endpoint dalam 9 jam, biaya boilerplate itu langsung terasa |
| **Express, bukan Fastify** | — | Fastify dipilih karena `app.inject()` (test integrasi tanpa membuka port) dan skema route bawaan. Perbedaannya kecil, tetapi keduanya langsung menguntungkan aspek "Testing & verifikasi" |
| **Prisma diganti query SQL langsung** | — | Ditolak karena brief §7.2 butir 4 mewajibkan skema dari migrasi. Menulis migrasi manual bisa, tetapi menambah satu hal yang harus dijaga benar dalam 9 jam |

> **Catatan**: ADR ini **belum** memuat penolakan terhadap saran AI. Brief §9.4 mewajibkan
> minimal satu ADR yang mencatatnya, dan bonus +2 hanya berlaku untuk penolakan yang nyata
> terjadi dan bisa diperiksa. ADR itu ditulis **saat kejadiannya**, bukan direkonstruksi —
> lihat `docs/adr/0002-plafon-per-anggota.md` yang menyediakan tempatnya, dan rujuk entri
> `AI-DEVLOG` yang terkait.

---

## Catatan Verifikasi

- [ ] `AGENTS.md` bagian 2 memuat versi yang sama persis dengan tabel Keputusan di atas
- [ ] `docker compose up` sudah pernah dijalankan dari clone bersih di direktori baru,
      bukan dari direktori kerja yang sudah punya `node_modules`
- [ ] Perintah test dan lint identik di `AGENTS.md` bagian 7, `README.md` bagian 2.6,
      dan `.github/workflows/ci.yml`
- [ ] Tabel keahlian tim di bagian Konteks sudah diisi dengan angka nyata
- [ ] **Sinyal kegagalan diperiksa Kamis 14.00**: apakah walking skeleton sudah jalan?
