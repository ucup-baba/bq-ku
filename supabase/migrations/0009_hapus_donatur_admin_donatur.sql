-- 0009: Admin Donatur boleh menghapus data donatur (orangnya), bukan hanya SUPERADMIN.
-- Pengaman: donatur yang masih punya donasi TIDAK bisa dihapus (FK diubah dari CASCADE
-- ke RESTRICT), supaya surat bernomor & rekap tidak ikut hilang diam-diam. Donatur dobel
-- digabung dulu (donasi dipindah ke donatur lain) lewat aplikasi, baru dihapus.
-- Aman dijalankan ulang.

drop policy if exists "donatur: hapus" on public.donatur;
create policy "donatur: hapus" on public.donatur for delete to authenticated
  using (public.has_role('SUPERADMIN') or public.has_role('ADMIN_DONATUR'));

do $$
declare c text;
begin
  for c in
    select con.conname from pg_constraint con
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = any (con.conkey)
    where con.conrelid = 'public.donasi'::regclass and con.contype = 'f' and a.attname = 'donaturId'
  loop
    execute format('alter table public.donasi drop constraint %I', c);
  end loop;
end $$;

alter table public.donasi add constraint "donasi_donaturId_fkey"
  foreign key ("donaturId") references public.donatur(id) on delete restrict;
