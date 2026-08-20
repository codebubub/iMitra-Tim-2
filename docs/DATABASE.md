# DATABASE — PostgreSQL Bersama Tim (Aiven)

**Pemilik**: Tech Lead — Firman
**Berlaku sejak**: 2026-08-20

---

## 1. Dua mode, dan kenapa keduanya ada

| Mode | Dipakai siapa | Database | Perintah |
|---|---|---|---|
| **Bersama** | Enam anggota tim, selama pengembangan | Aiven PostgreSQL 16 | `docker compose up` dengan `COMPOSE_PROFILES=` kosong |
| **Lokal** | **Penilai**, dan siapa pun dari clone bersih | Container `postgres:16-alpine` | `docker compose up` dengan `COMPOSE_PROFILES=lokal` (bawaan `.env.example`) |

**Kenapa mode lokal harus tetap ada dan harus menjadi bawaan.** Penilai menjalankan repo ini
di mesin bersih dengan `.env` hasil salinan `.env.example`. Berkas itu tidak memuat password
Aiven — dan tidak boleh memuatnya, karena secret ter-commit dikenai −10 (brief §7.2 butir 7).
Kalau satu-satunya jalan menjalankan aplikasi adalah Aiven, penilai tidak bisa menjalankannya
sama sekali, dan itu **kriteria diskualifikasi** (brief §7.3), bukan pengurangan nilai.

Karena itu `.env.example` mengarah ke database lokal, dan `.env` masing-masing anggota
mengarah ke Aiven. Satu perintah untuk keduanya; yang membedakan hanya isi `.env`.

---

## 2. Detail koneksi

| | |
|---|---|
| Host | `imitra-tim2-imitratim2.l.aivencloud.com` |
| Port | `13096` |
| Database | `defaultdb` |
| User | `avnadmin` |
| Password | **Tidak ditulis di repo.** Minta ke Tech Lead lewat kanal privat |
| SSL | `require` — Aiven menolak koneksi tanpa TLS |
| Batas koneksi | **20 total**, untuk enam orang + demo |

> Ejaan host: `imi**t**ra-tim2-...`, satu huruf `t` pada suku kata pertama. Ejaan
> `imittra-` (dua `t`) resolve di DNS tetapi tidak menerima koneksi — kesalahan ini sudah
> pernah terjadi sekali dan memakan waktu.

Uji cepat bahwa host Anda benar sebelum menyalahkan hal lain:

```bash
# Harus menampilkan versi PostgreSQL
docker run --rm -e PGPASSWORD='<password>' postgres:16-alpine \
  psql "postgresql://avnadmin@imitra-tim2-imitratim2.l.aivencloud.com:13096/defaultdb?sslmode=require" \
  -tAc "select version();"
```

---

## 3. Satu schema per orang — ini yang paling penting

Kami memakai **satu database** (`defaultdb`) dengan **schema PostgreSQL berbeda per orang**.
Bukan satu schema bersama.

| Anggota | Schema kerja | Schema test |
|---|---|---|
| Firman | `dev_firman` | `test_firman` |
| Alfian | `dev_alfian` | `test_alfian` |
| Dani | `dev_dani` | `test_dani` |
| Reffa | `dev_reffa` | `test_reffa` |
| Ray | `dev_ray` | `test_ray` |
| Eka | `dev_eka` | `test_eka` |
| **Bersama, untuk demo** | `demo` | — |

**Kenapa tidak satu schema bersama.** `prisma migrate dev` menghapus dan membangun ulang
schema ketika riwayat migrasi menyimpang — dan riwayat menyimpang setiap kali dua orang
membuat migrasi pada saat yang sama. Dengan schema bersama, satu perintah dari satu orang
menghapus data kerja lima orang lain, di tengah hari kedua. Dengan schema terpisah,
kerusakannya berhenti di orang itu sendiri.

**Schema `demo` hanya disentuh Tech Lead**, dan hanya dengan `prisma migrate deploy`
(bukan `migrate dev`). Di situlah data siap-demo untuk AC-09, AC-10, AC-12, dan AC-14
disimpan.

Bentuk `DATABASE_URL` di `.env` Anda:

```
postgresql://avnadmin:<password>@imitra-tim2-imitratim2.l.aivencloud.com:13096/defaultdb?sslmode=require&schema=dev_<nama>&connection_limit=2
```

Prisma membuat schema-nya sendiri saat migrasi pertama; Anda tidak perlu membuatnya manual.

---

## 4. Anggaran koneksi — 20 untuk semua

`connection_limit=2` pada URL bukan saran, melainkan pembagian kuota:

| Pemakai | Koneksi |
|---|---|
| 6 anggota × 2 | 12 |
| Container backend saat demo | 2 |
| Container migrate (sesaat) | 2 |
| Cadangan untuk psql / Prisma Studio / DBeaver | 4 |
| **Total** | **20** |

Prisma membuka pool sendiri **per proses**. Tanpa `connection_limit`, bawaannya
`num_cpus × 2 + 1` — di laptop 8 core itu 17 koneksi untuk **satu orang**. Dua orang
menjalankan `npm run dev` tanpa batas itu akan menghabiskan kuota, dan gejalanya bukan
pesan yang jelas: yang muncul adalah `too many connections` **di laptop orang lain**, acak,
dan sulit dilacak ke penyebabnya.

Kalau muncul `too many connections`:

```bash
# Lihat siapa yang memakai
psql "$DATABASE_URL" -c \
  "select usename, application_name, state, count(*) from pg_stat_activity group by 1,2,3 order by 4 desc;"

# Putuskan koneksi menganggur milik Anda sendiri (JANGAN milik orang lain tanpa memberi tahu)
psql "$DATABASE_URL" -c \
  "select pg_terminate_backend(pid) from pg_stat_activity where state='idle' and application_name='prisma';"
```

---

## 5. Alur migrasi

**Hanya Firman yang membuat migrasi baru.** Yang lain menjalankannya.

```bash
# Tech Lead — membuat migrasi baru dari perubahan schema.prisma
cd backend && npx prisma migrate dev --name <slug_singkat>
git add prisma/migrations && git commit -m "feat(db): <apa yang berubah>"

# Semua anggota — menerapkan migrasi yang sudah ada ke schema masing-masing
cd backend && npx prisma migrate deploy

# Tech Lead — menerapkan ke schema demo (URL demo dilewatkan eksplisit)
DATABASE_URL="postgresql://avnadmin:<password>@imitra-tim2-imitratim2.l.aivencloud.com:13096/defaultdb?sslmode=require&schema=demo&connection_limit=2" \
  npx prisma migrate deploy && npm run seed
```

Migrasi yang sudah di-merge ke `main` **tidak boleh diubah atau dihapus** (`AGENTS.md`
bagian 6 butir 2). Perubahan skema selalu berupa migrasi baru.

---

## 6. CI sengaja TIDAK memakai Aiven

`.github/workflows/ci.yml` menjalankan PostgreSQL sebagai service container, bukan
menyambung ke Aiven. Itu keputusan sadar, bukan kelalaian:

- CI menjalankan `migrate deploy` lalu `seed` **dua kali** (membuktikan idempoten, NFR-09).
  Mengarahkannya ke schema bersama berarti setiap push menulis ulang data tim.
- Setiap job CI akan memakan jatah dari 20 koneksi, dan beberapa PR paralel bisa
  menghabiskannya tepat saat seseorang sedang koding.
- Kredensial Aiven harus masuk GitHub Secrets, dan secret yang tidak perlu ada lebih baik
  tidak ada.

Database ephemeral di CI juga menguji hal yang lebih penting: bahwa migrasi kami bisa
membangun skema **dari nol**, bukan hanya menambal database yang sudah ada.

---

## 7. Kalau kredensial bocor

Anggap sudah bocor kalau ia pernah muncul di: pesan chat, komentar issue, screenshot, layar
yang dibagikan, atau commit mana pun.

1. Aiven Console → Service → **Users** → `avnadmin` → **Reset password**
2. Sebarkan password baru lewat kanal privat
3. Setiap anggota memperbarui `DATABASE_URL` di `.env` masing-masing
4. Kalau ia pernah **ter-commit**, menghapus barisnya tidak cukup — riwayat git tetap
   memuatnya, dan penilai memeriksa riwayat. Putar passwordnya, lalu laporkan ke instruktur
   sebelum mereka menemukannya sendiri.

Job `higiene` di CI memindai pola `AVNS_*` dan URL PostgreSQL berisi password pada setiap
push, dan menggagalkan build kalau menemukannya.
