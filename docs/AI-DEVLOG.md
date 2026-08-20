# AI-DEVLOG — Jurnal Pemakaian AI

**Tim**: `<!-- ISI: nama tim -->`
**Pemilik berkas**: AI Workflow Officer — `<!-- ISI: nama -->`
**Kontributor**: seluruh anggota tim

---

## Kenapa berkas ini yang dinilai paling tinggi

Menurut brief §9.3, ini **artefak paling bernilai** dalam hackathon, dan §12 menempatkan
"Disiplin rekayasa berbantuan AI" pada bobot terbesar (25 poin).

Alasannya sederhana. Aplikasi yang jalan hanya membuktikan bahwa kode Anda benar hari ini.
Devlog membuktikan bahwa **Anda tahu mengapa kode itu benar** — bahwa Anda memberi AI
spesifikasi, memverifikasi keluarannya terhadap acceptance criteria, dan menangkap
kesalahannya sebelum kesalahan itu masuk ke `main`. Kemampuan itulah yang Anda bawa kembali
ke pekerjaan hari Senin; aplikasi ini tidak.

Konsekuensi praktisnya: **kalau Anda memakai AI dengan baik tetapi tidak mencatatnya,
secara penilaian itu sama dengan tidak melakukannya.**

Dua sanksi dan dua bonus yang langsung terkait berkas ini:

| Temuan | Nilai |
|---|---|
| Devlog ditulis seluruhnya dalam 2 jam terakhir | **−8** |
| Entri yang menunjukkan AI salah secara **halus**, dan tim menangkapnya lewat test (bukan kebetulan) | **+3 per entri, maks +6** |
| Tidak ada satu pun entri kegagalan | Penilai menyimpulkan Anda tidak memverifikasi, atau tidak jujur. Keduanya merugikan |
| Minimal 3 entri sudah ada di Gate 2 (Kamis 15.30) | Syarat kelulusan Gate 2 |

---

## Aturan pengisian

1. **Minimal 10 entri.** Kurang dari itu dianggap tidak lengkap.
2. **Minimal 3 entri berupa kasus AI salah dan Anda menangkapnya.** Dalam 9 jam koding
   dengan AI, sesuatu pasti salah — itu normal. Menangkapnya adalah keahlian yang dinilai.
   Entri kegagalan yang paling bernilai adalah yang **halus**: keluaran yang tampak benar,
   test-nya hijau, dan tetap salah.
3. **Tersebar di dua hari.** Target: minimal 4 entri pada Kamis (3 di antaranya sebelum
   Gate 2 pukul 15.30) dan sisanya pada Jumat. Penilai membaca timestamp commit, bukan
   hanya isi entri. Sepuluh entri yang muncul dalam satu commit pada Jumat 14.50 dikenai −8.
4. **Commit devlog bersamaan dengan commit kode**, bukan dikumpulkan. Satu entri = beberapa
   menit, ditulis saat kejadiannya masih segar.
5. **Semua anggota menyetor entri**, bukan hanya AI Workflow Officer. Kolom "Oleh" yang
   berisi satu nama untuk 10 entri menandakan sembilan orang lain tidak memakai AI secara
   sadar — atau tidak mencatatnya.
6. **Jujur.** Entri yang seluruhnya berisi keberhasilan lebih merugikan daripada entri yang
   mencatat prompt yang gagal tiga kali.
7. **Rujuk artefak nyata**: nomor PR, nama berkas test, ID AC, ID BR. Entri tanpa rujukan
   tidak bisa diverifikasi penilai.

---

## Format entri (wajib, dari brief §9.3)

Salin blok di bawah untuk setiap entri baru. Jangan hilangkan field mana pun; kalau suatu
field tidak berlaku, tulis "tidak ada" beserta alasan singkat.

```markdown
### [DEVLOG-NN] <judul singkat> (FR-xx)
- **Waktu**: YYYY-MM-DD HH:MM
- **Oleh**: <nama>
- **Tool/Model**: <mis. 9Router -> Claude Opus>
- **Tugas**: <apa yang diminta, sebutkan FR/BR/AC terkait>
- **Cara memberi konteks**: <berkas apa yang dilampirkan, bagian brief mana, batasan apa
  yang disebut eksplisit>
- **Keluaran AI**: <apa yang dihasilkan, berapa besar>
- **Yang salah**: <kalau ada. Kalau tidak ada, tulis "tidak ada" dan sebutkan apa yang
  Anda periksa untuk memastikannya>
- **Cara verifikasi**: <langkah konkret. "Saya baca dan kelihatan benar" bukan verifikasi>
- **Tindakan**: <apa yang Anda ubah: prompt, kode, test, AGENTS.md>
- **Pelajaran**: <aturan yang Anda ambil dari kejadian ini. Kalau pelajarannya bersifat
  aturan repo, tambahkan ke AGENTS.md dan sebutkan di sini>
```

---

## Dua contoh entri terisi penuh (teladan, bukan untuk diisi ulang)

Dua entri di bawah adalah contoh standar yang diharapkan. **Hapus keduanya sebelum
`v1.0.0`** — atau biarkan, tetapi jangan hitung sebagai bagian dari 10 entri Anda.
Perhatikan tingkat kedetailannya: nomor PR, nama berkas, angka nyata, dan langkah verifikasi
yang bisa diulang orang lain.

### [CONTOH-A] Kritik model data nasabah perorangan vs kelompok (FR-02, FR-10) — kasus sukses

- **Waktu**: 2026-08-20 10:12
- **Oleh**: Rizky (Tech Lead)
- **Tool/Model**: 9Router → Claude Opus (chat, tanpa akses tulis ke repo)
- **Tugas**: Sebelum menulis migrasi pertama, meminta AI **mengkritik** rancangan model data
  kami — bukan membuatnya. Fokus: bagaimana satu pengajuan bisa mewakili nasabah perorangan
  maupun kelompok (majelis) 3–10 anggota, dengan level approval ditentukan dari total plafon
  kelompok (FR-10, AC-14).
- **Cara memberi konteks**: melampirkan brief §1.3 dan §4.1, ditambah draf skema kami dalam
  bentuk DDL (5 tabel: `pengajuan`, `nasabah`, `dokumen`, `survei`, `hasil_slik`). Prompt
  dibuka dengan batasan tegas: "jangan tulis kode, jangan usulkan tabel baru dulu; sebutkan
  3 kelemahan terbesar rancangan ini terhadap AC-14 dan BR-01, urut dari yang paling mahal
  kalau baru ditemukan besok."
- **Keluaran AI**: tiga kritik, tanpa kode. Yang paling berguna: rancangan kami menyimpan
  `plafon_diajukan` hanya di tabel `pengajuan`, sehingga untuk kelompok tidak ada tempat
  menyimpan plafon per anggota — dan AC-14 mensyaratkan penolakan satu anggota
  Rp 60.000.000 mengurangi total dari Rp 240.000.000 menjadi Rp 180.000.000. Tanpa plafon
  per anggota, angka itu tidak bisa dihitung ulang, hanya bisa ditulis manual.
- **Yang salah**: tidak ada pada keluaran itu sendiri. Satu usulan tambahannya — menyimpan
  kolom turunan `level_approval_diperlukan` di tabel `pengajuan` — kami tolak, karena nilai
  turunan yang disimpan akan basi persis pada skenario AC-14. Penolakan ini dicatat di
  `docs/adr/0002-plafon-per-anggota.md`.
- **Cara verifikasi**: menulis ulang AC-14 sebagai tabel angka di papan tulis (4 anggota,
  60+60+60+60 = 240 → 3 level; satu ditolak → 180 → 2 level), lalu menelusuri apakah skema
  usulan bisa menghasilkan kedua angka itu **hanya** dari data yang tersimpan. Skema lama
  gagal di langkah kedua.
- **Tindakan**: menambahkan tabel `pengajuan_anggota` (plafon per anggota + status per
  anggota), memindahkan `total_plafon` menjadi nilai yang dihitung saat dibaca, bukan kolom
  tersimpan. Migrasi awal ditulis setelah ini, bukan sebelumnya — jadi tidak ada migrasi
  yang perlu dibatalkan. Ditulis di PR #3.
- **Pelajaran**: AI jauh lebih berguna sebagai pengkritik rancangan daripada sebagai pembuat
  rancangan, dan kritik terbaik keluar ketika kami melampirkan **acceptance criteria berupa
  angka**, bukan deskripsi fitur. Sejak entri ini, setiap keputusan model data kami uji
  dengan cara: "AC mana yang membuktikan skema ini cukup?" Aturan ini masuk ke `AGENTS.md`
  bagian 3.

### [CONTOH-B] Pembulatan skor kelayakan menggeser grade (FR-06, BR-07) — kasus AI salah, halus

- **Waktu**: 2026-08-21 09:48
- **Oleh**: Dewi (Backend Engineer)
- **Tool/Model**: VSCode + Copilot (inline, mode agent pada satu berkas service)
- **Tugas**: Implementasi perhitungan skor kelayakan 0–100 dari empat komponen berbobot
  (§4.4) dan penurunan grade 1–5 dari rentang skor (Tabel 4.3), sesuai BR-07.
- **Cara memberi konteks**: melampirkan tabel §4.4 dan Tabel 4.3 sebagai komentar di atas
  fungsi, plus repository parameter yang sudah ada, plus catatan bahwa bobot dibaca dari
  tabel `parameter_skoring` (bukan konstanta).
- **Keluaran AI**: satu fungsi `hitungSkorKelayakan` (± 60 baris) plus 6 unit test. Bobot
  memang dibaca dari database — larangan di `AGENTS.md` bagian 6 butir 3 dipatuhi. Semua
  test hijau pada percobaan pertama.
- **Yang salah**: AI **membulatkan skor setiap komponen ke bilangan bulat sebelum dikalikan
  bobot**, lalu membulatkan lagi hasil akhirnya. BR-07 mensyaratkan pembulatan **hanya pada
  skor akhir**. Selisihnya biasanya 0 atau 1 poin, jadi tidak terlihat — kecuali tepat di
  batas grade. Pada data uji Slamet Riyadi (kapasitas bayar 67,3; SLIK kol-1 → 100; lama
  usaha 60 bulan → 100; survei kondisi usaha 4 × 20 = 80) hasil yang benar adalah
  (67,3×35 + 100×25 + 100×20 + 80×20) ÷ 100 = 84,555 → **85 → grade 1**. Versi AI
  membulatkan 67,3 menjadi 67 lebih dulu, sehingga menghasilkan 84,45 → **84 → grade 2**.
  Akibatnya rentang margin yang divalidasi ikut
  bergeser dari 11,0–13,0 % menjadi 13,0–15,5 %, sehingga AC-09 (margin 10,0 % harus
  diblokir untuk grade 1) diuji pada grade yang salah. Enam test buatan AI semuanya lolos,
  karena semuanya memakai nilai komponen bulat — jadi cabang yang salah tidak pernah
  tereksekusi. Hijaunya menipu.
- **Cara verifikasi**: QA menulis satu test dari AC secara terpisah, memakai baris data
  Slamet Riyadi dari `fixtures/nasabah-uji.csv` dan **menghitung skor manual di kalkulator
  lebih dulu**, bukan menyalin keluaran fungsi sebagai nilai harapan. Test itu gagal:
  harapan 85, hasil 84. Setelah itu kami tambahkan test batas untuk setiap ambang grade
  (39/40, 54/55, 69/70, 84/85) di `<!-- berkas test Anda -->` — dua di antaranya juga gagal.
- **Tindakan**: menghapus pembulatan per komponen, menyimpan skor komponen sebagai desimal
  di kolom rincian (BR-08 mewajibkan rincian disimpan, dan rincian yang sudah dibulatkan
  tidak bisa dipakai auditor untuk merekonstruksi angka akhir), dan membulatkan sekali saja
  di akhir. Test buatan AI yang menegaskan perilaku salah dihapus, bukan disesuaikan.
  Larangan "jangan bulatkan nilai antara; pembulatan hanya sekali di akhir sesuai BR-07"
  ditambahkan ke `AGENTS.md` bagian 6. PR #21.
- **Pelajaran**: test yang dibuat AI menguji asumsi AI, bukan requirement kami. Dua aturan
  tim sejak entri ini: (1) test untuk aturan bisnis ditulis dari AC dengan nilai harapan
  dihitung manual lebih dulu; (2) setiap aturan yang punya ambang wajib punya test tepat di
  batas atas dan batas bawahnya. Bug ini tidak akan pernah muncul di jalur bahagia demo —
  ia hanya muncul pada satu nasabah, dan nasabah itu mendapat margin yang lebih mahal
  daripada haknya.

---

## Entri Tim

<!-- ISI: sepuluh blok di bawah. Isi berurutan sesuai waktu kejadian, bukan sesuai nomor
     yang Anda sukai. Kalau ternyata perlu lebih dari 10, lanjutkan dengan DEVLOG-11, dst.
     Beri tanda pada judul entri kegagalan supaya penilai mudah menemukannya, mis.
     "### [DEVLOG-04] ... (FR-07) — kasus AI salah".
     Ingat: minimal 3 entri kegagalan, dan minimal 3 entri sudah ada sebelum Gate 2. -->

### [DEVLOG-01] `<!-- ISI: judul -->` (FR-`<!-- ISI -->`)
- **Waktu**:
- **Oleh**:
- **Tool/Model**:
- **Tugas**:
- **Cara memberi konteks**:
- **Keluaran AI**:
- **Yang salah**:
- **Cara verifikasi**:
- **Tindakan**:
- **Pelajaran**:

### [DEVLOG-02] `<!-- ISI: judul -->` (FR-`<!-- ISI -->`)
- **Waktu**:
- **Oleh**:
- **Tool/Model**:
- **Tugas**:
- **Cara memberi konteks**:
- **Keluaran AI**:
- **Yang salah**:
- **Cara verifikasi**:
- **Tindakan**:
- **Pelajaran**:

### [DEVLOG-03] `<!-- ISI: judul -->` (FR-`<!-- ISI -->`)
- **Waktu**:
- **Oleh**:
- **Tool/Model**:
- **Tugas**:
- **Cara memberi konteks**:
- **Keluaran AI**:
- **Yang salah**:
- **Cara verifikasi**:
- **Tindakan**:
- **Pelajaran**:

### [DEVLOG-04] `<!-- ISI: judul -->` (FR-`<!-- ISI -->`)
- **Waktu**:
- **Oleh**:
- **Tool/Model**:
- **Tugas**:
- **Cara memberi konteks**:
- **Keluaran AI**:
- **Yang salah**:
- **Cara verifikasi**:
- **Tindakan**:
- **Pelajaran**:

### [DEVLOG-05] `<!-- ISI: judul -->` (FR-`<!-- ISI -->`)
- **Waktu**:
- **Oleh**:
- **Tool/Model**:
- **Tugas**:
- **Cara memberi konteks**:
- **Keluaran AI**:
- **Yang salah**:
- **Cara verifikasi**:
- **Tindakan**:
- **Pelajaran**:

### [DEVLOG-06] `<!-- ISI: judul -->` (FR-`<!-- ISI -->`)
- **Waktu**:
- **Oleh**:
- **Tool/Model**:
- **Tugas**:
- **Cara memberi konteks**:
- **Keluaran AI**:
- **Yang salah**:
- **Cara verifikasi**:
- **Tindakan**:
- **Pelajaran**:

### [DEVLOG-07] `<!-- ISI: judul -->` (FR-`<!-- ISI -->`)
- **Waktu**:
- **Oleh**:
- **Tool/Model**:
- **Tugas**:
- **Cara memberi konteks**:
- **Keluaran AI**:
- **Yang salah**:
- **Cara verifikasi**:
- **Tindakan**:
- **Pelajaran**:

### [DEVLOG-08] `<!-- ISI: judul -->` (FR-`<!-- ISI -->`)
- **Waktu**:
- **Oleh**:
- **Tool/Model**:
- **Tugas**:
- **Cara memberi konteks**:
- **Keluaran AI**:
- **Yang salah**:
- **Cara verifikasi**:
- **Tindakan**:
- **Pelajaran**:

### [DEVLOG-09] `<!-- ISI: judul -->` (FR-`<!-- ISI -->`)
- **Waktu**:
- **Oleh**:
- **Tool/Model**:
- **Tugas**:
- **Cara memberi konteks**:
- **Keluaran AI**:
- **Yang salah**:
- **Cara verifikasi**:
- **Tindakan**:
- **Pelajaran**:

### [DEVLOG-10] `<!-- ISI: judul -->` (FR-`<!-- ISI -->`)
- **Waktu**:
- **Oleh**:
- **Tool/Model**:
- **Tugas**:
- **Cara memberi konteks**:
- **Keluaran AI**:
- **Yang salah**:
- **Cara verifikasi**:
- **Tindakan**:
- **Pelajaran**:

---

## Rekapitulasi (isi di akhir hari kedua, sebelum code freeze)

<!-- ISI: rekap singkat. Ini yang dibaca penilai lebih dulu sebelum masuk ke entri. -->

| Hal | Isi |
|---|---|
| Total entri | `<!-- ISI -->` |
| Entri pada Kamis / Jumat | `<!-- ISI -->` / `<!-- ISI -->` |
| Entri kegagalan AI (nomor) | `<!-- ISI: mis. DEVLOG-03, DEVLOG-06, DEVLOG-09 -->` |
| Anggota yang menyetor entri | `<!-- ISI: dari total anggota -->` |
| Perubahan `AGENTS.md` yang dipicu devlog | `<!-- ISI: nomor DEVLOG -> perubahan -->` |
| Satu pelajaran terpenting untuk pekerjaan sehari-hari | `<!-- ISI -->` |
