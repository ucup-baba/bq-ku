-- 0011: Berkas lembaga (Ruang Lembaga tahap B).
-- Berkas legal yayasan + riwayat versi, tautan bagikan (hash token), catatan akses
-- yang tidak bisa diubah/dihapus, dan saklar "Pengurus boleh mengelola berkas".
-- Cap & tanda tangan (rahasia): hanya Superadmin yang bisa membuka/mengunggah, dan
-- tidak bisa masuk tautan bagikan. Butuh migrasi 0010 (peran PENGURUS). Aman dijalankan ulang.

-- =====================================================================
-- A. PENGATURAN
-- =====================================================================
create table if not exists public.pengaturan (
  kunci text primary key,
  nilai jsonb not null,
  "updatedAt" timestamptz not null default now(),
  "updatedBy" uuid references public.profiles(id)
);
insert into public.pengaturan (kunci, nilai) values ('pengurus_kelola_berkas', 'false'::jsonb)
  on conflict (kunci) do nothing;
alter table public.pengaturan enable row level security;

drop policy if exists "pengaturan: baca" on public.pengaturan;
create policy "pengaturan: baca" on public.pengaturan for select to authenticated
  using (public.has_role('SUPERADMIN') or public.has_role('PENGURUS'));
drop policy if exists "pengaturan: ubah" on public.pengaturan;
create policy "pengaturan: ubah" on public.pengaturan for update to authenticated
  using (public.has_role('SUPERADMIN')) with check (public.has_role('SUPERADMIN'));

-- =====================================================================
-- B. FUNGSI BANTU
-- =====================================================================
create or replace function public.boleh_kelola_berkas()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('SUPERADMIN')
      or (public.has_role('PENGURUS')
          and coalesce((select nilai = 'true'::jsonb from public.pengaturan where kunci = 'pengurus_kelola_berkas'), false));
$$;
grant execute on function public.boleh_kelola_berkas() to authenticated;

create or replace function public.berkas_rahasia(p_jenis text)
returns boolean language sql immutable set search_path = public as $$
  select p_jenis in ('CAP', 'TANDA_TANGAN');
$$;

-- Boleh membuka file berkas (versi): Superadmin semua; Pengurus hanya yang bukan rahasia.
create or replace function public.boleh_buka_berkas(p_jenis text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('SUPERADMIN') or (public.has_role('PENGURUS') and not public.berkas_rahasia(p_jenis));
$$;
grant execute on function public.boleh_buka_berkas(text) to authenticated;

-- Boleh menulis berkas berjenis p_jenis: rahasia hanya Superadmin; lainnya boleh_kelola_berkas().
create or replace function public.boleh_tulis_berkas(p_jenis text)
returns boolean language sql stable security definer set search_path = public as $$
  select case when public.berkas_rahasia(p_jenis) then public.has_role('SUPERADMIN') else public.boleh_kelola_berkas() end;
$$;
grant execute on function public.boleh_tulis_berkas(text) to authenticated;

-- =====================================================================
-- C. BERKAS & VERSI
-- =====================================================================
create table if not exists public.berkas_lembaga (
  id text primary key,
  jenis text not null check (jenis in ('SK_KEMENKUMHAM','AKTA_PENDIRIAN','AKTA_PERUBAHAN','NPWP','IZIN_OPERASIONAL',
                                        'AKREDITASI','REKENING_BANK','CAP','TANDA_TANGAN','LAINNYA')),
  "namaLainnya" text,
  "nomorDokumen" text,
  "tanggalTerbit" date,
  "berlakuSampai" date,
  "namaPenandatangan" text,
  "createdAt" timestamptz not null default now(),
  "createdBy" uuid references public.profiles(id),
  "updatedAt" timestamptz not null default now(),
  constraint berkas_lembaga_nama_lainnya check (
    (jenis = 'LAINNYA' and coalesce(btrim("namaLainnya"), '') <> '') or (jenis <> 'LAINNYA' and "namaLainnya" is null)
  )
);
create unique index if not exists berkas_lembaga_jenis_tetap on public.berkas_lembaga (jenis) where jenis <> 'LAINNYA';

create table if not exists public.berkas_lembaga_versi (
  id text primary key,
  "berkasId" text not null references public.berkas_lembaga(id) on delete cascade,
  versi int not null check (versi >= 1),
  "storagePath" text not null unique,
  "namaFile" text not null,
  mime text not null check (mime in ('application/pdf','image/jpeg','image/png')),
  ukuran int not null check (ukuran > 0 and ukuran <= 10485760),
  "createdAt" timestamptz not null default now(),
  "createdBy" uuid references public.profiles(id),
  unique ("berkasId", versi)
);

alter table public.berkas_lembaga enable row level security;
alter table public.berkas_lembaga_versi enable row level security;

drop policy if exists "berkas_lembaga: baca" on public.berkas_lembaga;
create policy "berkas_lembaga: baca" on public.berkas_lembaga for select to authenticated
  using (public.has_role('SUPERADMIN') or public.has_role('PENGURUS'));
drop policy if exists "berkas_lembaga: tulis" on public.berkas_lembaga;
create policy "berkas_lembaga: tulis" on public.berkas_lembaga for insert to authenticated
  with check (public.boleh_tulis_berkas(jenis));
drop policy if exists "berkas_lembaga: ubah" on public.berkas_lembaga;
create policy "berkas_lembaga: ubah" on public.berkas_lembaga for update to authenticated
  using (public.boleh_tulis_berkas(jenis)) with check (public.boleh_tulis_berkas(jenis));
drop policy if exists "berkas_lembaga: hapus" on public.berkas_lembaga;
create policy "berkas_lembaga: hapus" on public.berkas_lembaga for delete to authenticated
  using (public.has_role('SUPERADMIN'));

drop policy if exists "berkas_lembaga_versi: baca" on public.berkas_lembaga_versi;
create policy "berkas_lembaga_versi: baca" on public.berkas_lembaga_versi for select to authenticated
  using (exists (select 1 from public.berkas_lembaga b where b.id = "berkasId" and public.boleh_buka_berkas(b.jenis)));
drop policy if exists "berkas_lembaga_versi: tulis" on public.berkas_lembaga_versi;
create policy "berkas_lembaga_versi: tulis" on public.berkas_lembaga_versi for insert to authenticated
  with check (exists (select 1 from public.berkas_lembaga b where b.id = "berkasId" and public.boleh_tulis_berkas(b.jenis)));
drop policy if exists "berkas_lembaga_versi: hapus" on public.berkas_lembaga_versi;
create policy "berkas_lembaga_versi: hapus" on public.berkas_lembaga_versi for delete to authenticated
  using (public.has_role('SUPERADMIN'));

create or replace function public.berkas_lembaga_sentuh()
returns trigger language plpgsql set search_path = public as $$
begin new."updatedAt" := now(); return new; end $$;
drop trigger if exists berkas_lembaga_sentuh on public.berkas_lembaga;
create trigger berkas_lembaga_sentuh before update on public.berkas_lembaga
  for each row execute function public.berkas_lembaga_sentuh();

-- =====================================================================
-- D. TAUTAN BAGIKAN
-- =====================================================================
create table if not exists public.tautan_bagikan (
  id text primary key,
  "tokenHash" text not null unique,
  penerima text not null check (btrim(penerima) <> ''),
  catatan text,
  "kedaluwarsaAt" timestamptz not null,
  "dicabutAt" timestamptz,
  "pinHash" text,
  "pinGagal" int not null default 0,
  "pinTerkunciSampai" timestamptz,
  "batasBuka" int check ("batasBuka" is null or "batasBuka" >= 1),
  "jumlahBuka" int not null default 0,
  "tandaAir" boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "createdBy" uuid references public.profiles(id)
);

create table if not exists public.tautan_bagikan_berkas (
  "tautanId" text not null references public.tautan_bagikan(id) on delete cascade,
  "berkasId" text not null references public.berkas_lembaga(id) on delete cascade,
  primary key ("tautanId", "berkasId")
);

alter table public.tautan_bagikan enable row level security;
alter table public.tautan_bagikan_berkas enable row level security;

drop policy if exists "tautan_bagikan: baca" on public.tautan_bagikan;
create policy "tautan_bagikan: baca" on public.tautan_bagikan for select to authenticated
  using (public.has_role('SUPERADMIN') or public.has_role('PENGURUS'));
drop policy if exists "tautan_bagikan: tulis" on public.tautan_bagikan;
create policy "tautan_bagikan: tulis" on public.tautan_bagikan for insert to authenticated
  with check (public.boleh_kelola_berkas());
drop policy if exists "tautan_bagikan: ubah" on public.tautan_bagikan;
create policy "tautan_bagikan: ubah" on public.tautan_bagikan for update to authenticated
  using (public.boleh_kelola_berkas()) with check (public.boleh_kelola_berkas());

drop policy if exists "tautan_bagikan_berkas: baca" on public.tautan_bagikan_berkas;
create policy "tautan_bagikan_berkas: baca" on public.tautan_bagikan_berkas for select to authenticated
  using (public.has_role('SUPERADMIN') or public.has_role('PENGURUS'));
drop policy if exists "tautan_bagikan_berkas: tulis" on public.tautan_bagikan_berkas;
create policy "tautan_bagikan_berkas: tulis" on public.tautan_bagikan_berkas for insert to authenticated
  with check (public.boleh_kelola_berkas());

-- Cap & tanda tangan tidak boleh masuk tautan bagikan — berlaku juga untuk service role.
create or replace function public.tolak_berkas_rahasia_dibagikan()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (select 1 from public.berkas_lembaga b where b.id = new."berkasId" and public.berkas_rahasia(b.jenis)) then
    raise exception 'Cap dan tanda tangan tidak boleh dibagikan' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists tolak_berkas_rahasia_dibagikan on public.tautan_bagikan_berkas;
create trigger tolak_berkas_rahasia_dibagikan before insert or update on public.tautan_bagikan_berkas
  for each row execute function public.tolak_berkas_rahasia_dibagikan();

-- =====================================================================
-- E. CATATAN AKSES (tidak bisa diubah/dihapus)
-- =====================================================================
create table if not exists public.log_akses_berkas (
  id bigserial primary key,
  waktu timestamptz not null default now(),
  aksi text not null check (aksi in ('LIHAT','UNDUH','UNGGAH','VERSI_BARU','UBAH_DATA','HAPUS','BUAT_TAUTAN',
                                     'CABUT_TAUTAN','BUKA_TAUTAN','UNDUH_TAUTAN','PIN_SALAH')),
  "berkasId" text,
  "versiId" text,
  "tautanId" text,
  "userId" uuid,
  ip text,
  perangkat text,
  rincian text
);
create index if not exists log_akses_berkas_waktu on public.log_akses_berkas (waktu desc);
alter table public.log_akses_berkas enable row level security;

drop policy if exists "log_akses_berkas: baca" on public.log_akses_berkas;
create policy "log_akses_berkas: baca" on public.log_akses_berkas for select to authenticated
  using (public.has_role('SUPERADMIN') or public.has_role('PENGURUS'));
-- Tidak ada policy insert/update/delete untuk authenticated: tulis hanya lewat catat_akses_berkas().

create or replace function public.tolak_ubah_log_akses()
returns trigger language plpgsql set search_path = public as $$
begin raise exception 'Catatan akses tidak bisa diubah atau dihapus'; end $$;
drop trigger if exists tolak_ubah_log_akses on public.log_akses_berkas;
create trigger tolak_ubah_log_akses before update or delete on public.log_akses_berkas
  for each row execute function public.tolak_ubah_log_akses();

-- Dicatat atas nama pemanggil (auth.uid()); hanya untuk pengguna Ruang Lembaga.
create or replace function public.catat_akses_berkas(
  p_aksi text, p_berkas text default null, p_versi text default null, p_tautan text default null, p_rincian text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.has_role('SUPERADMIN') or public.has_role('PENGURUS')) then
    raise exception 'Tidak berhak mencatat akses';
  end if;
  insert into public.log_akses_berkas (aksi, "berkasId", "versiId", "tautanId", "userId", rincian)
  values (p_aksi, p_berkas, p_versi, p_tautan, auth.uid(), p_rincian);
end $$;
revoke all on function public.catat_akses_berkas(text, text, text, text, text) from public;
grant execute on function public.catat_akses_berkas(text, text, text, text, text) to authenticated;

-- =====================================================================
-- F. STORAGE: folder lembaga/ (rahasia di lembaga/rahasia/)
-- =====================================================================
-- Kebijakan lama "berkas: baca/unggah/ubah/hapus" (0005) mengizinkan peran ruang santri untuk
-- semua path selain surat/. Kecualikan juga lembaga/ agar Admin Santri & Viewer tak bisa membukanya.
drop policy if exists "berkas: baca" on storage.objects;
create policy "berkas: baca" on storage.objects for select to authenticated
  using (
    bucket_id = 'berkas'
    and (storage.foldername(name))[1] is distinct from 'surat'
    and (storage.foldername(name))[1] is distinct from 'lembaga'
    and (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI') or public.has_role('VIEWER'))
  );
drop policy if exists "berkas: unggah" on storage.objects;
create policy "berkas: unggah" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'berkas'
    and (storage.foldername(name))[1] is distinct from 'surat'
    and (storage.foldername(name))[1] is distinct from 'lembaga'
    and (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI'))
  );
drop policy if exists "berkas: ubah" on storage.objects;
create policy "berkas: ubah" on storage.objects for update to authenticated
  using (
    bucket_id = 'berkas'
    and (storage.foldername(name))[1] is distinct from 'surat'
    and (storage.foldername(name))[1] is distinct from 'lembaga'
    and (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI'))
  )
  with check (
    bucket_id = 'berkas'
    and (storage.foldername(name))[1] is distinct from 'surat'
    and (storage.foldername(name))[1] is distinct from 'lembaga'
    and (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI'))
  );
drop policy if exists "berkas: hapus" on storage.objects;
create policy "berkas: hapus" on storage.objects for delete to authenticated
  using (
    bucket_id = 'berkas'
    and (storage.foldername(name))[1] is distinct from 'surat'
    and (storage.foldername(name))[1] is distinct from 'lembaga'
    and public.has_role('SUPERADMIN')
  );

drop policy if exists "berkas lembaga: baca" on storage.objects;
create policy "berkas lembaga: baca" on storage.objects for select to authenticated
  using (
    bucket_id = 'berkas'
    and (storage.foldername(name))[1] = 'lembaga'
    and exists (
      select 1 from public.berkas_lembaga_versi v join public.berkas_lembaga b on b.id = v."berkasId"
      where v."storagePath" = storage.objects.name and public.boleh_buka_berkas(b.jenis)
    )
  );
drop policy if exists "berkas lembaga: unggah" on storage.objects;
create policy "berkas lembaga: unggah" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'berkas'
    and (storage.foldername(name))[1] = 'lembaga'
    and case when (storage.foldername(name))[2] = 'rahasia' then public.has_role('SUPERADMIN') else public.boleh_kelola_berkas() end
  );
drop policy if exists "berkas lembaga: hapus" on storage.objects;
create policy "berkas lembaga: hapus" on storage.objects for delete to authenticated
  using (bucket_id = 'berkas' and (storage.foldername(name))[1] = 'lembaga' and public.has_role('SUPERADMIN'));
