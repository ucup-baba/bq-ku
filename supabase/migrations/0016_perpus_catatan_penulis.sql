-- 0016: Perpus BQ tahap 4 — catatan buku & profil penulis.
-- Seperti 0015, anggota tidak punya policy insert/update: tulisannya lewat fungsi security definer.
-- Galat berformat perpus:<kode>; lihat galatDariRpc di lib/perpus/pinjaman.ts.
-- Aman dijalankan ulang.

-- A. Tabel
create table if not exists public.perpus_catatan (
  id uuid primary key default gen_random_uuid(),
  "anggotaId" uuid not null references public.perpus_anggota("userId") on delete cascade,
  "bukuId" uuid not null references public.perpus_buku(id) on delete restrict,
  isi text not null check (char_length(trim(isi)) between 1 and 1000),
  publik boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  -- Dihapus admin: baris dipertahankan agar penulisnya bisa diberi tahu.
  "dihapusAt" timestamptz,
  "dihapusOleh" uuid references public.profiles(id) on delete set null,
  "alasanHapus" text,
  "pemberitahuanDitutupAt" timestamptz
);
create index if not exists perpus_catatan_buku_idx on public.perpus_catatan ("bukuId");
create unique index if not exists perpus_catatan_unik on public.perpus_catatan ("anggotaId", "bukuId")
  where "dihapusAt" is null;

create table if not exists public.perpus_penulis (
  nama text primary key,
  jenis text not null default 'penulis' check (jenis in ('penulis', 'penerbit')),
  "bioId" text check ("bioId" is null or char_length("bioId") <= 600),
  "bioEn" text check ("bioEn" is null or char_length("bioEn") <= 600),
  instagram text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  sumber text,
  "updatedAt" timestamptz not null default now()
);

-- B. RLS
alter table public.perpus_catatan enable row level security;
drop policy if exists "perpus_catatan: baca sendiri" on public.perpus_catatan;
create policy "perpus_catatan: baca sendiri" on public.perpus_catatan for select to authenticated
  using ("anggotaId" = auth.uid());
-- Catatan privat tetap privat, termasuk dari super admin.
drop policy if exists "perpus_catatan: moderasi baca" on public.perpus_catatan;
create policy "perpus_catatan: moderasi baca" on public.perpus_catatan for select to authenticated
  using (publik and public.has_role('SUPERADMIN'));

alter table public.perpus_penulis enable row level security;
drop policy if exists "perpus_penulis: baca" on public.perpus_penulis;
create policy "perpus_penulis: baca" on public.perpus_penulis for select to anon, authenticated using (true);
drop policy if exists "perpus_penulis: kelola" on public.perpus_penulis;
create policy "perpus_penulis: kelola" on public.perpus_penulis for all to authenticated
  using (public.has_role('SUPERADMIN') or public.has_role('PUSTAKAWAN'))
  with check (public.has_role('SUPERADMIN') or public.has_role('PUSTAKAWAN'));

-- C. Fungsi
create or replace function public.perpus_simpan_catatan(p_buku uuid, p_isi text, p_publik boolean default true)
returns public.perpus_catatan language plpgsql security definer set search_path = public as $$
declare
  v_anggota text;
  v public.perpus_catatan%rowtype;
begin
  select status into v_anggota from public.perpus_anggota where "userId" = auth.uid();
  if not found then raise exception 'perpus:bukan_anggota'; end if;
  if v_anggota = 'diblokir' then raise exception 'perpus:diblokir'; end if;
  if not exists (
    select 1 from public.perpus_pinjaman
     where "anggotaId" = auth.uid() and "bukuId" = p_buku
       and status in ('dipinjam', 'menunggu_verifikasi', 'dikembalikan')
  ) then raise exception 'perpus:belum_pernah_pinjam'; end if;
  insert into public.perpus_catatan ("anggotaId", "bukuId", isi, publik)
  values (auth.uid(), p_buku, p_isi, coalesce(p_publik, true))
  on conflict ("anggotaId", "bukuId") where "dihapusAt" is null
  do update set isi = excluded.isi, publik = excluded.publik, "updatedAt" = now()
  returning * into v;
  return v;
end $$;

create or replace function public.perpus_hapus_catatan(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.perpus_catatan where id = p_id and "anggotaId" = auth.uid() and "dihapusAt" is null;
  if not found then raise exception 'perpus:catatan_tidak_ada'; end if;
end $$;

create or replace function public.perpus_tutup_pemberitahuan(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.perpus_catatan set "pemberitahuanDitutupAt" = now()
   where id = p_id and "anggotaId" = auth.uid() and "dihapusAt" is not null;
  if not found then raise exception 'perpus:catatan_tidak_ada'; end if;
end $$;

create or replace function public.perpus_moderasi_catatan(p_id uuid, p_alasan text default null)
returns public.perpus_catatan language plpgsql security definer set search_path = public as $$
declare v public.perpus_catatan%rowtype;
begin
  if not public.has_role('SUPERADMIN') then raise exception 'perpus:terlarang'; end if;
  update public.perpus_catatan set "dihapusAt" = now(), "dihapusOleh" = auth.uid(), "alasanHapus" = nullif(trim(p_alasan), '')
   where id = p_id and publik and "dihapusAt" is null
  returning * into v;
  if not found then raise exception 'perpus:catatan_tidak_ada'; end if;
  return v;
end $$;

revoke all on function public.perpus_simpan_catatan(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.perpus_hapus_catatan(uuid) from public, anon, authenticated;
revoke all on function public.perpus_tutup_pemberitahuan(uuid) from public, anon, authenticated;
revoke all on function public.perpus_moderasi_catatan(uuid, text) from public, anon, authenticated;
grant execute on function public.perpus_simpan_catatan(uuid, text, boolean) to authenticated;
grant execute on function public.perpus_hapus_catatan(uuid) to authenticated;
grant execute on function public.perpus_tutup_pemberitahuan(uuid) to authenticated;
grant execute on function public.perpus_moderasi_catatan(uuid, text) to authenticated;

-- D. View. Daftar kolom catatan publik adalah batas privasinya: tanpa anggotaId, nama hanya nama depan + inisial.
create or replace view public.perpus_catatan_publik with (security_invoker = false) as
select
  c.id,
  c."bukuId",
  c.isi,
  c."createdAt",
  c."updatedAt",
  split_part(trim(a.nama), ' ', 1)
    || coalesce(' ' || nullif(left(split_part(trim(a.nama), ' ', 2), 1), '') || '.', '') as "namaSingkat"
from public.perpus_catatan c
join public.perpus_anggota a on a."userId" = c."anggotaId"
join public.perpus_buku b on b.id = c."bukuId"
where c.publik and c."dihapusAt" is null and a.status = 'aktif' and b.aktif;

create or replace view public.perpus_catatanku with (security_invoker = false) as
select
  c.id,
  c."bukuId",
  c.isi,
  c.publik,
  c."createdAt",
  c."updatedAt",
  c."dihapusAt",
  c."alasanHapus",
  c."pemberitahuanDitutupAt",
  left(b.id::text, 8) as "idPendek",
  b.judul
from public.perpus_catatan c
join public.perpus_buku b on b.id = c."bukuId"
where c."anggotaId" = auth.uid();

-- Kolom baru di akhir agar create or replace diterima.
create or replace view public.perpus_pinjamanku with (security_invoker = false) as
select
  p.id,
  p.status,
  p."jatuhTempo",
  p."diajukanAt",
  p."dikembalikanAt",
  p.catatan,
  left(b.id::text, 8) as "idPendek",
  b.judul,
  b.penulis,
  case when b."nomorPanggil" ~ '^(TMP|AUDIT)-' then null else b."nomorPanggil" end as "nomorPanggil",
  b."kelasDdc"
from public.perpus_pinjaman p
join public.perpus_buku b on b.id = p."bukuId"
where p."anggotaId" = auth.uid();

revoke all on public.perpus_catatan_publik from anon, authenticated;
grant select on public.perpus_catatan_publik to anon, authenticated;
revoke all on public.perpus_catatanku from anon, authenticated;
grant select on public.perpus_catatanku to authenticated;
