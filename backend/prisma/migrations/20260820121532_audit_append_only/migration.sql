-- Audit trail append-only, lapis ke-3 (SDD BAB 4.4, AC-13).
--
-- Dua lapis pertama ada di kode: tidak ada route PUT/PATCH/DELETE untuk audit,
-- dan audit.repo.ts hanya mengekspor tulis() dan cari(). Lapis ini mengikat
-- walaupun keduanya dilanggar: PostgreSQL sendiri yang menolak.
--
-- Dibungkus pemeriksaan keberadaan role supaya migrasi ini aman dijalankan di
-- database terkelola (Aiven), tempat aplikasi menyambung sebagai superuser dan
-- role `imitra_app` tidak ada. Di lingkungan itu hanya lapis 1 dan 2 yang
-- berlaku — dan itu dicatat, bukan didiamkan.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imitra_app') THEN
    REVOKE UPDATE, DELETE ON TABLE "audit_trail" FROM imitra_app;
    RAISE NOTICE 'audit_trail: hak UPDATE dan DELETE dicabut dari imitra_app';
  ELSE
    RAISE NOTICE 'audit_trail: role imitra_app tidak ada, pencabutan hak dilewati';
  END IF;
END
$$;
