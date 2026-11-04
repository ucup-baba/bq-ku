-- 0015: Perpus BQ tahap 3 — anggota, pinjaman, ketersediaan.
-- Anggota tidak punya policy insert/update: semua tulisannya lewat fungsi security definer di bagian C,
-- agar status anggota tidak bisa diubah sendiri dan transisi pinjaman tidak bisa dilompati.
-- Galat berformat perpus:<kode>; lihat galatDariRpc di lib/perpus/pinjaman.ts.
-- Aman dijalankan ulang.

-- A. Tabel
create table if not exists public.perpus_anggota (
  "userId" uuid primary key references auth.users(id) on delete cascade,
  nama text not null check (char_length(trim(nama)) between 2 and 120),
  "noWa" text not null check ("noWa" ~ '^62[0-9]{8,13}$'),
  status text not null default 'aktif' check (status in ('aktif', 'diblokir')),
  "createdAt" timestamptz not null default now()
);

create table if not exists public.perpus_pinjaman (
  id uuid primary key default gen_random_uuid(),
  "anggotaId" uuid not null references public.perpus_anggota("userId") on delete restrict,
  "bukuId" uuid not null references public.perpus_buku(id) on delete restrict,
  status text not null default 'diajukan'
    check (status in ('diajukan', 'dipinjam', 'menunggu_verifikasi', 'dikembalikan', 'ditolak', 'dibatalkan')),
  "jatuhTempo" date,
  "diajukanAt" timestamptz not null default now(),
  "disetujuiAt" timestamptz,
  "diserahkanAt" timestamptz,
  "diklaimKembaliAt" timestamptz,
  "dikembalikanAt" timestamptz,
  "diprosesOleh" uuid references public.profiles(id) on delete set null,
  catatan text
);
create index if not exists perpus_pinjaman_anggota_idx on public.perpus_pinjaman ("anggotaId");
create index if not exists perpus_pinjaman_buku_idx on public.perpus_pinjaman ("bukuId");
create index if not exists perpus_pinjaman_status_idx on public.perpus_pinjaman (status);
-- Satu anggota tidak bisa punya dua pinjaman aktif untuk buku yang sama.
create unique index if not exists perpus_pinjaman_aktif_unik on public.perpus_pinjaman ("anggotaId", "bukuId")
  where status in ('diajukan', 'dipinjam', 'menunggu_verifikasi');

-- B. RLS
do $$
declare t text;
begin
  foreach t in array array['perpus_anggota', 'perpus_pinjaman'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%1$s: kelola" on public.%1$I', t);
    execute format('create policy "%1$s: kelola" on public.%1$I for all to authenticated '
      'using (public.has_role(''SUPERADMIN'') or public.has_role(''PUSTAKAWAN'')) '
      'with check (public.has_role(''SUPERADMIN'') or public.has_role(''PUSTAKAWAN''))', t);
  end loop;
end $$;

drop policy if exists "perpus_anggota: baca sendiri" on public.perpus_anggota;
create policy "perpus_anggota: baca sendiri" on public.perpus_anggota for select to authenticated
  using ("userId" = auth.uid());
drop policy if exists "perpus_pinjaman: baca sendiri" on public.perpus_pinjaman;
create policy "perpus_pinjaman: baca sendiri" on public.perpus_pinjaman for select to authenticated
  using ("anggotaId" = auth.uid());

-- C. Fungsi
create or replace function public.perpus_hari_ini()
returns date language sql stable set search_path = public as $$
  select (now() at time zone 'Asia/Jakarta')::date;
$$;

create or replace function public.perpus_jumlah_dipinjam(p_buku uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.perpus_pinjaman
   where "bukuId" = p_buku and status in ('dipinjam', 'menunggu_verifikasi');
$$;

-- Daftar atau perbarui data sendiri; status tidak ikut berubah, jadi blokir tidak bisa dilepas sendiri.
create or replace function public.perpus_daftar_anggota(p_nama text, p_no_wa text)
returns public.perpus_anggota language plpgsql security definer set search_path = public as $$
declare v public.perpus_anggota%rowtype;
begin
  if auth.uid() is null then raise exception 'perpus:bukan_anggota'; end if;
  insert into public.perpus_anggota ("userId", nama, "noWa") values (auth.uid(), p_nama, p_no_wa)
  on conflict ("userId") do update set nama = excluded.nama, "noWa" = excluded."noWa"
  returning * into v;
  return v;
end $$;

create or replace function public.perpus_ajukan_pinjaman(p_buku uuid)
returns public.perpus_pinjaman language plpgsql security definer set search_path = public as $$
declare
  v_anggota text;
  v_eksemplar int;
  v public.perpus_pinjaman%rowtype;
begin
  select status into v_anggota from public.perpus_anggota where "userId" = auth.uid();
  if not found then raise exception 'perpus:bukan_anggota'; end if;
  if v_anggota = 'diblokir' then raise exception 'perpus:diblokir'; end if;
  select eksemplar into v_eksemplar from public.perpus_buku where id = p_buku and aktif;
  if not found then raise exception 'perpus:buku_tidak_ada'; end if;
  if public.perpus_jumlah_dipinjam(p_buku) >= v_eksemplar then raise exception 'perpus:stok_habis'; end if;
  begin
    insert into public.perpus_pinjaman ("anggotaId", "bukuId") values (auth.uid(), p_buku) returning * into v;
  exception when unique_violation then
    raise exception 'perpus:sudah_diajukan';
  end;
  return v;
end $$;

create or replace function public.perpus_batal_pinjaman(p_id uuid)
returns public.perpus_pinjaman language plpgsql security definer set search_path = public as $$
declare
  v public.perpus_pinjaman%rowtype;
  v_status text;
begin
  update public.perpus_pinjaman set status = 'dibatalkan'
   where id = p_id and "anggotaId" = auth.uid() and status = 'diajukan'
  returning * into v;
  if found then return v; end if;
  select status into v_status from public.perpus_pinjaman where id = p_id and "anggotaId" = auth.uid();
  if not found then raise exception 'perpus:pinjaman_tidak_ada'; end if;
  raise exception 'perpus:status_tidak_sah:%', v_status;
end $$;

create or replace function public.perpus_klaim_kembali(p_id uuid)
returns public.perpus_pinjaman language plpgsql security definer set search_path = public as $$
declare
  v public.perpus_pinjaman%rowtype;
  v_status text;
begin
  update public.perpus_pinjaman set status = 'menunggu_verifikasi', "diklaimKembaliAt" = now()
   where id = p_id and "anggotaId" = auth.uid() and status = 'dipinjam'
  returning * into v;
  if found then return v; end if;
  select status into v_status from public.perpus_pinjaman where id = p_id and "anggotaId" = auth.uid();
  if not found then raise exception 'perpus:pinjaman_tidak_ada'; end if;
  raise exception 'perpus:status_tidak_sah:%', v_status;
end $$;

-- Mengunci baris buku supaya dua ACC paralel tidak sama-sama mengambil eksemplar terakhir.
create or replace function public.perpus_acc_pinjaman(p_id uuid, p_jatuh_tempo date default null)
returns public.perpus_pinjaman language plpgsql security definer set search_path = public as $$
declare
  v public.perpus_pinjaman%rowtype;
  v_eksemplar int;
begin
  if not (public.has_role('SUPERADMIN') or public.has_role('PUSTAKAWAN')) then
    raise exception 'perpus:terlarang';
  end if;
  if p_jatuh_tempo < public.perpus_hari_ini() then raise exception 'perpus:tanggal_tidak_sah'; end if;
  select * into v from public.perpus_pinjaman where id = p_id for update;
  if not found then raise exception 'perpus:pinjaman_tidak_ada'; end if;
  if v.status <> 'diajukan' then raise exception 'perpus:status_tidak_sah:%', v.status; end if;
  select eksemplar into v_eksemplar from public.perpus_buku where id = v."bukuId" for update;
  if public.perpus_jumlah_dipinjam(v."bukuId") >= v_eksemplar then raise exception 'perpus:stok_habis'; end if;
  update public.perpus_pinjaman set
    status = 'dipinjam',
    "jatuhTempo" = coalesce(p_jatuh_tempo, public.perpus_hari_ini() + 14),
    "disetujuiAt" = now(),
    "diserahkanAt" = now(),
    "diprosesOleh" = auth.uid()
  where id = p_id
  returning * into v;
  return v;
end $$;

-- Supabase memberi EXECUTE ke anon/authenticated lewat default privileges, jadi keduanya dicabut eksplisit.
revoke all on function public.perpus_hari_ini() from public, anon, authenticated;
revoke all on function public.perpus_jumlah_dipinjam(uuid) from public, anon, authenticated;
revoke all on function public.perpus_daftar_anggota(text, text) from public, anon, authenticated;
revoke all on function public.perpus_ajukan_pinjaman(uuid) from public, anon, authenticated;
revoke all on function public.perpus_batal_pinjaman(uuid) from public, anon, authenticated;
revoke all on function public.perpus_klaim_kembali(uuid) from public, anon, authenticated;
revoke all on function public.perpus_acc_pinjaman(uuid, date) from public, anon, authenticated;
grant execute on function public.perpus_daftar_anggota(text, text) to authenticated;
grant execute on function public.perpus_ajukan_pinjaman(uuid) to authenticated;
grant execute on function public.perpus_batal_pinjaman(uuid) to authenticated;
grant execute on function public.perpus_klaim_kembali(uuid) to authenticated;
grant execute on function public.perpus_acc_pinjaman(uuid, date) to authenticated;

-- D. View publik. Hak akses dari 0014 tetap berlaku pada create or replace.
create or replace view public.perpus_katalog_publik with (security_invoker = false) as
select
  b.id,
  left(b.id::text, 8) as "idPendek",
  b.judul,
  b.penulis,
  case when b."nomorPanggil" ~ '^(TMP|AUDIT)-' then null else b."nomorPanggil" end as "nomorPanggil",
  b."kelasDdc",
  b.eksemplar,
  greatest(b.eksemplar - coalesce(p.jumlah, 0), 0)::int as tersedia,
  b."sampulPath",
  b.asal,
  case when b.asal = 'wakaf' then d.nama end as "namaDonatur",
  b."createdAt"
from public.perpus_buku b
left join public.perpus_donasi d on d.id = b."donasiId"
left join (
  select "bukuId", count(*)::int as jumlah from public.perpus_pinjaman
   where status in ('dipinjam', 'menunggu_verifikasi') group by "bukuId"
) p on p."bukuId" = b.id
where b.aktif;

-- Kolom baru harus di akhir agar create or replace diterima.
create or replace view public.perpus_ringkasan_publik with (security_invoker = false) as
with infaq as (
  select coalesce(sum(jumlah), 0)::bigint as total from public.perpus_donasi where jenis = 'uang'
), belanja as (
  select coalesce(sum(total), 0)::bigint as total from public.perpus_pengadaan
)
select
  (select count(*) from public.perpus_buku where aktif)::int as judul,
  (select coalesce(sum(eksemplar), 0) from public.perpus_buku where aktif)::int as eksemplar,
  (select count(distinct lower(trim(nama))) from public.perpus_donasi)::int as donatur,
  infaq.total as "totalInfaq",
  belanja.total as "totalPengadaan",
  infaq.total - belanja.total as saldo,
  (select count(*) from public.perpus_pinjaman where status in ('dipinjam', 'menunggu_verifikasi'))::int as "sedangDipinjam"
from infaq, belanja;

-- E. Pinjaman milik sendiri beserta judul; anggota tidak bisa membaca perpus_buku langsung.
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
  case when b."nomorPanggil" ~ '^(TMP|AUDIT)-' then null else b."nomorPanggil" end as "nomorPanggil"
from public.perpus_pinjaman p
join public.perpus_buku b on b.id = p."bukuId"
where p."anggotaId" = auth.uid();

revoke all on public.perpus_pinjamanku from anon, authenticated;
grant select on public.perpus_pinjamanku to authenticated;
