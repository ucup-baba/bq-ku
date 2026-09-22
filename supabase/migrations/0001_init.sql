-- 0001_init.sql — RESET TOTAL skema BQ-ku (Fase A). Jalankan di SQL Editor Supabase.
-- Menghapus semua data lama (disetujui: data uji coba).

drop table if exists public.upload_tokens cascade;
drop table if exists public.documents cascade;
drop table if exists public.santri cascade;
drop table if exists public.users cascade;
drop table if exists public.profiles cascade;
drop function if exists public.auth_role() cascade;
drop function if exists public.handle_new_user() cascade;
-- Berkas lama di bucket 'berkas' TIDAK bisa dihapus lewat SQL (storage.protect_delete).
-- Kosongkan lewat: npm run empty-bucket  (atau Dashboard → Storage → berkas → pilih semua → Delete)

-- ---------- PROFIL PENGGUNA ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  email text not null,
  role text not null default 'VIEWER' check (role in ('SUPERADMIN','PANITIA','VIEWER')),
  aktif boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nama, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'VIEWER')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.auth_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and aktif;
$$;
grant execute on function public.auth_role() to authenticated;

-- ---------- SANTRI ----------
create table public.santri (
  id text primary key,
  "namaLengkap" text not null,
  "namaPanggilan" text,
  nik text not null,
  "noKk" text,
  nisn text,
  "tempatLahir" text not null,
  "tanggalLahir" text not null,
  "jenisKelamin" text not null check ("jenisKelamin" in ('IKHWAN','AKHWAT')),
  "tahunMasuk" integer default 2026,
  jenjang text not null check (jenjang in ('SMP','SMA','SMK','ALUMNI')),
  kelas text not null,
  "sekolahSekarang" text not null,
  "asalSekolahSebelumnya" text,
  "namaAyah" text,
  "namaIbu" text,
  "statusSosial" text default 'REGULER',
  "kontakWali" text,
  "pekerjaanOrtu" text,
  alamat text,
  "ringkasanTentang" text,
  "riwayatTahfidz" text,
  keahlian text,
  "fotoFormalPath" text,
  "fotoProfilPath" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create unique index santri_nik_key on public.santri (nik);
create index santri_nama_idx on public.santri (lower("namaLengkap"));

-- ---------- DOKUMEN ----------
create table public.documents (
  id text primary key,
  "santriId" text not null references public.santri(id) on delete cascade,
  kategori text not null check (kategori in ('KARTU_KELUARGA','AKTA_KELAHIRAN','KTP_ORTU','SKL_IJAZAH','KIP_PIP','KRM_PKH_KKS','SKTM','SERTIFIKAT_PRESTASI','LAINNYA')),
  "nomorDokumen" text,
  "storagePath" text not null,
  "rawOcrText" text,
  "extractedFields" text,
  "statusVerifikasi" text not null default 'PENDING' check ("statusVerifikasi" in ('PENDING','VERIFIED','REJECTED','NEED_FIX')),
  "catatanVerifikasi" text,
  "createdAt" timestamptz not null default now()
);
create index documents_santri_idx on public.documents ("santriId");

-- ---------- TOKEN UPLOAD MANDIRI ----------
create table public.upload_tokens (
  id text primary key,
  "santriId" text not null references public.santri(id) on delete cascade,
  token text not null unique,
  "expiresAt" timestamptz not null,
  "usedCount" integer not null default 0,
  "createdAt" timestamptz not null default now()
);

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.santri enable row level security;
alter table public.documents enable row level security;
alter table public.upload_tokens enable row level security;

create policy "profiles: baca sendiri atau superadmin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.auth_role() = 'SUPERADMIN');
create policy "profiles: superadmin ubah" on public.profiles for update to authenticated
  using (public.auth_role() = 'SUPERADMIN') with check (public.auth_role() = 'SUPERADMIN');
create policy "profiles: superadmin hapus" on public.profiles for delete to authenticated
  using (public.auth_role() = 'SUPERADMIN');

create policy "santri: baca" on public.santri for select to authenticated using (public.auth_role() is not null);
create policy "santri: tulis" on public.santri for insert to authenticated with check (public.auth_role() in ('SUPERADMIN','PANITIA'));
create policy "santri: ubah" on public.santri for update to authenticated using (public.auth_role() in ('SUPERADMIN','PANITIA')) with check (public.auth_role() in ('SUPERADMIN','PANITIA'));
create policy "santri: hapus" on public.santri for delete to authenticated using (public.auth_role() = 'SUPERADMIN');

create policy "documents: baca" on public.documents for select to authenticated using (public.auth_role() is not null);
create policy "documents: tulis" on public.documents for insert to authenticated with check (public.auth_role() in ('SUPERADMIN','PANITIA'));
create policy "documents: ubah" on public.documents for update to authenticated using (public.auth_role() in ('SUPERADMIN','PANITIA')) with check (public.auth_role() in ('SUPERADMIN','PANITIA'));
create policy "documents: hapus" on public.documents for delete to authenticated using (public.auth_role() = 'SUPERADMIN');

create policy "upload_tokens: panitia" on public.upload_tokens for all to authenticated
  using (public.auth_role() in ('SUPERADMIN','PANITIA')) with check (public.auth_role() in ('SUPERADMIN','PANITIA'));

-- ---------- STORAGE ----------
insert into storage.buckets (id, name, public) values ('berkas', 'berkas', false)
on conflict (id) do update set public = false;

drop policy if exists "Public Read on berkas bucket" on storage.objects;
drop policy if exists "Public Upload on berkas bucket" on storage.objects;
drop policy if exists "Public Update on berkas bucket" on storage.objects;
drop policy if exists "Public Delete on berkas bucket" on storage.objects;

create policy "berkas: baca" on storage.objects for select to authenticated
  using (bucket_id = 'berkas' and public.auth_role() is not null);
create policy "berkas: unggah" on storage.objects for insert to authenticated
  with check (bucket_id = 'berkas' and public.auth_role() in ('SUPERADMIN','PANITIA'));
create policy "berkas: ubah" on storage.objects for update to authenticated
  using (bucket_id = 'berkas' and public.auth_role() in ('SUPERADMIN','PANITIA'));
create policy "berkas: hapus" on storage.objects for delete to authenticated
  using (bucket_id = 'berkas' and public.auth_role() = 'SUPERADMIN');
