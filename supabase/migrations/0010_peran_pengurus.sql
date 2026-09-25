-- 0010: Peran PENGURUS (Pengurus Yayasan) untuk Ruang Lembaga — BACA SAJA.
-- Pengurus boleh membaca santri, donatur, donasi, surat, foto santri, dan PNG surat.
-- Pengurus TIDAK boleh membaca tabel documents (memuat rawOcrText/extractedFields)
-- maupun file scan berkas santri; status berkas hanya lewat status_berkas_santri().
-- Tidak ada izin tulis. Izin peran lain tidak berubah. Aman dijalankan ulang.

-- A. Nilai peran yang sah
alter table public.profiles drop constraint if exists profiles_roles_valid;
alter table public.allowed_emails drop constraint if exists allowed_emails_roles_valid;
alter table public.profiles add constraint profiles_roles_valid
  check (roles <@ array['SUPERADMIN','PENGURUS','ADMIN_SANTRI','ADMIN_DONATUR','VIEWER'] and cardinality(roles) >= 1);
alter table public.allowed_emails add constraint allowed_emails_roles_valid
  check (roles <@ array['SUPERADMIN','PENGURUS','ADMIN_SANTRI','ADMIN_DONATUR','VIEWER'] and cardinality(roles) >= 1);

-- B. Baca santri
drop policy if exists "santri: baca" on public.santri;
create policy "santri: baca" on public.santri for select to authenticated
  using (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI') or public.has_role('VIEWER') or public.has_role('PENGURUS'));

-- C. Baca donatur, donasi, surat (nomor_surat_counter sengaja tidak)
do $$
declare t text;
begin
  foreach t in array array['donatur','donasi','surat'] loop
    execute format('drop policy if exists "%1$s: baca" on public.%1$I', t);
    execute format('create policy "%1$s: baca" on public.%1$I for select to authenticated using (public.has_role(''SUPERADMIN'') or public.has_role(''ADMIN_DONATUR'') or public.has_role(''PENGURUS''))', t);
  end loop;
end $$;

-- D. Status berkas tanpa isi berkas
create or replace function public.status_berkas_santri()
returns table ("santriId" text, kategori text, "statusVerifikasi" text)
language sql stable security definer set search_path = public as $$
  select d."santriId", d.kategori, d."statusVerifikasi"
  from public.documents d
  where public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI')
     or public.has_role('VIEWER') or public.has_role('PENGURUS');
$$;
revoke all on function public.status_berkas_santri() from public;
grant execute on function public.status_berkas_santri() to authenticated;

-- E. Storage: foto santri (hanya path yang tercatat sebagai foto)
drop policy if exists "foto santri: baca pengurus" on storage.objects;
create policy "foto santri: baca pengurus" on storage.objects for select to authenticated
  using (
    bucket_id = 'berkas'
    and public.has_role('PENGURUS')
    and exists (
      select 1 from public.santri s
      where s."fotoFormalPath" = storage.objects.name or s."fotoProfilPath" = storage.objects.name
    )
  );

-- F. Storage: PNG surat
drop policy if exists "berkas surat: baca" on storage.objects;
create policy "berkas surat: baca" on storage.objects for select to authenticated
  using (
    bucket_id = 'berkas'
    and (storage.foldername(name))[1] = 'surat'
    and (public.has_role('SUPERADMIN') or public.has_role('ADMIN_DONATUR') or public.has_role('PENGURUS'))
  );
