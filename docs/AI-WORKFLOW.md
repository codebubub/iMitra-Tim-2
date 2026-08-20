# AI-WORKFLOW — Cara Tim Ini Bekerja dengan AI

**Tim**: `<!-- ISI: nama tim -->`
**Pemilik berkas**: AI Workflow Officer — `<!-- ISI: nama -->`
**Terakhir diperbarui**: `<!-- ISI: tanggal & jam -->`

> Target panjang: satu sampai dua halaman. Ini dokumen **keputusan**, bukan laporan.
> Bedanya dengan `AI-DEVLOG.md`: devlog mencatat kejadian satu per satu, berkas ini mencatat
> pola — bagaimana tim memutuskan tool mana untuk tugas mana, dan apa yang tidak diserahkan
> ke AI. Isi kerangkanya di Sprint 0 (walaupun masih dugaan), lalu perbarui pada Jumat siang
> dengan apa yang **ternyata** terjadi. Perbedaan antara dugaan awal dan kenyataan justru
> bagian yang paling menarik untuk penilai — jangan dihapus, catat sebagai revisi.

---

## 1. Tugas → Tool/Model → Alasan

<!-- ISI: satu baris per jenis tugas. Hapus baris yang tidak Anda kerjakan, tambahkan yang
     kurang. Kolom "Alasan" harus berisi alasan teknis yang spesifik, bukan "lebih bagus".
     Contoh alasan yang bernilai: "patuh pada format tabel yang kami minta", "konteks
     panjang cukup untuk melampirkan SRS + skema sekaligus", "autocomplete di dalam berkas
     lebih cepat daripada bolak-balik ke chat untuk pekerjaan mekanis".
     Kolom "Terbukti?" diisi pada Jumat: Ya / Tidak / Diganti ke X. -->

| Tugas | Tool | Model | Alasan pemilihan | Terbukti? |
|---|---|---|---|---|
| Perancangan & kritik model data | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |  |
| Menulis migrasi skema | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |  |
| Aturan bisnis (skoring, margin, routing approval) | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |  |
| CRUD & endpoint rutin | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |  |
| Komponen UI per peran | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |  |
| Integrasi HTTP ke mock SLIK + jalur error | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |  |
| Menulis test dari AC | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |  |
| Review kode / cari bug sebelum PR | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |  |
| docker-compose & CI | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |  |
| Seed & data uji | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |  |
| Dokumentasi (SRS, SDD, ADR) | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |  |
| Debugging galat runtime | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |  |

---

## 2. Cara Kami Memberi Konteks ke AI

<!-- ISI: bagian ini yang membedakan tim yang memakai AI sebagai alat rekayasa dari tim yang
     memakainya sebagai mesin tebak. Jawab konkret, bukan prinsip umum. -->

**Yang selalu dilampirkan** (dan mengapa):

| Yang dilampirkan | Untuk tugas apa | Kenapa |
|---|---|---|
| `AGENTS.md` | `<!-- ISI -->` | `<!-- ISI -->` |
| Bagian brief yang relevan (mis. Tabel 4.3) | `<!-- ISI -->` | `<!-- ISI -->` |
| AC terkait, apa adanya | `<!-- ISI -->` | `<!-- ISI -->` |
| Skema / berkas migrasi | `<!-- ISI -->` | `<!-- ISI -->` |
| Berkas yang akan diubah, utuh | `<!-- ISI -->` | `<!-- ISI -->` |
| ADR yang sudah diputuskan | `<!-- ISI -->` | `<!-- ISI -->` |

**Yang sengaja TIDAK dilampirkan**: `<!-- ISI: mis. seluruh repo sekaligus — karena konteks
yang terlalu luas membuat keluaran menyentuh berkas yang tidak diminta. Atau: data nasabah,
walaupun fiktif, di luar fixtures resmi. -->`

**Batasan yang selalu kami sebut eksplisit di prompt**:

<!-- ISI: daftar kalimat batasan yang tim pakai berulang. Ini "pustaka prompt" tim, dan
     AI Workflow Officer yang menjaganya. Contoh bentuk yang berguna:
     - "parameter dibaca dari tabel X, jangan hardcode"
     - "jangan tambah dependensi; pakai yang sudah ada di manifest"
     - "jelaskan rencana dulu dalam maksimal 10 baris, jangan tulis kode sebelum saya setuju"
     - "maksimal 150 baris; kalau lebih, pecah jadi langkah" -->

- `<!-- ISI -->`
- `<!-- ISI -->`
- `<!-- ISI -->`

**Pola prompt yang paling sering berhasil**: `<!-- ISI: satu atau dua pola, tulis bentuknya
supaya anggota lain bisa memakainya. -->`

**Pola prompt yang kami hentikan**: `<!-- ISI: dan apa yang salah dengannya. Rujuk nomor
DEVLOG kalau ada. -->`

---

## 3. Pembagian AI vs Manual

<!-- ISI: isi ketiga kolom. Ini bukan pengakuan; ini keputusan rekayasa yang harus punya
     dasar. Kolom "Dasar keputusan" tidak boleh diisi "lebih cepat" saja — lebih cepat untuk
     apa, dan dengan risiko apa. -->

| Pekerjaan | AI / Manual / Campuran | Dasar keputusan |
|---|---|---|
| Model data & relasi | `<!-- ISI -->` | `<!-- ISI -->` |
| Migrasi | `<!-- ISI -->` | `<!-- ISI -->` |
| Perhitungan skor (BR-07, BR-08) | `<!-- ISI -->` | `<!-- ISI -->` |
| Validasi rentang margin (BR-06) | `<!-- ISI -->` | `<!-- ISI -->` |
| Routing approval berjenjang (BR-01, BR-02) | `<!-- ISI -->` | `<!-- ISI -->` |
| Pemisahan maker/checker (BR-09) | `<!-- ISI -->` | `<!-- ISI -->` |
| Middleware otorisasi | `<!-- ISI -->` | `<!-- ISI -->` |
| Audit trail append-only | `<!-- ISI -->` | `<!-- ISI -->` |
| Boilerplate CRUD | `<!-- ISI -->` | `<!-- ISI -->` |
| Form & tampilan | `<!-- ISI -->` | `<!-- ISI -->` |
| Test dari AC | `<!-- ISI -->` | `<!-- ISI -->` |
| Review PR | `<!-- ISI -->` | `<!-- ISI -->` |

**Aturan tim tentang ukuran keluaran AI**: `<!-- ISI: mis. "keluaran > 200 baris tidak
di-merge sebelum dibaca baris per baris oleh orang selain yang meminta". Brief §13 butir 6
menyarankan mencurigai keluaran besar; tuliskan aturan Anda sendiri. -->`

**Aturan tim tentang siapa yang bertanggung jawab atas kode hasil AI**: `<!-- ISI. Ingat
brief §12: penilai akan menunjuk satu baris acak dan meminta orang yang commit menjelaskan
apa yang dilakukannya, mengapa, dan apa yang terjadi kalau dihapus. Jawaban "itu dari AI"
menurunkan nilai. -->`

---

## 4. Yang Tidak Kami Percayakan ke AI

<!-- ISI: minimal 3 hal, dengan alasan teknis. Bagian ini dibaca penilai sebagai indikator
     kedewasaan tim. Jawaban yang lemah: "hal-hal penting". Jawaban yang kuat menyebut
     mekanisme kegagalannya — mengapa AI cenderung gagal di situ, dan apa akibatnya kalau
     kegagalan itu lolos ke main. -->

| Yang tidak diserahkan ke AI | Alasan | Bagaimana kami mengerjakannya |
|---|---|---|
| `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |
| `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |
| `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |

Kandidat yang layak dipertimbangkan — putuskan sendiri, jangan salin mentah:

- Nilai harapan (expected value) di dalam test aturan bisnis. Kalau angka harapan berasal
  dari AI, test hanya membuktikan AI konsisten dengan dirinya sendiri (brief §13 butir 7).
- Keputusan arsitektur yang mahal dibatalkan — dicatat di ADR oleh manusia.
- Penentuan prioritas FR mana yang dibuang di Gate 3.
- Apa pun yang menyentuh data pribadi (BR-11) dan penegakan otorisasi di server (AC-02).

---

## 5. Perbandingan Tool Antar Anggota

> Tim ini memakai tool yang berbeda-beda: 9Router/OmniRouter (Claude dan LLM lain),
> VSCode + Copilot, Hermes IDE, Antigravity IDE. Brief §9.1 menyebut hal ini **menarik**,
> bukan masalah. Bagian ini adalah kesempatan mendapatkan nilai yang tidak bisa didapat tim
> lain: satu proyek nyata, satu domain, empat tool, dan pengamatan langsung dari orang yang
> memakainya selama 9 jam.
>
> Yang membuat bagian ini bernilai adalah **kekhususannya**. "Tool A bagus untuk backend"
> tidak bernilai. "Tool A mempertahankan konteks lintas berkas sehingga cocok untuk
> perubahan yang menyentuh service + repository + test sekaligus; tool B kehilangan konteks
> di berkas ketiga sehingga kami pakai hanya untuk perubahan satu berkas" bernilai.
>
> Cara mengisinya tanpa menghabiskan waktu: setiap anggota menulis 3 baris tentang tool-nya
> saat istirahat makan, AI Workflow Officer yang merangkum. Sepuluh menit total.

### 5.1 Siapa memakai apa

<!-- ISI: satu baris per anggota. -->

| Anggota | Tool utama | Model yang dipakai | Untuk bagian apa |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

### 5.2 Pengamatan per tool

<!-- ISI: isi hanya tool yang benar-benar dipakai. Kolom "Kegagalan khas" adalah yang paling
     berguna bagi tim Anda sendiri di pekerjaan sehari-hari — dan yang paling meyakinkan
     bagi penilai bahwa Anda benar-benar mengamati, bukan menyalin kesan umum. -->

| Tool | Paling kuat untuk | Paling lemah untuk | Kegagalan khas yang kami amati | Cara kami menyiasatinya |
|---|---|---|---|---|
| 9Router / OmniRouter | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |
| VSCode + Copilot | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |
| Hermes IDE | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |
| Antigravity IDE | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |
| `<!-- ISI: tool lain -->` | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |

### 5.3 Uji banding kecil (opsional, tetapi bernilai)

<!-- ISI: kalau memungkinkan, ambil SATU tugas identik dan berikan ke dua tool berbeda,
     lalu bandingkan. Tugas yang cocok karena punya jawaban benar yang jelas:
     - implementasi BR-07 (pembulatan hanya di akhir), atau
     - penanganan SLIK 503 + timeout (harus berhenti, tidak boleh menganggap SLIK bersih)
     Batasi 15 menit. Kalau tidak sempat, tulis "tidak dilakukan" — jangan mengarang. -->

**Tugas yang dibandingkan**: `<!-- ISI -->`
**Konteks yang diberikan (identik ke keduanya)**: `<!-- ISI -->`

| Tool | Keluaran | Benar / salah | Catatan |
|---|---|---|---|
| `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |
| `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |

**Kesimpulan yang kami pakai untuk sisa hackathon**: `<!-- ISI -->`

### 5.4 Apakah `AGENTS.md` terbaca oleh semua tool?

<!-- ISI: ini pertanyaan praktis yang jawabannya sering mengejutkan. Uji dengan cara sederhana:
     minta agent menyebutkan satu larangan spesifik dari AGENTS.md tanpa Anda melampirkannya.
     Kalau tidak terbaca otomatis, catat bagaimana Anda menyiasatinya (lampirkan manual,
     buat berkas penunjuk, atau tempel bagian yang relevan ke awal prompt). -->

| Tool | Membaca otomatis? | Nama berkas yang dibacanya | Siasat kalau tidak terbaca |
|---|---|---|---|
| `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |
| `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |

---

## 6. Revisi Cara Kerja Selama Hackathon

<!-- ISI: catat setiap kali tim mengubah cara kerjanya dengan AI. Ini bukti pembelajaran
     — hal yang sama yang dinilai pada evolusi AGENTS.md. -->

| Kapan | Yang diubah | Pemicu (DEVLOG-xx) |
|---|---|---|
|  |  |  |
|  |  |  |
|  |  |  |
