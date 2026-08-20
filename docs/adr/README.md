# Architecture Decision Records (ADR)

ADR adalah catatan satu halaman tentang **satu keputusan arsitektur**: apa yang diputuskan,
mengapa, dan apa yang menjadi konsekuensinya. Ia ditulis sekali, tidak diedit ketika keadaan
berubah — kalau keputusannya berubah, buat ADR baru yang menyatakan ADR lama `Superseded`.

**Minimal 3 ADR** (brief §9.4). Dan **minimal satu ADR wajib mencatat keputusan di mana Anda
menolak saran AI**, beserta alasan teknisnya. Itu bukti bahwa Anda yang memegang kendali
arsitektur, bukan sebaliknya — dan bernilai bonus +2 (brief §12).

## Berkas di direktori ini

| Berkas | Isi |
|---|---|
| `0000-template.md` | Salin ini untuk setiap ADR baru |
| `0001-pilihan-stack.md` | Wajib. Bahasa, framework, database, ORM, dan alasannya |
| `0002-....md` | `<!-- ISI: judul -->` |
| `0003-....md` | `<!-- ISI: judul -->` |

Penomoran berurutan, tidak pernah dipakai ulang. Nama berkas: `NNNN-slug-singkat.md`.

## Cara menulis ADR yang baik dalam 5 menit

ADR bukan esai. Lima menit cukup, dan ADR lima menit yang ditulis **saat keputusan diambil**
jauh lebih bernilai daripada ADR satu jam yang ditulis dari ingatan pada Jumat sore.

1. **Menit 1 — tulis keputusannya lebih dulu, satu kalimat, dalam bentuk perintah.**
   "Kami memakai PostgreSQL dengan migrasi berbasis berkas SQL." Kalau satu kalimat tidak
   cukup, kemungkinan besar ini dua keputusan dan perlu dua ADR.
2. **Menit 2 — tulis konteksnya: tekanan apa yang membuat keputusan ini perlu diambil.**
   Fakta, bukan pendapat. Contoh fakta: waktu 9 jam, dua orang belum pernah memakai ORM X,
   penilai menjalankan `docker compose up` di mesin bersih. Konteks yang baik membuat pembaca
   di masa depan paham bahwa keputusan ini masuk akal **saat itu**.
3. **Menit 3 — tulis alasan: kenapa opsi ini, bukan yang lain.** Hubungkan ke konteks di
   menit 2. Kalau alasannya tidak merujuk satu pun fakta dari konteks, alasannya masih
   berupa selera.
4. **Menit 4 — tulis konsekuensi, termasuk yang merugikan.** ADR yang hanya berisi
   keuntungan adalah iklan, bukan keputusan. Sebutkan juga apa yang menjadi lebih sulit.
5. **Menit 5 — tulis alternatif yang ditolak, satu baris per alternatif, beserta alasan
   penolakan.** Ini bagian yang paling sering dilewati dan paling sering ditanya di gate.
   Alternatif tanpa alasan penolakan tidak menambah nilai.

Setelah itu commit. Jangan diperhalus.

## Kesalahan yang membuat ADR kehilangan nilai

- Menulis ADR untuk hal yang bukan keputusan arsitektur (nama variabel, pilihan warna).
- Menulis ADR setelah semuanya jadi, dengan alasan yang direkonstruksi. Timestamp commit
  memperlihatkannya.
- Mengedit ADR lama ketika keputusannya berubah. Buat ADR baru, tandai yang lama
  `Superseded oleh ADR-000X`.
- Tidak mencantumkan alternatif yang ditolak.
- ADR yang isinya bertentangan dengan kode. Kalau kode menang, perbarui statusnya.

## ADR yang mencatat penolakan saran AI

Ini wajib ada minimal satu. Bentuknya sama dengan ADR biasa, dengan tambahan pada bagian
"Alternatif yang ditolak": sebutkan **apa yang disarankan AI**, dengan tool/model apa,
dan **kenapa Anda menolaknya**. Alasan penolakan harus teknis dan bisa diperiksa —
misalnya karena saran itu menyimpan nilai turunan yang akan basi pada skenario AC-14,
atau karena saran itu menaruh aturan bisnis di lapisan yang salah menurut ADR sebelumnya.

Kalau ada entri di `docs/AI-DEVLOG.md` yang terkait, rujuk nomornya. Dua artefak yang saling
merujuk lebih meyakinkan daripada dua artefak yang berdiri sendiri.

## Daftar ADR (perbarui setiap menambah ADR)

<!-- ISI: tabel ringkas. Berguna di gate: penilai bisa melihat seluruh keputusan tanpa
     membuka tujuh berkas. -->

| No | Judul | Status | Tanggal | Menolak saran AI? |
|---|---|---|---|---|
| 0001 | Pilihan stack | `<!-- ISI -->` | `<!-- ISI -->` | `<!-- ISI -->` |
|  |  |  |  |  |
|  |  |  |  |  |
