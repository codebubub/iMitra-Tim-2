-- CreateEnum
CREATE TYPE "Peran" AS ENUM ('AO', 'ANL', 'KCP', 'KC', 'KOM', 'ADM');

-- CreateEnum
CREATE TYPE "JenisNasabah" AS ENUM ('PERORANGAN', 'KELOMPOK');

-- CreateEnum
CREATE TYPE "Akad" AS ENUM ('MURABAHAH', 'MUSYARAKAH');

-- CreateEnum
CREATE TYPE "StatusPengajuan" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIKASI_DOKUMEN', 'DOKUMEN_DITOLAK', 'SLIK_OK', 'SLIK_GAGAL', 'REJECTED_SLIK', 'SKORED', 'REJECTED_SCORING', 'MENUNGGU_APPROVAL_L1', 'MENUNGGU_APPROVAL_L2', 'MENUNGGU_APPROVAL_L3', 'APPROVED', 'REJECTED', 'DIKEMBALIKAN');

-- CreateEnum
CREATE TYPE "StatusAnggota" AS ENUM ('AKTIF', 'DITOLAK');

-- CreateEnum
CREATE TYPE "JenisDokumen" AS ENUM ('KTP', 'KK', 'SKU');

-- CreateEnum
CREATE TYPE "StatusDokumen" AS ENUM ('MENUNGGU', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "KodeAlasanDokumen" AS ENUM ('BURAM', 'TIDAK_TERBACA', 'KADALUARSA', 'TIDAK_SESUAI_PEMOHON', 'BUKAN_JENIS_DOKUMEN');

-- CreateEnum
CREATE TYPE "StatusSurvei" AS ENUM ('DRAFT', 'VALID', 'TIDAK_VALID');

-- CreateEnum
CREATE TYPE "StatusPanggilanSlik" AS ENUM ('OK', 'NOT_FOUND', 'UNAVAILABLE', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "KeputusanApproval" AS ENUM ('APPROVE', 'REJECT', 'RETURN');

-- CreateTable
CREATE TABLE "pengguna" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "peran" "Peran" NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pengguna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nasabah" (
    "id" TEXT NOT NULL,
    "nik" CHAR(16) NOT NULL,
    "nama" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "jenis_usaha" TEXT NOT NULL,

    CONSTRAINT "nasabah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengajuan" (
    "id" TEXT NOT NULL,
    "nomor_referensi" TEXT NOT NULL,
    "jenis_nasabah" "JenisNasabah" NOT NULL,
    "akad" "Akad" NOT NULL,
    "tenor_bulan" INTEGER NOT NULL,
    "status" "StatusPengajuan" NOT NULL DEFAULT 'DRAFT',
    "margin_persen" DECIMAL(5,2),
    "nisbah_bank_persen" DECIMAL(5,2),
    "catatan_analis" TEXT,
    "dibuat_oleh" TEXT NOT NULL,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubah_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengajuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengajuan_anggota" (
    "id" TEXT NOT NULL,
    "pengajuan_id" TEXT NOT NULL,
    "nasabah_id" TEXT NOT NULL,
    "plafon_diajukan" BIGINT NOT NULL,
    "status_anggota" "StatusAnggota" NOT NULL DEFAULT 'AKTIF',
    "urutan" INTEGER NOT NULL,

    CONSTRAINT "pengajuan_anggota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dokumen" (
    "id" TEXT NOT NULL,
    "pengajuan_anggota_id" TEXT NOT NULL,
    "jenis" "JenisDokumen" NOT NULL,
    "versi" INTEGER NOT NULL DEFAULT 1,
    "path_berkas" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "ukuran_byte" INTEGER NOT NULL,
    "status" "StatusDokumen" NOT NULL DEFAULT 'MENUNGGU',
    "kode_alasan" "KodeAlasanDokumen",
    "catatan" TEXT,
    "diunggah_oleh" TEXT NOT NULL,
    "diunggah_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diverifikasi_oleh" TEXT,
    "diverifikasi_pada" TIMESTAMP(3),

    CONSTRAINT "dokumen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survei" (
    "id" TEXT NOT NULL,
    "pengajuan_id" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "foto_path" TEXT NOT NULL,
    "omzet_harian" BIGINT NOT NULL,
    "lama_usaha_bulan" INTEGER NOT NULL,
    "kondisi_usaha_skala" INTEGER,
    "catatan" TEXT NOT NULL,
    "status" "StatusSurvei" NOT NULL DEFAULT 'DRAFT',
    "direkam_oleh" TEXT NOT NULL,
    "direkam_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dinilai_oleh" TEXT,
    "dinilai_pada" TIMESTAMP(3),

    CONSTRAINT "survei_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hasil_slik" (
    "id" TEXT NOT NULL,
    "pengajuan_anggota_id" TEXT NOT NULL,
    "status_panggilan" "StatusPanggilanSlik" NOT NULL,
    "kolektibilitas" INTEGER,
    "jumlah_fasilitas_aktif" INTEGER,
    "total_baki_debet" BIGINT,
    "tanggal_data" DATE,
    "reference_id" TEXT,
    "diperiksa_oleh" TEXT NOT NULL,
    "diperiksa_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hasil_slik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hasil_skoring" (
    "id" TEXT NOT NULL,
    "pengajuan_id" TEXT NOT NULL,
    "skor_akhir" INTEGER NOT NULL,
    "grade_sistem" INTEGER NOT NULL,
    "grade_final" INTEGER NOT NULL,
    "di_override" BOOLEAN NOT NULL DEFAULT false,
    "alasan_override" TEXT,
    "snapshot_parameter" JSONB NOT NULL,
    "dihitung_oleh" TEXT NOT NULL,
    "dihitung_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hasil_skoring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rincian_komponen_skor" (
    "id" TEXT NOT NULL,
    "hasil_skoring_id" TEXT NOT NULL,
    "kode_komponen" TEXT NOT NULL,
    "bobot" DECIMAL(6,3) NOT NULL,
    "nilai_mentah" DECIMAL(14,3) NOT NULL,
    "skor_komponen" DECIMAL(6,3) NOT NULL,
    "kontribusi" DECIMAL(9,3) NOT NULL,

    CONSTRAINT "rincian_komponen_skor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keputusan_approval" (
    "id" TEXT NOT NULL,
    "pengajuan_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "peran_wajib" "Peran" NOT NULL,
    "keputusan" "KeputusanApproval" NOT NULL,
    "alasan" TEXT,
    "diputuskan_oleh" TEXT NOT NULL,
    "diputuskan_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keputusan_approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_trail" (
    "id" BIGSERIAL NOT NULL,
    "pengajuan_id" TEXT,
    "aktor_id" TEXT,
    "aktor_peran" TEXT NOT NULL,
    "aksi" TEXT NOT NULL,
    "status_sebelum" TEXT,
    "status_sesudah" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "terjadi_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_trail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameter_skoring" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "bobot" DECIMAL(6,3),
    "nilai" DECIMAL(14,3),
    "aturan" JSONB,
    "diubah_oleh" TEXT,
    "diubah_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parameter_skoring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambang_approval" (
    "id" TEXT NOT NULL,
    "plafon_min" BIGINT NOT NULL,
    "plafon_maks" BIGINT NOT NULL,
    "urutan_peran" "Peran"[],
    "diubah_oleh" TEXT,
    "diubah_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ambang_approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rentang_margin" (
    "id" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "skor_min" INTEGER NOT NULL,
    "skor_maks" INTEGER NOT NULL,
    "margin_min" DECIMAL(5,2),
    "margin_maks" DECIMAL(5,2),
    "nisbah_min" DECIMAL(5,2),
    "nisbah_maks" DECIMAL(5,2),
    "dibiayai" BOOLEAN NOT NULL DEFAULT true,
    "diubah_oleh" TEXT,
    "diubah_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rentang_margin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifikasi" (
    "id" TEXT NOT NULL,
    "pengguna_id" TEXT NOT NULL,
    "pengajuan_id" TEXT,
    "pesan" TEXT NOT NULL,
    "dibaca" BOOLEAN NOT NULL DEFAULT false,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifikasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "urutan_referensi" (
    "tanggal" CHAR(8) NOT NULL,
    "urutan_terakhir" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "urutan_referensi_pkey" PRIMARY KEY ("tanggal")
);

-- CreateIndex
CREATE UNIQUE INDEX "pengguna_username_key" ON "pengguna"("username");

-- CreateIndex
CREATE UNIQUE INDEX "nasabah_nik_key" ON "nasabah"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "pengajuan_nomor_referensi_key" ON "pengajuan"("nomor_referensi");

-- CreateIndex
CREATE INDEX "pengajuan_status_idx" ON "pengajuan"("status");

-- CreateIndex
CREATE INDEX "pengajuan_dibuat_oleh_idx" ON "pengajuan"("dibuat_oleh");

-- CreateIndex
CREATE INDEX "pengajuan_anggota_pengajuan_id_idx" ON "pengajuan_anggota"("pengajuan_id");

-- CreateIndex
CREATE UNIQUE INDEX "pengajuan_anggota_pengajuan_id_nasabah_id_key" ON "pengajuan_anggota"("pengajuan_id", "nasabah_id");

-- CreateIndex
CREATE INDEX "dokumen_pengajuan_anggota_id_idx" ON "dokumen"("pengajuan_anggota_id");

-- CreateIndex
CREATE UNIQUE INDEX "dokumen_pengajuan_anggota_id_jenis_versi_key" ON "dokumen"("pengajuan_anggota_id", "jenis", "versi");

-- CreateIndex
CREATE INDEX "survei_pengajuan_id_status_idx" ON "survei"("pengajuan_id", "status");

-- CreateIndex
CREATE INDEX "hasil_slik_pengajuan_anggota_id_diperiksa_pada_idx" ON "hasil_slik"("pengajuan_anggota_id", "diperiksa_pada");

-- CreateIndex
CREATE INDEX "hasil_skoring_pengajuan_id_dihitung_pada_idx" ON "hasil_skoring"("pengajuan_id", "dihitung_pada");

-- CreateIndex
CREATE INDEX "rincian_komponen_skor_hasil_skoring_id_idx" ON "rincian_komponen_skor"("hasil_skoring_id");

-- CreateIndex
CREATE INDEX "keputusan_approval_pengajuan_id_level_idx" ON "keputusan_approval"("pengajuan_id", "level");

-- CreateIndex
CREATE INDEX "audit_trail_pengajuan_id_terjadi_pada_idx" ON "audit_trail"("pengajuan_id", "terjadi_pada");

-- CreateIndex
CREATE INDEX "audit_trail_aksi_idx" ON "audit_trail"("aksi");

-- CreateIndex
CREATE UNIQUE INDEX "parameter_skoring_kode_key" ON "parameter_skoring"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "rentang_margin_grade_key" ON "rentang_margin"("grade");

-- CreateIndex
CREATE INDEX "notifikasi_pengguna_id_dibaca_idx" ON "notifikasi"("pengguna_id", "dibaca");

-- AddForeignKey
ALTER TABLE "pengajuan" ADD CONSTRAINT "pengajuan_dibuat_oleh_fkey" FOREIGN KEY ("dibuat_oleh") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengajuan_anggota" ADD CONSTRAINT "pengajuan_anggota_pengajuan_id_fkey" FOREIGN KEY ("pengajuan_id") REFERENCES "pengajuan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengajuan_anggota" ADD CONSTRAINT "pengajuan_anggota_nasabah_id_fkey" FOREIGN KEY ("nasabah_id") REFERENCES "nasabah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokumen" ADD CONSTRAINT "dokumen_pengajuan_anggota_id_fkey" FOREIGN KEY ("pengajuan_anggota_id") REFERENCES "pengajuan_anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survei" ADD CONSTRAINT "survei_pengajuan_id_fkey" FOREIGN KEY ("pengajuan_id") REFERENCES "pengajuan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_slik" ADD CONSTRAINT "hasil_slik_pengajuan_anggota_id_fkey" FOREIGN KEY ("pengajuan_anggota_id") REFERENCES "pengajuan_anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_skoring" ADD CONSTRAINT "hasil_skoring_pengajuan_id_fkey" FOREIGN KEY ("pengajuan_id") REFERENCES "pengajuan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rincian_komponen_skor" ADD CONSTRAINT "rincian_komponen_skor_hasil_skoring_id_fkey" FOREIGN KEY ("hasil_skoring_id") REFERENCES "hasil_skoring"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keputusan_approval" ADD CONSTRAINT "keputusan_approval_pengajuan_id_fkey" FOREIGN KEY ("pengajuan_id") REFERENCES "pengajuan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keputusan_approval" ADD CONSTRAINT "keputusan_approval_diputuskan_oleh_fkey" FOREIGN KEY ("diputuskan_oleh") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_trail" ADD CONSTRAINT "audit_trail_pengajuan_id_fkey" FOREIGN KEY ("pengajuan_id") REFERENCES "pengajuan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_trail" ADD CONSTRAINT "audit_trail_aktor_id_fkey" FOREIGN KEY ("aktor_id") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_pengguna_id_fkey" FOREIGN KEY ("pengguna_id") REFERENCES "pengguna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_pengajuan_id_fkey" FOREIGN KEY ("pengajuan_id") REFERENCES "pengajuan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

