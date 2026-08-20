# SETUP — Menjalankan iMitra dari Nol

**Pemilik berkas**: Tech Lead / DevOps — Firman
**Terakhir diverifikasi**: 2026-08-20

---

## 0. Pilih jalur Anda

Ada dua cara menjalankan iMitra. Keduanya memakai **perintah yang sama**; yang membedakan
hanya isi `.env`.

| | Jalur A — Clone bersih | Jalur B — Anggota tim |
|---|---|---|
| Untuk siapa | **Penilai**, atau siapa pun yang baru clone | Enam anggota tim selama pengembangan |
| Database | PostgreSQL di dalam Docker | PostgreSQL terkelola Aiven, satu schema per orang |
| Perlu kredensial? | **Tidak** | Ya, password Aiven dari Tech Lead |
| Perlu internet? | Hanya untuk unduh image | Ya |
| `COMPOSE_PROFILES` | `lokal` (bawaan `.env.example`) | kosong |

**Kalau Anda ragu, pakai Jalur A.** Ia tidak memerlukan apa pun dari orang lain.

Aturan yang menjaga keduanya tetap hidup: `.env.example` **selalu** mengarah ke database
lokal. Kalau suatu saat ia menunjuk ke Aiven, penilai tidak akan bisa menjalankan repo ini
sama sekali — dan itu kriteria diskualifikasi (brief §7.3), bukan pengurangan nilai.

---

## 1. Prasyarat

| Perangkat | Versi minimum | Diperlukan untuk | Cara memeriksa |
|---|---|---|---|
| **Docker Engine** | 24 | Jalur A dan B | `docker --version` |
| **Docker Compose** | v2 | Jalur A dan B | `docker compose version` |
| Node.js | 20 LTS | Hanya kalau menjalankan tanpa Docker atau menjalankan test di host | `node --version` |
| Git | 2.40 | Semua | `git --version` |

**Docker Desktop harus benar-benar berjalan**, bukan hanya terpasang. Gejala kalau belum:
`failed to connect to the docker API at npipe:...`.

**Port yang harus bebas**: `3000`, `8080`, `9090`, dan `5432`. Kalau bentrok, ubah nilainya
di `.env` bagian "Port layanan" — tidak perlu menyentuh kode.

---

## 2. Jalur A — Clone bersih (penilai)

```bash
git clone https://github.com/codebubub/iMitra-Tim-2.git
cd iMitra-Tim-2
cp .env.example .env
docker compose up --build
```

Itu saja. Migrasi dan seed dijalankan otomatis oleh service `migrate`; tidak ada perintah
tambahan, tidak ada berkas yang perlu diedit.

Build pertama memakan **2–4 menit** karena mengunduh image dan memasang dependensi. Tunggu
sampai `docker compose ps` menampilkan seluruh service `healthy`, lalu buka
<http://localhost:3000>.

### Yang terjadi di balik layar

Urutannya dijamin healthcheck dan gelung tunggu, **bukan `sleep` yang ditebak panjangnya**:

```
db (healthy)
  └─> migrate  : prisma migrate deploy -> npm run seed -> keluar dengan kode 0
        └─> backend (healthy)
              └─> frontend
mock-slik (healthy) ──────┘
```

Kalau `migrate` gagal, ia keluar dengan kode bukan-nol dan **backend tidak ikut hidup**.
Itu disengaja: lebih baik berhenti daripada hidup dengan skema yang tidak lengkap.

### Alamat setelah jalan

| Layanan | URL | Untuk apa |
|---|---|---|
| Frontend | <http://localhost:3000> | Aplikasi |
| Backend API | <http://localhost:8080> | Kesehatan: `/health` |
| Daftar route | <http://localhost:8080/api/_routes> | **Bukti AC-13** |
| Mock SLIK | <http://localhost:9090/health> | Menampilkan `nasabahDimuat: 10` |
| Database | `localhost:5432` | Inspeksi manual (psql / DBeaver) |

### Akun demo

Password seluruh akun sama: **`Demo1234!`** (dari `SEED_DEFAULT_PASSWORD`).
Ini akun seed non-produksi; nilainya bukan rahasia.

| Username | Peran | Nama |
|---|---|---|
| `ao` | AO | Andi Prasetya |
| `anl` | ANL | Dewi Rahmawati |
| `kcp` | KCP | Bagus Setiawan |
| `kc` | KC | Sri Handayani |
| `kom` | KOM | Komite Pembiayaan |
| `adm` | ADM | Admin Sistem |
| `kcp2` | KCP | Rina Kusuma — **berperan approver sekaligus pembuat**, khusus untuk AC-11 |

### Data yang sudah tersedia

Seed membuat lima pengajuan siap-demo. Rincian dan cara memakainya ada di
[`DEMO-SCRIPT.md`](DEMO-SCRIPT.md) bagian 0.

---

## 3. Jalur B — Anggota tim (Aiven)

### 3.1 Sekali saja, saat pertama kali

```bash
git clone https://github.com/codebubub/iMitra-Tim-2.git
cd iMitra-Tim-2
cp .env.example .env
```

Lalu **edit `.env`** dan ubah tiga baris. Ganti `<nama>` dengan nama Anda
(`firman`, `alfian`, `dani`, `reffa`, `ray`, `eka`) dan `<password>` dengan nilai dari
Tech Lead:

```bash
COMPOSE_PROFILES=

DATABASE_URL=postgresql://avnadmin:<password>@imitra-tim2-imitratim2.l.aivencloud.com:13096/defaultdb?sslmode=require&schema=dev_<nama>&connection_limit=2
DATABASE_URL_TEST=postgresql://avnadmin:<password>@imitra-tim2-imitratim2.l.aivencloud.com:13096/defaultdb?sslmode=require&schema=test_<nama>&connection_limit=2
```

Tiga hal di URL itu wajib, dan masing-masing punya alasan:

| Parameter | Kenapa wajib |
|---|---|
| `sslmode=require` | Aiven menolak koneksi tanpa TLS |
| `schema=dev_<nama>` | Schema PostgreSQL, **bukan** database. Tanpa ini, `prisma migrate dev` milik satu orang menghapus data lima orang lain |
| `connection_limit=2` | Kuota 20 koneksi dibagi enam orang. Prisma membuka pool per proses; bawaannya `num_cpus × 2 + 1` — di laptop 8 core itu **17 koneksi untuk satu orang** |

> **Ejaan host: `imitra-tim2`, SATU huruf `t`.** Ejaan `imittra-` resolve di DNS tetapi
> tidak menerima koneksi sama sekali. Kesalahan ini sudah pernah terjadi dan memakan waktu.

Password **tidak ada di repo dan tidak boleh ditulis ke berkas mana pun selain `.env`**,
yang sudah masuk `.gitignore`. Mintakan lewat kanal privat — bukan lewat issue, commit,
atau layar yang dibagikan.

### 3.2 Schema Anda sudah siap

Keempat belas schema sudah dimigrasi dan di-seed. Anda **tidak perlu** menjalankan migrasi
apa pun untuk mulai bekerja:

| Kelompok | Schema |
|---|---|
| Kerja | `dev_firman` · `dev_alfian` · `dev_dani` · `dev_reffa` · `dev_ray` · `dev_eka` |
| Test | `test_firman` … `test_eka` · `test_ci` |
| Demo bersama | `demo` — **hanya Tech Lead** yang menjalankan migrasi di sini |

### 3.3 Menjalankan

```bash
docker compose up --build
```

Sama seperti Jalur A. Karena `COMPOSE_PROFILES` kosong, container `db` dilewati dan
aplikasi menyambung ke Aiven.

---

## 4. Menjalankan tanpa Docker (untuk iterasi cepat)

Docker bagus untuk memastikan semuanya jalan bersama, tetapi lambat untuk mengulang.
Saat mengembangkan satu layanan, jalankan layanan itu langsung di host.

Semua perintah di bawah dijalankan **dari direktori layanannya**, dan `.env` dibaca dari
akar repo — jalankan lewat `npm run dev` yang sudah mengaturnya, atau ekspor variabelnya
sendiri.

### Backend

```bash
cd backend
npm ci                    # sekali saja, atau setelah package.json berubah
npx prisma generate       # setelah schema.prisma berubah
npm run dev               # tsx watch, restart otomatis saat berkas berubah
```

Backend memerlukan `mock-slik` hidup. Jalankan salah satu:
`docker compose up mock-slik` atau `cd mock-slik && npm run dev`.

### Frontend

```bash
cd frontend
npm ci
npm run dev               # http://localhost:3000, hot reload
```

Frontend memerlukan backend hidup di `http://localhost:8080`.

### Mock SLIK

```bash
cd mock-slik
npm ci
npm run dev               # http://localhost:9090
```

Ia membaca `fixtures/nasabah-uji.csv` saat start. Kalau berkas itu berubah, restart.

---

## 5. Database

### 5.1 Perintah sehari-hari

Semua dari direktori `backend/`.

| Perintah | Kapan dipakai | Siapa |
|---|---|---|
| `npx prisma migrate deploy` | Menerapkan migrasi yang sudah ada ke schema Anda | **semua** |
| `npm run seed` | Mengisi data awal + lima pengajuan demo. Idempoten | semua |
| `npm run seed:demo` | Hanya data demo, tanpa data awal | semua |
| `npx prisma studio` | Melihat isi database di browser | semua |
| `npx prisma migrate dev --name <slug>` | **Membuat** migrasi baru dari perubahan `schema.prisma` | **hanya Tech Lead** |
| `npm run reset` | Menghapus schema dan membangun ulang dari nol | semua, di schema **sendiri** |

### 5.2 Aturan yang tidak boleh dilanggar

**Hanya Tech Lead yang membuat migrasi baru.** `prisma migrate dev` menghapus dan
membangun ulang schema ketika riwayat migrasi menyimpang — dan riwayat menyimpang setiap
kali dua orang membuat migrasi bersamaan. Yang lain memakai `migrate deploy`.

**Migrasi yang sudah di-merge ke `main` tidak boleh diubah atau dihapus**
(`AGENTS.md` bagian 6 butir 2). Perubahan skema selalu berupa migrasi baru.

**Jangan menjalankan `migrate dev` terhadap schema `demo`.** Itu schema bersama yang
dipakai saat demo.

### 5.3 Mereset ke kondisi bersih

```bash
# Jalur A (Docker) — menghapus volume database dan berkas upload
docker compose down -v && docker compose up --build

# Jalur B (Aiven) — hanya schema Anda sendiri
cd backend && npm run reset
```

Menghapus baris pengajuan **tidak** akan bekerja: trigger `audit_trail` menolak `UPDATE`
dan `DELETE`, dan PostgreSQL harus meng-`UPDATE` `audit_trail.pengajuan_id` menjadi `NULL`
lebih dulu. Itu disengaja — jejak keputusan pembiayaan tidak ikut terhapus bersama datanya.
Untuk membersihkan, reset schema-nya.

### 5.4 Menerapkan migrasi ke schema demo

Hanya Tech Lead:

```bash
cd backend
DATABASE_URL="postgresql://avnadmin:<password>@imitra-tim2-imitratim2.l.aivencloud.com:13096/defaultdb?sslmode=require&schema=demo&connection_limit=2" \
  npx prisma migrate deploy && npm run seed
```

---

## 6. Test

Perintah di bawah **identik** dengan `AGENTS.md` bagian 7 dan
`.github/workflows/ci.yml`. Kalau ketiganya berbeda, salah satunya sudah usang.

| Perintah | Direktori | Butuh database? | Menguji apa |
|---|---|---|---|
| `npm run test:unit` | `backend` | **Tidak** | Seluruh aturan bisnis di `domain/` — BR-01, 02, 05, 06, 07, 09, 12 |
| `npm run test:integration` | `backend` | Ya (`DATABASE_URL_TEST`) | Otorisasi per route (AC-02), audit append-only (AC-13), pengguna, notifikasi |
| `npm test` | `mock-slik` | Tidak | Kontrak brief §6.1: 200 / 404 / 503 |
| `npm run lint` | ketiganya | Tidak | Gaya **dan batas lapisan** — `domain/` tidak boleh mengimpor Prisma |
| `npm run ci` | `backend` | Ya | Semuanya sekaligus, sama seperti CI |

Test integrasi memakai `DATABASE_URL_TEST`, yang menunjuk ke schema `test_<nama>` Anda —
**bukan** schema kerja. Itu supaya test tidak menghapus data yang sedang Anda pakai.

---

## 7. Verifikasi bahwa benar-benar jalan

Jangan percaya "sepertinya sudah jalan". Sembilan pemeriksaan di bawah punya keluaran yang
bisa dicocokkan.

```bash
# 1. Semua service healthy
docker compose ps
#    -> kolom STATUS: "healthy" untuk db, mock-slik, backend, frontend

# 2. Backend hidup dan tersambung database
curl -s http://localhost:8080/health
#    -> {"status":"ok","database":"ok"}

# 3. Mock SLIK memuat fixtures
curl -s http://localhost:9090/health
#    -> {"status":"ok","nasabahDimuat":10,"mode":"ok"}
#    10, bukan 12: dua baris terakhir memang pemicu 404 dan 503

# 4. Login berhasil dan menghasilkan token
curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"ao","password":"Demo1234!"}'
#    -> {"token":"eyJ...","pengguna":{"peran":"AO",...}}

# 5. Lima pengajuan demo ada
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"anl","password":"Demo1234!"}' | jq -r .token)
curl -s http://localhost:8080/api/pengajuan -H "authorization: Bearer $TOKEN" | jq length
#    -> 5

# 6. AC-02: otorisasi ditegakkan di server
TOKEN_AO=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"ao","password":"Demo1234!"}' | jq -r .token)
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/api/audit \
  -H "authorization: Bearer $TOKEN_AO"
#    -> 403   (endpoint itu hanya untuk ADM)

# 7. AC-13: tidak ada route tulis untuk audit
curl -s http://localhost:8080/api/_routes | jq '[.route[] | select(.url | contains("audit"))] | map(.method) | unique'
#    -> ["GET"]

# 8. Seed idempoten
docker compose run --rm migrate
#    -> "Data demo sudah ada, dilewati: 5", tanpa error

# 9. Jalur error SLIK bisa dipaksa
curl -s -X POST http://localhost:9090/slik/_control/mode \
  -H 'content-type: application/json' -d '{"mode":"503"}'
#    -> {"mode":"503"}   JANGAN LUPA kembalikan ke {"mode":"ok"} setelah demo
```

Kalau kesembilan lulus, repo ini benar-benar jalan — bukan sekadar tidak menampilkan error.

---

## 8. Kalau ada yang salah

Gejala di bawah adalah yang **benar-benar kami temui**, bukan daftar teoretis.

| Gejala | Sebab | Perbaikan |
|---|---|---|
| `Variabel lingkungan wajib belum diisi: JWT_SECRET, DATABASE_URL` | `.env` tidak ada atau kosong. Backend sengaja gagal cepat daripada hidup tanpa konfigurasi | `cp .env.example .env` |
| `Can't reach database server at db:5432` | `COMPOSE_PROFILES` kosong (container `db` dilewati) tetapi `DATABASE_URL` masih menunjuk `db:5432` | Samakan keduanya: `lokal` + `db:5432`, atau kosong + URL Aiven |
| Koneksi ke Aiven tidak pernah tersambung, tetapi DNS resolve | Ejaan host `imittra-` (dua `t`) | Betulkan menjadi `imitra-tim2-imitratim2...` |
| `too many connections` muncul acak — sering **di laptop orang lain** | Ada yang lupa `connection_limit=2`. Satu proses bisa memakan 17 dari 20 koneksi | Perbaiki URL-nya, lalu lihat §8.1 di bawah |
| `npm ci` gagal: `package.json and package-lock.json are not in sync` | `package.json` berubah tanpa lockfile ikut diperbarui | `npm install` lalu **commit lockfile-nya** |
| `prisma migrate dev` meminta reset database | Riwayat migrasi menyimpang, atau Anda menjalankannya di schema bersama | Pakai `migrate deploy`. Hanya Tech Lead yang memakai `migrate dev` |
| `DELETE` pada `pengajuan` gagal dengan `audit_trail bersifat append-only` | Trigger AC-13 bekerja sebagaimana mestinya | Bersihkan dengan `npm run reset`, bukan menghapus baris |
| `failed to connect to the docker API at npipe:...` | Docker Desktop terpasang tetapi belum berjalan | Jalankan Docker Desktop, tunggu ikonnya hijau |
| `bind: address already in use` | Port sudah dipakai proses lain | Ubah port di `.env`, atau matikan proses yang memakainya |
| Frontend tampil tetapi semua data gagal dimuat (`Failed to fetch`) | `VITE_API_BASE_URL` menunjuk nama service docker | Harus `http://localhost:8080` — yang memanggil adalah **browser di host**, bukan container. Nilainya build arg, jadi perlu `--build` setelah diubah |
| Container `backend` restart terus | Service `migrate` keluar dengan kode bukan-nol | `docker compose logs migrate` — biasanya database tidak terjangkau atau migrasi gagal |
| Proses backend berhenti saat start dengan `Route berikut belum mendeklarasikan config.peran` | Ada route baru tanpa deklarasi peran. Ini fail-closed dan disengaja | Tambahkan `config: { peran: [...] }` pada route itu |
| `prisma/migrations` kosong | Clone lama sebelum migrasi awal di-commit | `git pull` |
| Peringatan `LF will be replaced by CRLF` saat `git add` | Normal di Windows | Abaikan |

### 8.1 Kalau koneksi Aiven habis

```bash
cd backend
# Lihat siapa yang memakai
npx prisma db execute --stdin --schema prisma/schema.prisma <<< "select usename, application_name, state, count(*) from pg_stat_activity group by 1,2,3 order by 4 desc;"

# Putuskan koneksi MENGANGGUR MILIK ANDA SENDIRI.
# Jangan memutus milik orang lain tanpa memberi tahu — mereka sedang bekerja.
npx prisma db execute --stdin --schema prisma/schema.prisma <<< "select pg_terminate_backend(pid) from pg_stat_activity where state='idle' and application_name='prisma';"
```

Pencegahan yang lebih baik daripada penyembuhan: matikan `npm run dev` kalau sedang tidak
dipakai, dan tutup Prisma Studio setelah selesai.

---

## 9. Alur kerja harian

```bash
# Pagi — ambil pekerjaan orang lain
git checkout main && git pull
git checkout <branch-anda> && git rebase origin/main
cd backend && npm ci && npx prisma generate && npx prisma migrate deploy

# Sebelum membuka PR — jalankan yang sama dengan CI
cd backend && npm run ci
cd ../mock-slik && npm run ci
cd ../frontend && npm run lint && npm run build
```

**Sinkron dengan `main` minimal dua kali sehari** — setelah istirahat siang dan sebelum
tutup hari. Rebase yang ditunda dua hari selalu lebih mahal daripada dua rebase kecil.

**Satu issue = satu branch fitur = satu PR** (brief §8.2). Branch bernama orang adalah
ruang kerja pribadi, bukan jalur merge. Rinciannya di
[`PEMBAGIAN-TIM.md`](PEMBAGIAN-TIM.md) bagian 4.

---

## 10. Dokumen terkait

| Dokumen | Isi |
|---|---|
| [`DATABASE.md`](DATABASE.md) | Schema per orang, anggaran koneksi, alur migrasi, prosedur kalau kredensial bocor |
| [`DEMO-SCRIPT.md`](DEMO-SCRIPT.md) | Data siap-demo, skrip AC-01…AC-15, lima jalur error |
| [`SDD-iMitra.md`](SDD-iMitra.md) | Arsitektur, model data, daftar endpoint, topologi compose |
| [`PEMBAGIAN-TIM.md`](PEMBAGIAN-TIM.md) | Kepemilikan modul, batas berkas per orang, aturan branch |
| [`../AGENTS.md`](../AGENTS.md) | Aturan repo untuk AI agent, termasuk perintah test & lint |
| [`../README.md`](../README.md) | Ringkasan untuk penilai — baca ini lebih dulu |
