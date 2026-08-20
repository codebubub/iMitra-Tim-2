# UI/UX — Prompt Google Stitch untuk iMitra

**Pemilik berkas**: Frontend Lead — Reffa
**Dikerjakan oleh**: Reffa · Ray · Eka (pembagian layar di `docs/PEMBAGIAN-TIM.md` §1)
**Turunan dari**: `docs/SDD-iMitra.md` BAB 6 · `docs/SRS-iMitra.md` BAB 5.1
**Tanggal**: 2026-08-20

---

## 0. Untuk apa berkas ini, dan untuk apa ia BUKAN

Berkas ini berisi prompt siap tempel untuk **Google Stitch** (`stitch.withgoogle.com`) —
satu blok per layar. Tujuannya memangkas waktu dari "layar kosong" ke "tata letak yang
sudah masuk akal", supaya waktu Reffa terpakai untuk **menyambungkan API dan menegakkan
perilaku**, bukan untuk menyusun grid dan memilih warna.

**Yang bukan tujuannya**, dan perlu ditegaskan sekarang karena inilah yang dinilai:

- **Keluaran Stitch adalah tata letak, bukan aplikasi.** Kode yang diekspor tidak tahu
  apa-apa tentang peran, status, atau aturan bisnis. Ia ditempel ke `frontend/src/pages/`
  sebagai titik awal, lalu **ditulis ulang** bagian datanya.
- **Menyembunyikan tombol bukan otorisasi.** Apa pun yang Stitch hasilkan, setiap endpoint
  tetap memeriksa peran di server (AC-02, dan sanksi −8 kalau gagal).
- **Tidak ada aturan bisnis di komponen UI.** Rentang margin, bobot skor, dan ambang
  approval datang dari API. Kalau keluaran Stitch memuat angka `11.0` atau `85` sebagai
  literal, hapus — itu pelanggaran `AGENTS.md` bagian 6 butir 3.
- Setiap sesi Stitch yang dipakai untuk menghasilkan layar yang benar-benar dipakai
  **wajib punya entri di `docs/AI-DEVLOG.md`** (tool: Google Stitch), sama seperti sesi AI
  lainnya. Ini termasuk pemakaian AI, dan bobotnya paling besar di rubrik.

---

## 1. Cara pakai

1. Buka Stitch, mulai proyek baru.
2. **Tempel blok §2 (Design System) lebih dulu** sebagai pesan pertama. Ia menjadi konteks
   untuk seluruh layar berikutnya dalam proyek yang sama — jangan tempel ulang di tiap layar.
3. Untuk tiap layar: pilih mode **Mobile** atau **Web** sesuai kolom di §3, lalu tempel blok
   prompt-nya apa adanya.
4. Perbaiki lewat pesan lanjutan, bukan dengan menulis ulang prompt dari nol. Contoh yang
   efektif: *"Make the score breakdown table denser and show 3 decimal places on the
   component score column"*.
5. Kalau hasilnya melenceng jauh, **kembali ke prompt dan tambahkan batasan**, jangan
   menambah 5 pesan perbaikan — sama seperti aturan tim untuk AI lainnya.
6. Ekspor ke Figma atau salin kodenya, lalu lihat §4 untuk cara memasukkannya ke
   `frontend/`.

**Urutan pengerjaan** (jangan generate semua 14 sekaligus — buat yang menutup AC lebih dulu):

| Gelombang | Layar | Pemilik | Kapan |
|---|---|---|---|
| 1 | S-01 Login · S-02 Dashboard | Reffa | Sprint 0, sebelum Gate 1 |
| 1 | S-03 Buat Pengajuan | Ray | Kamis siang, untuk Gate 2 |
| 2 | S-04 Detail Pengajuan · S-12 Audit Trail | Reffa | Jumat pagi |
| 2 | S-05 Upload Dokumen · S-06 Verifikasi Dokumen · S-07 Survei | Ray | Jumat pagi |
| 2 | S-08 SLIK · S-09 Skoring · S-10 Margin | Eka | Jumat pagi |
| 3 | S-11 Antrian Approval | Eka | Jumat pagi |
| 4 | S-13 Parameter ADM · S-14 Kelola Pengguna | Eka | Jumat siang |

**Reffa menyelesaikan fondasi UI lebih dulu** — `theme.css`, badge status, kartu, panel
galat, layout + sidebar — target **Kamis 13.00**. Sampai itu ada di `main`, Ray dan Eka
menghasilkan tata letak di Stitch tetapi belum menempelkannya ke `frontend/`, supaya tidak
ada tiga versi komponen yang sama.

---

## 2. Design System — tempel ini lebih dulu

```
I am designing "iMitra", an internal loan origination web app for a sharia microfinance
bank in Indonesia (Bank Syariah Nasional). It is used by bank staff, not by customers.
Six roles use it: field officers (AO), analysts (ANL), and three levels of approvers
(KCP, KC, KOM), plus an admin (ADM).

Apply this design system to every screen I ask for in this project:

TONE
Calm, dense, trustworthy, institutional. This is a banking back-office tool that handles
money and personal data — not a consumer fintech app. No gradients, no illustrations,
no marketing copy, no emoji. Clarity over personality. Staff use it for hours.

COLOR
- Primary: deep teal #0F6B5C (buttons, active nav, links)
- Primary hover: #0B564A
- Accent: warm amber #C08A2E, used sparingly for "needs attention" only
- Background: #F7F8F7
- Surface / cards: #FFFFFF with 1px border #E3E6E4
- Text primary #16211E, secondary #5A6763, muted #8A948F
- Semantic: success #1F7A46, warning #B4700F, danger #B3261E, info #1B5E9E
- Status badges use a tinted background of the semantic color plus its dark text, never
  a solid saturated fill.

TYPE
- Font family: "Plus Jakarta Sans", fallback Inter, system-ui
- Page title 24/32 semibold, section title 18/26 semibold, body 14/22 regular,
  label 13/18 medium uppercase-tracking-wide, table cell 14/20, caption 12/16
- All monetary amounts and scores use tabular figures, right-aligned in tables

LAYOUT
- 8px spacing scale. Corner radius 8px on cards and inputs, 6px on buttons, 999px on badges
- Card shadow: none by default; use the 1px border instead
- Web screens: fixed left sidebar nav 240px, top bar 56px with page title and user chip,
  content max-width 1200px
- Mobile screens: single column, 16px side padding, sticky bottom action bar for the
  primary action, no left sidebar

LANGUAGE
All visible text is Indonesian. Use the exact Indonesian strings I give you — do not
translate them to English and do not invent new labels.

STATUS BADGES — these exact 15 values, in Indonesian sentence case, with these colors:
DRAFT (gray) · SUBMITTED (info) · VERIFIKASI_DOKUMEN (info) · DOKUMEN_DITOLAK (warning) ·
SLIK_OK (info) · SLIK_GAGAL (warning) · REJECTED_SLIK (danger) · SKORED (info) ·
REJECTED_SCORING (danger) · MENUNGGU_APPROVAL_L1 (info) · MENUNGGU_APPROVAL_L2 (info) ·
MENUNGGU_APPROVAL_L3 (info) · APPROVED (success) · REJECTED (danger) · DIKEMBALIKAN (warning)
Every badge must carry text — never communicate status by color alone.

RULES THAT APPLY TO EVERY SCREEN
1. Blocked actions are shown DISABLED with a tooltip naming the missing prerequisite.
   Never hide a button to indicate it is unavailable, and never show a button that does
   nothing.
2. Business-rule violations appear as a red banner: a plain sentence a user understands,
   with a small monospace badge showing the rule code (for example "BR-06") beside it.
3. Never display a full 16-digit national ID (NIK). Mask it as 3404********0001. Never put
   it in a URL, a filename, or a page title.
4. Every input has a visible label. Errors appear under the field, in text, not only in red.
5. Empty states say what to do next, in one sentence.
```

---

## 3. Prompt per layar

Kolom **AC** menunjukkan acceptance criteria yang bergantung pada layar itu — kalau
layarnya melenceng, AC itu yang gagal saat demo.

| # | Layar | Mode | Peran | AC | Pemilik | Backend yang dipanggil |
|---|---|---|---|---|---|---|
| S-01 | Login | Web | Publik | AC-01 | **Reffa** | Firman |
| S-02 | Dashboard Pipeline | Web | Semua | FR-12 | **Reffa** | Dani |
| S-03 | Buat Pengajuan | Mobile | AO | AC-01, AC-14 | **Ray** | Dani |
| S-04 | Detail Pengajuan | Web | Semua | semua | **Reffa** | Dani |
| S-05 | Upload Dokumen | Mobile | AO | AC-03 | **Ray** | Dani |
| S-06 | Verifikasi Dokumen | Web | ANL | AC-02, AC-03 | **Ray** | Dani |
| S-07 | Rekam & Nilai Survei | Mobile | AO, ANL | AC-04 | **Ray** | Dani |
| S-08 | SLIK Check | Web | ANL | AC-05, AC-06 | **Eka** | Alfian |
| S-09 | Skoring | Web | ANL | AC-06, AC-07, AC-08 | **Eka** | Alfian |
| S-10 | Margin / Nisbah | Web | ANL | AC-09 | **Eka** | Alfian |
| S-11 | Antrian Approval | Web | KCP/KC/KOM | AC-10, AC-11 | **Eka** | Dani |
| S-12 | Audit Trail | Web | Semua | AC-12, AC-13 | **Reffa** | Firman |
| S-13 | Parameter | Web | ADM | AC-15 | **Eka** | Alfian |
| S-14 | Kelola Pengguna | Web | ADM | — | **Eka** | Firman |

Kolom "Backend yang dipanggil" adalah **pasangan bicara** saat bentuk respons perlu
dipastikan. Setelah kontrak API dibekukan Kamis 13.00, bentuk respons tidak berubah lagi
tanpa memperbarui `docs/SDD-iMitra.md` BAB 5 di PR yang sama.

---

### S-01 · Login — **Web**

```
A login screen for iMitra, centered card 400px wide on the app background.

Card contains: the wordmark "iMitra" in primary teal, a one-line subtitle
"Sistem Originasi Pembiayaan Mikro Syariah" in secondary text, a username field labeled
"Nama pengguna", a password field labeled "Kata sandi" with a show/hide toggle, and a
full-width primary button "Masuk".

Below the card, small muted text: "Bank Syariah Nasional · Lingkungan demo".

Show an error state variant: a red banner above the fields reading
"Nama pengguna atau kata sandi salah" — the message must not reveal which one was wrong.

No "forgot password", no "sign up", no social login. This is an internal system with
seeded accounts.
```

**Wajib ada**: pesan galat tidak membocorkan field mana yang salah.

---

### S-02 · Dashboard Pipeline — **Web**

```
A pipeline dashboard, the landing page after login.

Left sidebar navigation with these items (Indonesian, with simple line icons):
"Dashboard", "Pengajuan", "Antrian Approval", "Parameter", "Pengguna". Show "Dashboard"
as active. At the bottom of the sidebar, a user chip: name, and role code badge "ANL".

Top bar: page title "Dashboard Pipeline", a bell icon with an unread count of 3, and a
"Keluar" text button.

Content, top row: 6 compact stat cards in a single row, each showing a large tabular
number and a small label underneath. Labels in order:
"Draft", "Verifikasi dokumen", "Menunggu SLIK", "Skoring", "Menunggu approval", "Disetujui".
Cards are clickable filters — show the third one in a selected state with a teal border.

Below: a filter row containing a search field with placeholder
"Cari nomor referensi atau nama nasabah", a status dropdown labeled "Status", and an
akad dropdown labeled "Akad".

Then a dense data table, 8 rows, columns:
"Nomor Referensi" (monospace, e.g. IMT-20260820-0007),
"Nasabah" (name, and underneath a small muted line "Kelompok · 4 anggota" for group rows),
"Akad" (badge: Murabahah or Musyarakah),
"Total Plafon" (right-aligned, formatted "Rp 240.000.000"),
"Status" (status badge),
"Level Approval" (small text "KCP → KC → KOM" with the current level in bold teal),
"Diperbarui" (relative time, e.g. "12 menit lalu").
Rows are clickable. Include pagination at the bottom.

Show an empty-state variant of the table: a single centered line
"Belum ada pengajuan pada filter ini." with a link "Bersihkan filter".
```

**Wajib ada**: kolom Total Plafon dan Level Approval — keduanya nilai turunan yang
dihitung server (ADR-0002), jadi UI hanya menampilkan.

---

### S-03 · Buat Pengajuan — **Mobile**

```
A mobile form for a field officer (AO) creating a financing application, designed for a
360px wide phone used one-handed outdoors.

A 3-step wizard with a slim step indicator at the top: "1 Nasabah", "2 Pembiayaan",
"3 Anggota". Show step 2 and step 3 as separate screens.

STEP 2 "Pembiayaan": a segmented control labeled "Jenis nasabah" with options
"Perorangan" and "Kelompok (Majelis)". Then a segmented control labeled "Akad" with
"Murabahah" and "Musyarakah". Then a currency input labeled "Plafon diajukan" prefixed
"Rp" with live thousand separators, and helper text under it:
"Batas Rp 5.000.000 – Rp 500.000.000". Then a number input labeled "Tenor (bulan)".

STEP 3 "Anggota" (only for Kelompok): a list of member rows, each row a card showing
member number, a name field "Nama nasabah", a masked ID field "NIK" showing
3404********0001, and a currency field "Plafon". Each card has a small remove button.
Below the list, a dashed-border button "+ Tambah anggota" with helper text
"Minimal 3, maksimal 10 anggota".

Directly under the member list, a highlighted summary panel that updates live:
"Total plafon kelompok" with a large amount "Rp 240.000.000", and under it
"Level approval yang diperlukan: KCP → KC → KOM (3 level)".

A sticky bottom bar with a secondary button "Simpan draft" and a primary button "Kirim".

Also show an error variant: after pressing "Kirim" with Rp 4.000.000, a red banner reads
"Plafon Rp 4.000.000 di bawah batas minimum Rp 5.000.000" with a small badge "BR-01".
```

**Wajib ada**: panel total plafon + level approval yang berubah live — inilah yang membuat
AO melihat konsekuensi angkanya sebelum submit, dan yang membuat AC-14 mudah didemokan.

---

### S-04 · Detail Pengajuan — **Web**

```
A detail page for one financing application. This is the hub every other screen is
reached from.

Header block: the reference number "IMT-20260820-0007" in monospace as the page title,
a status badge "SKORED" next to it, and a "Kembali" link above.
Under the title, a horizontal row of 5 read-only summary items separated by thin dividers:
"Nasabah: Slamet Riyadi", "Akad: Murabahah", "Total Plafon: Rp 240.000.000",
"Tenor: 24 bulan", "Dibuat oleh: Andi (AO) · 20 Agu 09:14".

Below the header, a horizontal tab bar with 6 tabs:
"Dokumen", "Survei", "SLIK", "Skoring", "Margin", "Audit".
Each tab label carries a small state dot: green when complete, amber when pending, red
when failed. Show "Skoring" as the active tab.

On the right side of the header, a vertical stepper showing the application's progress
through 6 stages: "Pengajuan", "Dokumen", "Survei", "SLIK", "Skoring", "Approval" —
completed stages checked, current stage highlighted, future stages muted.

For group applications, add a collapsible section above the tabs titled
"Anggota kelompok (4)", listing each member with name, masked NIK, plafon, and a status
badge "Aktif" or "Ditolak". A rejected member's row is struck through and its plafon is
shown in muted text, with a note that it no longer counts toward the total.
```

**Wajib ada**: anggota `DITOLAK` terlihat jelas tidak dihitung — ini yang ditunjukkan saat
AC-14.

---

### S-05 · Upload Dokumen (AO) — **Mobile**

```
A mobile document upload screen for a field officer.

Header: reference number in monospace and a status badge "DOKUMEN_DITOLAK".

Three upload slots stacked vertically, each a card: "KTP", "Kartu Keluarga",
"Surat Keterangan Usaha". Each card shows a thumbnail, the file name, the upload time,
and a status badge.

Show all three states:
- "Kartu Keluarga": badge "Terverifikasi" in success color, no action button.
- "Surat Keterangan Usaha": badge "Menunggu verifikasi" in info color.
- "KTP": badge "Ditolak" in danger color, plus a red-tinted panel inside the card reading
  "Alasan: Buram" and below it in smaller text "Catatan analis: foto tidak terbaca pada
  bagian NIK", and a primary button "Unggah ulang KTP".

Critical: only the rejected document offers a re-upload button. The other two must not
show any upload control — the officer re-submits one document, never the whole
application.

Under the three cards, a small caption: "Maks 5 MB · JPG, PNG, atau PDF".

Also show a version history disclosure inside the KTP card:
"Riwayat: versi 1 ditolak 20 Agu 11:02" as a collapsed line.
```

**Wajib ada**: hanya dokumen yang ditolak yang punya tombol unggah ulang. Ini AC-03, dan
kesalahan paling umum adalah membuat seluruh form bisa diisi ulang.

---

### S-06 · Verifikasi Dokumen (ANL) — **Web**

```
A document verification workspace for an analyst. Two-column layout.

Left column, 40% width: a list of documents to verify, grouped by member for group
applications. Group header "Anggota 1 — Slamet Riyadi" then three rows: "KTP",
"Kartu Keluarga", "Surat Keterangan Usaha", each with a status badge. The currently
selected document row is highlighted.

Right column, 60% width: a large document preview panel with zoom and rotate controls in
its top-right corner. Underneath the preview, an action bar containing:
- a primary green button "Terverifikasi"
- a danger outline button "Tolak"

When "Tolak" is pressed, show a panel that expands under the action bar containing a
required dropdown labeled "Kode alasan" with exactly these five options:
"Buram", "Tidak terbaca", "Kadaluarsa", "Tidak sesuai pemohon", "Bukan jenis dokumen",
plus an optional textarea "Catatan untuk AO", and a confirm button "Kirim penolakan"
that stays disabled until a reason code is selected.

At the top of the page, a progress line: "2 dari 3 dokumen terverifikasi".

Do not show the customer's full national ID anywhere on this screen, even though the
KTP image itself is displayed.
```

**Wajib ada**: kode alasan wajib dipilih sebelum tombol kirim aktif. Layar ini tidak boleh
terjangkau AO — dan endpoint-nya tetap 403 untuk AO (AC-02).

---

### S-07 · Rekam & Nilai Survei — **Mobile**

```
Two related mobile screens for an on-site business survey.

SCREEN A — "Rekam Survei", used by the field officer at the customer's business:
A card at the top labeled "Lokasi usaha" containing a full-width button
"Ambil koordinat saat ini" with a location pin icon, and below it two manual number
fields "Latitude" and "Longitude" that stay visible and editable — the officer may be
somewhere with poor GPS, so manual entry is always available, never hidden behind a
"having trouble?" link.
Then a photo section labeled "Foto tempat usaha" with a large dashed capture tile and a
horizontal strip of 2 captured thumbnails, each with a small delete badge. Caption below:
"Minimal 1 foto".
Then a currency input "Estimasi omzet harian" prefixed "Rp", a number input
"Lama usaha berjalan (bulan)", and a textarea "Catatan kondisi usaha".
Sticky bottom bar: secondary "Simpan draft", primary "Kirim survei".

SCREEN B — "Nilai Survei", used by the analyst reviewing it:
Read-only summary of what the officer submitted: a small static map thumbnail with the
pin, the photo strip, omzet, lama usaha, and the note.
Below it, an input section titled "Penilaian analis" containing a 1-to-5 rating control
labeled "Kondisi usaha" rendered as five selectable boxes numbered 1 through 5 with
captions "Sangat buruk" under 1 and "Sangat baik" under 5. Then two buttons:
a primary "Tandai VALID" and a danger outline "Tandai TIDAK VALID".
Helper text under the buttons: "Skoring memerlukan minimal satu survei berstatus VALID."
```

**Wajib ada**: penilaian 1–5 diisi ANL, bukan AO (asumsi A-10). Kalau Stitch menaruh
rating di layar AO, pindahkan.

---

### S-08 · SLIK Check — **Web**

```
A SLIK credit-bureau check screen for an analyst. SLIK is an external service; this screen
must make failures impossible to miss.

Top: a primary button "Jalankan SLIK Check" and, to its right, muted text
"Hasil berlaku 30 hari".

Below: one result card per application member. Show four cards demonstrating four
different outcomes — this is the important part:

CARD 1, success, collectibility 1: green left border. Name "Siti Aminah",
masked ID "3404********0001", a large badge "Kolektibilitas 1 — Lancar" in success color,
and a small grid of details: "Fasilitas aktif: 1", "Total baki debet: Rp 8.000.000",
"Tanggal data: 20 Agu 2026", "Referensi: SLIK-8842".

CARD 2, collectibility 2: amber left border, badge
"Kolektibilitas 2 — Dalam Perhatian Khusus", plus an amber info panel reading
"Grade risiko akan dibatasi minimal 3. Catatan analis wajib diisi sebelum diajukan ke
approval." and a required textarea "Catatan analis".

CARD 3, collectibility 4: red left border, badge "Kolektibilitas 4 — Diragukan", and a
red panel reading "Pengajuan ditolak otomatis oleh sistem. Status: REJECTED_SLIK." No
action buttons at all on this card.

CARD 4, service failure: red-outlined card with a warning icon, heading
"Layanan SLIK tidak tersedia", body text "Panggilan gagal (503). Pengajuan tidak dapat
dilanjutkan ke skoring." and a secondary button "Coba lagi". The collectibility field
shows an em dash, NOT a number — the system must never guess a value when the call fails.

At the bottom, a collapsed disclosure "Riwayat panggilan (3)" listing timestamped attempts
with their outcomes: OK, TIMEOUT, UNAVAILABLE.
```

**Wajib ada**: kartu 4 menampilkan tanda hubung, bukan angka. Penilai **akan** mencabut
mock SLIK — layar inilah yang mereka lihat saat itu.

---

### S-09 · Skoring — **Web**

```
A credit scoring result screen for an analyst. The analyst must be able to defend these
numbers to an auditor, so the arithmetic has to be visible, not just the result.

Top row, three cards side by side:
- "Skor Akhir": a very large tabular number "85" out of 100
- "Grade Sistem": "1 — Sangat baik"
- "Grade Final": "1 — Sangat baik", with a small "Override" text button beside it

Main section titled "Rincian Komponen Skor", a dense table with 5 columns:
"Komponen" | "Bobot" | "Nilai Mentah" | "Skor Komponen" | "Kontribusi"
Four rows, all numbers right-aligned with tabular figures and 3 decimal places on the
last two columns:
- "Kapasitas bayar" | 35 | "Rasio angsuran 39,810%" | 67,300 | 2.355,500
- "Riwayat SLIK" | 25 | "Kolektibilitas 1" | 100,000 | 2.500,000
- "Lama usaha" | 20 | "60 bulan" | 100,000 | 2.000,000
- "Hasil survei lapangan" | 20 | "Kondisi usaha 4 dari 5" | 80,000 | 1.600,000
A bold total row underneath: "Total" | 100 | — | — | 8.455,500
And below the table, one line of plain text showing the final arithmetic:
"8.455,500 ÷ 100 = 84,555 → dibulatkan menjadi 85"

Right of the table, a narrow panel "Parameter yang dipakai" listing the parameter values
used for this run, with a caption "Disimpan bersama hasil — perubahan parameter setelah
ini tidak mengubah angka di atas."

Override panel (show it expanded as a second variant): a dropdown "Grade final" with
options 1 to 5, a required textarea "Alasan override (wajib)" with helper text
"Minimal 10 karakter", and a primary button "Simpan override" that is disabled while the
reason is empty. Show the disabled state.

Blocked variant: instead of the score cards, a red banner reading
"Skoring belum dapat dijalankan: belum ada survei berstatus VALID." with a badge "BR-03",
and under it a checklist of the three prerequisites with check and cross icons:
"Semua dokumen terverifikasi" (check), "Minimal satu survei VALID" (cross),
"SLIK check sudah dijalankan" (check).
```

**Wajib ada**: baris aritmetika akhir dan 3 desimal pada skor komponen. Skor akhir yang
dibulatkan harus terlihat berasal dari angka yang ditampilkan (BR-07, BR-08, AC-07).

---

### S-10 · Margin / Nisbah — **Web**

```
A margin-setting screen for an analyst, on a Murabahah application graded 1.

A card titled "Penetapan Margin" containing:
- A read-only line "Grade final: 1 — Sangat baik"
- A prominent reference strip showing the allowed band for this grade:
  "Rentang yang disetujui untuk grade 1: 11,00% – 13,00% p.a." with a small caption
  "Nilai diambil dari parameter, bukan dari kode."
- A percentage input labeled "Margin (p.a.)" with a "%" suffix
- A primary button "Simpan margin" and a secondary "Batal"

Show the blocked variant as the main state: the input contains 10,00 and is outlined in
danger red, and below the card a red banner reads
"Margin 10,00% di bawah batas bawah grade 1 (11,00%)." with a small monospace badge
"BR-06". The "Simpan margin" button is disabled. There is no "lanjutkan saja" link, no
"simpan sebagai pengecualian", and no override path anywhere on this screen.

Also show a Musyarakah variant of the same card where the field is labeled
"Nisbah bagi hasil bank" and the band reads "20,00% – 25,00%".

And a grade-5 variant: the whole input section is replaced by a red panel reading
"Grade 5 tidak dapat dibiayai. Pengajuan berstatus REJECTED_SCORING." with no inputs at
all.
```

**Wajib ada**: tidak ada jalur "lanjutkan saja" di mana pun. Kalau Stitch menambahkan
tombol "Simpan sebagai pengecualian", hapus — itu persis yang dilarang BR-06.

---

### S-11 · Antrian Approval — **Web**

```
An approval queue for a branch head (KC, approval level 2).

Page title "Antrian Approval" with a subtitle "Menampilkan pengajuan pada level Anda (KC)".

A table with columns:
"Nomor Referensi" (monospace) | "Nasabah" | "Total Plafon" (right-aligned) |
"Grade" (badge) | "Skor" | "Jalur Approval" | "Menunggu sejak"

The "Jalur Approval" column renders a compact horizontal chain of chips:
"KCP ✓" in success, "KC" in bold teal with a filled ring marking it as current, then
"KOM" in muted gray. This makes the sequence visible at a glance.

Selecting a row opens a right-side drawer 480px wide containing:
- A risk summary block: total plafon, grade, skor, kolektibilitas, akad, tenor
- A link "Lihat detail lengkap"
- A decision section with three buttons: primary green "Setujui", danger outline "Tolak",
  and amber outline "Kembalikan ke AO"
- A textarea "Alasan" with helper text "Wajib untuk Tolak dan Kembalikan"

Show two blocked variants:

VARIANT A — out of sequence: the decision buttons are disabled and an amber banner reads
"Menunggu keputusan KCP terlebih dahulu." with a badge "BR-02".

VARIANT B — maker equals checker: the decision buttons are disabled and a red banner reads
"Anda adalah pembuat pengajuan ini dan tidak dapat menyetujuinya." with a badge "BR-09".
Add a small caption under the banner: "Pemeriksaan ini dilakukan di server."
```

**Wajib ada**: kedua varian terblokir. Penilai menguji AC-11 dengan akun yang perannya
approver tetapi juga pembuat — dan mereka akan menembak API langsung, bukan hanya UI.

---

### S-12 · Audit Trail — **Web**

```
An audit trail view for one application, read-only.

Page title "Audit Trail" with the reference number in monospace underneath, and a caption
"Catatan bersifat append-only. Tidak ada cara mengubah atau menghapus baris di sini."

A vertical timeline, oldest at top, newest at bottom, 10 entries. Each entry row shows:
- a timestamp column "20 Agu 2026 09:14" in tabular figures
- an actor column: name plus a small role badge, e.g. "Andi" + "AO"
- an action column: a short Indonesian phrase, e.g. "Membuat pengajuan",
  "Mengirim pengajuan", "Menolak dokumen KTP", "Menjalankan SLIK check",
  "Menjalankan skoring", "Override grade 2 → 3", "Menetapkan margin 12,50%",
  "Menyetujui (KCP)", "Menyetujui (KC)"
- a status transition chip on the right, e.g. "DRAFT → SUBMITTED", using the two status
  badges with a small arrow between them

Two entries are expandable: the override entry expands to show
"Alasan: kondisi pasar turun di sektor peternakan", and the SLIK failure entry expands to
show "Penyebab: SERVICE_UNAVAILABLE (503)".

There must be no edit icon, no delete icon, no "tambah catatan" button, and no row hover
action of any kind. The only controls on this page are a filter dropdown "Aksi" and a
date range picker.

No entry displays a national ID number or a document file path.
```

**Wajib ada**: nol kontrol tulis. AC-13 dibuktikan dari daftar route, tetapi layar yang
punya tombol hapus akan langsung memancing pertanyaan.

---

### S-13 · Parameter (ADM) — **Web**

```
A parameter administration screen for the admin role, with three sections on one page,
each an editable table with inline editing.

Page title "Parameter Sistem", subtitle
"Perubahan berlaku pada perhitungan berikutnya, tanpa restart aplikasi."

SECTION 1 "Bobot Komponen Skor": table with columns "Komponen", "Bobot", "Aturan".
Four rows: Kapasitas bayar 35, Riwayat SLIK 25, Lama usaha 20, Hasil survei lapangan 20.
Show the "Lama usaha" row in edit mode: the bobot cell is an active number input
containing 25, with a small hint underneath "Sebelumnya: 20". A footer row shows
"Total bobot: 105" and, when the total changes, a muted note "Skor akhir dibagi total
bobot, jadi total tidak harus 100."

SECTION 2 "Ambang Approval": table with columns "Plafon minimum", "Plafon maksimum",
"Level yang diperlukan". Three rows showing the amounts formatted in rupiah and the level
column rendering chips like "KCP", "KCP → KC", "KCP → KC → KOM".

SECTION 3 "Rentang Margin per Grade": table with columns "Grade", "Rentang skor",
"Margin murabahah", "Nisbah musyarakah", "Dibiayai". Five rows. The grade 5 row shows
"Tidak dibiayai" across the margin columns and a "Tidak" chip in the last column.

A sticky footer bar appears when anything is edited: "3 perubahan belum disimpan" with a
secondary "Batalkan" and a primary "Simpan perubahan".

After saving, show a success toast: "Parameter tersimpan. Berlaku untuk perhitungan
berikutnya." — do not show any message about restarting.
```

**Wajib ada**: pesan "tanpa restart". AC-15 gagal kalau layanan di-restart, walaupun
hasilnya berubah.

---

### S-14 · Kelola Pengguna (ADM) — **Web**

```
A user management screen for the admin.

Page title "Kelola Pengguna" with a primary button "Tambah pengguna" at the right.

A table with columns "Nama", "Nama pengguna", "Peran" (role badge), "Status"
(Aktif / Nonaktif chip), "Dibuat". Eight rows covering all six roles: AO, ANL, KCP, KC,
KOM, ADM, with two AO rows and two KCP rows.

Row actions: an "Ubah peran" text button and an "Nonaktifkan" text button. No delete
action — users are deactivated, never removed, because audit trail entries reference them.

The add-user drawer contains: "Nama lengkap", "Nama pengguna", a "Peran" dropdown listing
the six role codes with their Indonesian names, and a "Kata sandi awal" field with a
"Bangkitkan" button beside it.
```

---

## 4. Dari Stitch ke `frontend/`

Keluaran Stitch adalah HTML/CSS atau berkas Figma. Yang masuk ke repo hanya **struktur dan
gaya**, tidak pernah datanya.

| Yang diambil dari Stitch | Yang ditulis ulang oleh Reffa |
|---|---|
| Tata letak, hierarki, spasi, tabel, keadaan kosong | Seluruh pengambilan data (`frontend/src/api/`) |
| Token warna dan tipografi → jadikan variabel CSS di satu berkas `theme.css` | Semua angka dan teks contoh — datang dari API |
| Komponen berulang: badge status, kartu, panel galat, kartu statistik | Guard route per peran (`frontend/src/auth/`) |
| Varian keadaan (terblokir, gagal, kosong) sebagai referensi visual | Kondisi kapan varian itu tampil — dari status dan respons API |

**Aturan yang tidak boleh dilanggar saat menempel**:

1. **Hapus setiap angka bisnis yang jadi literal.** Rentang `11,00% – 13,00%`, bobot `35`,
   ambang `Rp 50.000.000` — semuanya datang dari endpoint parameter. Kalau angka itu tetap
   ada di komponen, AC-15 akan lolos di layar tetapi gagal saat ADM mengubah nilainya.
2. **Jangan simpan mock data sebagai konstanta di komponen.** Kalau perlu contoh saat
   mengembangkan, ambil dari data seed lewat API.
3. **Guard route bukan otorisasi.** `frontend/src/auth/` hanya menyembunyikan menu; setiap
   endpoint tetap memeriksa peran di server.
4. **Jangan tambah dependensi** dari keluaran Stitch (pustaka ikon, animasi, komponen)
   tanpa persetujuan Tech Lead — `AGENTS.md` bagian 6 butir 1.
5. **Badge status memakai 15 nilai enum yang sama persis** dengan
   `AGENTS.md` bagian 4.1. Kalau Stitch menghasilkan "Menunggu Persetujuan", ganti menjadi
   `MENUNGGU_APPROVAL_L1`.

---

## 5. Checklist sebelum UI dianggap selesai

Dijalankan Reffa (Frontend Lead sekaligus QA / Verification) pada sesi hardening Jumat 13.15–15.00.

- [ ] Setiap layar di §3 punya padanan berkas di `frontend/src/pages/`
- [ ] Tidak ada angka dari brief §4.1, §4.3, atau §4.4 yang muncul sebagai literal di
      `frontend/`
- [ ] Setiap pesan pelanggaran aturan menampilkan kode BR-nya (BR-01, BR-02, BR-03, BR-06,
      BR-09 minimal pernah terlihat)
- [ ] Tidak ada NIK 16 digit penuh di layar mana pun, dan tidak ada NIK di URL
- [ ] Tidak ada tombol yang tidak berfungsi; aksi terblokir tampil nonaktif dengan tooltip
- [ ] Layar AO (S-03, S-05, S-07) terpakai pada lebar 360 px tanpa scroll horizontal
- [ ] Layar Audit Trail tidak punya satu pun kontrol tulis
- [ ] Layar Margin tidak punya jalur "lanjutkan saja"
- [ ] Layar SLIK menampilkan tanda hubung, bukan angka, saat panggilan gagal
- [ ] Badge status memakai 15 nilai enum yang sama dengan backend
- [ ] Minimal satu entri `AI-DEVLOG.md` mencatat pemakaian Stitch, termasuk apa yang
      keluarannya salah dan bagaimana ditangkap
