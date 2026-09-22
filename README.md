# BQ-ku — Administrasi Berkas Santri

Next.js 16 + Supabase (Auth, Postgres, Storage). Node 22.

## Setup
1. `cp .env.example .env.local` lalu isi nilai Supabase & `NEXT_PUBLIC_APP_URL`.
2. Jalankan `supabase/migrations/0001_init.sql` di **Supabase Dashboard → SQL Editor** (atau `supabase db push`). Migrasi ini mereset seluruh data.
3. Di Supabase **Authentication → URL Configuration**: Site URL = `NEXT_PUBLIC_APP_URL`; tambahkan `…/auth/callback` ke Redirect URLs.
4. Buat superadmin pertama:
   `node --env-file=.env.local scripts/seed-admin.mjs --email admin@contoh.id --nama "Admin" --password "kata-sandi-awal"`
5. `npm install && npm run dev`, buka `/login`.

## Test
`npm test` — unit test selalu jalan. Test integrasi DB hanya jalan bila `SUPABASE_TEST_URL` & `SUPABASE_TEST_SERVICE_ROLE_KEY` diset (pakai proyek Supabase terpisah yang sudah dimigrasi).
