# DEMO-SCRIPT — Skrip Demo iMitra

**Tim**: `<!-- ISI: nama tim -->`
**Pemilik berkas**: QA / Verification — `<!-- ISI: nama -->`
**Jadwal demo**: Jumat 21 Agustus, 15 menit demo + 10 menit tanya jawab

---

## Cara berkas ini dipakai penilai

Instruktur **menjalankan skrip ini**, bukan mendengarkan presentasi. Ia akan meminta AC
secara acak — termasuk **jalur error**: SLIK 503, dokumen ditolak, maker mencoba menjadi
approver (brief §12). Demo yang hanya menunjukkan jalur bahagia kehilangan nilai pada dua
aspek sekaligus: "Demo & komunikasi" dan "Testing & verifikasi".

Konsekuensi praktis:

- **Data disiapkan lebih dulu.** Tidak ada waktu membuat data saat demo. Semua NIK berasal
  dari `fixtures/nasabah-uji.csv` — penilai memakai NIK dari daftar itu.
- **Setiap baris harus pernah dilatih minimal sekali** oleh orang yang akan mendemokannya.
  Kolom "Status latihan" bukan hiasan.
- **Urutan skrip harus bisa dijalankan dari database yang baru di-seed.** Kalau AC-12
  memerlukan pengajuan yang sudah `APPROVED`, siapkan datanya lewat seed, bukan lewat
  klik manual selama demo.
- Instruktur juga akan **menunjuk satu baris kode secara acak** dan meminta orang yang
  commit menjelaskannya. Itu bukan bagian dari skrip ini, tetapi siapkan orangnya.

---

## 1. Persiapan sebelum demo (checklist)

<!-- ISI: centang saat sudah benar-benar dilakukan, bukan saat direncanakan. -->

**H-1 (Jumat 13.15–15.00, sesi hardening):**

- [ ] `docker compose up` diuji dari **clone bersih di direktori baru** (bukan direktori kerja)
- [ ] Seed dijalankan dua kali berurutan tanpa error (idempoten)
- [ ] Seluruh 12 baris `fixtures/nasabah-uji.csv` sudah termuat di mock SLIK
- [ ] Semua akun demo (AO, ANL, KCP, KC, KOM, ADM) bisa login
- [ ] Ada minimal satu pengajuan berstatus `APPROVED` lengkap untuk AC-12
- [ ] Ada satu pengajuan kelompok 4 anggota total Rp 240.000.000 untuk AC-14
- [ ] CI hijau di commit terakhir sebelum tag `v1.0.0` (CI merah di tag = −5)
- [ ] Tag `v1.0.0` dibuat pukul 15.00 dan di-push
- [ ] Seluruh 15 baris tabel AC di bawah punya kolom "Status latihan" terisi

**15 menit sebelum demo:**

- [ ] Database direset ke kondisi seed (perintah reset diketahui semua yang mendemokan)
- [ ] Semua layanan hidup: frontend, backend, mock SLIK, database
- [ ] Tab browser disiapkan: satu per peran, sudah login (hindari mengetik password saat demo)
- [ ] Alat untuk memanggil API langsung siap (untuk AC-02 dan AC-13) — terminal atau
      Postman, sudah berisi request-nya, tidak perlu mengetik saat demo
- [ ] Pembagian siapa mendemokan bagian mana sudah disepakati
- [ ] `fixtures/nasabah-uji.csv` terbuka di satu tab, supaya NIK bisa dibaca cepat
- [ ] Jam dipasang: 15 menit habis lebih cepat daripada dugaan; latih urutannya minimal sekali
      dari awal sampai akhir

**Urutan demo yang disarankan** (isi urutan Anda sendiri kalau berbeda):

<!-- ISI: urutan yang menghemat waktu adalah urutan yang mengikuti satu pengajuan dari
     DRAFT sampai APPROVED, lalu menyisipkan jalur error di titik yang wajar — bukan
     melompat-lompat antar AC. Tulis urutan nomor AC-nya di sini. -->

`<!-- ISI: mis. AC-01 → AC-02 → AC-03 → AC-04 → AC-05 → AC-06 → AC-07 → AC-08 → AC-09 → AC-10 → AC-11 → AC-12 → AC-13 → AC-14 → AC-15 -->`

---

## 2. Skrip AC-01 s.d. AC-15

<!-- ISI: kolom Langkah, Akun yang dipakai, Data uji, Hasil yang diharapkan, dan Status latihan.
     Kolom "Kriteria" sudah pre-isi persis dari brief §5 — jangan diubah.
     Kolom "Langkah": langkah nyata dan berurutan, bukan "buka halaman lalu klik".
       Sebutkan nama menu/tombol yang benar-benar ada di aplikasi Anda.
     Kolom "Akun": kode peran (AO/ANL/KCP/KC/KOM/ADM) + username akun seed.
     Kolom "Data uji": NIK dari fixtures/nasabah-uji.csv + nilai plafon/tenor/akad.
     Kolom "Hasil yang diharapkan": yang terlihat di layar ATAU kode HTTP + isi respons.
     Kolom "Status latihan": Belum / Sudah (tanggal) / Gagal — dan kalau Gagal, buat issue. -->

### AC P0

| AC | Kriteria (dari brief) | Langkah | Akun | Data uji | Hasil yang diharapkan | Status latihan |
|---|---|---|---|---|---|---|
| **AC-01** | AO login, membuat pengajuan Rp 30.000.000 murabahah, mendapat nomor referensi format `IMT-YYYYMMDD-NNNN` |  |  |  |  |  |
| **AC-02** | AO **tidak dapat** mengakses layar verifikasi dokumen — dan panggilan API langsung ke endpoint verifikasi mengembalikan 403, bukan 200 |  |  |  |  |  |
| **AC-03** | ANL menolak dokumen KTP dengan kode alasan; AO mengunggah ulang **hanya** KTP; data pengajuan lain tidak hilang |  |  |  |  |  |
| **AC-04** | Pengajuan **tanpa** survei valid ditolak saat mencoba masuk skoring, dengan pesan yang menyebut BR-03 |  |  |  |  |  |
| **AC-05** | Nasabah dengan SLIK kolektibilitas 4 otomatis berstatus `REJECTED_SLIK` tanpa melalui approval |  |  |  |  |  |
| **AC-06** | Nasabah dengan SLIK kolektibilitas 2 dapat lanjut, tetapi grade risikonya tidak pernah lebih baik dari 3 |  |  |  |  |  |
| **AC-07** | Skoring menampilkan rincian keempat komponen beserta bobot dan skor komponennya |  |  |  |  |  |
| **AC-08** | ANL override grade dari 2 ke 3; sistem menolak jika alasan kosong; setelah diisi, override tercatat di audit trail dengan identitas ANL |  |  |  |  |  |
| **AC-09** | Margin 10,0 % untuk grade 1 (di bawah batas 11,0 %) **diblokir** sistem |  |  |  |  |  |
| **AC-10** | Pengajuan Rp 30.000.000 hanya butuh approval KCP; Rp 120.000.000 butuh KCP lalu KC; KC tidak bisa memutuskan sebelum KCP |  |  |  |  |  |
| **AC-11** | Pengguna yang membuat pengajuan tidak bisa menyetujuinya sendiri, meski perannya memungkinkan |  |  |  |  |  |
| **AC-12** | Audit trail menampilkan riwayat lengkap satu pengajuan dari `DRAFT` sampai `APPROVED`, urut waktu, dengan aktor di setiap baris |  |  |  |  |  |
| **AC-13** | Tidak ada endpoint yang bisa mengubah atau menghapus baris audit trail (tunjukkan dari daftar route, bukan dari kata-kata) |  |  |  |  |  |

### AC P1

| AC | Kriteria (dari brief) | Langkah | Akun | Data uji | Hasil yang diharapkan | Status latihan |
|---|---|---|---|---|---|---|
| **AC-14** | *(P1)* Pengajuan kelompok 4 anggota, total Rp 240.000.000, membutuhkan 3 level. Setelah satu anggota Rp 60.000.000 ditolak, total jadi Rp 180.000.000 dan level yang diperlukan turun menjadi 2 |  |  |  |  |  |
| **AC-15** | *(P1)* ADM mengubah bobot komponen "Lama usaha" dari 20 ke 25; skoring berikutnya memakai bobot baru **tanpa** restart aplikasi |  |  |  |  |  |

**Catatan teknis untuk beberapa AC** (baca sebelum menyusun langkahnya):

- **AC-02 dan AC-13 tidak bisa didemokan dari UI saja.** AC-02 mensyaratkan panggilan API
  langsung yang mengembalikan 403; AC-13 mensyaratkan Anda menunjukkan **daftar route**
  aplikasi (mis. keluaran perintah yang mencetak route, atau berkas router) sebagai bukti
  tidak ada `PUT`/`PATCH`/`DELETE` pada audit trail. Siapkan perintahnya lebih dulu.
- **AC-06 punya dua bagian**: pengajuan lanjut, **dan** grade tidak pernah lebih baik dari 3.
  Tunjukkan keduanya — termasuk kasus di mana perhitungan mentah menghasilkan grade 2
  tetapi sistem memaksanya menjadi 3.
- **AC-09 memerlukan pengajuan yang sudah bergrade 1.** Siapkan datanya lebih dulu; jangan
  mencoba mencapai grade 1 dengan mengisi form saat demo.
- **AC-15 mensyaratkan tanpa restart.** Kalau Anda me-restart layanan, AC ini gagal walaupun
  hasilnya berubah. Latih dengan mengubah bobot lewat UI ADM lalu langsung menjalankan
  skoring baru pada pengajuan lain.

---

## 3. Jalur Error yang Wajib Disiapkan

> Penilai **akan** menguji ini. Brief §13 butir 8 menyatakannya terang-terangan: "Penilai
> akan mencabut mock SLIK Anda. Itu pasti terjadi." Kelima jalur di bawah wajib bisa
> didemokan, masing-masing dalam waktu di bawah satu menit.

<!-- ISI: kolom Cara memicu, Hasil yang diharapkan, dan Status latihan.
     Kolom "Yang TIDAK boleh terjadi" sudah pre-isi — ia menyebut kegagalan khas yang
     dicari penilai. -->

| # | Jalur error | Cara memicu | Hasil yang diharapkan | Yang TIDAK boleh terjadi | Status latihan |
|---|---|---|---|---|---|
| E-1 | **SLIK 503** (layanan tidak tersedia) | `<!-- ISI: NIK 3404000000000503 dari fixtures, atau query param pemaksa -->` | `<!-- ISI: pesan jelas ke ANL, status pengajuan tidak maju, jejak tercatat -->` | Aplikasi crash; pengajuan lanjut seolah SLIK bersih; kolektibilitas terisi nilai default | |
| E-2 | **SLIK 404** (NIK tidak ditemukan) | `<!-- ISI: NIK 3404999999999999 dari fixtures -->` | `<!-- ISI: pesan bahwa NIK tidak ditemukan di SLIK; pengajuan tidak masuk skoring -->` | Dianggap kol-1; error 500 generik tanpa penjelasan; NIK muncul di pesan error (BR-11) | |
| E-3 | **Dokumen ditolak lalu di-upload ulang** | `<!-- ISI: ANL menolak KTP dengan kode alasan, AO upload ulang hanya KTP -->` | `<!-- ISI: hanya dokumen itu yang diminta ulang; data pengajuan lain utuh; kode alasan tersimpan -->` | AO harus mengisi ulang seluruh pengajuan; penolakan tanpa kode alasan | |
| E-4 | **Maker mencoba menjadi approver** | `<!-- ISI: pengguna berperan approver membuat pengajuan, lalu mencoba approve pengajuannya sendiri — lewat UI DAN lewat API langsung -->` | `<!-- ISI: ditolak di server dengan pesan menyebut BR-09 -->` | Hanya tombolnya disembunyikan tetapi API tetap 200 (ini juga memicu −8 pada AC-02) | |
| E-5 | **Margin di luar rentang grade** | `<!-- ISI: grade 1, margin 10,0 % (batas bawah 11,0 %). Uji juga batas atas 13,1 % -->` | `<!-- ISI: diblokir dengan pesan menyebut BR-06; tidak ada jalur lanjut -->` | Hanya peringatan lalu tetap tersimpan; pengajuan lanjut ke approval | |

**Jalur error tambahan yang layak disiapkan** (bukan wajib, tetapi sering ditanya):

<!-- ISI: pilih yang relevan dengan implementasi Anda. -->

- [ ] Timeout SLIK (bukan 503, tetapi tidak ada respons sama sekali) — `<!-- ISI: cara memicu -->`
- [ ] Plafon Rp 4.000.000 dan Rp 600.000.000 ditolak saat submit dengan pesan batas (BR-01)
- [ ] Skoring dijalankan sebelum SLIK / sebelum survei valid (BR-03)
- [ ] Grade 5 diajukan ke approval → `REJECTED_SCORING` (BR-05)
- [ ] Override grade dengan alasan kosong ditolak (AC-08)
- [ ] Hasil SLIK lebih dari 30 hari → ditandai perlu SLIK ulang (BR-04)
- [ ] Approver level 2 mencoba memutuskan sebelum level 1 (BR-02)

---

## 4. Pembagian Peran Saat Demo

<!-- ISI: siapa berbicara, siapa mengoperasikan, siapa memegang terminal untuk panggilan API.
     Satu orang berbicara sambil mengetik akan kehabisan waktu. -->

| Bagian | Yang mendemokan | Yang mengoperasikan | Catatan |
|---|---|---|---|
| Pembukaan + arsitektur (maks 2 menit) | `<!-- ISI -->` | `<!-- ISI -->` |  |
| AC-01 s.d. AC-04 | `<!-- ISI -->` | `<!-- ISI -->` |  |
| AC-05 s.d. AC-09 | `<!-- ISI -->` | `<!-- ISI -->` |  |
| AC-10 s.d. AC-13 | `<!-- ISI -->` | `<!-- ISI -->` |  |
| AC-14, AC-15 | `<!-- ISI -->` | `<!-- ISI -->` |  |
| Jalur error E-1 s.d. E-5 | `<!-- ISI -->` | `<!-- ISI -->` |  |
| Tanya jawab | `<!-- ISI -->` | — |  |

**Yang menjawab kalau penilai menunjuk baris kode acak**: orang yang commit baris itu.
Pastikan setiap anggota tahu bagian mana yang menjadi tanggung jawabnya.

---

## 5. Yang Akan Kami Katakan Kalau Sesuatu Gagal

<!-- ISI: siapkan ini. Gagal saat demo tidak fatal; yang fatal adalah panik dan mencoba
     memperbaikinya di depan penilai selama tiga menit.
     Isi: apa yang dikatakan, apa yang dilewati, dan siapa yang memutuskan melewati. -->

| Situasi | Tindakan | Yang memutuskan |
|---|---|---|
| Satu AC gagal saat demo | `<!-- ISI: mis. sebutkan bahwa ini diketahui, rujuk README bagian 5, lanjut ke AC berikutnya -->` | `<!-- ISI -->` |
| Layanan mati di tengah demo | `<!-- ISI -->` | `<!-- ISI -->` |
| Waktu 15 menit hampir habis | `<!-- ISI: AC mana yang dilewati lebih dulu -->` | `<!-- ISI -->` |
