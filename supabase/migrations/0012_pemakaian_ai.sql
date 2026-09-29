-- 0012: AI & OCR — setelan penyedia (pengaturan.kunci='ai') + catatan pemakaian.
insert into public.pengaturan (kunci, nilai) values ('ai', '{
  "utama": {"penyedia": "openai", "model": "gpt-5.4-mini"},
  "cadangan": {"penyedia": "gemini", "model": "gemini-flash-lite-latest"},
  "batasHarian": 200,
  "plafonBulananRp": 50000,
  "harga": {}
}'::jsonb) on conflict (kunci) do nothing;

create table if not exists public.pemakaian_ai (
  id uuid primary key default gen_random_uuid(),
  "idPermintaan" uuid not null,
  waktu timestamptz not null default now(),
  "penggunaId" uuid references public.profiles(id) on delete set null,
  fitur text not null check (fitur in ('ocr_tunggal', 'ocr_massal', 'ocr_mandiri')),
  peran text not null check (peran in ('utama', 'cadangan')),
  penyedia text not null check (penyedia in ('openai', 'gemini')),
  model text not null,
  "tokenMasuk" int not null default 0,
  "tokenKeluar" int not null default 0,
  "biayaRp" numeric(12,2),
  berhasil boolean not null,
  galat text
);
create index if not exists pemakaian_ai_waktu_idx on public.pemakaian_ai (waktu desc);

-- Ditulis server dengan kunci admin; dibaca Superadmin saja.
alter table public.pemakaian_ai enable row level security;
drop policy if exists "pemakaian_ai: baca" on public.pemakaian_ai;
create policy "pemakaian_ai: baca" on public.pemakaian_ai for select to authenticated
  using (public.has_role('SUPERADMIN'));
