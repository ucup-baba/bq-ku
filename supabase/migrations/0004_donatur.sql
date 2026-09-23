-- 0004_donatur.sql — Ruang Donatur: donatur, donasi, surat ucapan terima kasih.

create table if not exists public.donatur (
  id text primary key,
  nama text not null,
  sapaan text not null default 'BAPAK' check (sapaan in ('BAPAK','IBU','SDR','SDRI','BAPAK_IBU')),
  "noWa" text,
  alamat text,
  catatan text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists donatur_nama_idx on public.donatur (lower(nama));

create table if not exists public.donasi (
  id text primary key,
  "donaturId" text not null references public.donatur(id) on delete cascade,
  tanggal date not null,
  jenis text not null check (jenis in ('ZAKAT','INFAQ','SHADAQAH','LAINNYA')),
  bentuk text not null check (bentuk in ('UANG','BARANG')),
  nominal bigint,
  "deskripsiBarang" text,
  keterangan text,
  "createdAt" timestamptz not null default now(),
  "createdBy" uuid references public.profiles(id),
  constraint donasi_bentuk_isi check (
    (bentuk = 'UANG' and nominal is not null and nominal > 0 and "deskripsiBarang" is null)
    or (bentuk = 'BARANG' and "deskripsiBarang" is not null and nominal is null)
  )
);
create index if not exists donasi_tanggal_idx on public.donasi (tanggal desc);
create index if not exists donasi_donatur_idx on public.donasi ("donaturId");

create table if not exists public.surat (
  id text primary key,
  "donasiId" text not null references public.donasi(id) on delete cascade,
  "nomorSurat" text not null unique,
  "tanggalSurat" date not null,
  "storagePath" text,
  "terkirimWa" boolean not null default false,
  "dikirimAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "createdBy" uuid references public.profiles(id)
);
create index if not exists surat_tanggal_idx on public.surat ("tanggalSurat" desc);

create table if not exists public.nomor_surat_counter (
  tahun int not null,
  bulan int not null,
  "urutanTerakhir" int not null default 0,
  primary key (tahun, bulan)
);

alter table public.donatur enable row level security;
alter table public.donasi enable row level security;
alter table public.surat enable row level security;
alter table public.nomor_surat_counter enable row level security;

do $$
declare t text;
begin
  foreach t in array array['donatur','donasi','surat','nomor_surat_counter'] loop
    -- drop dulu agar migrasi ini aman dijalankan ulang
    execute format('drop policy if exists "%1$s: baca" on public.%1$I', t);
    execute format('drop policy if exists "%1$s: tulis" on public.%1$I', t);
    execute format('drop policy if exists "%1$s: ubah" on public.%1$I', t);
    execute format('drop policy if exists "%1$s: hapus" on public.%1$I', t);
    execute format('create policy "%1$s: baca" on public.%1$I for select to authenticated using (public.has_role(''SUPERADMIN'') or public.has_role(''ADMIN_DONATUR''))', t);
    execute format('create policy "%1$s: tulis" on public.%1$I for insert to authenticated with check (public.has_role(''SUPERADMIN'') or public.has_role(''ADMIN_DONATUR''))', t);
    execute format('create policy "%1$s: ubah" on public.%1$I for update to authenticated using (public.has_role(''SUPERADMIN'') or public.has_role(''ADMIN_DONATUR'')) with check (public.has_role(''SUPERADMIN'') or public.has_role(''ADMIN_DONATUR''))', t);
    execute format('create policy "%1$s: hapus" on public.%1$I for delete to authenticated using (public.has_role(''SUPERADMIN''))', t);
  end loop;
end $$;

-- Nomor surat berikutnya, aman dari balapan (dipanggil lewat RPC).
create or replace function public.next_nomor_surat(p_tahun int, p_bulan int)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if not (public.has_role('SUPERADMIN') or public.has_role('ADMIN_DONATUR')) then
    raise exception 'Tidak berhak';
  end if;
  insert into public.nomor_surat_counter (tahun, bulan, "urutanTerakhir")
  values (p_tahun, p_bulan, 1)
  on conflict (tahun, bulan) do update set "urutanTerakhir" = public.nomor_surat_counter."urutanTerakhir" + 1
  returning "urutanTerakhir" into v;
  return v;
end $$;
grant execute on function public.next_nomor_surat(int, int) to authenticated;

-- Menaikkan counter bila panitia memakai nomor manual yang lebih besar.
create or replace function public.bump_nomor_surat(p_tahun int, p_bulan int, p_urut int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.has_role('SUPERADMIN') or public.has_role('ADMIN_DONATUR')) then
    raise exception 'Tidak berhak';
  end if;
  insert into public.nomor_surat_counter (tahun, bulan, "urutanTerakhir")
  values (p_tahun, p_bulan, p_urut)
  on conflict (tahun, bulan) do update
    set "urutanTerakhir" = greatest(public.nomor_surat_counter."urutanTerakhir", p_urut);
end $$;
grant execute on function public.bump_nomor_surat(int, int, int) to authenticated;
