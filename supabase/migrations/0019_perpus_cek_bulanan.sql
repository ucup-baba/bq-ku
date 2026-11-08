-- 0019: Perpus BQ — cek bulanan (stok opname) buku di rak.
-- Satu sesi per bulan; hasil per judul. Hanya SUPERADMIN & PUSTAKAWAN, tidak ada yang tampil publik.
-- Aman dijalankan ulang.

create table if not exists public.perpus_cek (
  id uuid primary key default gen_random_uuid(),
  periode text not null unique check (periode ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  "dibuatAt" timestamptz not null default now(),
  "dibuatOleh" uuid references public.profiles(id) on delete set null,
  "selesaiAt" timestamptz,
  "selesaiOleh" uuid references public.profiles(id) on delete set null
);

create table if not exists public.perpus_cek_item (
  "cekId" uuid not null references public.perpus_cek(id) on delete cascade,
  "bukuId" uuid not null references public.perpus_buku(id) on delete cascade,
  hasil text not null check (hasil in ('ada', 'rusak', 'hilang')),
  "jumlahAda" int not null default 0 check ("jumlahAda" between 0 and 99),
  catatan text check (catatan is null or char_length(catatan) <= 300),
  "dicekOleh" uuid references public.profiles(id) on delete set null,
  "dicekAt" timestamptz not null default now(),
  primary key ("cekId", "bukuId")
);
create index if not exists perpus_cek_item_buku_idx on public.perpus_cek_item ("bukuId");

do $$
declare t text;
begin
  foreach t in array array['perpus_cek', 'perpus_cek_item'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%1$s: kelola" on public.%1$I', t);
    execute format('create policy "%1$s: kelola" on public.%1$I for all to authenticated '
      'using (public.has_role(''SUPERADMIN'') or public.has_role(''PUSTAKAWAN'')) '
      'with check (public.has_role(''SUPERADMIN'') or public.has_role(''PUSTAKAWAN''))', t);
  end loop;
end $$;
