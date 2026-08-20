# fixtures — Data Uji iMitra

## Isi

| Berkas | Isi |
|---|---|
| `nasabah-uji.csv` | 12 baris data nasabah fiktif untuk dimuat ke mock SLIK |

---

## Aturan yang tidak bisa dinegosiasikan

1. **Data ini fiktif.** Seluruh NIK dibangkitkan untuk keperluan latihan dan tidak merujuk
   orang nyata.
2. **Jangan pernah menggantinya dengan data nasabah nyata**, walaupun hanya untuk "menguji
   sebentar", walaupun sudah disamarkan sebagian. Brief §7.3 menyatakan commit yang memuat
   data nasabah nyata atau dump dari sistem produksi adalah **kriteria diskualifikasi** —
   bukan pengurangan nilai, tetapi kegagalan langsung. Riwayat git tidak bisa dibersihkan
   dengan menghapus berkas di commit berikutnya.
3. **Jangan menambah, mengurangi, atau mengubah 12 baris ini.** Penilai memakai NIK dari
   daftar ini saat demo. Kalau Anda perlu kasus tambahan, buat berkas terpisah
   (mis. `fixtures/nasabah-tambahan.csv`) dan sebutkan di `README.md` — jangan sentuh
   berkas ini.
4. Kalau Anda memerlukan data nasabah untuk mengisi form pengajuan (nama, alamat), buat
   sendiri data fiktif. Yang wajib konsisten dengan berkas ini hanyalah **NIK dan hasil SLIK**.

---

## Kolom

| Kolom | Arti | Dipakai oleh |
|---|---|---|
| `nik` | Nomor Induk Kependudukan (fiktif). Kunci pencarian mock SLIK | Mock SLIK, form pengajuan |
| `nama` | Nama nasabah | Respons SLIK (`nama`) |
| `jenis_usaha` | Jenis usaha mikro | Form pengajuan, konteks survei |
| `kolektibilitas` | Kualitas pembiayaan 1–5 dari SLIK | Respons SLIK (`kolektibilitas`), penerapan Tabel 4.2 |
| `jumlah_fasilitas_aktif` | Jumlah fasilitas pembiayaan aktif | Respons SLIK (`jumlahFasilitasAktif`) |
| `total_baki_debet` | Total baki debet dalam rupiah | Respons SLIK (`totalBakiDebet`) |
| `omzet_harian` | Estimasi omzet harian usaha, rupiah | Komponen skor "Kapasitas bayar" (§4.4) |
| `lama_usaha_bulan` | Lama usaha berjalan dalam bulan | Komponen skor "Lama usaha" (§4.4) |
| `skenario` | Cabang aturan yang diuji baris ini | Penyusunan test dan `docs/DEMO-SCRIPT.md` |

Perhatikan: `omzet_harian` dan `lama_usaha_bulan` **bukan bagian dari kontrak respons SLIK**.
Keduanya ada di berkas ini karena keduanya dibutuhkan untuk skoring, dan pada sistem nyata
berasal dari hasil survei lapangan (FR-04) yang direkam AO — bukan dari SLIK. Pakai keduanya
sebagai nilai survei yang konsisten saat menguji skoring, sehingga hasil skoring bisa
diprediksi dan diverifikasi.

Tanda `-` pada baris ke-11 dan ke-12 berarti tidak ada data: kedua NIK itu memang tidak boleh
mengembalikan data 200.

---

## Cara memakai

### 1. Muat ke mock SLIK

Mock SLIK membaca berkas ini (atau tabel hasil seed dari berkas ini) dan melayani
`POST /slik/inquiry` sesuai kontrak brief §6.1:

- NIK ada di daftar dengan kolektibilitas 1–5 → **200** dengan payload lengkap
- NIK `3404999999999999` → **404** `{ "error": "NIK_NOT_FOUND" }`
- NIK `3404000000000503` → **503** `{ "error": "SERVICE_UNAVAILABLE" }`
- NIK di luar daftar → **404** `{ "error": "NIK_NOT_FOUND" }`

Sediakan juga **cara memaksa 503 dan timeout** di luar NIK pemicu, misalnya lewat query
param. Penilai akan meminta jalur error ini secara langsung (brief §6.1 dan §13 butir 8).

<!-- ISI: tulis di sini bagaimana mock SLIK Anda memuat berkas ini, dan bagaimana cara
     memaksa 503/timeout selain lewat NIK pemicu. -->

`<!-- ISI: cara memuat + cara memaksa error -->`

### 2. Pakai sebagai dasar test dari AC

Setiap baris memetakan ke minimal satu cabang aturan. Pemetaan awal:

| NIK | Skenario | AC / BR yang relevan |
|---|---|---|
| `3404110985000001` | Grade 1, jalur bahagia plafon kecil | AC-01, AC-10 (level KCP tunggal) |
| `3404220790000002` | Grade 2, approval 2 level | AC-10 (KCP → KC) |
| `3404150688000003` | Kol-2, grade dipaksa minimal 3 | AC-06, Tabel 4.2 |
| `3404031292000004` | Kol-4, penolakan otomatis | AC-05, Tabel 4.2 |
| `3404190883000005` | Usaha baru 5 bulan, kapasitas rendah | BR-05, Tabel 4.3 (grade 5 tidak dibiayai) |
| `3404270995000006` | Kol-3, penolakan otomatis | Tabel 4.2 |
| `3404080781000007` | Grade 1, plafon besar, 3 level | AC-09, AC-10 (KCP → KC → KOM) |
| `3404121189000008` | Kol-5, penolakan otomatis | Tabel 4.2 |
| `3404300394000009` | Kol-2 + kapasitas sedang → grade 3 | AC-06, AC-07 |
| `3404060586000010` | Lama usaha 18 bulan, uji batas komponen skor | AC-07, BR-07 |
| `3404999999999999` | NIK tidak ditemukan | Jalur error E-2 di `DEMO-SCRIPT.md` |
| `3404000000000503` | Layanan tidak tersedia | Jalur error E-1 di `DEMO-SCRIPT.md` |

Grade akhir bergantung pada plafon, tenor, dan penilaian survei yang Anda masukkan — kolom
`skenario` menyebutkan **cabang yang dituju**, bukan jaminan hasil. Kalau hasil perhitungan
Anda berbeda dari dugaan pada kolom itu, periksa dulu perhitungan Anda terhadap §4.4 dan
BR-07 (pembulatan hanya sekali, di akhir); kalau setelah diperiksa hasil Anda memang benar,
catat selisih dan asumsinya di `docs/SRS-iMitra.md` bagian 2.5.

### 3. Siapkan sebelum demo

Ketiga hal ini diperiksa di `docs/DEMO-SCRIPT.md` bagian 1:

- Seluruh 12 baris termuat dan bisa di-inquiry
- NIK 404 dan NIK 503 berperilaku benar
- Skenario kelompok (AC-14) sudah punya data siap: 4 anggota, total Rp 240.000.000, dengan
  satu anggota berplafon Rp 60.000.000 yang akan ditolak saat demo

---

## Catatan tentang BR-11

NIK adalah data pribadi. Walaupun NIK di berkas ini fiktif, tegakkan BR-11 sejak awal:
jangan tulis NIK ke log aplikasi, jangan sertakan di pesan error, dan jangan taruh di URL
(termasuk sebagai path param atau query string). Pakai id internal pengajuan untuk korelasi.
Kebiasaan yang dibentuk pada data fiktif inilah yang berlaku nanti pada data nyata.
