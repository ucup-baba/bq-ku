-- 0007: Admin Donatur boleh menghapus surat beserta catatan donasinya.
-- Sebelumnya (0004) hanya SUPERADMIN yang boleh DELETE di semua tabel donatur.
-- Hapus data donatur (orangnya) tetap khusus SUPERADMIN. Aman dijalankan ulang.

drop policy if exists "donasi: hapus" on public.donasi;
create policy "donasi: hapus" on public.donasi for delete to authenticated
  using (public.has_role('SUPERADMIN') or public.has_role('ADMIN_DONATUR'));

drop policy if exists "surat: hapus" on public.surat;
create policy "surat: hapus" on public.surat for delete to authenticated
  using (public.has_role('SUPERADMIN') or public.has_role('ADMIN_DONATUR'));
