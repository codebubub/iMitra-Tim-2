import { PrismaClient, type Prisma } from '@prisma/client'
import { hitungSkorKelayakan, type BobotKomponen, type ParameterSkalar } from '../src/domain/skoring.js'
import { gradeDariSkor, terapkanLantaiKolektibilitas } from '../src/domain/grade.js'

/**
 * DATA SIAP-DEMO (brief §5: "Siapkan datanya lebih dulu — Anda tidak akan diberi
 * waktu untuk membuat data saat demo").
 *
 * Empat pengajuan di bawah menutup empat AC yang MUSTAHIL disiapkan saat demo
 * berlangsung, karena masing-masing memerlukan pengajuan yang sudah menempuh
 * beberapa tahap:
 *
 *   IMT-YYYYMMDD-9001  APPROVED, audit trail lengkap DRAFT..APPROVED   -> AC-12
 *   IMT-YYYYMMDD-9002  SKORED grade 1, siap penetapan margin           -> AC-09
 *   IMT-YYYYMMDD-9003  Rp 120.000.000 menunggu KCP, jalur KCP->KC      -> AC-10
 *   IMT-YYYYMMDD-9004  Kelompok 4 x Rp 60.000.000 = Rp 240.000.000     -> AC-14
 *
 * DUA HAL YANG MEMBEDAKAN BERKAS INI DARI "MENGARANG DATA":
 *
 * 1. SKOR DIHITUNG DENGAN FUNGSI DOMAIN YANG SAMA dengan yang dipakai aplikasi
 *    (`hitungSkorKelayakan`, `gradeDariSkor`, `terapkanLantaiKolektibilitas`).
 *    Angka yang tersimpan karena itu identik dengan yang akan dihasilkan kalau
 *    ANL menekan tombol Skoring. Kalau suatu saat rumusnya berubah dan seed ini
 *    menghasilkan grade berbeda, itu SINYAL — bukan gangguan.
 *
 * 2. PARAMETER DIBACA DARI DATABASE, bukan ditulis ulang di sini. Bobot yang
 *    dipakai adalah bobot yang benar-benar berlaku saat seed dijalankan, dan
 *    disimpan sebagai snapshot bersama hasilnya (ADR-0003).
 *
 * NOMOR REFERENSI memakai urutan 9001-9004 supaya tidak pernah bertabrakan
 * dengan pengajuan sungguhan, yang menghitung naik dari 0001. Penghitung
 * `urutan_referensi` sengaja TIDAK disentuh.
 *
 * IDEMPOTEN dengan cara MELEWATI, bukan membuat ulang. Alasannya teknis:
 * migrasi 20260820134500 memasang trigger yang menolak UPDATE dan DELETE pada
 * `audit_trail`, sehingga menghapus pengajuan yang sudah punya audit akan gagal.
 * Untuk mengulang dari nol: `prisma migrate reset`, bukan menghapus baris.
 */

const prisma = new PrismaClient()

/** Zona waktu Asia/Jakarta, sama dengan domain/nomor-referensi.ts (asumsi A-7). */
function kunciTanggalHariIni(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .replaceAll('-', '')
}

/** Jam demo yang berurutan, supaya audit trail terbaca wajar (AC-12). */
function jam(hariLalu: number, jamKe: number, menit = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() - hariLalu)
  d.setHours(jamKe, menit, 0, 0)
  return d
}

type Aktor = { id: string; peran: string }

async function bacaParameter() {
  const baris = await prisma.parameterSkoring.findMany()
  const peta = new Map(baris.map((b) => [b.kode, b]))

  const bobot = {
    KAPASITAS_BAYAR: Number(peta.get('KAPASITAS_BAYAR')?.bobot),
    RIWAYAT_SLIK: Number(peta.get('RIWAYAT_SLIK')?.bobot),
    LAMA_USAHA: Number(peta.get('LAMA_USAHA')?.bobot),
    HASIL_SURVEI: Number(peta.get('HASIL_SURVEI')?.bobot),
  } as BobotKomponen

  const kapasitas = peta.get('KAPASITAS_BAYAR')?.aturan as { penuh: number; nol: number }
  const lamaUsaha = peta.get('LAMA_USAHA')?.aturan as { penuh: number; nol: number }

  const skalar: ParameterSkalar = {
    marginReferensiSkoring: Number(peta.get('MARGIN_REFERENSI_SKORING')?.nilai),
    hariKerjaPerBulan: Number(peta.get('HARI_KERJA_PER_BULAN')?.nilai),
    marginUsahaPersen: Number(peta.get('MARGIN_USAHA_PERSEN')?.nilai),
    rasioPenuh: kapasitas.penuh,
    rasioNol: kapasitas.nol,
    lamaUsahaPenuhBulan: lamaUsaha.penuh,
    lamaUsahaNolBulan: lamaUsaha.nol,
  }

  const rentang = (await prisma.rentangMargin.findMany({ orderBy: { grade: 'asc' } })).map((r) => ({
    grade: r.grade,
    skorMin: r.skorMin,
    skorMaks: r.skorMaks,
    dibiayai: r.dibiayai,
  }))

  return { bobot, skalar, rentang }
}

type SpekAnggota = { nik: string; plafon: number; kolektibilitas: number }

type SpekPengajuan = {
  urutan: number
  jenisNasabah: 'PERORANGAN' | 'KELOMPOK'
  akad: 'MURABAHAH' | 'MUSYARAKAH'
  tenorBulan: number
  anggota: SpekAnggota[]
  survei: { omzetHarian: number; lamaUsahaBulan: number; kondisiUsahaSkala: number }
  /** Status akhir yang ingin dicapai. Audit trail dirakit sesuai jalur menuju status ini. */
  statusAkhir: 'APPROVED' | 'SKORED' | 'MENUNGGU_APPROVAL_L1'
  marginPersen?: number
  catatanAnalis?: string
  untukAC: string
}

async function buatPengajuanDemo(
  spek: SpekPengajuan,
  aktor: { ao: Aktor; anl: Aktor; kcp: Aktor },
  param: Awaited<ReturnType<typeof bacaParameter>>,
): Promise<string | null> {
  const nomorReferensi = `IMT-${kunciTanggalHariIni()}-${String(spek.urutan).padStart(4, '0')}`

  /**
   * Idempotensi dikunci pada PENANDA DEMO, bukan pada nomor referensi.
   *
   * Nomor referensi memuat tanggal (IMT-YYYYMMDD-NNNN), sehingga memeriksa
   * nomor berarti seed menganggap data hari ini belum ada — dan membuat lima
   * pengajuan baru setiap hari. Setelah dua hari sudah ada sepuluh; pada hari
   * demo akan ada lima belas, dan penilai melihat daftar yang membingungkan.
   *
   * Penanda `untukAC` disimpan di metadata baris audit pertama setiap pengajuan
   * demo, jadi ia bertahan lintas tanggal dan tidak bergantung pada nomor.
   */
  const sudahAda = await prisma.auditTrail.findFirst({
    where: {
      aksi: 'UBAH_STATUS',
      statusSesudah: 'DRAFT',
      metadata: { path: ['untukAC'], equals: spek.untukAC },
    },
    select: { id: true },
  })
  if (sudahAda) return null

  const totalPlafon = spek.anggota.reduce((s, a) => s + a.plafon, 0)

  // Kolektibilitas terburuk di antara anggota yang menentukan komponen SLIK dan
  // lantai grade — sama seperti yang dilakukan alur sungguhan untuk kelompok.
  const kolTerburuk = Math.max(...spek.anggota.map((a) => a.kolektibilitas))

  const hasil = hitungSkorKelayakan(
    {
      totalPlafon,
      tenorBulan: spek.tenorBulan,
      omzetHarian: spek.survei.omzetHarian,
      lamaUsahaBulan: spek.survei.lamaUsahaBulan,
      kondisiUsahaSkala: spek.survei.kondisiUsahaSkala,
      kolektibilitas: kolTerburuk,
    },
    param.bobot,
    param.skalar,
  )

  const gradeSistem = gradeDariSkor(hasil.skorAkhir, param.rentang)
  const gradeFinal = terapkanLantaiKolektibilitas(gradeSistem, kolTerburuk)

  await prisma.$transaction(async (tx) => {
    const pengajuan = await tx.pengajuan.create({
      data: {
        nomorReferensi,
        jenisNasabah: spek.jenisNasabah,
        akad: spek.akad,
        tenorBulan: spek.tenorBulan,
        status: spek.statusAkhir,
        marginPersen: spek.marginPersen ?? null,
        catatanAnalis: spek.catatanAnalis ?? null,
        dibuatOleh: aktor.ao.id,
        dibuatPada: jam(2, 9, 10),
      },
    })

    const audit: Prisma.AuditTrailCreateManyInput[] = [
      {
        pengajuanId: pengajuan.id,
        aktorId: aktor.ao.id,
        aktorPeran: 'AO',
        aksi: 'UBAH_STATUS',
        statusSebelum: null,
        statusSesudah: 'DRAFT',
        metadata: { sebab: 'Pengajuan dibuat', untukAC: spek.untukAC },
        terjadiPada: jam(2, 9, 10),
      },
    ]

    for (const [i, a] of spek.anggota.entries()) {
      const nasabah = await tx.nasabah.findUnique({ where: { nik: a.nik } })
      if (!nasabah) throw new Error(`Nasabah ${a.nik.slice(0, 4)}**** belum ada di seed dasar`)

      const anggota = await tx.pengajuanAnggota.create({
        data: {
          pengajuanId: pengajuan.id,
          nasabahId: nasabah.id,
          plafonDiajukan: BigInt(a.plafon),
          urutan: i + 1,
        },
      })

      // Tiga dokumen wajib per anggota, seluruhnya VERIFIED (asumsi A-9, BR-03).
      for (const jenis of ['KTP', 'KK', 'SKU'] as const) {
        await tx.dokumen.create({
          data: {
            pengajuanAnggotaId: anggota.id,
            jenis,
            versi: 1,
            // Path memakai UUID; nama asli berkas dan NIK tidak pernah menjadi
            // bagian dari path (BR-11).
            pathBerkas: `demo/${anggota.id}-${jenis.toLowerCase()}.jpg`,
            mime: 'image/jpeg',
            ukuranByte: 184_320,
            status: 'VERIFIED',
            diunggahOleh: aktor.ao.id,
            diunggahPada: jam(2, 10, 5),
            diverifikasiOleh: aktor.anl.id,
            diverifikasiPada: jam(2, 11, 20),
          },
        })
      }

      // Satu baris hasil SLIK per anggota, berhasil.
      await tx.hasilSlik.create({
        data: {
          pengajuanAnggotaId: anggota.id,
          statusPanggilan: 'OK',
          kolektibilitas: a.kolektibilitas,
          jumlahFasilitasAktif: 1,
          totalBakiDebet: BigInt(8_000_000),
          tanggalData: jam(1, 8),
          referenceId: `SLIK-DEMO-${String(spek.urutan)}${i + 1}`,
          diperiksaOleh: aktor.anl.id,
          diperiksaPada: jam(1, 13, 30),
        },
      })
    }

    audit.push(
      {
        pengajuanId: pengajuan.id,
        aktorId: aktor.ao.id,
        aktorPeran: 'AO',
        aksi: 'UBAH_STATUS',
        statusSebelum: 'DRAFT',
        statusSesudah: 'SUBMITTED',
        metadata: { sebab: 'Dikirim AO setelah validasi batas plafon (BR-01)', totalPlafon },
        terjadiPada: jam(2, 9, 45),
      },
      {
        pengajuanId: pengajuan.id,
        aktorId: aktor.anl.id,
        aktorPeran: 'ANL',
        aksi: 'VERIFIKASI_DOKUMEN',
        statusSebelum: 'SUBMITTED',
        statusSesudah: 'VERIFIKASI_DOKUMEN',
        metadata: { sebab: 'Seluruh dokumen wajib terverifikasi', jumlahDokumen: spek.anggota.length * 3 },
        terjadiPada: jam(2, 11, 20),
      },
      {
        pengajuanId: pengajuan.id,
        aktorId: aktor.anl.id,
        aktorPeran: 'ANL',
        aksi: 'SLIK_OK',
        statusSebelum: 'VERIFIKASI_DOKUMEN',
        statusSesudah: 'SLIK_OK',
        metadata: { kolektibilitasTerburuk: kolTerburuk },
        terjadiPada: jam(1, 13, 30),
      },
    )

    // Survei lapangan: direkam AO, dinilai ANL (asumsi A-10).
    await tx.survei.create({
      data: {
        pengajuanId: pengajuan.id,
        latitude: -7.024_5,
        longitude: 107.520_1,
        fotoPath: `demo/${pengajuan.id}-survei.jpg`,
        omzetHarian: BigInt(spek.survei.omzetHarian),
        lamaUsahaBulan: spek.survei.lamaUsahaBulan,
        kondisiUsahaSkala: spek.survei.kondisiUsahaSkala,
        catatan: 'Tempat usaha aktif, stok terisi, pembeli ramai saat kunjungan.',
        status: 'VALID',
        direkamOleh: aktor.ao.id,
        direkamPada: jam(2, 14),
        dinilaiOleh: aktor.anl.id,
        dinilaiPada: jam(1, 9, 15),
      },
    })

    // Hasil skoring + empat rincian komponen (BR-08, AC-07).
    const skoring = await tx.hasilSkoring.create({
      data: {
        pengajuanId: pengajuan.id,
        skorAkhir: hasil.skorAkhir,
        gradeSistem,
        gradeFinal,
        diOverride: false,
        snapshotParameter: {
          bobot: param.bobot,
          skalar: param.skalar,
          rentangGrade: param.rentang,
          diambilPada: jam(1, 14).toISOString(),
        } as Prisma.InputJsonValue,
        dihitungOleh: aktor.anl.id,
        dihitungPada: jam(1, 14),
      },
    })

    await tx.rincianKomponenSkor.createMany({
      data: hasil.rincian.map((r) => ({
        hasilSkoringId: skoring.id,
        kodeKomponen: r.kodeKomponen,
        bobot: r.bobot,
        nilaiMentah: r.nilaiMentah,
        skorKomponen: r.skorKomponen,
        kontribusi: r.kontribusi,
      })),
    })

    audit.push({
      pengajuanId: pengajuan.id,
      aktorId: aktor.anl.id,
      aktorPeran: 'ANL',
      aksi: 'SKORING',
      statusSebelum: 'SLIK_OK',
      statusSesudah: 'SKORED',
      metadata: { skorAkhir: hasil.skorAkhir, gradeSistem, gradeFinal },
      terjadiPada: jam(1, 14),
    })

    if (spek.statusAkhir !== 'SKORED') {
      audit.push(
        {
          pengajuanId: pengajuan.id,
          aktorId: aktor.anl.id,
          aktorPeran: 'ANL',
          aksi: 'SET_MARGIN',
          statusSebelum: 'SKORED',
          statusSesudah: 'SKORED',
          metadata: { marginPersen: spek.marginPersen, gradeFinal },
          terjadiPada: jam(1, 14, 20),
        },
        {
          pengajuanId: pengajuan.id,
          aktorId: aktor.anl.id,
          aktorPeran: 'ANL',
          aksi: 'UBAH_STATUS',
          statusSebelum: 'SKORED',
          statusSesudah: 'MENUNGGU_APPROVAL_L1',
          metadata: { sebab: 'Diajukan ke approval', totalPlafon },
          terjadiPada: jam(1, 14, 30),
        },
      )
    }

    if (spek.statusAkhir === 'APPROVED') {
      await tx.keputusanApprovalRow.create({
        data: {
          pengajuanId: pengajuan.id,
          level: 1,
          peranWajib: 'KCP',
          keputusan: 'APPROVE',
          alasan: null,
          diputuskanOleh: aktor.kcp.id,
          diputuskanPada: jam(0, 9, 5),
        },
      })

      audit.push(
        {
          pengajuanId: pengajuan.id,
          aktorId: aktor.kcp.id,
          aktorPeran: 'KCP',
          aksi: 'KEPUTUSAN_APPROVAL',
          statusSebelum: 'MENUNGGU_APPROVAL_L1',
          statusSesudah: 'MENUNGGU_APPROVAL_L1',
          metadata: { level: 1, keputusan: 'APPROVE' },
          terjadiPada: jam(0, 9, 5),
        },
        {
          pengajuanId: pengajuan.id,
          aktorId: aktor.kcp.id,
          aktorPeran: 'KCP',
          aksi: 'UBAH_STATUS',
          statusSebelum: 'MENUNGGU_APPROVAL_L1',
          statusSesudah: 'APPROVED',
          metadata: { sebab: 'Level terakhir menyetujui', levelTerakhir: 1 },
          terjadiPada: jam(0, 9, 6),
        },
      )
    }

    await tx.auditTrail.createMany({ data: audit })

    // Notifikasi untuk pembuat (FR-11), tanpa data pribadi.
    await tx.notifikasi.create({
      data: {
        penggunaId: aktor.ao.id,
        pengajuanId: pengajuan.id,
        pesan: `${nomorReferensi} berstatus ${spek.statusAkhir}`,
        dibaca: false,
        dibuatPada: jam(0, 9, 6),
      },
    })
  })

  return `${nomorReferensi}  skor ${hasil.skorAkhir} grade ${gradeFinal}  ${spek.statusAkhir}  (${spek.untukAC})`
}

export async function seedDemo(): Promise<void> {
  const [ao, anl, kcp] = await Promise.all([
    prisma.pengguna.findUnique({ where: { username: 'ao' } }),
    prisma.pengguna.findUnique({ where: { username: 'anl' } }),
    prisma.pengguna.findUnique({ where: { username: 'kcp' } }),
  ])
  if (!ao || !anl || !kcp) throw new Error('Akun seed dasar belum ada. Jalankan `npm run seed` lebih dulu.')

  const aktor = { ao, anl, kcp }
  const param = await bacaParameter()

  const spek: SpekPengajuan[] = [
    {
      // AC-12: riwayat lengkap DRAFT sampai APPROVED, urut waktu, aktor di tiap baris.
      urutan: 9001,
      jenisNasabah: 'PERORANGAN',
      akad: 'MURABAHAH',
      tenorBulan: 24,
      anggota: [{ nik: '3404110985000001', plafon: 30_000_000, kolektibilitas: 1 }],
      survei: { omzetHarian: 800_000, lamaUsahaBulan: 48, kondisiUsahaSkala: 4 },
      statusAkhir: 'APPROVED',
      marginPersen: 12.0,
      untukAC: 'AC-12',
    },
    {
      // AC-09: grade 1 siap penetapan margin. Margin 10,0% harus diblokir (BR-06).
      urutan: 9002,
      jenisNasabah: 'PERORANGAN',
      akad: 'MURABAHAH',
      tenorBulan: 24,
      anggota: [{ nik: '3404080781000007', plafon: 40_000_000, kolektibilitas: 1 }],
      survei: { omzetHarian: 1_200_000, lamaUsahaBulan: 60, kondisiUsahaSkala: 5 },
      statusAkhir: 'SKORED',
      untukAC: 'AC-09',
    },
    {
      // AC-10: Rp 120.000.000 -> jalur KCP lalu KC. KC tidak boleh memutuskan dulu.
      urutan: 9003,
      jenisNasabah: 'PERORANGAN',
      akad: 'MURABAHAH',
      tenorBulan: 24,
      anggota: [{ nik: '3404220790000002', plafon: 120_000_000, kolektibilitas: 1 }],
      survei: { omzetHarian: 500_000, lamaUsahaBulan: 30, kondisiUsahaSkala: 4 },
      statusAkhir: 'MENUNGGU_APPROVAL_L1',
      marginPersen: 16.5,
      untukAC: 'AC-10',
    },
    {
      // AC-14: 4 x Rp 60.000.000 = Rp 240.000.000 -> 3 level. Setelah satu anggota
      // ditolak: Rp 180.000.000 -> 2 level.
      urutan: 9004,
      jenisNasabah: 'KELOMPOK',
      akad: 'MURABAHAH',
      tenorBulan: 24,
      anggota: [
        { nik: '3404190883000005', plafon: 60_000_000, kolektibilitas: 1 },
        { nik: '3404060586000010', plafon: 60_000_000, kolektibilitas: 1 },
        { nik: '3404150688000003', plafon: 60_000_000, kolektibilitas: 2 },
        // Siti Aminah bisa dipakai lagi di sini karena pengajuannya di 9001
        // sudah APPROVED — status terminal, jadi tidak lagi terhitung aktif
        // menurut asumsi A-6.
        { nik: '3404110985000001', plafon: 60_000_000, kolektibilitas: 1 },
      ],
      survei: { omzetHarian: 2_000_000, lamaUsahaBulan: 36, kondisiUsahaSkala: 4 },
      statusAkhir: 'MENUNGGU_APPROVAL_L1',
      marginPersen: 19.5,
      catatanAnalis:
        'Satu anggota berkolektibilitas 2. Grade dilantai di 3 sesuai Tabel 4.2; kelompok tetap layak karena tanggung renteng.',
      untukAC: 'AC-14',
    },
    {
      // AC-06: kolektibilitas 2 boleh lanjut, TETAPI grade tidak pernah lebih
      // baik dari 3.
      //
      // Angkanya dipilih supaya lantai itu BENAR-BENAR TERLIHAT: skor 85 jatuh
      // di rentang grade 1, lalu dipaksa turun ke grade 3 oleh Tabel 4.2.
      // Tanpa kasus seperti ini, AC-06 hanya bisa "ditunjukkan" pada pengajuan
      // yang grade mentahnya memang sudah 3 atau lebih buruk — dan itu tidak
      // membuktikan apa pun.
      urutan: 9005,
      jenisNasabah: 'PERORANGAN',
      akad: 'MURABAHAH',
      tenorBulan: 24,
      anggota: [{ nik: '3404300394000009', plafon: 20_000_000, kolektibilitas: 2 }],
      survei: { omzetHarian: 500_000, lamaUsahaBulan: 36, kondisiUsahaSkala: 5 },
      statusAkhir: 'SKORED',
      catatanAnalis:
        'Kolektibilitas 2: grade sistem 1 diturunkan menjadi 3 sesuai Tabel 4.2. Usaha berjalan 36 bulan dengan kondisi sangat baik, arus kas mencukupi.',
      untukAC: 'AC-06',
    },
  ]

  const dibuat: string[] = []
  const dilewati: string[] = []

  for (const s of spek) {
    const hasil = await buatPengajuanDemo(s, aktor, param)
    if (hasil) dibuat.push(hasil)
    else dilewati.push(`IMT-${kunciTanggalHariIni()}-${String(s.urutan).padStart(4, '0')} (${s.untukAC})`)
  }

  if (dibuat.length > 0) {
    console.log('  Data demo dibuat:')
    for (const d of dibuat) console.log('    ' + d)
  }
  if (dilewati.length > 0) {
    console.log(`  Data demo sudah ada, dilewati: ${dilewati.length}`)
  }
}

// Bisa dijalankan sendiri: npm run seed:demo
if (process.argv[1]?.includes('seed-demo')) {
  seedDemo()
    .then(() => console.log('Seed demo selesai.'))
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
