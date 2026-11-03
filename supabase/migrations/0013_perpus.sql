-- 0013: Perpus BQ tahap 1 — peran PUSTAKAWAN, katalog buku, donasi & pengadaan perpustakaan.
-- Hanya SUPERADMIN & PUSTAKAWAN yang membaca/menulis tabel ini (halaman publik menyusul di 0014 lewat view).
-- Aman dijalankan ulang.

-- A. Peran
alter table public.profiles drop constraint if exists profiles_roles_valid;
alter table public.allowed_emails drop constraint if exists allowed_emails_roles_valid;
alter table public.profiles add constraint profiles_roles_valid
  check (roles <@ array['SUPERADMIN','PENGURUS','ADMIN_SANTRI','ADMIN_DONATUR','PUSTAKAWAN','VIEWER'] and cardinality(roles) >= 1);
alter table public.allowed_emails add constraint allowed_emails_roles_valid
  check (roles <@ array['SUPERADMIN','PENGURUS','ADMIN_SANTRI','ADMIN_DONATUR','PUSTAKAWAN','VIEWER'] and cardinality(roles) >= 1);

-- B. Fitur AI baru
alter table public.pemakaian_ai drop constraint if exists pemakaian_ai_fitur_check;
alter table public.pemakaian_ai add constraint pemakaian_ai_fitur_check
  check (fitur in ('ocr_tunggal', 'ocr_massal', 'ocr_mandiri', 'klasifikasi_buku'));

-- C. Tabel
create table if not exists public.perpus_donasi (
  id uuid primary key default gen_random_uuid(),
  tanggal date,
  "tanggalTeks" text,
  nama text not null,
  jenis text not null check (jenis in ('uang', 'buku')),
  jumlah bigint check (jumlah is null or jumlah >= 0),
  "jumlahBuku" int check ("jumlahBuku" is null or "jumlahBuku" >= 1),
  catatan text,
  "createdAt" timestamptz not null default now(),
  "createdBy" uuid references public.profiles(id) on delete set null,
  constraint perpus_donasi_isi check ((jenis = 'uang' and jumlah is not null) or (jenis = 'buku' and jumlah is null))
);

create table if not exists public.perpus_pengadaan (
  id uuid primary key default gen_random_uuid(),
  tanggal date,
  "tanggalTeks" text,
  toko text,
  total bigint not null default 0 check (total >= 0),
  catatan text,
  "createdAt" timestamptz not null default now(),
  "createdBy" uuid references public.profiles(id) on delete set null
);

create table if not exists public.perpus_buku (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  penulis text not null default '',
  "kelasDdc" text not null default '',
  "kodePengarang" text not null default '',
  "kodeJudul" text not null default '',
  "noSeri" int,
  "nomorPanggil" text not null unique,
  "nomorPanggilLama" text,
  "statusKode" text not null default 'baku' check ("statusKode" in ('baku', 'perlu_audit')),
  "catatanAudit" text,
  eksemplar int not null default 1 check (eksemplar between 1 and 99),
  "sampulPath" text,
  asal text not null default 'koleksi_awal' check (asal in ('koleksi_awal', 'wakaf', 'pengadaan')),
  "donasiId" uuid references public.perpus_donasi(id) on delete set null,
  "pengadaanId" uuid references public.perpus_pengadaan(id) on delete set null,
  aktif boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "createdBy" uuid references public.profiles(id) on delete set null
);
create index if not exists perpus_buku_donasi_idx on public.perpus_buku ("donasiId");
create index if not exists perpus_buku_pengadaan_idx on public.perpus_buku ("pengadaanId");
create index if not exists perpus_buku_status_idx on public.perpus_buku ("statusKode");

-- D. RLS: kelola penuh hanya SUPERADMIN & PUSTAKAWAN
do $$
declare t text;
begin
  foreach t in array array['perpus_donasi', 'perpus_pengadaan', 'perpus_buku'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%1$s: kelola" on public.%1$I', t);
    execute format('create policy "%1$s: kelola" on public.%1$I for all to authenticated '
      'using (public.has_role(''SUPERADMIN'') or public.has_role(''PUSTAKAWAN'')) '
      'with check (public.has_role(''SUPERADMIN'') or public.has_role(''PUSTAKAWAN''))', t);
  end loop;
end $$;

-- E. Terapkan nomor panggil hasil audit dalam satu transaksi.
--    Nomor lama semua buku yang diubah dilepas dulu (AUDIT-<id>) supaya pertukaran nomor antarbuku tidak melanggar unique.
create or replace function public.perpus_terapkan_nomor(perubahan jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.perpus_buku set "nomorPanggil" = 'AUDIT-' || id
   where id in (select (e->>'id')::uuid from jsonb_array_elements(perubahan) e);
  update public.perpus_buku b set
    "kelasDdc" = e->>'kelasDdc',
    "kodePengarang" = e->>'kodePengarang',
    "kodeJudul" = e->>'kodeJudul',
    "noSeri" = (e->>'noSeri')::int,
    "nomorPanggil" = e->>'nomorPanggil',
    "statusKode" = 'baku',
    "catatanAudit" = null,
    "updatedAt" = now()
  from jsonb_array_elements(perubahan) e
  where b.id = (e->>'id')::uuid;
end $$;
revoke all on function public.perpus_terapkan_nomor(jsonb) from public;
grant execute on function public.perpus_terapkan_nomor(jsonb) to authenticated;
