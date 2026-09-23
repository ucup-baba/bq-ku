-- 0008: Opsi akad/jenis donasi baru: ZIS, WAKAF, dan LAINNYA.
-- Tetap mengizinkan ZAKAT, INFAQ, SHADAQAH untuk kompatibilitas data riwayat.

alter table public.donasi drop constraint if exists donasi_jenis_check;
alter table public.donasi add constraint donasi_jenis_check
  check (jenis in ('ZIS', 'WAKAF', 'LAINNYA', 'ZAKAT', 'INFAQ', 'SHADAQAH'));
