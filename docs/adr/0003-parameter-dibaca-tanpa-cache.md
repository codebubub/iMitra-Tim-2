# ADR-0003: Parameter bisnis dibaca dari database pada setiap pemakaian, dan hasil skoring menyimpan snapshot-nya

- **Status**: Accepted
- **Tanggal**: 2026-08-20
- **Pengambil keputusan**: Tech Lead — Muhammad Rayhan Subhi, bersama Backend Engineer Risiko — Alfian
- **Terkait**: FR-06, FR-07, FR-08, **FR-13**; BR-05, BR-06, BR-07, BR-08; **AC-15**, AC-09; `docs/SDD-iMitra.md` BAB 2.3 dan 4.1

---

## Konteks

Tiga kelompok angka dalam sistem ini menentukan keputusan pembiayaan: bobot komponen skor
(§4.4), ambang approval per plafon (§4.1), dan rentang margin per grade (§4.3). Brief
menyatakan ketiganya **wajib tersimpan sebagai data**, bukan konstanta, dan AC-15 mengujinya
secara langsung:

> ADM mengubah bobot komponen "Lama usaha" dari 20 ke 25; skoring berikutnya memakai bobot
> baru **tanpa restart aplikasi**.

Dua tekanan yang saling bertabrakan:

1. **Kalau parameter di-cache di memori proses**, AC-15 gagal — atau lebih buruk, ia lolos
   di mesin pengembang (karena proses baru saja di-restart) dan gagal di depan penilai.
   Cache dengan TTL juga tidak menyelamatkan: penilai tidak akan menunggu 60 detik.
2. **Kalau parameter tidak disimpan bersama hasil**, hasil skoring lama menjadi tidak bisa
   dipertanggungjawabkan. Setelah ADM mengubah bobot, skor 84 yang tersimpan kemarin tidak
   lagi bisa direkonstruksi dari parameter yang berlaku hari ini — padahal BR-08 ada persis
   supaya analis bisa mempertanggungjawabkan keputusannya ke auditor.

Ada juga godaan yang perlu ditutup sejak awal: keluaran AI hampir selalu menuliskan tabel
seperti `{ 1: [11.0, 13.0], 2: [13.0, 15.5] }` sebagai object literal di dalam service.
Kode itu jalan, test buatannya hijau — dan salah, karena test-nya menguji konstanta itu,
bukan requirement kami.

---

## Keputusan

1. **Parameter dibaca dari database pada setiap pemanggilan** yang membutuhkannya. Tidak ada
   cache di memori proses: tidak ada variabel modul, tidak ada map statis, tidak ada TTL.
2. **Fungsi di `domain/` menerima parameter sebagai argumen**, tidak pernah membacanya
   sendiri. Yang membaca database adalah service.
3. **Setiap baris `hasil_skoring` menyimpan `snapshot_parameter` (jsonb)** berisi seluruh
   nilai parameter yang dipakai saat perhitungan itu, dan setiap baris
   `rincian_komponen_skor` menyimpan **nilai bobot**, bukan referensi ke tabel parameter.
4. **Hasil skoring lama tidak pernah dihitung ulang** ketika parameter berubah.

---

## Alasan

- **AC-15 menjadi konsekuensi arsitektur, bukan fitur yang bisa lupa dikerjakan.** Tidak ada
  cache berarti tidak ada yang perlu di-invalidasi, dan tidak ada jalan bagi nilai basi untuk
  hidup di memori.
- **Butir 2 membuat aturan bisnis benar-benar bisa diuji dari AC.** Unit test bisa memberi
  bobot apa pun tanpa database; test integrasi bisa **mengubah baris parameter lebih dulu**
  lalu memastikan hasilnya ikut berubah. Test yang hanya memanggil fungsi dengan nilai tetap
  tidak membuktikan parameter dibaca dari data — dan itulah bentuk test yang biasanya
  dihasilkan AI.
- **Butir 3 menyelesaikan konflik antara "berubah tanpa restart" dan "bisa
  dipertanggungjawabkan".** Perhitungan baru selalu memakai nilai terbaru; perhitungan lama
  selalu bisa direkonstruksi dari snapshot-nya sendiri. Keduanya benar sekaligus.
- **Biayanya kecil dan terukur.** Satu skoring membaca ~8 baris parameter. Pada beban
  hackathon, biaya query itu jauh di bawah ambang NFR-07 (< 500 ms), dan kalau kelak menjadi
  masalah, jawabannya adalah indeks atau read replica — bukan cache yang membuat AC-15 gagal.

---

## Konsekuensi

**Menjadi lebih mudah**:

- AC-15 lolos tanpa penanganan khusus, dan tidak bisa rusak karena PR lain.
- Instruktur bisa mengoreksi asumsi kami (A-1 margin referensi, A-2 hari kerja dan margin
  usaha, A-8 masa berlaku SLIK) dengan mengubah satu baris data — bukan satu PR.
- Audit terhadap keputusan pembiayaan lama tetap mungkin walaupun parameter sudah berubah
  beberapa kali.

**Menjadi lebih sulit / risiko yang diterima**:

- Setiap pemanggilan skoring melakukan query tambahan. Diterima secara sadar; NFR-07
  menetapkan angka yang akan kami ukur.
- `snapshot_parameter` menduplikasi data. Diterima: ini duplikasi **historis** (salinan
  keadaan pada satu titik waktu), bukan duplikasi nilai turunan yang bisa basi — berbeda
  sifatnya dari kolom yang ditolak di ADR-0002.
- Tidak ada perlindungan terhadap ADM yang memasukkan parameter tidak masuk akal di tengah
  demo. Mitigasi: validasi di FR-13 (bobot tidak negatif, Σ bobot > 0, rentang skor tidak
  tumpang tindih atau berlubang, `margin_min ≤ margin_maks`), dan setiap perubahan parameter
  masuk audit trail.

**Utang teknis yang diterima sadar**:

- Tidak ada versioning eksplisit pada tabel parameter (mis. `berlaku_sejak` / `berlaku_sampai`).
  Riwayat perubahan hanya bisa dibaca dari audit trail. Cukup untuk rilis ini; tidak cukup
  untuk produksi.

---

## Alternatif yang Ditolak

| Alternatif | Sumber usulan | Alasan ditolak |
|---|---|---|
| Cache parameter di memori dengan TTL 60 detik | — | AC-15 mensyaratkan perubahan berlaku pada skoring **berikutnya**. Penilai tidak akan menunggu TTL habis, dan kegagalannya akan terlihat tepat di depan mereka |
| Cache dengan invalidasi manual saat ADM menyimpan parameter | — | Benar secara teori, salah secara praktik dalam 9 jam: ia menambah satu jalur yang harus diingat setiap kali ada endpoint tulis parameter baru. Kebenaran yang bergantung pada ingatan bukan kebenaran |
| Parameter sebagai variabel lingkungan (`.env`) | — | Mengubahnya memerlukan restart container — pelanggaran langsung terhadap AC-15 dan FR-13. Ini juga alasan `SLIK_RESULT_VALID_DAYS` dipindahkan dari `.env.example` ke tabel parameter (asumsi A-8) |
| Menghitung ulang seluruh hasil skoring lama saat parameter berubah | — | Menghapus jejak keputusan yang sudah diambil analis. Auditor perlu tahu skor **saat keputusan dibuat**, bukan skor seandainya aturan hari ini berlaku surut |
| Rentang margin sebagai object literal di dalam service | Pola yang sering muncul pada keluaran AI | Melanggar FR-13 dan BR-06, dan test yang menyertainya menguji konstanta itu sendiri — hijau tetapi menipu. Larangan eksplisitnya ada di `AGENTS.md` bagian 6 butir 3 |

---

## Catatan Verifikasi

Keputusan ini gagal ditegakkan kalau salah satu dari ini benar:

- [ ] Ada variabel tingkat modul yang menyimpan parameter di luar pemanggilan
- [ ] Ada berkas di `domain/` yang mengimpor Prisma atau membaca `process.env`
- [ ] Ada angka dari brief §4.1, §4.3, atau §4.4 yang muncul sebagai literal di kode
      non-seed — **termasuk di dalam test**
- [ ] `parameter-live.spec.ts` lolos tanpa benar-benar mengubah baris database di antara dua
      pemanggilan skoring
