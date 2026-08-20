# DEMO-SCRIPT — Skrip Demo iMitra

**Tim**: `<!-- ISI: nama tim -->`
**Pemilik berkas**: QA / Verification — Reffa
**Jadwal demo**: Jumat 21 Agustus, 15 menit demo + 10 menit tanya jawab

---

## Cara berkas ini dipakai penilai

Instruktur **menjalankan skrip ini**, bukan mendengarkan presentasi. Ia akan meminta AC
secara acak — termasuk **jalur error**: SLIK 503, dokumen ditolak, maker mencoba menjadi
approver (brief §12). Demo yang hanya menunjukkan jalur bahagia kehilangan nilai pada dua
aspek sekaligus.

Konsekuensi praktisnya:

- **Data sudah disiapkan lewat seed.** Lima pengajuan siap-demo dibuat otomatis saat
  `docker compose up`; tidak ada yang perlu diklik saat demo.
- **Setiap baris harus pernah dilatih minimal sekali** oleh orang yang akan mendemokannya.
  Kolom "Status latihan" bukan hiasan.
- Instruktur juga akan **menunjuk satu baris kode secara acak** dan meminta orang yang
  commit menjelaskannya. Siapkan orangnya, bukan hanya layarnya.

---

## 0. Data yang sudah tersedia setelah seed

Lima pengajuan di bawah dibuat `prisma/seed-demo.ts`. **Skornya dihitung dengan fungsi
domain yang sama dengan yang dipakai aplikasi**, jadi angkanya identik dengan yang akan
muncul kalau ANL menekan tombol Skoring sendiri.

Bagian tanggal mengikuti hari seed dijalankan. Kalau seed dijalankan ulang pada hari demo,
nomornya menjadi `IMT-20260821-900x`.

| Nomor referensi | Status | Skor | Grade | Total plafon | Jalur approval | Untuk |
|---|---|---|---|---|---|---|
| `IMT-…-9001` | `APPROVED` | 96 | 1 | Rp 30.000.000 | KCP | **AC-12** |
| `IMT-…-9002` | `SKORED` | 100 | 1 | Rp 40.000.000 | KCP | **AC-09** |
| `IMT-…-9003` | `MENUNGGU_APPROVAL_L1` | 57 | 3 | Rp 120.000.000 | KCP → KC | **AC-10** |
| `IMT-…-9004` | `MENUNGGU_APPROVAL_L1` | 46 | 4 | Rp 240.000.000 (4 anggota) | KCP → KC → KOM | **AC-14** |
| `IMT-…-9005` | `SKORED` | 85 | **sistem 1 → final 3** | Rp 20.000.000 | KCP | **AC-06** |

`9005` adalah yang paling penting untuk dijelaskan: skornya 85, yang jatuh di rentang
**grade 1**, tetapi kolektibilitasnya 2 sehingga Tabel 4.2 menurunkannya ke **grade 3**.
Tanpa kasus seperti ini, AC-06 hanya bisa "ditunjukkan" pada pengajuan yang grade mentahnya
memang sudah 3 — dan itu tidak membuktikan apa pun.

**NIK yang masih bebas** untuk membuat pengajuan baru saat demo (asumsi A-6: satu NIK hanya
boleh punya satu pengajuan aktif):

| NIK | Nama | Kolektibilitas | Berguna untuk |
|---|---|---|---|
| `3404031292000004` | Endang Sulastri | **4** | AC-01 → AC-05 (penolakan otomatis) |
| `3404270995000006` | Ratna Dewi | **3** | cadangan penolakan otomatis |
| `3404121189000008` | Nur Hidayah | **5** | cadangan penolakan otomatis |

---

## 1. Persiapan sebelum demo (checklist)

**H-1 (Jumat 13.15–15.00, sesi hardening):**

- [ ] `docker compose up` diuji dari **clone bersih di direktori baru** (bukan direktori kerja)
- [ ] Uji itu dijalankan orang **selain** yang menulis `docker-compose.yml`
- [ ] Seed dijalankan dua kali berurutan tanpa error (idempoten) — kedua kali menampilkan
      `Data demo sudah ada, dilewati: 5`
- [ ] Seluruh 12 baris `fixtures/nasabah-uji.csv` sudah termuat di mock SLIK
      (`GET http://localhost:9090/health` menampilkan `nasabahDimuat: 10`; dua baris sisanya
      memang pemicu 404 dan 503)
- [ ] Ketujuh akun demo bisa login
- [ ] Kelima pengajuan `9001`–`9005` muncul di dashboard
- [ ] CI hijau di commit terakhir sebelum tag `v1.0.0` (CI merah di tag = −5)
- [ ] Tag `v1.0.0` dibuat pukul 15.00 dan di-push
- [ ] Seluruh baris tabel AC di bawah punya kolom "Status latihan" terisi

**15 menit sebelum demo:**

- [ ] Database direset ke kondisi seed: `docker compose down -v && docker compose up --build`
- [ ] Semua service `healthy` (`docker compose ps`)
- [ ] Tab browser disiapkan: satu per peran, sudah login (hindari mengetik password saat demo)
- [ ] Terminal siap dengan perintah curl untuk AC-02 dan AC-13 — **sudah diketik, tinggal Enter**
- [ ] `fixtures/nasabah-uji.csv` terbuka di satu tab supaya NIK bisa dibaca cepat
- [ ] Pembagian siapa mendemokan bagian mana sudah disepakati
- [ ] Jam dipasang: 15 menit habis lebih cepat daripada dugaan

**Urutan demo yang disarankan.** Ikuti satu pengajuan dari `DRAFT` sampai ditolak SLIK,
lalu pindah ke data yang sudah disiapkan. Ini menghindari lompat-lompat antar layar:

`AC-01 → AC-02 → AC-03 → AC-04 → AC-05` (satu pengajuan baru, dibuat langsung)
→ `AC-06 → AC-07 → AC-08 → AC-09` (data 9005 dan 9002)
→ `AC-10 → AC-11 → AC-14` (data 9003, 9004)
→ `AC-12 → AC-13` (data 9001)
→ `AC-15` (layar ADM)
→ jalur error `E-1` s.d. `E-5`

---

## 2. Skrip AC-01 s.d. AC-15

### AC P0

| AC | Kriteria (dari brief) | Langkah | Akun | Data uji | Hasil yang diharapkan | Status latihan |
|---|---|---|---|---|---|---|
| **AC-01** | AO login, membuat pengajuan Rp 30.000.000 murabahah, mendapat nomor referensi format `IMT-YYYYMMDD-NNNN` | Login → **Pengajuan Baru** → isi nasabah → akad Murabahah, plafon 30.000.000, tenor 24 → **Kirim** | `ao` | NIK `3404031292000004` (Endang Sulastri), Rp 30.000.000, murabahah, 24 bulan | Nomor referensi baru muncul, formatnya `IMT-<hari ini>-0001`. Status `SUBMITTED` | |
| **AC-02** | AO **tidak dapat** mengakses layar verifikasi dokumen — dan panggilan API langsung mengembalikan 403, bukan 200 | Tunjukkan menu Verifikasi tidak ada bagi AO, **lalu tembak API langsung dari terminal** dengan token AO | `ao` | lihat perintah curl di bawah tabel | **HTTP 403** dengan body `{"error":"AKSES_DITOLAK", ...}`. Tegaskan: bukan 404, bukan 200 | |
| **AC-03** | ANL menolak dokumen KTP dengan kode alasan; AO mengunggah ulang **hanya** KTP; data pengajuan lain tidak hilang | ANL buka pengajuan AC-01 → tab Dokumen → KTP → **Tolak** → kode alasan `BURAM` → simpan. Login AO → hanya KTP yang punya tombol Unggah Ulang | `anl` lalu `ao` | pengajuan dari AC-01 | KTP berstatus Ditolak dengan alasan Buram. KK dan SKU **tidak** punya tombol unggah. Setelah AO unggah ulang KTP, plafon/tenor/nasabah tetap utuh | |
| **AC-04** | Pengajuan **tanpa** survei valid ditolak saat mencoba masuk skoring, dengan pesan yang menyebut BR-03 | ANL buka pengajuan AC-01 → tab Skoring → **Jalankan Skoring** (survei belum ada) | `anl` | pengajuan dari AC-01 | **HTTP 422**, banner merah + badge `BR-03`, dan daftar prasyarat yang kurang: "minimal satu survei berstatus VALID" | |
| **AC-05** | Nasabah dengan SLIK kolektibilitas 4 otomatis berstatus `REJECTED_SLIK` tanpa melalui approval | AO rekam survei → ANL nilai VALID → ANL tab SLIK → **Jalankan SLIK Check** | `ao` lalu `anl` | NIK `3404031292000004` (kolektibilitas 4) | Kartu merah "Kolektibilitas 4 — Diragukan", status pengajuan langsung `REJECTED_SLIK`. **Tidak ada tombol lanjut**, tidak pernah masuk antrian approval | |
| **AC-06** | Nasabah dengan SLIK kolektibilitas 2 dapat lanjut, tetapi grade risikonya tidak pernah lebih baik dari 3 | Buka `IMT-…-9005` → tab Skoring | `anl` | `IMT-…-9005` (Agus Setiawan, kol-2) | **Skor 85** (rentang grade 1) tetapi **Grade Sistem 1 → Grade Final 3**. Tunjukkan keduanya berdampingan, dan catatan analis yang wajib terisi | |
| **AC-07** | Skoring menampilkan rincian keempat komponen beserta bobot dan skor komponennya | Pada layar yang sama, tunjukkan tabel Rincian Komponen Skor | `anl` | `IMT-…-9005` | Empat baris: Kapasitas bayar (35), Riwayat SLIK (25), Lama usaha (20), Hasil survei (20), lengkap dengan nilai mentah, skor komponen 3 desimal, dan kontribusi. Plus baris aritmetika akhir | |
| **AC-08** | ANL override grade dari 2 ke 3; sistem menolak jika alasan kosong; setelah diisi, override tercatat di audit trail dengan identitas ANL | Buka `IMT-…-9002` → Skoring → **Override** → kosongkan alasan → Simpan; lalu isi alasan → Simpan; buka tab Audit | `anl` | `IMT-…-9002` (grade 1) | Alasan kosong → ditolak 400. Setelah diisi ≥10 karakter → tersimpan, dan baris `OVERRIDE_GRADE` muncul di audit dengan nama Dewi Rahmawati (ANL) | |
| **AC-09** | Margin 10,0 % untuk grade 1 (di bawah batas 11,0 %) **diblokir** sistem | Buka `IMT-…-9002` → tab Margin → isi `10,0` → Simpan | `anl` | `IMT-…-9002` (grade 1, rentang 11,00–13,00 %) | **HTTP 422**, banner merah + badge `BR-06`: "Margin 10,00% di bawah batas bawah grade 1 (11,00%)". Tombol Simpan nonaktif. **Tidak ada jalur lanjutkan-saja di layar itu** | |
| **AC-10** | Pengajuan Rp 30.000.000 hanya butuh approval KCP; Rp 120.000.000 butuh KCP lalu KC; KC tidak bisa memutuskan sebelum KCP | Login KC → Antrian Approval → buka `IMT-…-9003` → coba Setujui. Lalu login KCP → Setujui → kembali ke KC | `kc` lalu `kcp` | `IMT-…-9003` (Rp 120.000.000) | KC awalnya diblokir: **422** + badge `BR-02` "Menunggu keputusan KCP terlebih dahulu". Chip jalur menampilkan `KCP → KC`. Setelah KCP menyetujui, KC bisa memutuskan | |
| **AC-11** | Pengguna yang membuat pengajuan tidak bisa menyetujuinya sendiri, meski perannya memungkinkan | Login `kcp2` → buat pengajuan → ajukan sampai approval → coba setujui sendiri, lewat UI **dan** lewat API langsung | `kcp2` | akun `kcp2` berperan KCP tetapi juga pembuat | **HTTP 403** dengan pesan menyebut `BR-09`. Tegaskan bahwa pemeriksaannya di server, bukan tombol yang disembunyikan | |
| **AC-12** | Audit trail menampilkan riwayat lengkap satu pengajuan dari `DRAFT` sampai `APPROVED`, urut waktu, dengan aktor di setiap baris | Buka `IMT-…-9001` → tab Audit | siapa pun yang berhak | `IMT-…-9001` | **9 baris**, urut waktu, dari `— → DRAFT` sampai `MENUNGGU_APPROVAL_L1 → APPROVED`. Aktor berganti AO → ANL → KCP dan terlihat di setiap baris | |
| **AC-13** | Tidak ada endpoint yang bisa mengubah atau menghapus baris audit trail (tunjukkan dari daftar route, bukan dari kata-kata) | Jalankan `curl` ke `/api/_routes` dan saring baris audit | — | lihat perintah curl di bawah tabel | Hanya `GET`. Tidak ada `POST`/`PUT`/`PATCH`/`DELETE` untuk audit. **Bonus**: tunjukkan trigger database menolak `UPDATE` langsung | |

### AC P1

| AC | Kriteria (dari brief) | Langkah | Akun | Data uji | Hasil yang diharapkan | Status latihan |
|---|---|---|---|---|---|---|
| **AC-14** | *(P1)* Pengajuan kelompok 4 anggota, total Rp 240.000.000, membutuhkan 3 level. Setelah satu anggota Rp 60.000.000 ditolak, total jadi Rp 180.000.000 dan level yang diperlukan turun menjadi 2 | Buka `IMT-…-9004` → tunjukkan total dan jalur `KCP → KC → KOM` → ANL tolak satu anggota → muat ulang halaman | `anl` | `IMT-…-9004` (4 × Rp 60.000.000) | Sebelum: Rp 240.000.000, **3 level**. Sesudah: Rp 180.000.000, **2 level** (`KCP → KC`). Anggota ditolak tercoret dan plafonnya tidak lagi dihitung | |
| **AC-15** | *(P1)* ADM mengubah bobot komponen "Lama usaha" dari 20 ke 25; skoring berikutnya memakai bobot baru **tanpa** restart aplikasi | Login ADM → Parameter → ubah bobot Lama usaha 20 → 25 → Simpan. **Tanpa menyentuh terminal**, login ANL → jalankan skoring pada pengajuan lain | `adm` lalu `anl` | parameter `LAMA_USAHA` | Skor berubah, dan rincian komponen menampilkan bobot **25**. **Tidak ada restart** — tegaskan ini, karena AC-15 gagal kalau layanan di-restart walaupun hasilnya berubah | |

**Perintah yang harus sudah diketik di terminal sebelum demo:**

```bash
# Ambil token AO sekali, simpan ke variabel
TOKEN_AO=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"ao","password":"Demo1234!"}' | jq -r .token)

# AC-02 — AO menembak endpoint verifikasi dokumen. HARUS 403.
curl -i -X POST http://localhost:8080/api/dokumen/<id-dokumen>/verifikasi \
  -H "authorization: Bearer $TOKEN_AO" \
  -H 'content-type: application/json' \
  -d '{"keputusan":"VERIFIED"}'

# AC-13 — daftar route, disaring ke sumber daya audit. Hanya GET yang muncul.
curl -s http://localhost:8080/api/_routes | jq '.route[] | select(.url | contains("audit"))'

# AC-13 bonus — trigger database menolak UPDATE, bukan sekadar tidak ada route.
docker compose exec db psql -U imitra_app -d imitra \
  -c "update audit_trail set aksi='DIUBAH' where id=(select min(id) from audit_trail);"
# -> ERROR: audit_trail bersifat append-only (AC-13)
```

---

## 3. Jalur Error yang Wajib Disiapkan

> Brief §13 butir 8: "Penilai akan mencabut mock SLIK Anda. Itu pasti terjadi."

| # | Jalur error | Cara memicu | Hasil yang diharapkan | Yang TIDAK boleh terjadi | Status latihan |
|---|---|---|---|---|---|
| **E-1** | **SLIK 503** (layanan tidak tersedia) | NIK `3404000000000503`, **atau** paksa seluruh respons: `curl -X POST http://localhost:9090/slik/_control/mode -H 'content-type: application/json' -d '{"mode":"503"}'` | Kartu merah "Layanan SLIK tidak tersedia", status pengajuan `SLIK_GAGAL`, kolektibilitas ditampilkan sebagai **tanda hubung**, tombol "Coba lagi" tersedia. Baris `hasil_slik` tercatat dengan `status_panggilan = UNAVAILABLE` | Aplikasi crash; pengajuan lanjut seolah SLIK bersih; kolektibilitas terisi nilai default | |
| **E-2** | **SLIK 404** (NIK tidak ditemukan) | Buat pengajuan dengan NIK `3404999999999999` lalu jalankan SLIK check | Pesan "NIK tidak ditemukan di SLIK" **tanpa mencantumkan NIK-nya** (BR-11), status `SLIK_GAGAL`, skoring tetap terkunci | Dianggap kol-1; error 500 generik; NIK muncul di pesan error | |
| **E-3** | **Dokumen ditolak lalu di-upload ulang** | Sama dengan AC-03 | Hanya dokumen itu yang punya tombol unggah ulang; kode alasan tersimpan; data pengajuan lain utuh; versi lama tetap ada di riwayat | AO harus mengisi ulang seluruh pengajuan; penolakan tanpa kode alasan | |
| **E-4** | **Maker mencoba menjadi approver** | Sama dengan AC-11, lewat UI **dan** lewat API langsung | Ditolak di server, **403**, pesan menyebut `BR-09` | Hanya tombolnya disembunyikan tetapi API tetap 200 (ini juga memicu −8 pada AC-02) | |
| **E-5** | **Margin di luar rentang grade** | `IMT-…-9002`, margin `10,0` (batas bawah 11,0). Uji juga batas atas `13,1` | Diblokir dengan badge `BR-06`; tombol Simpan nonaktif; tidak ada jalur lanjut | Hanya peringatan lalu tetap tersimpan; pengajuan lanjut ke approval | |

**Setelah E-1, jangan lupa kembalikan mock ke normal:**

```bash
curl -X POST http://localhost:9090/slik/_control/mode \
  -H 'content-type: application/json' -d '{"mode":"ok"}'
```

**Jalur error tambahan yang layak disiapkan** (bukan wajib, tetapi sering ditanya):

- [ ] Timeout SLIK — `{"mode":"timeout"}`; mock sengaja tidak pernah membalas, dan klien
      backend yang memutus sendiri setelah 3 detik lewat `AbortController`
- [ ] Plafon Rp 4.000.000 dan Rp 600.000.000 ditolak saat submit dengan pesan yang menyebut
      **kedua** batas (BR-01)
- [ ] Grade 5 diajukan ke approval → `REJECTED_SCORING` (BR-05)
- [ ] Override grade dengan alasan kosong ditolak (AC-08)
- [ ] Approver level 2 mencoba memutuskan sebelum level 1 (BR-02, sama dengan AC-10)

---

## 4. Pembagian Peran Saat Demo

Satu orang berbicara sambil mengetik akan kehabisan waktu. Pisahkan keduanya.

| Bagian | Yang mendemokan | Yang mengoperasikan | Catatan |
|---|---|---|---|
| Pembukaan + arsitektur (maks 2 menit) | Firman | Reffa | Tunjukkan diagram SDD BAB 2.1, jangan membacakannya |
| AC-01 s.d. AC-05 | Ray | Reffa | Satu pengajuan dari nol sampai `REJECTED_SLIK` |
| AC-06 s.d. AC-09 | Eka | Alfian | Layar skoring dan margin — bagian dengan angka paling banyak |
| AC-10, AC-11, AC-14 | Dani | Eka | Antrian approval dan kelompok |
| AC-12, AC-13 | Firman | Reffa | Audit trail + terminal untuk `/api/_routes` |
| AC-15 | Eka | Alfian | Tegaskan "tanpa restart" |
| Jalur error E-1 s.d. E-5 | Alfian | Ray | Alfian pemilik mock SLIK, paling siap kalau ditanya |
| Tanya jawab | semua, sesuai kepemilikan modul | — | Yang ditanya menjawab, bukan Tech Lead yang menjawab semuanya |

**Yang menjawab kalau penilai menunjuk baris kode acak**: orang yang commit baris itu.
Pemetaan modul → orang ada di [`docs/PEMBAGIAN-TIM.md`](PEMBAGIAN-TIM.md) bagian 1.

---

## 5. Yang Akan Kami Katakan Kalau Sesuatu Gagal

Gagal saat demo tidak fatal. Yang fatal adalah panik dan mencoba memperbaikinya di depan
penilai selama tiga menit.

| Situasi | Tindakan | Yang memutuskan |
|---|---|---|
| Satu AC gagal saat demo | Sebutkan bahwa ini diketahui, rujuk `README.md` bagian 5, **lanjut ke AC berikutnya**. Jangan mendebug di depan penilai | Firman |
| Layanan mati di tengah demo | Reffa menjalankan `docker compose restart <service>` di terminal kedua sementara yang lain melanjutkan ke AC yang tidak terpengaruh | Reffa |
| Waktu 15 menit hampir habis | Lewati dengan urutan ini: AC-15 → AC-14 → AC-07. **Jangan pernah melewati jalur error** — bobotnya lebih besar daripada AC P1 | Firman |
| Penilai meminta AC yang datanya belum siap | Katakan terus terang bahwa datanya belum disiapkan, dan tunjukkan test otomatis yang menutup AC itu | orang yang memegang AC tersebut |

---

## Riwayat latihan

<!-- ISI: satu baris per sesi latihan penuh. Latihan yang tidak dicatat cenderung tidak
     pernah benar-benar dilakukan. -->

| Tanggal & jam | Yang berlatih | AC yang dilalui | Yang gagal | Issue |
|---|---|---|---|---|
| `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |
