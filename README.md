# BQ-ku — Administrasi Berkas Santri

Next.js 16 + Supabase (Auth, Postgres, Storage). Node 22.

## Setup
1. `cp .env.example .env.local` lalu isi nilai Supabase & `NEXT_PUBLIC_APP_URL`.
2. Jalankan `supabase/migrations/0001_init.sql` di **Supabase Dashboard → SQL Editor** (atau `supabase db push`). Migrasi ini mereset seluruh data tabel.
   Berkas lama di bucket dikosongkan terpisah: `npm run empty-bucket` (Node 22).
3. Jalankan juga `supabase/migrations/0002_google_allowlist.sql`.
4. Masuk hanya via **Google**: Google Cloud Console → OAuth Client ID (Web) dengan redirect `https://<project-ref>.supabase.co/auth/v1/callback`; lalu Supabase → Authentication → Providers → Google (isi Client ID/Secret). Di **Authentication → URL Configuration**: Site URL = `NEXT_PUBLIC_APP_URL`; tambahkan `…/auth/callback` ke Redirect URLs.
5. Daftarkan email Google superadmin pertama:
   `npm run seed:admin -- --email nama@gmail.com --nama "Nama"`
   Email lain ditambahkan dari halaman **Kelola Pengguna**. Akun Google yang belum didaftarkan akan melihat halaman "Akun belum diaktifkan".
6. `npm install && npm run dev`, buka `/login`.

## Test
`npm test` — unit test selalu jalan. Test integrasi DB hanya jalan bila `SUPABASE_TEST_URL` & `SUPABASE_TEST_SERVICE_ROLE_KEY` diset (pakai proyek Supabase terpisah yang sudah dimigrasi).
