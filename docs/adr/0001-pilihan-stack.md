# ADR-0001: Pilihan Stack Teknologi iMitra

> **ADR ini wajib dan wajib selesai pada Sprint 0 (Kamis, sebelum 11.00).** Ia dibawa ke
> Gate 1 dan akan ditanyakan langsung. Brief §7.1 menyatakan bahasa, framework, database,
> dan pustaka bebas dipilih — dengan syarat **alasannya ditulis di ADR-001**.
>
> Target: 20 menit, satu halaman. Setiap bagian di bawah punya prompt pertanyaan; jawab
> pertanyaannya, hapus prompt-nya. Jangan tinggalkan `<!-- ISI: ... -->` mana pun.

- **Status**: `<!-- ISI: Proposed | Accepted -->`
- **Tanggal**: `<!-- ISI: 2026-08-20 -->`
- **Pengambil keputusan**: `<!-- ISI: nama Tech Lead + siapa yang ikut memutuskan -->`
- **Terkait**: seluruh FR; brief §7.1, §7.2; `AGENTS.md` bagian 2

---

## Konteks

<!-- ISI: prompt pertanyaan — jawab semuanya, ringkas.
     1. Apa yang harus dibangun dalam 9 jam koding? (backend + frontend terpisah, mock SLIK
        sebagai layanan terpisah, database dengan migrasi, seed, test, CI, docker compose)
     2. Stack apa yang sudah dikuasai anggota tim? Sebutkan berapa orang untuk masing-masing.
        Ini fakta paling menentukan — 9 jam bukan waktu untuk belajar framework baru.
     3. Ketentuan wajib mana dari brief §7.2 yang memengaruhi pilihan? (satu perintah untuk
        menjalankan di mesin bersih, migrasi bukan db.sql, seed idempoten, otorisasi
        server-side, CI hijau)
     4. Tool AI apa yang dipakai anggota, dan stack mana yang paling didukung oleh tool itu?
        Stack yang jarang dipakai berarti keluaran AI lebih sering salah dan verifikasi
        lebih mahal.
     5. Batasan lingkungan: apakah semua laptop bisa menjalankan Docker? Berapa lama waktu
        setup pertama? -->

`<!-- ISI: konteks -->`

**Keahlian tim** (fakta, bukan perkiraan optimis):

<!-- ISI: tabel ini yang paling sering menyelamatkan tim dari pilihan yang salah.
     Skala: Mahir / Pernah pakai / Belum pernah. -->

| Kandidat stack | Jumlah anggota mahir | Jumlah anggota pernah pakai | Belum pernah |
|---|---|---|---|
| `<!-- ISI -->` |  |  |  |
| `<!-- ISI -->` |  |  |  |
| `<!-- ISI -->` |  |  |  |

---

## Keputusan

<!-- ISI: pernyataan tegas dan lengkap. Semua nilai di bawah harus sama dengan
     AGENTS.md bagian 2 — kalau berbeda, salah satunya usang. -->

| Lapisan | Pilihan | Versi |
|---|---|---|
| Bahasa & framework backend | `<!-- ISI -->` | `<!-- ISI -->` |
| Bahasa & framework frontend | `<!-- ISI -->` | `<!-- ISI -->` |
| Database | `<!-- ISI -->` | `<!-- ISI -->` |
| ORM / query layer | `<!-- ISI -->` | `<!-- ISI -->` |
| Tool migrasi | `<!-- ISI -->` | `<!-- ISI -->` |
| Test runner | `<!-- ISI -->` | `<!-- ISI -->` |
| Linter / formatter | `<!-- ISI -->` | `<!-- ISI -->` |
| Bahasa mock SLIK | `<!-- ISI -->` | `<!-- ISI -->` |
| Orkestrasi lokal | Docker Compose | `<!-- ISI -->` |

**Cara menjalankan yang dijanjikan ke penilai**: `<!-- ISI: satu perintah -->`

**Yang secara eksplisit tidak termasuk keputusan ini**: `<!-- ISI: mis. pilihan pustaka UI
komponen, yang diputuskan Frontend Engineer sendiri; atau strategi caching, yang belum
diperlukan. -->`

---

## Alasan

<!-- ISI: prompt pertanyaan:
     1. Kriteria apa yang dipakai memilih, dan bobotnya? (keahlian tim / kecepatan sampai
        walking skeleton / dukungan tool AI / kemudahan menulis test / kemudahan Docker)
     2. Untuk setiap kriteria, mengapa pilihan ini menang?
     3. Apa bukti konkretnya? Contoh bukti: "empat dari tujuh anggota pernah mengirim
        aplikasi produksi dengan stack ini", bukan "stack ini populer".
     4. Bagaimana pilihan ini membantu memenuhi ketentuan wajib §7.2 — khususnya migrasi,
        seed idempoten, dan otorisasi server-side?
     5. Bagaimana pilihan ini memengaruhi kualitas keluaran AI? Apakah tim pernah
        mengujinya? -->

| Kriteria | Bobot bagi kami | Kenapa pilihan ini menang |
|---|---|---|
| Keahlian tim | `<!-- ISI -->` | `<!-- ISI -->` |
| Kecepatan sampai walking skeleton (Gate 2, Kamis 15.30) | `<!-- ISI -->` | `<!-- ISI -->` |
| Dukungan tool AI yang tim pakai | `<!-- ISI -->` | `<!-- ISI -->` |
| Kemudahan menulis test dari AC | `<!-- ISI -->` | `<!-- ISI -->` |
| Kemudahan dijalankan di mesin bersih | `<!-- ISI -->` | `<!-- ISI -->` |

---

## Konsekuensi

**Menjadi lebih mudah**:
- `<!-- ISI -->`

**Menjadi lebih sulit / risiko yang kami terima**:
<!-- ISI: contoh bentuk yang jujur: "satu anggota belum pernah memakai framework frontend
     ini, sehingga ia diberi pekerjaan di mock SLIK dan seed pada 2 jam pertama". -->
- `<!-- ISI -->`

**Utang teknis yang diterima sadar**:
- `<!-- ISI -->`

**Rencana kalau ternyata salah** (jawab ini sebelum Gate 1 — instruktur akan menanyakan
"apa satu hal yang paling mungkin membuat tim ini gagal, dan apa rencana Anda untuk itu?"):
- Sinyal bahwa keputusan ini salah: `<!-- ISI: mis. walking skeleton belum jalan pada
  Kamis 14.00 -->`
- Yang akan kami lakukan: `<!-- ISI -->`
- Batas waktu memutuskan: `<!-- ISI -->`

---

## Lapisan Autentikasi

<!-- ISI: brief §6.3 secara khusus meminta keputusan ini dicatat di ADR.
     Autentikasi lokal (username + password ter-hash, session atau JWT). JANGAN membangun
     integrasi AD/SSO. Tetapi rancang lapisannya supaya bisa ditukar nanti.
     Prompt pertanyaan:
     - Session atau JWT? Kenapa?
     - Algoritma hashing password apa?
     - Di mana batas (interface/abstraksi) yang memungkinkan penukaran ke AD/SSO nanti,
       dan bagian mana yang harus diubah kalau penukaran itu benar-benar terjadi?
     - Di mana peran (AO/ANL/KCP/KC/KOM/ADM) disimpan dan bagaimana dibaca di server pada
       setiap request? (AC-02 akan menguji ini langsung dengan panggilan API) -->

`<!-- ISI -->`

---

## Alternatif yang Ditolak

<!-- ISI: minimal dua. Kalau salah satu alternatif adalah saran AI yang Anda tolak,
     sebutkan tool/model-nya — dan kalau ADR inilah ADR yang memuat penolakan saran AI,
     rujuk nomor DEVLOG-nya. -->

| Alternatif | Sumber usulan | Alasan ditolak |
|---|---|---|
| `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |
| `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |
| `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |

---

## Catatan Verifikasi

- [ ] `AGENTS.md` bagian 2 sudah memuat versi yang sama dengan tabel Keputusan di atas
- [ ] `docker compose up` sudah pernah dijalankan dari clone bersih, bukan hanya dari
      direktori kerja yang sudah ada `node_modules`/artefak build
- [ ] Perintah test dan lint sudah sama di `AGENTS.md`, `README.md`, dan `ci.yml`
