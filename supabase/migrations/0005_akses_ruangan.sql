-- 0005_akses_ruangan.sql — Batas akses antar-ruangan (santri vs donatur) dan
-- kompatibilitas kolom lama "role" dengan build produksi yang masih membacanya.
--
-- Isi:
--   A. Fungsi bantu legacy_role() / peran_dari_role_lama().
--   B. Sinkronisasi dua arah role <-> roles pada profiles & allowed_emails
--      (trigger BEFORE), normalisasi data yang sudah ada, dan pembaruan
--      handle_new_user / apply_allowed_email.
--   C. RLS baca santri/dokumen: hanya SUPERADMIN, ADMIN_SANTRI, VIEWER
--      (ADMIN_DONATUR tidak lagi bisa membaca data santri).
--   D. Storage bucket 'berkas': policy lama tidak berlaku untuk prefix surat/,
--      dan policy baru khusus surat/ untuk SUPERADMIN & ADMIN_DONATUR.
--
-- Idempoten: aman dijalankan ulang (create or replace function, drop trigger
-- if exists, drop policy if exists). Seluruh isi dibungkus satu transaksi agar
-- tidak ada jeda ketika trigger sedang dilepas sementara build lama menulis.

begin;

-- =====================================================================
-- A. FUNGSI BANTU
-- =====================================================================

-- Nilai kolom lama "role" yang dimengerti build lama ('SUPERADMIN' |
-- 'PANITIA' | 'VIEWER') diturunkan dari daftar peran baru. Urutan elemen
-- array tidak berpengaruh: SUPERADMIN menang, lalu ADMIN_SANTRI (= PANITIA),
-- sisanya (VIEWER, ADMIN_DONATUR saja) dianggap VIEWER oleh build lama.
create or replace function public.legacy_role(p_roles text[])
returns text language sql immutable set search_path = public as $$
  select case
           when 'SUPERADMIN' = any(coalesce(p_roles, '{}')) then 'SUPERADMIN'
           when 'ADMIN_SANTRI' = any(coalesce(p_roles, '{}')) then 'PANITIA'
           else 'VIEWER'
         end;
$$;

-- Kebalikan untuk tulisan build lama: satu nilai "role" lama menjadi satu
-- peran baru. PANITIA -> ADMIN_SANTRI, null -> VIEWER, nilai lain apa adanya
-- (nilai asing akan ditolak oleh constraint *_roles_valid dari 0003).
create or replace function public.peran_dari_role_lama(p_role text)
returns text language sql immutable set search_path = public as $$
  select case
           when p_role is null then 'VIEWER'
           when p_role = 'PANITIA' then 'ADMIN_SANTRI'
           else p_role
         end;
$$;

-- =====================================================================
-- B. SINKRONISASI role <-> roles
-- =====================================================================

-- Fungsi trigger BEFORE INSERT OR UPDATE yang dipasang di profiles dan
-- allowed_emails (keduanya punya kolom "role" text dan "roles" text[]).
-- Aturan:
--   INSERT : bila roles kosong (tulisan build lama yang hanya mengirim role)
--            -> roles := array[peran dari role].
--   UPDATE : bila roles berubah -> roles yang berlaku (kode baru / trigger).
--            bila HANYA role yang berubah (tulisan build lama)
--            -> roles := array[peran dari role].
--   Selalu di akhir: role := legacy_role(roles), sehingga setelah operasi
--   apa pun berlaku invarian role = legacy_role(roles).
-- Fungsi ini hanya mengubah NEW (tidak menulis tabel lain), jadi tidak bisa
-- memicu rekursi.
create or replace function public.sinkron_role_roles()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.roles is null then
      new.roles := array[public.peran_dari_role_lama(new.role)];
    end if;
  elsif new.roles is distinct from old.roles then
    null; -- roles menang; role diturunkan di bawah
  elsif new.role is distinct from old.role then
    new.roles := array[public.peran_dari_role_lama(new.role)];
  end if;
  new.role := public.legacy_role(new.roles);
  return new;
end $$;

-- Lepas trigger lebih dulu agar normalisasi di bawah tidak diterjemahkan
-- sebagai "build lama mengubah role" (yang akan menimpa roles multi-peran)
-- dan agar tidak memicu apply_allowed_email (yang mengubah nama/aktif
-- profil). Keduanya dipasang kembali di akhir bagian ini.
drop trigger if exists sinkron_role_roles on public.profiles;
drop trigger if exists sinkron_role_roles on public.allowed_emails;
drop trigger if exists on_allowed_email_upsert on public.allowed_emails;

-- Normalisasi sekali jalan untuk data yang sudah ada: kode sebelumnya
-- menulis role = roles[1] (bisa 'ADMIN_SANTRI'/'ADMIN_DONATUR' yang tidak
-- dikenal build lama). roles adalah sumber kebenaran.
update public.profiles
   set role = public.legacy_role(roles)
 where role is distinct from public.legacy_role(roles);
update public.allowed_emails
   set role = public.legacy_role(roles)
 where role is distinct from public.legacy_role(roles);

-- Tanpa DEFAULT, INSERT build lama (yang tidak mengirim roles) membawa
-- roles = null sehingga trigger bisa menurunkannya dari role. Dengan default
-- ['ADMIN_SANTRI'] undangan VIEWER/SUPERADMIN dari build lama salah menjadi
-- ADMIN_SANTRI. NOT NULL tetap berlaku: trigger BEFORE mengisinya lebih dulu.
alter table public.profiles alter column roles drop default;
alter table public.allowed_emails alter column roles drop default;

-- Pembuat profil saat akun pertama kali masuk: role diisi legacy_role(...)
-- (trigger sinkronisasi pada profiles juga akan menurunkannya lagi — hasilnya
-- sama, jadi keduanya tidak saling menimpa secara keliru).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  allowed public.allowed_emails%rowtype;
  display_name text;
begin
  display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'nama',
    split_part(new.email, '@', 1)
  );
  select * into allowed from public.allowed_emails where lower(email) = lower(new.email);
  if found then
    insert into public.profiles (id, nama, email, role, roles, aktif)
    values (new.id, allowed.nama, new.email, public.legacy_role(allowed.roles), allowed.roles, true)
    on conflict (id) do nothing;
  else
    insert into public.profiles (id, nama, email, role, roles, aktif)
    values (new.id, display_name, new.email, 'VIEWER', array['VIEWER'], false)
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

-- Trigger AFTER pada allowed_emails: menyalin peran ke profil yang sudah ada.
-- NEW di sini adalah baris final (sudah melewati trigger BEFORE sinkronisasi),
-- jadi NEW.roles selalu terisi. UPDATE ke profiles mengubah roles, sehingga
-- trigger sinkronisasi profiles memakai roles dan menurunkan role. Tidak ada
-- trigger pada profiles yang menulis balik ke allowed_emails -> tanpa rekursi.
create or replace function public.apply_allowed_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set roles = new.roles, role = public.legacy_role(new.roles),
         aktif = true, nama = new.nama, "updatedAt" = now()
   where lower(email) = lower(new.email);
  return new;
end $$;

-- Pasang kembali trigger. Urutan eksekusi pada allowed_emails:
-- BEFORE sinkron_role_roles (baris dilengkapi) -> penulisan baris ->
-- AFTER on_allowed_email_upsert (menyalin ke profiles, yang lalu melewati
-- BEFORE sinkron_role_roles milik profiles).
create trigger sinkron_role_roles
before insert or update on public.profiles
for each row execute function public.sinkron_role_roles();

create trigger sinkron_role_roles
before insert or update on public.allowed_emails
for each row execute function public.sinkron_role_roles();

create trigger on_allowed_email_upsert
after insert or update on public.allowed_emails
for each row execute function public.apply_allowed_email();

-- =====================================================================
-- C. RLS BACA SANTRI & DOKUMEN
-- =====================================================================

-- Sebelumnya: auth_role() is not null (semua akun aktif, termasuk
-- ADMIN_DONATUR). Kini hanya peran ruang santri + VIEWER (wali).
drop policy if exists "santri: baca" on public.santri;
create policy "santri: baca" on public.santri for select to authenticated
  using (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI') or public.has_role('VIEWER'));

drop policy if exists "documents: baca" on public.documents;
create policy "documents: baca" on public.documents for select to authenticated
  using (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI') or public.has_role('VIEWER'));

-- =====================================================================
-- D. STORAGE BUCKET 'berkas'
-- =====================================================================

-- D1. Policy lama (dari 0001) dibuat ulang dengan pengecualian prefix surat/.
-- (storage.foldername(name))[1] adalah segmen folder pertama; untuk berkas
-- di akar bucket hasilnya null, sehingga "is distinct from 'surat'" = true.
drop policy if exists "berkas: baca" on storage.objects;
create policy "berkas: baca" on storage.objects for select to authenticated
  using (
    bucket_id = 'berkas'
    and (storage.foldername(name))[1] is distinct from 'surat'
    and (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI') or public.has_role('VIEWER'))
  );

drop policy if exists "berkas: unggah" on storage.objects;
create policy "berkas: unggah" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'berkas'
    and (storage.foldername(name))[1] is distinct from 'surat'
    and (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI'))
  );

drop policy if exists "berkas: ubah" on storage.objects;
create policy "berkas: ubah" on storage.objects for update to authenticated
  using (
    bucket_id = 'berkas'
    and (storage.foldername(name))[1] is distinct from 'surat'
    and (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI'))
  )
  with check (
    bucket_id = 'berkas'
    and (storage.foldername(name))[1] is distinct from 'surat'
    and (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI'))
  );

drop policy if exists "berkas: hapus" on storage.objects;
create policy "berkas: hapus" on storage.objects for delete to authenticated
  using (
    bucket_id = 'berkas'
    and (storage.foldername(name))[1] is distinct from 'surat'
    and public.has_role('SUPERADMIN')
  );

-- D2. Policy khusus PNG surat donatur (prefix surat/): hanya ruang donatur.
-- Unggah dengan upsert butuh select + insert + update sekaligus.
drop policy if exists "berkas surat: baca" on storage.objects;
create policy "berkas surat: baca" on storage.objects for select to authenticated
  using (
    bucket_id = 'berkas'
    and (storage.foldername(name))[1] = 'surat'
    and (public.has_role('SUPERADMIN') or public.has_role('ADMIN_DONATUR'))
  );

drop policy if exists "berkas surat: unggah" on storage.objects;
create policy "berkas surat: unggah" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'berkas'
    and (storage.foldername(name))[1] = 'surat'
    and (public.has_role('SUPERADMIN') or public.has_role('ADMIN_DONATUR'))
  );

drop policy if exists "berkas surat: ubah" on storage.objects;
create policy "berkas surat: ubah" on storage.objects for update to authenticated
  using (
    bucket_id = 'berkas'
    and (storage.foldername(name))[1] = 'surat'
    and (public.has_role('SUPERADMIN') or public.has_role('ADMIN_DONATUR'))
  )
  with check (
    bucket_id = 'berkas'
    and (storage.foldername(name))[1] = 'surat'
    and (public.has_role('SUPERADMIN') or public.has_role('ADMIN_DONATUR'))
  );

drop policy if exists "berkas surat: hapus" on storage.objects;
create policy "berkas surat: hapus" on storage.objects for delete to authenticated
  using (
    bucket_id = 'berkas'
    and (storage.foldername(name))[1] = 'surat'
    and public.has_role('SUPERADMIN')
  );

commit;
