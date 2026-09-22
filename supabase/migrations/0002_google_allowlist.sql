-- 0002_google_allowlist.sql — Masuk hanya via Google. Akses ditentukan daftar email yang diizinkan.

create table if not exists public.allowed_emails (
  email text primary key,
  nama text not null,
  role text not null default 'PANITIA' check (role in ('SUPERADMIN','PANITIA','VIEWER')),
  "createdAt" timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;
create policy "allowed_emails: superadmin" on public.allowed_emails for all to authenticated
  using (public.auth_role() = 'SUPERADMIN') with check (public.auth_role() = 'SUPERADMIN');

-- Profil dibuat saat akun Google pertama kali masuk:
--   email ada di allowed_emails → role sesuai daftar, aktif
--   tidak ada                   → VIEWER nonaktif (harus diaktifkan superadmin)
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
    insert into public.profiles (id, nama, email, role, aktif)
    values (new.id, allowed.nama, new.email, allowed.role, true)
    on conflict (id) do nothing;
  else
    insert into public.profiles (id, nama, email, role, aktif)
    values (new.id, display_name, new.email, 'VIEWER', false)
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

-- Jika superadmin menambah email untuk akun yang SUDAH pernah masuk (profil nonaktif), aktifkan langsung.
create or replace function public.apply_allowed_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set role = new.role, aktif = true, nama = new.nama, "updatedAt" = now()
   where lower(email) = lower(new.email);
  return new;
end $$;

drop trigger if exists on_allowed_email_upsert on public.allowed_emails;
create trigger on_allowed_email_upsert
after insert or update on public.allowed_emails
for each row execute function public.apply_allowed_email();
