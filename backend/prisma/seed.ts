import { readFileSync } from 'node:fs'
import { PrismaClient, type Peran } from '@prisma/client'
import bcrypt from 'bcryptjs'

/**
 * Seed data (brief 7.2 butir 5).
 *
 * IDEMPOTEN: seluruhnya memakai `upsert` pada kunci alami (username, NIK, kode
 * parameter). Menjalankannya dua kali berurutan tidak menghasilkan error dan
 * tidak menggandakan baris — NFR-09 mengujinya di CI, dan penilai bisa saja
 * menjalankan `docker compose up` dua kali.
 *
 * Angka parameter di bawah berasal dari brief 4.1, 4.3, dan 4.4. INI SATU-SATUNYA
 * TEMPAT angka itu boleh muncul sebagai literal di seluruh repo — di sini ia
 * adalah DATA AWAL, bukan konstanta yang dipakai perhitungan (AGENTS.md bagian 6
 * butir 3).
 */

const prisma = new PrismaClient()
const PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? 'Demo1234!'
const COST = Number(process.env.PASSWORD_HASH_COST ?? 10)

const RUPIAH = { JUTA_5: 5_000_000n, JUTA_50: 50_000_000n, JUTA_200: 200_000_000n, JUTA_500: 500_000_000n }

async function seedPengguna(hash: string) {
  const akun: { username: string; nama: string; peran: Peran }[] = [
    { username: 'ao', nama: 'Andi Prasetya', peran: 'AO' },
    { username: 'anl', nama: 'Dewi Rahmawati', peran: 'ANL' },
    { username: 'kcp', nama: 'Bagus Setiawan', peran: 'KCP' },
    { username: 'kc', nama: 'Sri Handayani', peran: 'KC' },
    { username: 'kom', nama: 'Komite Pembiayaan', peran: 'KOM' },
    { username: 'adm', nama: 'Admin Sistem', peran: 'ADM' },
    // Akun khusus untuk AC-11: berperan KCP TETAPI juga membuat pengajuan.
    // Tanpa akun ini, maker=approver tidak bisa didemokan.
    { username: 'kcp2', nama: 'Rina Kusuma (KCP merangkap pembuat)', peran: 'KCP' },
  ]

  for (const a of akun) {
    await prisma.pengguna.upsert({
      where: { username: a.username },
      create: { ...a, passwordHash: hash },
      update: { nama: a.nama, peran: a.peran, aktif: true },
    })
  }
  console.log(`  ${akun.length} akun pengguna`)
}

async function seedParameter() {
  // Empat komponen skor (brief 4.4). Bobot WAJIB bisa diubah ADM (AC-15).
  const komponen = [
    {
      kode: 'KAPASITAS_BAYAR',
      nama: 'Kapasitas bayar',
      bobot: 35,
      aturan: { penuh: 30, nol: 60 },
    },
    { kode: 'RIWAYAT_SLIK', nama: 'Riwayat SLIK', bobot: 25, aturan: { kol1: 100, kol2: 40 } },
    { kode: 'LAMA_USAHA', nama: 'Lama usaha', bobot: 20, aturan: { penuh: 36, nol: 6 } },
    { kode: 'HASIL_SURVEI', nama: 'Hasil survei lapangan', bobot: 20, aturan: { pengali: 20 } },
  ]

  for (const k of komponen) {
    await prisma.parameterSkoring.upsert({
      where: { kode: k.kode },
      create: { kode: k.kode, nama: k.nama, bobot: k.bobot, aturan: k.aturan },
      update: {},
    })
  }

  // Parameter turunan asumsi tim (SRS bagian 2.5). Disimpan sebagai data supaya
  // koreksi instruktur = satu baris, bukan satu PR.
  const skalar = [
    { kode: 'MARGIN_REFERENSI_SKORING', nama: 'Margin referensi skoring (% p.a.) — asumsi A-1', nilai: 15.5 },
    { kode: 'HARI_KERJA_PER_BULAN', nama: 'Hari kerja per bulan — asumsi A-2', nilai: 25 },
    { kode: 'MARGIN_USAHA_PERSEN', nama: 'Margin usaha terhadap omzet (%) — asumsi A-2', nilai: 30 },
    { kode: 'SLIK_MASA_BERLAKU_HARI', nama: 'Masa berlaku hasil SLIK (hari) — BR-04, asumsi A-8', nilai: 30 },
  ]

  for (const s of skalar) {
    await prisma.parameterSkoring.upsert({
      where: { kode: s.kode },
      create: s,
      update: {},
    })
  }
  console.log(`  ${komponen.length + skalar.length} parameter skoring`)
}

async function seedAmbangApproval() {
  // Brief 4.1. Batas atas dibuat inklusif dengan menurunkan 1 rupiah pada baris
  // berikutnya, supaya tidak ada nilai yang jatuh di antara dua baris.
  const ambang: { plafonMin: bigint; plafonMaks: bigint; urutanPeran: Peran[] }[] = [
    { plafonMin: RUPIAH.JUTA_5, plafonMaks: RUPIAH.JUTA_50, urutanPeran: ['KCP'] },
    { plafonMin: RUPIAH.JUTA_50 + 1n, plafonMaks: RUPIAH.JUTA_200, urutanPeran: ['KCP', 'KC'] },
    { plafonMin: RUPIAH.JUTA_200 + 1n, plafonMaks: RUPIAH.JUTA_500, urutanPeran: ['KCP', 'KC', 'KOM'] },
  ]

  const sudahAda = await prisma.ambangApproval.count()
  if (sudahAda === 0) {
    await prisma.ambangApproval.createMany({ data: ambang })
  }
  console.log(`  ${ambang.length} baris ambang approval`)
}

async function seedRentangMargin() {
  // Brief 4.3. skorMin/skorMaks dipakai JUGA untuk menurunkan grade dari skor —
  // satu sumber, bukan dua.
  const rentang = [
    { grade: 1, skorMin: 85, skorMaks: 100, marginMin: 11.0, marginMaks: 13.0, nisbahMin: 20.0, nisbahMaks: 25.0, dibiayai: true },
    { grade: 2, skorMin: 70, skorMaks: 84, marginMin: 13.0, marginMaks: 15.5, nisbahMin: 25.0, nisbahMaks: 30.0, dibiayai: true },
    { grade: 3, skorMin: 55, skorMaks: 69, marginMin: 15.5, marginMaks: 18.0, nisbahMin: 30.0, nisbahMaks: 35.0, dibiayai: true },
    { grade: 4, skorMin: 40, skorMaks: 54, marginMin: 18.0, marginMaks: 21.0, nisbahMin: 35.0, nisbahMaks: 40.0, dibiayai: true },
    // Grade 5 = "< 40". skorMin 0 supaya tidak ada skor yang jatuh di luar tabel.
    { grade: 5, skorMin: 0, skorMaks: 39, marginMin: null, marginMaks: null, nisbahMin: null, nisbahMaks: null, dibiayai: false },
  ]

  for (const r of rentang) {
    await prisma.rentangMargin.upsert({ where: { grade: r.grade }, create: r, update: {} })
  }
  console.log(`  ${rentang.length} baris rentang margin per grade`)
}

/** 12 baris fixtures dimuat sebagai nasabah. Dua baris pemicu error dilewati. */
async function seedNasabah() {
  const path = process.env.FIXTURES_PATH ?? '../fixtures/nasabah-uji.csv'
  const isi = readFileSync(path, 'utf8')
  const baris = isi.split(/\r?\n/).filter((b) => b.trim())
  let jumlah = 0

  for (const b of baris.slice(1)) {
    const kolom = b.split(',')
    const [nik, nama, jenisUsaha, kolektibilitas] = kolom
    if (!nik || kolektibilitas === '-' || kolektibilitas === undefined) continue

    await prisma.nasabah.upsert({
      where: { nik },
      create: { nik, nama, alamat: `Jl. Contoh No. ${jumlah + 1}, Kabupaten Uji`, jenisUsaha },
      update: {},
    })
    jumlah++
  }
  console.log(`  ${jumlah} nasabah dari fixtures`)
}

async function main() {
  console.log('Seed iMitra (idempoten):')
  const hash = await bcrypt.hash(PASSWORD, COST)

  await seedPengguna(hash)
  await seedParameter()
  await seedAmbangApproval()
  await seedRentangMargin()
  await seedNasabah()

  console.log('Seed selesai.')
  console.log('')
  console.log('  BELUM DI-SEED — dikerjakan pemilik FR-nya, lihat docs/PEMBAGIAN-TIM.md:')
  console.log('    - satu pengajuan APPROVED lengkap dengan audit trail  (AC-12)')
  console.log('    - satu pengajuan bergrade 1 siap penetapan margin      (AC-09)')
  console.log('    - satu pengajuan kelompok 4 x Rp 60.000.000            (AC-14)')
  console.log('    - satu pengajuan Rp 120.000.000 di MENUNGGU_APPROVAL_L1 (AC-10)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
