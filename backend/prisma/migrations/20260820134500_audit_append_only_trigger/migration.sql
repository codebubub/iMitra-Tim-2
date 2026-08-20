-- =============================================================================
--  FR-09 / AC-13 — menutup lubang di lapis ke-3 audit trail.
--
--  MASALAH YANG DIPERBAIKI MIGRASI INI.
--  Migrasi 20260820121532 mencabut hak dengan
--      REVOKE UPDATE, DELETE ON audit_trail FROM imitra_app;
--  dan itu TIDAK BERPENGARUH, karena imitra_app adalah PEMILIK tabel. PostgreSQL
--  memberi pemilik hak implisit yang tidak bisa dicabut dengan REVOKE; hanya hak
--  yang diberikan lewat GRANT yang bisa dicabut.
--
--  Dibuktikan di database sungguhan sebelum migrasi ini ditulis:
--      SELECT tableowner, current_user FROM pg_tables
--       WHERE tablename = 'audit_trail';        -- imitra_app | imitra_app
--      UPDATE audit_trail SET aksi = 'DIUBAH';  -- UPDATE 1   (lolos!)
--      DELETE FROM audit_trail;                 -- DELETE 1   (lolos!)
--
--  Artinya lapis ke-3 selama ini bersifat hiasan justru di lingkungan yang
--  dipakai penilai: docker compose dan CI keduanya menyambung sebagai imitra_app,
--  dan imitra_app-lah yang menjalankan migrasi sehingga ia menjadi pemilik.
--
--  PERBAIKANNYA: trigger. Trigger berlaku untuk SEMUA peran, pemilik dan
--  superuser sekalipun, dan tidak bergantung pada siapa yang memiliki tabel.
--
--  Migrasi 20260820121532 sengaja TIDAK diubah — ia sudah ada di riwayat orang
--  lain (AGENTS.md bagian 6 butir 2). REVOKE di sana tetap berguna sebagai
--  pertahanan berlapis untuk peran non-pemilik.
--
--  YANG MASIH BOLEH: INSERT. Audit ditulis, tidak pernah diubah.
--
--  KONSEKUENSI YANG WAJIB DIKETAHUI SEBELUM MENULIS TEST:
--  menghapus baris `pengajuan` yang sudah punya audit akan GAGAL, karena
--  PostgreSQL harus meng-UPDATE audit_trail.pengajuan_id menjadi NULL lebih dulu
--  dan trigger menolaknya. Itu disengaja: jejak keputusan pembiayaan tidak ikut
--  terhapus bersama datanya. Bersihkan data test dengan mereset schema
--  (prisma migrate reset), bukan dengan menghapus baris pengajuan.
-- =============================================================================

CREATE OR REPLACE FUNCTION tolak_ubah_audit_trail() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION
    'audit_trail bersifat append-only (FR-09, AC-13): % ditolak', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_trail_append_only ON "audit_trail";

CREATE TRIGGER audit_trail_append_only
  BEFORE UPDATE OR DELETE ON "audit_trail"
  FOR EACH ROW EXECUTE FUNCTION tolak_ubah_audit_trail();
