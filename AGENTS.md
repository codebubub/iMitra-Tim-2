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

<!-- ISI: satu baris per perubahan. Contoh isi:
     | 2026-08-20 13:40 | Andi | Larang agent membuat migrasi baru tanpa persetujuan Tech Lead | DEVLOG-04 | -->

| Tanggal & jam | Oleh | Perubahan | Dipicu oleh |
|---|---|---|---|
|  |  | Versi awal |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

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

<!-- ISI: isi persis, termasuk versi mayor-minor. "Node terbaru" bukan versi.
     Agent akan menghasilkan kode yang salah kalau versi tidak jelas — misalnya memakai API
     yang baru ada di versi berikutnya, atau sintaks yang sudah dihapus.
     Hapus baris yang tidak Anda pakai; jangan tinggalkan baris kosong berisi tanda tanya. -->

| Lapisan | Teknologi | Versi | Catatan |
|---|---|---|---|
| Bahasa backend | `<!-- ISI -->` | `<!-- ISI -->` |  |
| Framework backend | `<!-- ISI -->` | `<!-- ISI -->` |  |
| Bahasa/framework frontend | `<!-- ISI -->` | `<!-- ISI -->` |  |
| Database | `<!-- ISI -->` | `<!-- ISI -->` |  |
| ORM / query layer | `<!-- ISI -->` | `<!-- ISI -->` |  |
| Tool migrasi | `<!-- ISI -->` | `<!-- ISI -->` |  |
| Test runner | `<!-- ISI -->` | `<!-- ISI -->` |  |
| Linter / formatter | `<!-- ISI -->` | `<!-- ISI -->` |  |
| Mock SLIK | `<!-- ISI -->` | `<!-- ISI -->` | Layanan terpisah, dipanggil via HTTP |
| Runtime | Docker Compose | `<!-- ISI -->` |  |

**Batasan versi yang tidak boleh diubah agent**: `<!-- ISI: mis. "jangan naikkan versi ORM,
migrasi sudah dibuat untuk versi ini" -->`

---

## 3. Struktur Direktori & Di Mana Kode Baru Diletakkan

<!-- ISI: sesuaikan pohon di bawah dengan struktur nyata Anda setelah Sprint 0.
     Ini bagian yang paling sering menyelamatkan waktu: tanpa ini, agent akan menaruh
     kode di tempat baru setiap kali dan Anda akan punya tiga tempat berbeda untuk
     aturan bisnis yang sama. -->

```
/
├── backend/          <!-- ISI: rincian isi -->
├── frontend/         <!-- ISI: rincian isi -->
├── mock-slik/        <!-- ISI: rincian isi -->
├── docs/
├── fixtures/
└── docker-compose.yml
```

**Aturan penempatan (agent wajib mengikuti ini, bukan menebak)**:

<!-- ISI: lengkapi tabel. Kolom "Lokasi" berisi path nyata di repo Anda.
     Kolom "Jangan taruh di" penting: ia mencegah agent menaruh logika bisnis di controller
     atau di komponen UI, yang merupakan kesalahan paling umum pada kode hasil AI. -->

| Jenis kode | Lokasi | Jangan taruh di |
|---|---|---|
| Aturan bisnis / perhitungan (skoring, margin, routing approval) | `<!-- ISI -->` | controller, komponen UI, middleware |
| Endpoint / route handler | `<!-- ISI -->` |  |
| Akses database / repository | `<!-- ISI -->` | service, controller |
| Migrasi skema | `<!-- ISI -->` | mana pun selain direktori migrasi |
| Seed data | `<!-- ISI -->` |  |
| Test unit | `<!-- ISI -->` |  |
| Test integrasi / API | `<!-- ISI -->` |  |
| Komponen UI | `<!-- ISI -->` |  |
| Pemanggil HTTP ke mock SLIK (client + penanganan error) | `<!-- ISI -->` | dipanggil langsung dari controller |
| Konfigurasi / pembacaan env | `<!-- ISI -->` | tersebar di seluruh kode |

**Aturan lapisan**: `<!-- ISI: mis. "controller tidak boleh mengakses database langsung;
selalu lewat service → repository. Aturan bisnis tidak boleh tahu tentang HTTP." -->`

---

## 4. Konvensi

### 4.1 Penamaan

<!-- ISI: sesuaikan dengan bahasa pilihan Anda. Yang penting: KONSISTEN dan TERTULIS.
     Agent tidak punya preferensi; ia akan meniru apa pun yang Anda tulis di sini,
     dan kalau tidak Anda tulis, ia akan meniru gaya campur aduk dari data latihannya. -->

| Objek | Konvensi | Contoh |
|---|---|---|
| Tabel database | `<!-- ISI -->` | `<!-- ISI -->` |
| Kolom database | `<!-- ISI -->` | `<!-- ISI -->` |
| Kelas / tipe | `<!-- ISI -->` | `<!-- ISI -->` |
| Fungsi / method | `<!-- ISI -->` | `<!-- ISI -->` |
| Berkas | `<!-- ISI -->` | `<!-- ISI -->` |
| Endpoint | `<!-- ISI -->` | `<!-- ISI -->` |
| Enum status | `<!-- ISI -->` | `<!-- ISI -->` |
| Branch | `feat/FR-NN-slug`, `fix/FR-NN-slug` | `feat/FR-06-skoring`, `fix/FR-03-reupload` |

**Bahasa dalam kode**: `<!-- ISI: putuskan sekali dan tegakkan. Pilihan yang lazim:
istilah domain dalam Bahasa Indonesia (pengajuan, survei, plafon, nisbah, skoring),
sisanya dalam Bahasa Inggris. Yang dilarang adalah mencampur keduanya untuk konsep yang
sama — "pengajuan" di satu berkas dan "application" di berkas lain akan membuat agent
membuat dua entitas untuk satu hal. -->`

**Status pengajuan (enum wajib)**: nilai berikut berasal dari brief dan tidak boleh diganti
namanya: `DRAFT`, `REJECTED_SLIK`, `REJECTED_SCORING`, `APPROVED`. Status dokumen: `VERIFIED`,
`REJECTED`. Status survei: `VALID`. Keputusan approval: `APPROVE`, `REJECT`, `RETURN`.
<!-- ISI: tambahkan status transisi lain yang Anda perlukan (mis. SUBMITTED, VERIFYING,
     SCORED, WAITING_APPROVAL_L1) beserta diagram transisinya di SDD. Agent tidak boleh
     menambah nilai enum baru tanpa memperbarui daftar ini dan SDD. -->

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
- Satu issue = satu branch = satu PR.
- Agent tidak boleh membuat commit atas nama orang lain, dan tidak boleh melakukan
  `git push` ke `main`. `main` dilindungi.
- Kalau perubahan berasal dari sesi AI, PR wajib menyebut nomor entri devlog
  (`DEVLOG-xx`) di bagian AI pada template PR.

### 4.3 Error Handling

<!-- ISI: sesuaikan dengan stack. Yang wajib ada, apa pun stack-nya: bentuk respons error
     yang seragam, kode HTTP yang benar, dan larangan membocorkan data pribadi. -->

Bentuk respons error yang seragam untuk seluruh API:

```json
{
  "error": "<!-- ISI: KODE_KONSTAN -->",
  "message": "<!-- ISI: pesan untuk pengguna, tanpa data pribadi -->",
  "rule": "<!-- ISI: opsional, mis. BR-03 -->"
}
```

| Situasi | Kode HTTP | Catatan |
|---|---|---|
| Belum login / token tidak valid | 401 | |
| Login tetapi peran tidak berwenang | **403** | AC-02 menguji ini secara langsung. Bukan 200, bukan 404 |
| Validasi input gagal | 400 | Sebutkan field yang salah |
| Pelanggaran aturan bisnis (BR-xx) | `<!-- ISI: 409 atau 422, pilih satu dan konsisten -->` | Pesan wajib menyebut kode BR-nya |
| Sumber daya tidak ada | 404 | |
| Mock SLIK tidak tersedia / timeout | `<!-- ISI: mis. 502 atau 503 -->` | **Tidak boleh** dianggap SLIK bersih |
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
| **BR-01** | Plafon < Rp 5.000.000 atau > Rp 500.000.000 ditolak saat submit, dengan pesan yang menjelaskan batas | `<!-- ISI: path -->` |
| **BR-02** | Approval harus berurutan: level 2 tidak dapat memutuskan sebelum level 1 memberi `APPROVE` | `<!-- ISI -->` |
| **BR-03** | Skoring baru boleh jalan jika semua dokumen wajib `VERIFIED` **dan** ada minimal satu survei `VALID` **dan** SLIK check sudah dijalankan | `<!-- ISI -->` |
| **BR-04** | Hasil SLIK berlaku 30 hari; lewat itu pengajuan ditandai perlu SLIK ulang | `<!-- ISI -->` |
| **BR-05** | Grade 5 tidak dapat diajukan ke approval; status menjadi `REJECTED_SCORING` | `<!-- ISI -->` |
| **BR-06** | Margin/nisbah di luar rentang grade-nya **diblokir**, bukan diberi peringatan. Tidak ada jalur "lanjutkan saja" | `<!-- ISI -->` |
| **BR-07** | Skor akhir = Σ (skor komponen × bobot) ÷ Σ bobot, dibulatkan ke bilangan bulat terdekat | `<!-- ISI -->` |
| **BR-08** | Rincian tiap komponen skor wajib ditampilkan ke ANL **dan disimpan** bersama hasil skoring, bukan hanya angka akhir | `<!-- ISI -->` |
| **BR-09** | Satu pengguna tidak boleh menjadi maker dan approver pada pengajuan yang sama; ditegakkan di **server** | `<!-- ISI -->` |
| **BR-10** | Setiap perubahan status wajib punya aktor dan timestamp; tidak ada perubahan "oleh sistem" tanpa jejak sebab | `<!-- ISI -->` |
| **BR-11** | NIK dan foto dokumen adalah data pribadi: tidak boleh muncul di log aplikasi, pesan error, atau URL | `<!-- ISI -->` |
| **BR-12** | Nomor referensi `IMT-YYYYMMDD-NNNN` unik dan tidak pernah dipakai ulang, termasuk untuk pengajuan yang ditolak | `<!-- ISI -->` |

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

**Nama tabel parameter di database Anda**:
<!-- ISI: sebutkan nama tabel nyata, mis. parameter_skoring, ambang_approval, rentang_margin.
     Tulis di sini supaya agent memakai nama yang benar tanpa menebak. -->

| Isi | Nama tabel |
|---|---|
| Bobot & aturan komponen skor | `<!-- ISI -->` |
| Ambang approval per plafon | `<!-- ISI -->` |
| Rentang margin/nisbah per grade | `<!-- ISI -->` |

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

16. `<!-- ISI -->`
17. `<!-- ISI -->`

---

## 7. Perintah Test & Lint

<!-- ISI: perintah persis, bisa di-copy-paste. Harus identik dengan yang ada di
     .github/workflows/ci.yml dan README.md bagian 2.6. Kalau agent diminta
     "jalankan test", inilah yang ia jalankan. -->

```bash
# Instalasi dependensi
<!-- ISI -->

# Migrasi (lingkungan test)
<!-- ISI -->

# Seed data uji
<!-- ISI -->

# Test unit
<!-- ISI -->

# Test integrasi / API
<!-- ISI -->

# Lint
<!-- ISI -->

# Format
<!-- ISI -->

# Semua sekaligus, sama seperti yang dijalankan CI
<!-- ISI -->
```

**Aturan Definition of Done untuk agent**: perubahan dianggap selesai hanya jika lint bersih,
seluruh test lolos, dan ada minimal satu test yang berasal dari AC terkait — bukan test yang
diturunkan dari kode yang baru saja ditulis.

**Sebelum membuka PR**, pastikan:

- Test dan lint lolos secara lokal, bukan hanya "seharusnya lolos".
- `docs/TRACEABILITY.md` diperbarui untuk FR yang disentuh.
- Ada entri `docs/AI-DEVLOG.md` kalau AI dipakai, dan nomornya disebut di deskripsi PR.
- Tabel status FR di `README.md` diperbarui kalau statusnya berubah.
