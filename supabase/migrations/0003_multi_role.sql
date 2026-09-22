-- 0003_multi_role.sql — satu akun boleh punya beberapa peran.

alter table public.profiles add column if not exists roles text[];
alter table public.allowed_emails add column if not exists roles text[];

-- Salin nilai lama (PANITIA menjadi ADMIN_SANTRI)
update public.profiles
   set roles = array[case when role = 'PANITIA' then 'ADMIN_SANTRI' else role end]
 where roles is null;
update public.allowed_emails
   set roles = array[case when role = 'PANITIA' then 'ADMIN_SANTRI' else role end]
 where roles is null;

alter table public.profiles alter column roles set default array['VIEWER'];
alter table public.profiles alter column roles set not null;
alter table public.allowed_emails alter column roles set default array['ADMIN_SANTRI'];
alter table public.allowed_emails alter column roles set not null;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.allowed_emails drop constraint if exists allowed_emails_role_check;
alter table public.profiles add constraint profiles_roles_valid
  check (roles <@ array['SUPERADMIN','ADMIN_SANTRI','ADMIN_DONATUR','VIEWER'] and array_length(roles,1) >= 1);
alter table public.allowed_emails add constraint allowed_emails_roles_valid
  check (roles <@ array['SUPERADMIN','ADMIN_SANTRI','ADMIN_DONATUR','VIEWER'] and array_length(roles,1) >= 1);

-- Kolom lama dipertahankan sementara agar deploy lama tidak rusak; diisi dari roles[1].
alter table public.profiles alter column role drop not null;
alter table public.allowed_emails alter column role drop not null;

create or replace function public.auth_roles()
returns text[] language sql stable security definer set search_path = public as $$
  select roles from public.profiles where id = auth.uid() and aktif;
$$;
grant execute on function public.auth_roles() to authenticated;

create or replace function public.has_role(r text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(r = any(public.auth_roles()), false);
$$;
grant execute on function public.has_role(text) to authenticated;

-- auth_role() lama tetap ada (dipakai policy lama) tapi kini membaca roles[1]
create or replace function public.auth_role()
returns text language sql stable security definer set search_path = public as $$
  select case
           when public.has_role('SUPERADMIN') then 'SUPERADMIN'
           when public.has_role('ADMIN_SANTRI') then 'PANITIA'
           else coalesce((public.auth_roles())[1], null)
         end;
$$;

-- Trigger pembuat profil: pakai roles dari allowed_emails
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
    values (new.id, allowed.nama, new.email, allowed.roles[1], allowed.roles, true)
    on conflict (id) do nothing;
  else
    insert into public.profiles (id, nama, email, role, roles, aktif)
    values (new.id, display_name, new.email, 'VIEWER', array['VIEWER'], false)
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

create or replace function public.apply_allowed_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set roles = new.roles, role = new.roles[1], aktif = true, nama = new.nama, "updatedAt" = now()
   where lower(email) = lower(new.email);
  return new;
end $$;

-- Policy santri/dokumen: ADMIN_SANTRI menggantikan PANITIA
drop policy if exists "santri: tulis" on public.santri;
drop policy if exists "santri: ubah" on public.santri;
drop policy if exists "documents: tulis" on public.documents;
drop policy if exists "documents: ubah" on public.documents;
drop policy if exists "upload_tokens: panitia" on public.upload_tokens;

create policy "santri: tulis" on public.santri for insert to authenticated
  with check (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI'));
create policy "santri: ubah" on public.santri for update to authenticated
  using (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI'))
  with check (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI'));
create policy "documents: tulis" on public.documents for insert to authenticated
  with check (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI'));
create policy "documents: ubah" on public.documents for update to authenticated
  using (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI'))
  with check (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI'));
create policy "upload_tokens: panitia" on public.upload_tokens for all to authenticated
  using (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI'))
  with check (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI'));
