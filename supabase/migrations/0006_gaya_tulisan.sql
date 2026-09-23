-- 0006_gaya_tulisan.sql — Pilihan gaya font tulisan tangan untuk isian PNG
-- surat ucapan terima kasih (Kalam / Patrick Hand), dipilih per surat lewat
-- formulir donatur.
--
-- Idempoten: aman dijalankan ulang (add column if not exists, drop
-- constraint if exists lalu add constraint).

begin;

-- Kolom baru: default 'KALAM' agar baris surat lama (dibuat sebelum fitur
-- ini ada) tetap valid tanpa migrasi data tambahan.
alter table public.surat
  add column if not exists "gayaTulisan" text not null default 'KALAM';

alter table public.surat drop constraint if exists surat_gaya_tulisan_check;
alter table public.surat add constraint surat_gaya_tulisan_check
  check ("gayaTulisan" in ('KALAM', 'PATRICK'));

commit;
