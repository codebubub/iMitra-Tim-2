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

### [DEVLOG-01] Klien API & layar lapangan AO dibangun dari kontrak beku (FR-02/03/04/11) — kasus AI salah
- **Waktu**: 2026-08-20 20:35
- **Oleh**: Ray
- **Tool/Model**: 9Router → Claude Opus (mode agent dengan akses tulis ke repo)
- **Tugas**: Membangun layar milik saya (S-03 Buat Pengajuan, S-05 Upload Dokumen,
  S-06 Verifikasi Dokumen, S-07 Survei, FR-11 Notifikasi) beserta modul
  `src/api/{pengajuan,dokumen,survei,notifikasi}.ts`, terhadap kontrak beku
  SDD BAB 5. Endpoint dokumen/survei/anggota milik Dani belum ada (jalur R-3),
  jadi frontend dibangun ke kontrak, bukan menunggu backend.
- **Cara memberi konteks**: melampirkan SDD BAB 5 (daftar 32 endpoint), BAB 4.1
  (model data), AGENTS.md bagian 4.1 (enum status) & bagian 6 (larangan), serta
  spesifikasi layar S-03..S-07 dari UIUX-STITCH.md. Batasan eksplisit yang saya
  sebutkan: jangan hardcode angka bisnis (R-8/#3), URL berkas pakai id bukan NIK
  (BR-11), nomor referensi dari server (#4).
- **Keluaran AI**: 4 modul API + 5 komponen layar + 5 route di App.tsx. Build
  `tsc -b && vite build` hijau, eslint bersih pada percobaan pertama.
- **Yang salah**: keluaran yang "hijau" itu ternyata tidak cocok dengan bentuk
  respons/permintaan backend yang SEBENARNYA ada di `services/pengajuan.service.ts`.
  Tiga ketidakcocokan halus: (1) tipe anggota memakai `nikTertutup`, server
  mengirim `nikTersamar`; (2) tipe detail memakai `levelApproval`, server
  mengirim `urutanApproval` + `jumlahLevel`; (3) — yang paling merugikan —
  `AnggotaBaru` menandai `alamat` dan `jenisUsaha` sebagai OPSIONAL, padahal skema
  zod route (`skemaAnggota`) mewajibkan keduanya `.min(1)`. Form Buat Pengajuan
  saya tidak mengumpulkan kedua field itu sama sekali, jadi setiap submit AO akan
  ditolak 400 di server. Tidak terlihat oleh typecheck karena keduanya sisi
  frontend yang konsisten satu sama lain — hanya salah terhadap kontrak backend.
- **Cara verifikasi**: menyalakan backend terhadap database Aiven schema `dev_ray`
  (yang sudah dimigrasi + di-seed), lalu membaca `routes/index.ts` dan
  `services/pengajuan.service.ts` baris demi baris untuk membandingkan field
  respons dan skema zod permintaan dengan tipe TypeScript saya. Bukan "dibaca
  sekilas dan tampak benar" — saya cocokkan nama field satu per satu.
- **Tindakan**: memperbaiki tipe di `src/api/pengajuan.ts` (`nikTersamar`,
  `urutanApproval`/`jumlahLevel`, `RingkasBuatPengajuan` untuk POST create/submit),
  menjadikan `alamat`/`jenisUsaha` WAJIB, dan menambahkan input Alamat + Jenis
  usaha di form S-03 untuk perorangan maupun majelis. Build + lint hijau ulang.
- **Pelajaran**: build hijau + lint bersih pada kode frontend hanya membuktikan
  frontend konsisten dengan DIRINYA SENDIRI, bukan dengan kontrak backend. Untuk
  layar yang dibangun mendahului endpoint (R-3), verifikasi yang benar adalah
  membandingkan tipe langsung ke skema zod route dan bentuk respons service —
  bukan menunggu runtime. Kontrak dibekukan Kamis 13.00; setiap perubahan bentuk
  respons harus diumumkan dan SDD BAB 5 diperbarui di PR yang sama.

### [DEVLOG-02] Layar analis/approver/admin disambungkan ke API nyata (FR-05/06/07/08/13) — kasus AI salah
- **Waktu**: 2026-08-20 21:40
- **Oleh**: Eka
- **Tool/Model**: 9Router → Claude Opus (mode agent dengan akses tulis ke repo)
- **Tugas**: Mengisi keenam layar milik saya yang sebelumnya masih rangka 11 baris
  (S-08 SLIK, S-09 Skoring, S-10 Margin, S-11 Antrian Approval, S-13 Parameter,
  S-14 Kelola Pengguna) beserta modul `src/api/{slik,skoring,margin,approval,parameter}.ts`.
  Route-nya sudah didaftarkan Reffa di `App.tsx`, jadi tugasnya mengisi isi
  layar, bukan menambah route.
- **Cara memberi konteks**: melampirkan AGENTS.md **lengkap** (bukan ringkasan),
  spesifikasi S-08…S-14 dari UIUX-STITCH.md, SDD BAB 4.1 (model data) dan BAB 5
  (kontrak endpoint), serta `docs/PEMBAGIAN-TIM.md` untuk batas modul. Batasan
  yang saya sebutkan eksplisit: BR-06 tanpa jalur "lanjutkan saja", BR-07/BR-08
  rincian 3 desimal, BR-11 NIK tidak boleh utuh, larangan #3 (tanpa konstanta
  angka bisnis), dan R-2 (`theme.css` + `components/` hanya milik Reffa).
- **Keluaran AI**: 5 modul API + 6 layar. `tsc --noEmit` dan `eslint` bersih,
  `vite build` hijau pada percobaan kedua (percobaan pertama satu peringatan
  `react-hooks/exhaustive-deps` di Parameter.tsx, diperbaiki dengan `useMemo`).
- **Yang salah**: dua pelanggaran yang lolos dari build hijau.
  **(1)** Keluaran pertama S-08 memakai empat kelas CSS baru (`.rincian-slik`,
  `.panel-peringatan`, `.kisi-kartu`, `.pengungkap`) yang tidak ada di
  `theme.css`. Layar tetap ter-build dan lint tetap bersih — CSS yang tidak ada
  hanya menghasilkan elemen tanpa gaya, bukan galat. Ini melanggar R-2: kelas
  bersama hanya milik Reffa.
  **(2)** Yang lebih berbahaya: tombol "Jalankan SLIK" mengirim `a.nikTersamar`
  ke `POST /slik-check`. NIK bertopeng (`3404********0001`) panjangnya tetap 16
  karakter sehingga **lolos** `z.string().length(16)` di route, lalu mock SLIK
  menjawab `NIK_NOT_FOUND`. Hasilnya: layar menampilkan "Layanan SLIK gagal"
  padahal yang salah adalah datanya sendiri — kegagalan palsu yang akan terlihat
  seperti bug backend Alfian saat demo.
- **Cara verifikasi**: menjalankan `grep -nE` terhadap keenam layar untuk empat
  hal secara terpisah: angka bisnis literal (11.0/13.0/50000000/bobot 35), kata
  yang menandakan jalur BR-06 ("lanjutkan saja", "pengecualian", "paksa"),
  pemakaian `.nik` selain `nikTersamar`, dan kata "hapus/delete" di S-14. Lalu
  membaca `routes/slik.ts` + `routes/parameter.ts` + `routes/skoring.ts` baris
  demi baris untuk mencocokkan bentuk respons — bukan mengandalkan build.
  Dari pembacaan itulah lima temuan kontrak (T-1…T-5) muncul.
- **Tindakan**: (1) keempat kelas CSS diganti objek gaya lokal di dalam berkas
  layar, memakai token yang sudah ada — tanpa menyentuh `theme.css`. (2) Kolom
  input NIK 16 digit ditambahkan ke kartu S-08; ANL mengetik ulang dari dokumen,
  nilainya dibuang dari state setelah panggilan berhasil, dan tombol nonaktif
  sampai `/^\d{16}$/` terpenuhi. (3) Lima temuan kontrak dicatat sebagai bagian
  3.1 di `TRACEABILITY.md` dan diteruskan ke Alfian, **tanpa** menambal dengan
  data tiruan di frontend.
- **Pelajaran**: validasi panjang string bukan validasi isi. Data yang sudah
  disamarkan untuk melindungi privasi (BR-11) sering tetap memenuhi batasan
  bentuk, sehingga ia lolos zod, lolos typecheck, lolos build — dan gagal hanya
  di runtime, dengan pesan yang menuduh komponen lain. Untuk setiap field yang
  ditopengi server, pertanyaannya bukan "apakah tipenya cocok" melainkan
  "apakah nilai ini masih dapat dipakai untuk tujuannya". Kalau tidak, frontend
  memang tidak boleh memilikinya, dan alurnya harus berubah — bukan tipenya.

### [DEVLOG-03] Test lapisan api/ untuk layar analis/approver/admin (FR-05/06/07/08/13) — kasus AI salah
- **Waktu**: 2026-08-20 22:10
- **Oleh**: Eka
- **Tool/Model**: 9Router → Claude Opus (mode agent dengan akses tulis ke repo)
- **Tugas**: Menulis test untuk lapisan `src/api/{slik,skoring,margin,approval,parameter}.ts`
  dan `client.ts`, karena frontend belum punya satu pun test dan Definition of
  Done (AGENTS.md bagian 7) mensyaratkan minimal satu test dari AC terkait.
  Batasan yang saya berikan: JANGAN pasang dependensi baru tanpa persetujuan
  (larangan #1), jadi test render komponen (butuh @testing-library/react + jsdom)
  ditunda; yang dikerjakan test lapisan api dengan fetch + localStorage di-stub.
- **Cara memberi konteks**: melampirkan `client.ts` (perilaku header auth &
  penerusan galat), keenam modul api, dan daftar AC/BR yang harus ditegakkan —
  terutama BR-11 (NIK tidak di URL), BR-06 (tanpa jalur "paksa"), BR-07/08
  (desimal tak dibulatkan), dan AC-04/AC-09 (field `rule` diteruskan).
- **Keluaran AI**: 6 berkas spec + 1 bantuan-uji, 29 test. `vitest run` hijau
  pada percobaan pertama — 29 lolos.
- **Yang salah**: "hijau" itu menipu. `vitest` lolos, tetapi `tsc --noEmit`
  **gagal dengan 8 error**. Dua akar: (1) `afterEach(() => vi.unstubAllGlobals())`
  — bentuk arrow tanpa kurung mengembalikan nilai `VitestUtils`, sedangkan
  `afterEach` mengharapkan `void`; Vitest tetap menjalankannya, tetapi kontrak
  tipenya salah. (2) stub `Response` di-cast `as Response` padahal objeknya tidak
  cukup mirip — TS menolaknya, butuh `as unknown as Response`. Kalau berhenti di
  "vitest hijau", berkas test ini akan menggagalkan `npm run build` (yang
  menjalankan `tsc -b`) di CI — test yang justru merusak build.
- **Cara verifikasi**: (a) menjalankan `tsc --noEmit`, `eslint`, dan `vite build`
  SELAIN `vitest` — bukan hanya test runner. (b) yang lebih penting: menguji
  bahwa test-nya benar-benar menangkap regresi, dengan menyabotase kode sumber
  sementara. Mengirim NIK di URL membuat test BR-11 gagal tepat; menghapus
  `rule: body.rule` di client.ts membuat dua test AC-04/AC-09 gagal tepat.
  Keduanya pulih setelah kode dikembalikan. Test yang tidak bisa gagal tidak
  membuktikan apa pun.
- **Tindakan**: memperbaiki kedelapan error tipe (afterEach dibungkus blok,
  cast `as unknown as Response`), lalu menjalankan ulang keempat gerbang sampai
  semuanya exit 0: tsc bersih, eslint bersih, vite build hijau, 29 test lolos.
- **Pelajaran**: "test lolos" dan "test benar" adalah dua hal berbeda, dan
  keduanya berbeda lagi dari "test tidak merusak build". Test runner memakai
  transpilasi (esbuild) yang MENGABAIKAN error tipe; hanya `tsc` yang
  menegakkannya. Definition of Done untuk berkas test bukan "vitest hijau"
  melainkan keempat gerbang hijau DAN test terbukti gagal saat kodenya salah.
  Sabotase terkontrol adalah cara termurah membuktikan yang terakhir.

### [DEVLOG-04] Klien survei mengarang field `fotoUrl` & bentuk multipart yang tidak ada di kontrak (FR-04) — kasus AI salah
- **Waktu**: 2026-08-21 08:35
- **Oleh**: Ray
- **Tool/Model**: 9Router → Claude Opus (mode agent dengan akses tulis ke repo)
- **Tugas**: Menyelaraskan modul `src/api/survei.ts` + layar S-07 (Rekam & Nilai
  Survei, FR-04) ke endpoint survei Dani yang kini sudah ada di `main`
  (`routes/survei.ts`, `services/survei.service.ts`). Layar ini semula dibangun
  mendahului backend (jalur R-3), jadi tugasnya memverifikasi klien terhadap
  kontrak yang sekarang nyata, bukan terhadap asumsi lama.
- **Cara memberi konteks**: melampirkan `routes/survei.ts` (skema zod `skemaRekam`
  + `skemaNilai`), `services/survei.service.ts` (bentuk respons `daftarSurvei`),
  model `Survei` di `schema.prisma`, dan AGENTS.md bagian 6 butir 1 (jangan tambah
  dependensi — jadi tidak boleh pakai pustaka multipart). Batasan eksplisit:
  foto lewat base64 di JSON, BR-11 (path/URL foto bukan data pribadi di daftar).
- **Keluaran AI**: modul `survei.ts` versi awal — tipe `Survei` memuat
  `fotoUrl: string[]`, fungsi `rekamSurvei` mengirim `multipart/form-data`
  (FormData dengan `File[]` dan koordinat opsional `number | null`), dan layar
  ANL merender galeri `survei.fotoUrl.map(...)`. `tsc -b`, `eslint`, `vite build`
  semuanya hijau.
- **Yang salah**: dua kesalahan yang saling menutupi sehingga tampak benar.
  **(1)** `GET /api/pengajuan/{id}/survei` (`daftarSurvei`) **tidak pernah
  mengembalikan `fotoUrl`** — server hanya mengirim fakta terukur (lat, lng,
  omzet, lama usaha, skala, status). Tidak ada endpoint pengambilan foto survei
  sama sekali. AI mengarang field itu karena "layar survei tentu menampilkan
  foto" terdengar masuk akal, dan karena `string[]` yang kosong tidak pernah
  memicu galat tipe. **(2)** `rekamSurvei` mengirim multipart, padahal
  `skemaRekam` mewajibkan JSON `{ fotoBase64, fotoMime, latitude, longitude,
  catatan }` — SATU foto base64, koordinat & catatan WAJIB (`z.number()`,
  `.min(1)`), bukan `File[]` opsional. Semua lolos typecheck karena kliennya
  konsisten dengan dirinya sendiri; kesalahannya murni terhadap kontrak server.
  Yang membuatnya lolos perhatian: build hijau + bentuk lama (multipart, foto
  jamak) adalah pola "wajar" untuk unggah foto, jadi tidak ada yang tampak aneh
  saat dibaca sekilas.
- **Cara verifikasi**: review kontrak baris-demi-baris SEBELUM merge — membuka
  `routes/survei.ts` dan `services/survei.service.ts` di sebelah `survei.ts`,
  lalu mencocokkan tiap field permintaan ke `skemaRekam` dan tiap field respons
  ke objek yang benar-benar dikembalikan service. `fotoUrl` tidak ada padanannya
  di service → ketahuan karangan. `rekamSurvei` mengirim FormData sedangkan route
  memanggil `skemaRekam.parse(req.body)` atas JSON → setiap submit akan 400.
  Ketahuan lewat review kontrak, BUKAN lewat test dan bukan lewat menjalankan
  aplikasi (endpoint-nya belum pernah dipanggil dari layar ini secara live).
- **Tindakan**: menulis ulang `survei.ts` ke kontrak nyata — hapus `fotoUrl`,
  `rekamSurvei` kirim JSON base64 via helper `api()`, koordinat jadi `number`
  wajib. Layar ANL: blok galeri `fotoUrl` dihapus (kalau dibiarkan,
  `survei.fotoUrl.length` meng-crash layar karena field-nya `undefined` saat
  runtime). Menambah util `src/api/berkas.ts` (`fileKeBase64`) tanpa menyentuh
  `client.ts` milik Reffa. `bolehKirimSurvei` diperketat mewajibkan koordinat,
  dengan test batas dari AC-04. Commit f65b6c9; keempat gerbang hijau ulang.
- **Pelajaran**: field yang "sepertinya pasti ada" adalah tempat paling rawan AI
  berhalusinasi, dan tipe `array`/optional menyembunyikannya dari typecheck
  karena nilai kosong selalu valid secara tipe. Untuk klien yang dibangun
  mendahului endpoint (R-3), sumber kebenaran adalah objek yang benar-benar
  di-`return` service dan skema zod route — bukan nama field yang terdengar
  wajar. Membaca respons service, bukan mengarang bentuknya, sekarang jadi
  langkah wajib sebelum saya sebut sebuah layar "tersambung".

### [DEVLOG-05] `ubahAnggota` mengirim field `nama` yang di-drop diam-diam oleh skema route (FR-02, FR-10) — kasus AI salah
- **Waktu**: 2026-08-21 08:42
- **Oleh**: Ray
- **Tool/Model**: 9Router → Claude Opus (mode agent dengan akses tulis ke repo)
- **Tugas**: Menyelaraskan sisa modul `src/api/pengajuan.ts` ke kontrak backend
  yang sudah di-`main`, termasuk `ubahAnggota` untuk `PATCH
  /api/pengajuan/{id}/anggota/{anggotaId}` (ubah anggota majelis saat DRAFT,
  FR-10 / AC-14).
- **Cara memberi konteks**: melampirkan `routes/index.ts` (skema `skemaUbahAnggota`
  + pendaftaran route PATCH anggota) dan `services/pengajuan.service.ts` (fungsi
  `ubahAnggota` dan nilai yang dikembalikannya), plus SDD BAB 5 baris endpoint
  anggota. Batasan: bentuk permintaan harus persis skema zod route, jangan
  menambah field yang tak diterima server.
- **Keluaran AI**: tipe klien `ubahAnggota(id, anggotaId, input:
  Partial<Pick<AnggotaBaru,'nama'|'plafonDiajukan'>>)` yang mengembalikan
  `Anggota` penuh — jadi pemanggil boleh mengirim `{ nama }`, `{ plafonDiajukan }`,
  atau keduanya. `tsc -b` dan `eslint` hijau.
- **Yang salah**: `skemaUbahAnggota` di route HANYA
  `z.object({ plafonDiajukan: z.number().int().positive() })` — dan **tidak
  `.strict()`** (berbeda dari `skemaUbahPengguna` yang `.strict()` di berkas yang
  sama). Konsekuensinya field `nama` yang dikirim klien **tidak ditolak, tetapi
  dibuang diam-diam** oleh zod: server balas 200, tetapi nama tidak pernah
  berubah. Ini justru lebih berbahaya daripada 400 — panggilan "berhasil",
  UI-nya akan tampak sukses, dan nama yang salah tetap tersimpan tanpa ada galat
  yang menunjuk penyebabnya. Selain itu service hanya mengembalikan ringkasan
  `{ id, plafonDiajukan }`, bukan `Anggota` penuh seperti tipe klien mengklaim.
  Yang membuatnya lolos perhatian: `.strict()` tidak wajib di zod, jadi tanpa
  membuka berkas route mustahil menebak field asing akan di-drop; dan karena
  fungsi ini **belum dipakai satu layar pun** (S-03 saat ini membangun ulang
  seluruh anggota lewat POST, bukan PATCH per field), bug-nya laten — tidak ada
  test maupun layar yang akan memicunya, jadi ia bisa hidup sampai orang lain
  memakainya berbulan kemudian.
- **Cara verifikasi**: review kontrak baris-demi-baris SEBELUM merge — membandingkan
  tipe `input` klien dengan `skemaUbahAnggota` dan tipe kembalian dengan nilai
  `return` service. Perbedaan `nama` (ada di klien, tidak ada di skema) langsung
  terlihat; lalu saya cek apakah skema `.strict()` — ternyata tidak, jadi
  perilakunya "diterima lalu dibuang", bukan "ditolak". Ketahuan lewat review
  kontrak, bukan test/aplikasi — memang tidak akan tertangkap test karena tidak
  ada pemanggil, itulah kenapa saya catat sebagai bug laten, bukan bug aktif.
- **Tindakan**: mempersempit tipe klien menjadi `input: { plafonDiajukan: number }`
  dan tipe kembalian menjadi ringkasan `{ id, plafonDiajukan; urutan? }` yang
  benar-benar dikirim server, dengan komentar bahwa endpoint ini tidak mendukung
  ubah nama. Perubahan nasabah (nama) memang bukan kapabilitas endpoint ini —
  kalau kelak dibutuhkan, itu perubahan skema milik Dani + Firman, saya cukup
  menandainya, bukan menambalnya di klien. Commit dcf0e21.
- **Pelajaran**: zod tanpa `.strict()` menerima-lalu-membuang field asing, jadi
  "server balas 200" TIDAK membuktikan permintaan saya benar. Klien harus dibentuk
  dari skema route yang sebenarnya, bukan dari tipe domain (`AnggotaBaru`) yang
  kebetulan punya lebih banyak field. Dan bug pada kode yang belum dipakai tetap
  bug — justru yang paling licin, karena tak ada test yang menabraknya; menyempitkan
  tipe klien sekarang mencegah pemanggil pertama kelak menulis `{ nama }` dan
  mengira itu berhasil.

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
