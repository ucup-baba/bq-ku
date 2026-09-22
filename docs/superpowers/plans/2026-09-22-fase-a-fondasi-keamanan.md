# Fase A — Fondasi & Keamanan: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengamankan BQ-ku untuk data santri asli: login panitia (Supabase Auth), semua API & tabel & storage terproteksi, satu jalur DB (Supabase), validasi input, test yang benar-benar berjalan, repo bersih.

**Architecture:** Next.js 16 App Router + `@supabase/ssr`. Tiga klien Supabase (browser / server-cookie / admin-service-role). Route handler memanggil `requireUser()`; RLS Postgres memakai `auth_role()` sebagai lapisan kedua. Bucket private: server menyimpan `storagePath`, menyematkan signed URL (1 jam) saat membaca, dan menormalisasi signed URL → path saat menyimpan sehingga komponen client yang besar tidak perlu direfactor (itu Fase B).

**Tech Stack:** Next.js 16, React 19, TypeScript, `@supabase/supabase-js` 2.x, `@supabase/ssr`, `zod` 4, Vitest 5, Tailwind 3, Phosphor Icons.

**Spec:** `docs/superpowers/specs/2026-09-22-fase-a-fondasi-keamanan-design.md`

## Global Constraints

- Baca `node_modules/next/dist/docs/` sebelum memakai API Next yang tidak yakin (AGENTS.md). Konvensi: `proxy.ts` (bukan `middleware.ts`), `cookies()` & `params` adalah Promise.
- Node `22` (`.nvmrc`, `engines`). Jangan menambah dependency native.
- Semua teks UI berbahasa Indonesia, mengikuti tema claymorphism yang sudah ada (Tailwind `rounded-2xl/3xl`, `bg-white dark:bg-slate-900`, aksen `teal`/`emerald`). Ikon hanya dari `@phosphor-icons/react` (`weight="duotone"`/`"bold"`), tanpa emoji.
- Route publik hanya: `/login`, `/reset-password`, `/auth/callback`, `/upload-mandiri/*`, `/api/upload-mandiri`. Selain itu wajib login.
- Nama bucket dari env `SUPABASE_STORAGE_BUCKET` (default `berkas`). Signed URL berlaku 3600 detik.
- Service-role key tidak boleh diimpor dari file `'use client'`. `lib/supabase/admin.ts` mengimpor `server-only`.
- Kolom Postgres camelCase dikutip ganda (`"namaLengkap"`) — mengikuti konvensi `supabase-setup.sql` yang lama.
- Commit kecil per task, pesan commit berformat `type(scope): ...` dan diakhiri `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Agen **tidak** punya akses ke proyek Supabase produksi (`zmltgsayohzbgdhewkfs`). Migrasi dijalankan pemilik. Test integrasi hanya berjalan jika env test diset.

---

## File Structure (ringkasan)

| Path | Tanggung jawab |
|---|---|
| `lib/env.ts` | Baca & validasi env server; lempar error bernama jika kosong |
| `lib/supabase/client.ts` | `createBrowserSupabase()` (anon + cookie session) |
| `lib/supabase/server.ts` | `createServerSupabase()` (anon + cookie, RLS user) |
| `lib/supabase/admin.ts` | `createAdminSupabase()` (service role, server-only) |
| `lib/storage/paths.ts` | `storagePathFromUrl()`, `isStoragePath()` — normalisasi URL↔path |
| `lib/storage/signed.ts` | `signPaths(client, paths)` → map path→signed URL |
| `lib/db/santri-repo.ts` | CRUD santri/dokumen/token, klien di-inject, sematkan signed URL |
| `lib/validation/santri.ts` | Skema Zod santri/dokumen; `zodFieldErrors()` |
| `lib/validation/pengguna.ts` | Skema undang/ubah pengguna |
| `lib/auth/session.ts` | `getSessionUser()`, `requireUser()`, `AuthError`, `authErrorResponse()` |
| `lib/auth/roles.ts` | (ada) fungsi hak akses |
| `proxy.ts` | Refresh session + redirect ke `/login` |
| `app/auth/callback/route.ts` | Tukar `code` → session (undangan & reset password) |
| `app/login/page.tsx`, `app/reset-password/page.tsx` | Halaman auth |
| `app/api/auth/logout/route.ts` | Keluar |
| `app/api/documents/[id]/url/route.ts` | Signed URL segar untuk satu dokumen |
| `app/api/pengguna/route.ts`, `app/api/pengguna/[id]/route.ts` | Kelola pengguna (SUPERADMIN) |
| `app/pengguna/page.tsx`, `components/pengguna/PenggunaTable.tsx`, `components/pengguna/UndangPenggunaModal.tsx` | UI kelola pengguna |
| `components/auth/AuthProvider.tsx` | Context `useAuth()` dari `SessionUser` (menggantikan `DemoRoleSwitcher.tsx`) |
| `supabase/migrations/0001_init.sql` | Skema reset total + RLS + storage |
| `scripts/seed-admin.mjs` | Buat SUPERADMIN pertama |
| `tests/validation/*.test.ts`, `tests/auth/session.test.ts`, `tests/storage/paths.test.ts`, `tests/db/santri-repo.test.ts` (integrasi bersyarat) | Test |

---

### Task 1: Bersih-bersih repo, pin Node, metadata paket

**Files:**
- Delete: `task-3-diff-utf8.txt`, `Masjid Baitul Qowwam UI.dc.html`, `.superpowers/` (dari git), `supabase-setup.sql`
- Create: `.nvmrc`
- Modify: `.gitignore`, `package.json`

- [ ] **Step 1: Hapus file sampah dari git & disk**

```bash
git rm -q "task-3-diff-utf8.txt" "Masjid Baitul Qowwam UI.dc.html" supabase-setup.sql
git rm -rq .superpowers
```

- [ ] **Step 2: Tambah ke `.gitignore`**

Tambahkan di akhir file:
```
# agent working files
/.superpowers/
```

- [ ] **Step 3: Pin Node & perbaiki metadata**

Buat `.nvmrc` berisi `22`. Di `package.json` ubah:
```json
"name": "bq-ku",
"description": "Sistem Administrasi Berkas Santri & Digital CV Profiler — Baitul Qowwam",
"engines": { "node": ">=22 <23" },
```
(Sisipkan `"engines"` setelah `"license"`.)

- [ ] **Step 4: Verifikasi**

Run: `git status --short && node -e "console.log(require('./package.json').name)"`
Expected: file terhapus tercatat sebagai `D`, output `bq-ku`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(repo): remove stray files, pin Node 22, fix package metadata

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Env terpusat + tiga klien Supabase, hapus SQLite

**Files:**
- Create: `lib/env.ts`, `lib/supabase/admin.ts`
- Rewrite: `lib/supabase/server.ts`, `lib/supabase/client.ts`
- Delete: `lib/db/index.ts`, `lib/db/schema.sql`, `lib/db/seed.ts`, `data/`, `tests/db/santri-repo.test.ts`, `tests/e2e/integration.test.ts` (keduanya ditulis ulang di Task 4)
- Modify: `package.json`, `.env.example`
- Test: `tests/env.test.ts`

**Interfaces:**
- Produces: `env` (objek), `requireEnv(name: string): string`, `createBrowserSupabase(): SupabaseClient`, `createServerSupabase(): Promise<SupabaseClient>`, `createAdminSupabase(): SupabaseClient`.

- [ ] **Step 1: Dependency**

```bash
npm uninstall better-sqlite3 @types/better-sqlite3 pg @types/pg
npm install @supabase/ssr server-only zod
```

- [ ] **Step 2: Hapus SQLite & seed**

```bash
git rm -q lib/db/index.ts lib/db/schema.sql lib/db/seed.ts tests/db/santri-repo.test.ts tests/e2e/integration.test.ts
rm -rf data
```

- [ ] **Step 3: Test env gagal dulu** — `tests/env.test.ts`

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';

describe('requireEnv', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('mengembalikan nilai jika ada', async () => {
    vi.stubEnv('X_TEST', 'abc');
    const { requireEnv } = await import('@/lib/env');
    expect(requireEnv('X_TEST')).toBe('abc');
  });

  it('melempar error bernama jika kosong', async () => {
    vi.stubEnv('X_KOSONG', '');
    const { requireEnv } = await import('@/lib/env');
    expect(() => requireEnv('X_KOSONG')).toThrow(/X_KOSONG/);
  });
});
```

Run: `npx vitest run tests/env.test.ts` → FAIL (module tidak ada).

- [ ] **Step 4: `lib/env.ts`**

```ts
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variabel lingkungan ${name} belum diset. Lihat .env.example.`);
  return v;
}

/** Hanya untuk kode server. Klien browser membaca process.env.NEXT_PUBLIC_* langsung agar di-inline oleh bundler. */
export const env = {
  get SUPABASE_URL() { return requireEnv('NEXT_PUBLIC_SUPABASE_URL'); },
  get SUPABASE_ANON_KEY() { return requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'); },
  get SUPABASE_SERVICE_ROLE_KEY() { return requireEnv('SUPABASE_SERVICE_ROLE_KEY'); },
  get STORAGE_BUCKET() { return process.env.SUPABASE_STORAGE_BUCKET || 'berkas'; },
  get APP_URL() { return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; },
};
```

- [ ] **Step 5: Klien browser** — `lib/supabase/client.ts`

```ts
'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function createBrowserSupabase(): SupabaseClient {
  if (_client) return _client;
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return _client;
}
```

- [ ] **Step 6: Klien server (cookie, RLS user)** — `lib/supabase/server.ts`

```ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

export async function createServerSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Dipanggil dari Server Component: cookie diset oleh proxy.ts, abaikan.
        }
      },
    },
  });
}
```

- [ ] **Step 7: Klien admin** — `lib/supabase/admin.ts`

```ts
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/** Service role: melewati RLS. Hanya untuk jalur wali (upload-mandiri), undang pengguna, dan skrip. */
export function createAdminSupabase(): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

- [ ] **Step 8: `.env.example`** — tambahkan di akhir:

```
# URL publik aplikasi (dipakai untuk tautan upload mandiri & email auth)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Opsional: proyek Supabase terpisah untuk test integrasi (npm test)
SUPABASE_TEST_URL=
SUPABASE_TEST_SERVICE_ROLE_KEY=
```

- [ ] **Step 9: Verifikasi**

Run: `npx vitest run tests/env.test.ts` → PASS. `grep -rn "better-sqlite3\|lib/db/index\|isSupabaseServerConfigured\|getSupabaseServerClient\|from '@/lib/supabase/client'" --include=*.ts --include=*.tsx app lib components tests` → daftar file yang masih memakai API lama (diperbaiki di Task 4 & 8; jangan perbaiki di sini). `npm run build` **belum** diharapkan lulus sampai Task 8.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor(db): remove SQLite path, add env module and ssr-based Supabase clients

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Migrasi `0001_init.sql` + README

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `README.md`

**Interfaces:**
- Produces: tabel `santri`, `documents`, `profiles`, `upload_tokens`; fungsi `auth_role()`; trigger `on_auth_user_created`; bucket `berkas` private. Kolom baru: `documents."storagePath"`, `santri."fotoFormalPath"`, `santri."fotoProfilPath"`.

- [ ] **Step 1: Tulis migrasi**

```sql
-- 0001_init.sql — RESET TOTAL skema BQ-ku (Fase A). Jalankan di SQL Editor Supabase.
-- Menghapus semua data lama (disetujui: data uji coba).

drop table if exists public.upload_tokens cascade;
drop table if exists public.documents cascade;
drop table if exists public.santri cascade;
drop table if exists public.users cascade;
drop table if exists public.profiles cascade;
drop function if exists public.auth_role() cascade;
drop function if exists public.handle_new_user() cascade;
delete from storage.objects where bucket_id = 'berkas';

-- ---------- PROFIL PENGGUNA ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  email text not null,
  role text not null default 'VIEWER' check (role in ('SUPERADMIN','PANITIA','VIEWER')),
  aktif boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nama, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'VIEWER')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.auth_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and aktif;
$$;
grant execute on function public.auth_role() to authenticated;

-- ---------- SANTRI ----------
create table public.santri (
  id text primary key,
  "namaLengkap" text not null,
  "namaPanggilan" text,
  nik text not null,
  "noKk" text,
  nisn text,
  "tempatLahir" text not null,
  "tanggalLahir" text not null,
  "jenisKelamin" text not null check ("jenisKelamin" in ('IKHWAN','AKHWAT')),
  "tahunMasuk" integer default 2026,
  jenjang text not null check (jenjang in ('SMP','SMA','SMK','ALUMNI')),
  kelas text not null,
  "sekolahSekarang" text not null,
  "asalSekolahSebelumnya" text,
  "namaAyah" text,
  "namaIbu" text,
  "statusSosial" text default 'REGULER',
  "kontakWali" text,
  "pekerjaanOrtu" text,
  alamat text,
  "ringkasanTentang" text,
  "riwayatTahfidz" text,
  keahlian text,
  "fotoFormalPath" text,
  "fotoProfilPath" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create unique index santri_nik_key on public.santri (nik);
create index santri_nama_idx on public.santri (lower("namaLengkap"));

-- ---------- DOKUMEN ----------
create table public.documents (
  id text primary key,
  "santriId" text not null references public.santri(id) on delete cascade,
  kategori text not null check (kategori in ('KARTU_KELUARGA','AKTA_KELAHIRAN','KTP_ORTU','SKL_IJAZAH','KIP_PIP','KRM_PKH_KKS','SKTM','SERTIFIKAT_PRESTASI','LAINNYA')),
  "nomorDokumen" text,
  "storagePath" text not null,
  "rawOcrText" text,
  "extractedFields" text,
  "statusVerifikasi" text not null default 'PENDING' check ("statusVerifikasi" in ('PENDING','VERIFIED','REJECTED','NEED_FIX')),
  "catatanVerifikasi" text,
  "createdAt" timestamptz not null default now()
);
create index documents_santri_idx on public.documents ("santriId");

-- ---------- TOKEN UPLOAD MANDIRI ----------
create table public.upload_tokens (
  id text primary key,
  "santriId" text not null references public.santri(id) on delete cascade,
  token text not null unique,
  "expiresAt" timestamptz not null,
  "usedCount" integer not null default 0,
  "createdAt" timestamptz not null default now()
);

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.santri enable row level security;
alter table public.documents enable row level security;
alter table public.upload_tokens enable row level security;

create policy "profiles: baca sendiri atau superadmin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.auth_role() = 'SUPERADMIN');
create policy "profiles: superadmin ubah" on public.profiles for update to authenticated
  using (public.auth_role() = 'SUPERADMIN') with check (public.auth_role() = 'SUPERADMIN');
create policy "profiles: superadmin hapus" on public.profiles for delete to authenticated
  using (public.auth_role() = 'SUPERADMIN');

create policy "santri: baca" on public.santri for select to authenticated using (public.auth_role() is not null);
create policy "santri: tulis" on public.santri for insert to authenticated with check (public.auth_role() in ('SUPERADMIN','PANITIA'));
create policy "santri: ubah" on public.santri for update to authenticated using (public.auth_role() in ('SUPERADMIN','PANITIA')) with check (public.auth_role() in ('SUPERADMIN','PANITIA'));
create policy "santri: hapus" on public.santri for delete to authenticated using (public.auth_role() = 'SUPERADMIN');

create policy "documents: baca" on public.documents for select to authenticated using (public.auth_role() is not null);
create policy "documents: tulis" on public.documents for insert to authenticated with check (public.auth_role() in ('SUPERADMIN','PANITIA'));
create policy "documents: ubah" on public.documents for update to authenticated using (public.auth_role() in ('SUPERADMIN','PANITIA')) with check (public.auth_role() in ('SUPERADMIN','PANITIA'));
create policy "documents: hapus" on public.documents for delete to authenticated using (public.auth_role() = 'SUPERADMIN');

create policy "upload_tokens: panitia" on public.upload_tokens for all to authenticated
  using (public.auth_role() in ('SUPERADMIN','PANITIA')) with check (public.auth_role() in ('SUPERADMIN','PANITIA'));

-- ---------- STORAGE ----------
insert into storage.buckets (id, name, public) values ('berkas', 'berkas', false)
on conflict (id) do update set public = false;

drop policy if exists "Public Read on berkas bucket" on storage.objects;
drop policy if exists "Public Upload on berkas bucket" on storage.objects;
drop policy if exists "Public Update on berkas bucket" on storage.objects;
drop policy if exists "Public Delete on berkas bucket" on storage.objects;

create policy "berkas: baca" on storage.objects for select to authenticated
  using (bucket_id = 'berkas' and public.auth_role() is not null);
create policy "berkas: unggah" on storage.objects for insert to authenticated
  with check (bucket_id = 'berkas' and public.auth_role() in ('SUPERADMIN','PANITIA'));
create policy "berkas: ubah" on storage.objects for update to authenticated
  using (bucket_id = 'berkas' and public.auth_role() in ('SUPERADMIN','PANITIA'));
create policy "berkas: hapus" on storage.objects for delete to authenticated
  using (bucket_id = 'berkas' and public.auth_role() = 'SUPERADMIN');
```

- [ ] **Step 2: README.md**

```markdown
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
```

- [ ] **Step 3: Verifikasi sintaks (opsional jika ada Postgres lokal)** — minimal: `grep -c "create policy" supabase/migrations/0001_init.sql` → `16`.

- [ ] **Step 4: Commit**

```bash
git add supabase README.md
git commit -m "feat(db): add versioned 0001_init migration with RLS, profiles trigger and private bucket

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: `santri-repo.ts` satu jalur + helper storage + test integrasi bersyarat

**Files:**
- Create: `lib/storage/paths.ts`, `lib/storage/signed.ts`
- Rewrite: `lib/db/santri-repo.ts`
- Test: `tests/storage/paths.test.ts`, `tests/db/santri-repo.test.ts`

**Interfaces:**
- Produces:
  - `storagePathFromUrl(input: string, bucket?: string): string` — menerima signed URL / public URL / path mentah → path.
  - `signPaths(client, paths: string[], bucket?): Promise<Record<string,string>>`.
  - `Santri` mendapat `fotoFormalPath`, `fotoProfilPath` (persisten) **dan** `fotoFormalUrl`, `fotoProfilUrl` (signed, hanya di respons). `SantriDocument` mendapat `storagePath` (persisten) dan `fileUrl` (signed).
  - Semua fungsi repo menerima `client: SupabaseClient` sebagai argumen pertama: `createSantri(client, input)`, `getSantriById(client, id)`, `listSantri(client, filter?)`, `updateSantri(client, id, patch)`, `deleteSantri(client, id)`, `saveDocument(client, input)`, `listDocumentsBySantri(client, santriId)`, `updateDocumentStatus(client, id, status, catatan?)`, `deleteDocument(client, id)`, `getDocumentById(client, id)`, `createUploadTokenRecord(client, santriId, token, expiresAt)`, `getUploadTokenRecord(client, token)`, `incrementUploadTokenUsage(client, token)`.
  - `class DuplicateNikError extends Error { existingId: string }`.

- [ ] **Step 1: Test helper path (gagal dulu)** — `tests/storage/paths.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { storagePathFromUrl } from '@/lib/storage/paths';

describe('storagePathFromUrl', () => {
  it('mengekstrak path dari signed URL', () => {
    const u = 'https://x.supabase.co/storage/v1/object/sign/berkas/2026_ikhwan_ahmad_kk.pdf?token=abc';
    expect(storagePathFromUrl(u)).toBe('2026_ikhwan_ahmad_kk.pdf');
  });
  it('mengekstrak path dari public URL lama', () => {
    const u = 'https://x.supabase.co/storage/v1/object/public/berkas/foto/a%20b.webp';
    expect(storagePathFromUrl(u)).toBe('foto/a b.webp');
  });
  it('mengembalikan path apa adanya', () => {
    expect(storagePathFromUrl('2026_ikhwan_ahmad_kk.pdf')).toBe('2026_ikhwan_ahmad_kk.pdf');
  });
  it('menghormati nama bucket kustom', () => {
    expect(storagePathFromUrl('https://x/storage/v1/object/sign/arsip/a.pdf?token=1', 'arsip')).toBe('a.pdf');
  });
  it('menolak URL luar', () => {
    expect(() => storagePathFromUrl('https://evil.com/a.pdf')).toThrow();
  });
});
```

Run: `npx vitest run tests/storage` → FAIL.

- [ ] **Step 2: `lib/storage/paths.ts`**

```ts
const OBJECT_RE = /\/storage\/v1\/object\/(?:sign|public|authenticated)\/([^/]+)\/([^?]+)/;

/** Normalisasi apa pun yang dikirim client (signed URL, public URL lama, atau path) menjadi path di bucket. */
export function storagePathFromUrl(input: string, bucket = process.env.SUPABASE_STORAGE_BUCKET || 'berkas'): string {
  const s = (input || '').trim();
  if (!s) throw new Error('Path berkas kosong');
  if (!/^https?:\/\//i.test(s)) return s.replace(/^\/+/, '');
  const m = s.match(OBJECT_RE);
  if (!m || m[1] !== bucket) throw new Error('URL berkas tidak dikenal (bukan dari storage aplikasi)');
  return decodeURIComponent(m[2]);
}
```

- [ ] **Step 3: `lib/storage/signed.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export const SIGNED_URL_TTL = 3600;

/** Membuat signed URL sekaligus. Path yang gagal ditandatangani dipetakan ke '' (jangan sampai satu berkas rusak merobohkan halaman). */
export async function signPaths(
  client: SupabaseClient,
  paths: Array<string | null | undefined>,
  bucket = process.env.SUPABASE_STORAGE_BUCKET || 'berkas',
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter((p): p is string => !!p)));
  if (unique.length === 0) return {};
  const { data, error } = await client.storage.from(bucket).createSignedUrls(unique, SIGNED_URL_TTL);
  if (error || !data) return Object.fromEntries(unique.map(p => [p, '']));
  const out: Record<string, string> = {};
  for (const row of data) out[row.path ?? ''] = row.signedUrl || '';
  return out;
}
```

- [ ] **Step 4: Tulis ulang `lib/db/santri-repo.ts`** (ganti seluruh isi)

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { signPaths } from '@/lib/storage/signed';
import { storagePathFromUrl } from '@/lib/storage/paths';

export type StatusVerifikasi = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NEED_FIX';

export type SantriDocument = {
  id: string;
  santriId: string;
  kategori: string;
  nomorDokumen?: string | null;
  storagePath: string;
  /** Signed URL (1 jam), hanya ada di respons baca. */
  fileUrl?: string;
  rawOcrText?: string | null;
  extractedFields?: string | null;
  statusVerifikasi: StatusVerifikasi;
  catatanVerifikasi?: string | null;
  createdAt?: string | null;
};

export type UploadToken = {
  id: string; santriId: string; token: string; expiresAt: string; usedCount: number; createdAt?: string | null;
};

export type Santri = {
  id: string;
  namaLengkap: string;
  namaPanggilan?: string | null;
  nik: string;
  noKk?: string | null;
  nisn?: string | null;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: 'IKHWAN' | 'AKHWAT';
  tahunMasuk?: number | null;
  jenjang: 'SMP' | 'SMA' | 'SMK' | 'ALUMNI';
  kelas: string;
  sekolahSekarang: string;
  asalSekolahSebelumnya?: string | null;
  namaAyah?: string | null;
  namaIbu?: string | null;
  statusSosial?: 'REGULER' | 'YATIM' | 'PIATU' | 'YATIM_PIATU' | 'DHUAFA' | null;
  kontakWali?: string | null;
  pekerjaanOrtu?: string | null;
  alamat?: string | null;
  ringkasanTentang?: string | null;
  riwayatTahfidz?: string | null;
  keahlian?: string | null;
  fotoFormalPath?: string | null;
  fotoProfilPath?: string | null;
  /** Signed URL, hanya di respons baca. */
  fotoFormalUrl?: string | null;
  fotoProfilUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  documents?: SantriDocument[];
};

export type SantriInput = Omit<Santri, 'id' | 'createdAt' | 'updatedAt' | 'documents' | 'fotoFormalUrl' | 'fotoProfilUrl'> & {
  keahlian?: string[] | string | null;
};

export type DocumentInput = {
  santriId: string;
  kategori: string;
  nomorDokumen?: string | null;
  /** Boleh path, signed URL, atau public URL lama — dinormalisasi. */
  storagePath: string;
  rawOcrText?: string | null;
  extractedFields?: unknown;
  statusVerifikasi?: StatusVerifikasi;
  catatanVerifikasi?: string | null;
};

export type SantriFilter = {
  query?: string; q?: string;
  jenisKelamin?: 'IKHWAN' | 'AKHWAT';
  jenjang?: 'SMP' | 'SMA' | 'SMK' | 'ALUMNI';
};

export class DuplicateNikError extends Error {
  constructor(public existingId: string) { super('NIK sudah terdaftar'); this.name = 'DuplicateNikError'; }
}

const generateId = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const keahlianToString = (k: SantriInput['keahlian']) => Array.isArray(k) ? JSON.stringify(k) : (k ?? null);

async function attachSignedUrls(client: SupabaseClient, rows: Santri[]): Promise<Santri[]> {
  const paths: string[] = [];
  for (const s of rows) {
    paths.push(s.fotoFormalPath || '', s.fotoProfilPath || '');
    for (const d of s.documents || []) paths.push(d.storagePath);
  }
  const map = await signPaths(client, paths);
  return rows.map(s => ({
    ...s,
    fotoFormalUrl: s.fotoFormalPath ? map[s.fotoFormalPath] || null : null,
    fotoProfilUrl: s.fotoProfilPath ? map[s.fotoProfilPath] || null : null,
    documents: (s.documents || []).map(d => ({ ...d, fileUrl: map[d.storagePath] || '' })),
  }));
}

export async function createSantri(client: SupabaseClient, input: SantriInput): Promise<Santri> {
  const row = {
    ...input,
    id: generateId(),
    keahlian: keahlianToString(input.keahlian),
    statusSosial: input.statusSosial ?? 'REGULER',
    tahunMasuk: input.tahunMasuk ?? new Date().getFullYear(),
    fotoFormalPath: input.fotoFormalPath ? storagePathFromUrl(input.fotoFormalPath) : null,
    fotoProfilPath: input.fotoProfilPath ? storagePathFromUrl(input.fotoProfilPath) : null,
    createdAt: now(),
    updatedAt: now(),
  };
  const { data, error } = await client.from('santri').insert(row).select().single();
  if (error) {
    if (error.code === '23505') {
      const { data: ex } = await client.from('santri').select('id').eq('nik', input.nik).maybeSingle();
      throw new DuplicateNikError(ex?.id || '');
    }
    throw new Error(`Gagal menyimpan santri: ${error.message}`);
  }
  const [withUrls] = await attachSignedUrls(client, [{ ...(data as Santri), documents: [] }]);
  return withUrls;
}

export async function getSantriById(client: SupabaseClient, id: string): Promise<(Santri & { documents: SantriDocument[] }) | null> {
  const { data, error } = await client.from('santri').select('*, documents(*)').eq('id', id).maybeSingle();
  if (error || !data) return null;
  const [s] = await attachSignedUrls(client, [data as Santri]);
  return s as Santri & { documents: SantriDocument[] };
}

export async function listSantri(client: SupabaseClient, filter?: SantriFilter): Promise<Santri[]> {
  let q = client.from('santri').select('*, documents(*)');
  const search = filter?.query || filter?.q;
  if (search) q = q.or(`namaLengkap.ilike.%${search}%,nik.ilike.%${search}%`);
  if (filter?.jenisKelamin) q = q.eq('jenisKelamin', filter.jenisKelamin);
  if (filter?.jenjang) q = q.eq('jenjang', filter.jenjang);
  const { data, error } = await q.order('createdAt', { ascending: false });
  if (error) throw new Error(`Gagal mengambil daftar santri: ${error.message}`);
  return attachSignedUrls(client, (data || []) as Santri[]);
}

export async function updateSantri(client: SupabaseClient, id: string, patch: Partial<SantriInput>): Promise<Santri> {
  const row: Record<string, unknown> = { ...patch, updatedAt: now() };
  if (patch.keahlian !== undefined) row.keahlian = keahlianToString(patch.keahlian);
  if (patch.fotoFormalPath !== undefined) row.fotoFormalPath = patch.fotoFormalPath ? storagePathFromUrl(patch.fotoFormalPath) : null;
  if (patch.fotoProfilPath !== undefined) row.fotoProfilPath = patch.fotoProfilPath ? storagePathFromUrl(patch.fotoProfilPath) : null;
  const { data, error } = await client.from('santri').update(row).eq('id', id).select('*, documents(*)').single();
  if (error) {
    if (error.code === '23505') {
      const { data: ex } = await client.from('santri').select('id').eq('nik', patch.nik!).maybeSingle();
      throw new DuplicateNikError(ex?.id || '');
    }
    throw new Error(`Gagal memperbarui santri: ${error.message}`);
  }
  const [s] = await attachSignedUrls(client, [data as Santri]);
  return s;
}

export async function deleteSantri(client: SupabaseClient, id: string): Promise<boolean> {
  const { data: docs } = await client.from('documents').select('storagePath').eq('santriId', id);
  const { data: s } = await client.from('santri').select('fotoFormalPath, fotoProfilPath').eq('id', id).maybeSingle();
  const { error, count } = await client.from('santri').delete({ count: 'exact' }).eq('id', id);
  if (error) throw new Error(`Gagal menghapus santri: ${error.message}`);
  const paths = [...(docs || []).map(d => d.storagePath), s?.fotoFormalPath, s?.fotoProfilPath].filter(Boolean) as string[];
  if (paths.length) await client.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'berkas').remove(paths);
  return (count ?? 0) > 0;
}

export async function saveDocument(client: SupabaseClient, input: DocumentInput): Promise<SantriDocument> {
  const storagePath = storagePathFromUrl(input.storagePath);
  const extracted = typeof input.extractedFields === 'object' && input.extractedFields !== null
    ? JSON.stringify(input.extractedFields) : (input.extractedFields as string | null | undefined) ?? null;
  const base = {
    nomorDokumen: input.nomorDokumen ?? null,
    storagePath,
    rawOcrText: input.rawOcrText ?? null,
    extractedFields: extracted,
    statusVerifikasi: input.statusVerifikasi || 'PENDING',
    catatanVerifikasi: input.catatanVerifikasi ?? null,
  };
  const { data: existing } = await client.from('documents').select('id, storagePath')
    .eq('santriId', input.santriId).eq('kategori', input.kategori).maybeSingle();

  let saved: SantriDocument;
  if (existing) {
    const { data, error } = await client.from('documents').update(base).eq('id', existing.id).select().single();
    if (error) throw new Error(`Gagal memperbarui dokumen: ${error.message}`);
    saved = data as SantriDocument;
    if (existing.storagePath && existing.storagePath !== storagePath) {
      await client.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'berkas').remove([existing.storagePath]);
    }
  } else {
    const { data, error } = await client.from('documents')
      .insert({ id: generateId(), santriId: input.santriId, kategori: input.kategori, createdAt: now(), ...base }).select().single();
    if (error) throw new Error(`Gagal menyimpan dokumen: ${error.message}`);
    saved = data as SantriDocument;
  }
  const map = await signPaths(client, [saved.storagePath]);
  return { ...saved, fileUrl: map[saved.storagePath] || '' };
}

export async function getDocumentById(client: SupabaseClient, id: string): Promise<SantriDocument | null> {
  const { data, error } = await client.from('documents').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data as SantriDocument;
}

export async function listDocumentsBySantri(client: SupabaseClient, santriId: string): Promise<SantriDocument[]> {
  const { data, error } = await client.from('documents').select('*').eq('santriId', santriId);
  if (error) return [];
  const rows = (data || []) as SantriDocument[];
  const map = await signPaths(client, rows.map(d => d.storagePath));
  return rows.map(d => ({ ...d, fileUrl: map[d.storagePath] || '' }));
}

export async function updateDocumentStatus(client: SupabaseClient, id: string, status: StatusVerifikasi, catatan?: string): Promise<boolean> {
  const { error } = await client.from('documents').update({ statusVerifikasi: status, catatanVerifikasi: catatan ?? null }).eq('id', id);
  return !error;
}

export async function deleteDocument(client: SupabaseClient, id: string): Promise<boolean> {
  const doc = await getDocumentById(client, id);
  const { error } = await client.from('documents').delete().eq('id', id);
  if (!error && doc?.storagePath) {
    await client.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'berkas').remove([doc.storagePath]);
  }
  return !error;
}

export async function createUploadTokenRecord(client: SupabaseClient, santriId: string, token: string, expiresAt: string): Promise<UploadToken> {
  const record: UploadToken = { id: 'tok_' + generateId().slice(0, 8), santriId, token, expiresAt, usedCount: 0, createdAt: now() };
  const { data, error } = await client.from('upload_tokens').insert(record).select().single();
  if (error) throw new Error(`Gagal membuat token upload: ${error.message}`);
  return data as UploadToken;
}

export async function getUploadTokenRecord(client: SupabaseClient, token: string): Promise<UploadToken | null> {
  const { data, error } = await client.from('upload_tokens').select('*').eq('token', token).maybeSingle();
  if (error || !data) return null;
  return data as UploadToken;
}

export async function incrementUploadTokenUsage(client: SupabaseClient, token: string): Promise<void> {
  const rec = await getUploadTokenRecord(client, token);
  if (!rec) return;
  await client.from('upload_tokens').update({ usedCount: rec.usedCount + 1 }).eq('token', token);
}
```

- [ ] **Step 5: Test integrasi bersyarat** — `tests/db/santri-repo.test.ts`

```ts
import { describe, it, expect, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createSantri, getSantriById, listSantri, updateSantri, deleteSantri, saveDocument, DuplicateNikError } from '@/lib/db/santri-repo';

const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const run = url && key ? describe : describe.skip;

run('santri-repo (integrasi Supabase)', () => {
  const client = createClient(url!, key!, { auth: { persistSession: false } });
  const created: string[] = [];
  const base = {
    namaLengkap: 'TEST Ahmad Fulan', nik: '3201010101010001', tempatLahir: 'Bogor', tanggalLahir: '2011-01-01',
    jenisKelamin: 'IKHWAN' as const, jenjang: 'SMP' as const, kelas: '7', sekolahSekarang: 'SMP IT BQ',
  };

  afterAll(async () => {
    if (created.length) await client.from('santri').delete().in('id', created);
  });

  it('membuat, membaca, memperbarui, menghapus santri', async () => {
    const s = await createSantri(client, base);
    created.push(s.id);
    expect(s.id).toBeTruthy();
    const got = await getSantriById(client, s.id);
    expect(got?.namaLengkap).toBe(base.namaLengkap);
    expect(got?.documents).toEqual([]);
    const up = await updateSantri(client, s.id, { kelas: '8' });
    expect(up.kelas).toBe('8');
    const list = await listSantri(client, { q: 'TEST Ahmad' });
    expect(list.some(x => x.id === s.id)).toBe(true);
    expect(await deleteSantri(client, s.id)).toBe(true);
    created.splice(created.indexOf(s.id), 1);
  });

  it('menolak NIK ganda dengan DuplicateNikError', async () => {
    const a = await createSantri(client, { ...base, nik: '3201010101010002' });
    created.push(a.id);
    await expect(createSantri(client, { ...base, nik: '3201010101010002' })).rejects.toBeInstanceOf(DuplicateNikError);
  });

  it('menyimpan dokumen dengan storagePath & mengembalikan signed fileUrl', async () => {
    const s = await createSantri(client, { ...base, nik: '3201010101010003' });
    created.push(s.id);
    const path = `test/${s.id}/kk.txt`;
    await client.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'berkas').upload(path, new Blob(['x']), { upsert: true });
    const d = await saveDocument(client, { santriId: s.id, kategori: 'KARTU_KELUARGA', storagePath: path });
    expect(d.storagePath).toBe(path);
    expect(d.fileUrl).toMatch(/\/object\/sign\//);
  });
});
```

- [ ] **Step 6: Jalankan** — `npx vitest run tests/storage tests/db` → paths PASS; santri-repo `skipped` (tanpa env) atau PASS (dengan env test).

- [ ] **Step 7: Commit**

```bash
git add lib/storage lib/db/santri-repo.ts tests/storage tests/db
git commit -m "refactor(repo): single Supabase path with injected client, storagePath + signed URLs, NIK dedup

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Validasi Zod + wiring API santri (400/409)

**Files:**
- Create: `lib/validation/santri.ts`, `lib/validation/errors.ts`
- Modify: `app/api/santri/route.ts`, `app/api/santri/[id]/route.ts`
- Test: `tests/validation/santri.test.ts`

**Interfaces:**
- Produces: `santriInputSchema`, `santriUpdateSchema`, `documentInputSchema`, `zodFieldErrors(error): Record<string,string>`, `validationResponse(error): NextResponse` (400 `{ error:'Validasi gagal', fields }`), `normalizeWa(s: string): string`.
- Catatan: route di task ini **belum** memanggil `requireUser` (Task 6) — sementara pakai `createAdminSupabase()` agar bisa diuji; Task 6 menggantinya.

- [ ] **Step 1: Test (gagal dulu)** — `tests/validation/santri.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { santriInputSchema, santriUpdateSchema, normalizeWa, zodFieldErrors } from '@/lib/validation/santri';

const valid = {
  namaLengkap: 'Ahmad Fulan', nik: '3201010101010001', tempatLahir: 'Bogor', tanggalLahir: '2011-01-01',
  jenisKelamin: 'IKHWAN', jenjang: 'SMP', kelas: '7A', sekolahSekarang: 'SMP IT BQ',
};

describe('santriInputSchema', () => {
  it('menerima data valid & menormalisasi WA', () => {
    const r = santriInputSchema.safeParse({ ...valid, kontakWali: '0812-3456-789' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.kontakWali).toBe('628123456789');
  });
  it('menolak NIK bukan 16 digit', () => {
    const r = santriInputSchema.safeParse({ ...valid, nik: '123' });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error).nik).toMatch(/16 digit/);
  });
  it('menolak NISN bukan 10 digit tapi menerima kosong', () => {
    expect(santriInputSchema.safeParse({ ...valid, nisn: '12' }).success).toBe(false);
    expect(santriInputSchema.safeParse({ ...valid, nisn: '' }).success).toBe(true);
  });
  it('menolak tanggal lahir di masa depan', () => {
    expect(santriInputSchema.safeParse({ ...valid, tanggalLahir: '2999-01-01' }).success).toBe(false);
  });
  it('menolak kelas 10 untuk jenjang SMP', () => {
    const r = santriInputSchema.safeParse({ ...valid, jenjang: 'SMP', kelas: '10 IPA' });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error).kelas).toBeTruthy();
  });
  it('menerima kelas bebas untuk ALUMNI', () => {
    expect(santriInputSchema.safeParse({ ...valid, jenjang: 'ALUMNI', kelas: 'Lulus 2025' }).success).toBe(true);
  });
  it('membuang field tak dikenal (fotoFormalUrl) dan memetakan ke path', () => {
    const r = santriInputSchema.safeParse({ ...valid, fotoFormalUrl: 'https://x/storage/v1/object/sign/berkas/a.webp?token=1', xyz: 1 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect((r.data as any).xyz).toBeUndefined();
      expect(r.data.fotoFormalPath).toBe('https://x/storage/v1/object/sign/berkas/a.webp?token=1');
    }
  });
  it('update parsial hanya memvalidasi yang dikirim', () => {
    expect(santriUpdateSchema.safeParse({ kelas: '8' }).success).toBe(true);
  });
});

describe('normalizeWa', () => {
  it('0812… → 62812…', () => expect(normalizeWa('0812 3456 789')).toBe('628123456789'));
  it('+62 → 62', () => expect(normalizeWa('+62 812')).toBe('62812'));
});
```

Run: `npx vitest run tests/validation` → FAIL.

- [ ] **Step 2: `lib/validation/errors.ts`**

```ts
import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

export function zodFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function validationResponse(error: ZodError) {
  return NextResponse.json({ error: 'Validasi gagal', fields: zodFieldErrors(error) }, { status: 400 });
}
```

- [ ] **Step 3: `lib/validation/santri.ts`**

```ts
import { z } from 'zod';
export { zodFieldErrors } from './errors';

export function normalizeWa(s: string): string {
  const digits = s.replace(/[^\d+]/g, '');
  if (digits.startsWith('+62')) return '62' + digits.slice(3);
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  return digits.replace(/^\+/, '');
}

const optionalText = z.string().trim().transform(v => (v === '' ? null : v)).nullable().optional();
const digits = (n: number, label: string) =>
  z.string().trim().regex(new RegExp(`^\\d{${n}}$`), `${label} harus ${n} digit angka`);
const optionalDigits = (n: number, label: string) =>
  z.string().trim().transform(v => (v === '' ? null : v)).nullable().optional()
    .refine(v => v == null || new RegExp(`^\\d{${n}}$`).test(v), `${label} harus ${n} digit angka`);

const isoDateNotFuture = z.string().trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
  .refine(v => !Number.isNaN(Date.parse(v)), 'Tanggal tidak valid')
  .refine(v => Date.parse(v) <= Date.now(), 'Tanggal lahir tidak boleh di masa depan');

const kelasCocokJenjang = (d: { jenjang: string; kelas: string }) => {
  const n = parseInt(d.kelas, 10);
  if (d.jenjang === 'SMP') return n >= 7 && n <= 9;
  if (d.jenjang === 'SMA' || d.jenjang === 'SMK') return n >= 10 && n <= 12;
  return true; // ALUMNI bebas
};

const santriBase = z.object({
  namaLengkap: z.string().trim().min(3, 'Nama lengkap minimal 3 huruf'),
  namaPanggilan: optionalText,
  nik: digits(16, 'NIK'),
  noKk: optionalDigits(16, 'No. KK'),
  nisn: optionalDigits(10, 'NISN'),
  tempatLahir: z.string().trim().min(2, 'Tempat lahir wajib diisi'),
  tanggalLahir: isoDateNotFuture,
  jenisKelamin: z.enum(['IKHWAN', 'AKHWAT'], { message: 'Jenis kelamin wajib dipilih' }),
  tahunMasuk: z.coerce.number().int().min(2000).max(2100).optional(),
  jenjang: z.enum(['SMP', 'SMA', 'SMK', 'ALUMNI'], { message: 'Jenjang wajib dipilih' }),
  kelas: z.string().trim().min(1, 'Kelas wajib diisi'),
  sekolahSekarang: z.string().trim().min(2, 'Sekolah saat ini wajib diisi'),
  asalSekolahSebelumnya: optionalText,
  namaAyah: optionalText,
  namaIbu: optionalText,
  statusSosial: z.enum(['REGULER', 'YATIM', 'PIATU', 'YATIM_PIATU', 'DHUAFA']).optional(),
  kontakWali: z.string().trim().transform(v => (v === '' ? null : normalizeWa(v))).nullable().optional()
    .refine(v => v == null || /^62\d{8,13}$/.test(v), 'Nomor WhatsApp tidak valid'),
  pekerjaanOrtu: optionalText,
  alamat: optionalText,
  ringkasanTentang: optionalText,
  riwayatTahfidz: optionalText,
  keahlian: z.union([z.array(z.string()), z.string()]).nullable().optional(),
  // Client lama mengirim *Url (signed URL); server menyimpannya sebagai *Path (repo menormalisasi).
  fotoFormalUrl: optionalText,
  fotoProfilUrl: optionalText,
  fotoFormalPath: optionalText,
  fotoProfilPath: optionalText,
});

const mapFoto = <T extends { fotoFormalUrl?: string | null; fotoProfilUrl?: string | null; fotoFormalPath?: string | null; fotoProfilPath?: string | null }>(d: T) => {
  const { fotoFormalUrl, fotoProfilUrl, ...rest } = d;
  return {
    ...rest,
    fotoFormalPath: d.fotoFormalPath ?? fotoFormalUrl ?? undefined,
    fotoProfilPath: d.fotoProfilPath ?? fotoProfilUrl ?? undefined,
  };
};

export const santriInputSchema = santriBase
  .refine(kelasCocokJenjang, { path: ['kelas'], message: 'Kelas tidak sesuai jenjang (SMP 7–9, SMA/SMK 10–12)' })
  .transform(mapFoto);

export const santriUpdateSchema = santriBase.partial()
  .refine(d => (d.jenjang && d.kelas ? kelasCocokJenjang({ jenjang: d.jenjang, kelas: d.kelas }) : true),
    { path: ['kelas'], message: 'Kelas tidak sesuai jenjang (SMP 7–9, SMA/SMK 10–12)' })
  .transform(mapFoto);

export const documentInputSchema = z.object({
  kategori: z.enum(['KARTU_KELUARGA', 'AKTA_KELAHIRAN', 'KTP_ORTU', 'SKL_IJAZAH', 'KIP_PIP', 'KRM_PKH_KKS', 'SKTM', 'SERTIFIKAT_PRESTASI', 'LAINNYA']),
  nomorDokumen: optionalText,
  storagePath: z.string().trim().min(1).optional(),
  fileUrl: z.string().trim().min(1).optional(),
  rawOcrText: optionalText,
  extractedFields: z.unknown().optional(),
  statusVerifikasi: z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'NEED_FIX']).optional(),
  catatanVerifikasi: optionalText,
}).refine(d => d.storagePath || d.fileUrl, { path: ['storagePath'], message: 'Berkas wajib ada' })
  .transform(d => ({ ...d, storagePath: (d.storagePath || d.fileUrl)! }));

export type SantriInputParsed = z.infer<typeof santriInputSchema>;
```

Run: `npx vitest run tests/validation` → PASS.

- [ ] **Step 4: Wire `app/api/santri/route.ts`** (ganti seluruh isi; auth ditambahkan Task 6)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { listSantri, createSantri, DuplicateNikError, type SantriFilter } from '@/lib/db/santri-repo';
import { santriInputSchema } from '@/lib/validation/santri';
import { validationResponse } from '@/lib/validation/errors';

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminSupabase();
    const { searchParams } = new URL(req.url);
    const filter: SantriFilter = {};
    const q = searchParams.get('q'); if (q) filter.q = q;
    const jk = searchParams.get('jenisKelamin'); if (jk === 'IKHWAN' || jk === 'AKHWAT') filter.jenisKelamin = jk;
    const jj = searchParams.get('jenjang'); if (jj === 'SMP' || jj === 'SMA' || jj === 'SMK' || jj === 'ALUMNI') filter.jenjang = jj;
    return NextResponse.json({ success: true, data: await listSantri(supabase, filter) });
  } catch (error: any) {
    console.error('List santri error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data santri: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminSupabase();
    const parsed = santriInputSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const santri = await createSantri(supabase, parsed.data);
    return NextResponse.json({ success: true, data: santri }, { status: 201 });
  } catch (error: any) {
    if (error instanceof DuplicateNikError) {
      return NextResponse.json({ error: 'NIK sudah terdaftar', existingId: error.existingId }, { status: 409 });
    }
    console.error('Create santri error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan data santri: ' + error.message }, { status: 500 });
  }
}
```

- [ ] **Step 5: Wire `app/api/santri/[id]/route.ts`** (ganti seluruh isi)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getSantriById, updateSantri, deleteSantri, saveDocument, DuplicateNikError } from '@/lib/db/santri-repo';
import { santriUpdateSchema, documentInputSchema } from '@/lib/validation/santri';
import { validationResponse } from '@/lib/validation/errors';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const santri = await getSantriById(createAdminSupabase(), id);
    if (!santri) return NextResponse.json({ error: 'Santri tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ success: true, data: santri });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal mengambil data: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const parsed = santriUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const updated = await updateSantri(createAdminSupabase(), id, parsed.data);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error instanceof DuplicateNikError) {
      return NextResponse.json({ error: 'NIK sudah terdaftar', existingId: error.existingId }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal memperbarui data: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const ok = await deleteSantri(createAdminSupabase(), id);
    if (!ok) return NextResponse.json({ error: 'Santri tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Data santri berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal menghapus data: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const parsed = documentInputSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const doc = await saveDocument(createAdminSupabase(), { santriId: id, ...parsed.data });
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal menambah dokumen: ' + error.message }, { status: 500 });
  }
}
```

- [ ] **Step 6: Perbaiki pemanggil `getSantriById` di server pages**

`app/santri/[id]/page.tsx` dan `app/santri/[id]/edit/page.tsx`: ganti `getSantriById(id)` → `getSantriById(createAdminSupabase(), id)` dengan `import { createAdminSupabase } from '@/lib/supabase/admin'` (Task 6 mengganti ke server client).

- [ ] **Step 7: Verifikasi** — `npx vitest run` → semua unit PASS; `npx tsc --noEmit -p . 2>&1 | grep -v "upload\|ocr\|upload-mandiri\|DemoRole\|DocumentUploadBox\|BatchScan" | head` → tidak ada error di file yang disentuh task ini.

- [ ] **Step 8: Commit**

```bash
git add lib/validation tests/validation app/api/santri app/santri
git commit -m "feat(api): zod validation for santri & documents, 409 on duplicate NIK

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Inti auth — `session.ts`, `proxy.ts`, callback, proteksi semua route

**Files:**
- Create: `lib/auth/session.ts`, `proxy.ts`, `app/auth/callback/route.ts`, `app/api/auth/logout/route.ts`
- Modify: semua `app/api/**/route.ts` kecuali `upload-mandiri`; `app/santri/[id]/page.tsx`, `app/santri/[id]/edit/page.tsx`
- Test: `tests/auth/session.test.ts`

**Interfaces:**
- Produces: `type SessionUser = { id: string; email: string; nama: string; role: UserRole }`, `getSessionUser(): Promise<SessionUser|null>`, `requireUser(roles?: UserRole[]): Promise<{ user: SessionUser; supabase: SupabaseClient }>`, `class AuthError extends Error { status: 401|403; code: 'UNAUTHENTICATED'|'FORBIDDEN' }`, `authErrorResponse(e: unknown): NextResponse | null` (null jika bukan AuthError).
- `PUBLIC_PATHS` di `lib/auth/public-paths.ts`: `['/login','/reset-password','/auth/callback','/upload-mandiri','/api/upload-mandiri']`.

- [ ] **Step 1: Test (gagal dulu)** — `tests/auth/session.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getUser = vi.fn();
const maybeSingle = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: async () => ({
    auth: { getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));

import { getSessionUser, requireUser, AuthError } from '@/lib/auth/session';

beforeEach(() => { getUser.mockReset(); maybeSingle.mockReset(); });

describe('getSessionUser', () => {
  it('null jika tidak login', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await getSessionUser()).toBeNull();
  });
  it('null jika profil nonaktif', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.c' } } });
    maybeSingle.mockResolvedValue({ data: { nama: 'A', role: 'PANITIA', aktif: false } });
    expect(await getSessionUser()).toBeNull();
  });
  it('mengembalikan user + role', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.c' } } });
    maybeSingle.mockResolvedValue({ data: { nama: 'A', role: 'PANITIA', aktif: true } });
    expect(await getSessionUser()).toEqual({ id: 'u1', email: 'a@b.c', nama: 'A', role: 'PANITIA' });
  });
});

describe('requireUser', () => {
  it('401 jika tidak login', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(requireUser()).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
  });
  it('403 jika role tidak diizinkan', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.c' } } });
    maybeSingle.mockResolvedValue({ data: { nama: 'A', role: 'VIEWER', aktif: true } });
    await expect(requireUser(['SUPERADMIN'])).rejects.toBeInstanceOf(AuthError);
  });
  it('lolos jika role cocok', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.c' } } });
    maybeSingle.mockResolvedValue({ data: { nama: 'A', role: 'SUPERADMIN', aktif: true } });
    const { user } = await requireUser(['SUPERADMIN', 'PANITIA']);
    expect(user.role).toBe('SUPERADMIN');
  });
});
```

Run: `npx vitest run tests/auth/session.test.ts` → FAIL.

- [ ] **Step 2: `lib/auth/public-paths.ts`**

```ts
export const PUBLIC_PATHS = ['/login', '/reset-password', '/auth/callback', '/upload-mandiri', '/api/upload-mandiri'];
export const isPublicPath = (pathname: string) => PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
```

- [ ] **Step 3: `lib/auth/session.ts`**

```ts
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/auth/roles';

export type SessionUser = { id: string; email: string; nama: string; role: UserRole };

export class AuthError extends Error {
  constructor(public status: 401 | 403, public code: 'UNAUTHENTICATED' | 'FORBIDDEN', message: string) {
    super(message); this.name = 'AuthError';
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerSupabase();
  return getSessionUserWith(supabase);
}

async function getSessionUserWith(supabase: SupabaseClient): Promise<SessionUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('nama, role, aktif').eq('id', user.id).maybeSingle();
  if (!profile || !profile.aktif) return null;
  return { id: user.id, email: user.email || '', nama: profile.nama, role: profile.role as UserRole };
}

/** Dipanggil di awal setiap route handler terproteksi. Mengembalikan klien ber-RLS milik user. */
export async function requireUser(roles?: UserRole[]): Promise<{ user: SessionUser; supabase: SupabaseClient }> {
  const supabase = await createServerSupabase();
  const user = await getSessionUserWith(supabase);
  if (!user) throw new AuthError(401, 'UNAUTHENTICATED', 'Silakan masuk terlebih dahulu');
  if (roles && !roles.includes(user.role)) throw new AuthError(403, 'FORBIDDEN', 'Anda tidak memiliki hak akses untuk tindakan ini');
  return { user, supabase };
}

export function authErrorResponse(e: unknown): NextResponse | null {
  if (e instanceof AuthError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  return null;
}
```

Run: `npx vitest run tests/auth/session.test.ts` → PASS.

- [ ] **Step 4: `proxy.ts`** (root proyek)

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isPublicPath } from '@/lib/auth/public-paths';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname, search } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Silakan masuk terlebih dahulu', code: 'UNAUTHENTICATED' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone(); url.pathname = '/'; url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|woff2?)$).*)'],
};
```

- [ ] **Step 5: `app/auth/callback/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/';
  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/'}`);
  }
  return NextResponse.redirect(`${origin}/login?error=tautan-tidak-valid`);
}
```

- [ ] **Step 6: `app/api/auth/logout/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 7: Proteksi route** — pola yang dipakai di setiap handler:

```ts
import { requireUser, authErrorResponse } from '@/lib/auth/session';
// ...
export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireUser(['SUPERADMIN', 'PANITIA']);
    // ... pakai `supabase` (RLS user) untuk repo, BUKAN createAdminSupabase()
  } catch (error: any) {
    const authRes = authErrorResponse(error); if (authRes) return authRes;
    // ... penanganan error lama
  }
}
```

Terapkan:
| File | Handler | roles |
|---|---|---|
| `app/api/santri/route.ts` | GET | `undefined` (semua yang login) |
| | POST | `['SUPERADMIN','PANITIA']` |
| `app/api/santri/[id]/route.ts` | GET | `undefined` |
| | PUT, POST | `['SUPERADMIN','PANITIA']` |
| | DELETE | `['SUPERADMIN']` |
| `app/api/upload/route.ts`, `app/api/ocr/route.ts`, `app/api/ocr/batch/route.ts`, `app/api/upload-token/route.ts` | POST | `['SUPERADMIN','PANITIA']` |

Di `app/api/santri/*` ganti `createAdminSupabase()` → `supabase` dari `requireUser`, hapus import admin. Di `app/api/upload-token/route.ts` ganti `createUploadTokenRecord(santriId, …)` → `createUploadTokenRecord(supabase, santriId, …)` dan `getSantriById(santriId)` → `getSantriById(supabase, santriId)`; `baseUrl` → `env.APP_URL`. Route `upload`, `ocr`, `ocr/batch` diselesaikan penuh di Task 8; di task ini cukup tambahkan `requireUser` di baris pertama `try`.

Server pages: `app/santri/[id]/page.tsx` & `edit/page.tsx` → `getSantriById(await createServerSupabase(), id)` dengan `import { createServerSupabase } from '@/lib/supabase/server'`.

- [ ] **Step 8: Verifikasi** — `npx vitest run` PASS. `grep -rn "createAdminSupabase" app/api` → hanya boleh muncul di `app/api/upload-mandiri/route.ts` (setelah Task 8) dan `app/api/pengguna/*` (Task 9).

- [ ] **Step 9: Commit**

```bash
git add lib/auth proxy.ts app/auth app/api tests/auth app/santri
git commit -m "feat(auth): session helpers, proxy redirect, auth callback, protect all API routes

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: UI auth — `/login`, `/reset-password`, `AuthProvider`, shell, `seed-admin`

**Files:**
- Create: `app/login/page.tsx`, `components/auth/LoginForm.tsx`, `app/reset-password/page.tsx`, `components/auth/ResetPasswordForm.tsx`, `components/auth/AuthProvider.tsx`, `components/auth/UserMenu.tsx`, `scripts/seed-admin.mjs`
- Delete: `components/auth/DemoRoleSwitcher.tsx`
- Modify: `app/layout.tsx`, `components/layout/AppShell.tsx`, `components/layout/DesktopSidebar.tsx`, `components/layout/MobileBottomNav.tsx`, `package.json` (script)
- Test: `tests/layout/navigation.test.ts` (perbarui jika mereferensikan DemoRoleSwitcher)

**Interfaces:**
- `AuthProvider({ user: SessionUser | null, children })`; `useAuth(): { user: SessionUser|null; role: UserRole; canEdit; canDelete; canManageUsers; logout(): Promise<void> }` — `role` default `'VIEWER'` jika null.
- `/login` & `/reset-password` dirender **tanpa** `AppShell` (sidebar/nav): `AppShell` menerima `user`; jika `null`, render `children` polos.

- [ ] **Step 1: `components/auth/AuthProvider.tsx`**

```tsx
'use client';
import React, { createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { canDeleteSantri, canEditSantri, canManageUsers, type UserRole } from '@/lib/auth/roles';
import type { SessionUser } from '@/lib/auth/session';
import { createBrowserSupabase } from '@/lib/supabase/client';

type AuthContextType = {
  user: SessionUser | null; role: UserRole;
  canEdit: boolean; canDelete: boolean; canManageUsers: boolean;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextType>({
  user: null, role: 'VIEWER', canEdit: false, canDelete: false, canManageUsers: false, logout: async () => {},
});

export function AuthProvider({ user, children }: { user: SessionUser | null; children: React.ReactNode }) {
  const router = useRouter();
  const role: UserRole = user?.role ?? 'VIEWER';
  // Session kedaluwarsa/keluar di tab lain → kembali ke login (spec §7)
  React.useEffect(() => {
    if (!user) return;
    const { data: sub } = createBrowserSupabase().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { router.push('/login'); router.refresh(); }
    });
    return () => sub.subscription.unsubscribe();
  }, [user, router]);
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login'); router.refresh();
  };
  return (
    <AuthContext.Provider value={{ user, role, canEdit: canEditSantri(role), canDelete: canDeleteSantri(role), canManageUsers: canManageUsers(role), logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
```

- [ ] **Step 2: `app/layout.tsx`** — jadikan async, ambil user, oper ke shell:

```tsx
import { getSessionUser } from '@/lib/auth/session';
// ...
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} ${caveat.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider>
          <AppShell user={user}>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: `components/layout/AppShell.tsx`**

```tsx
'use client';
import React from 'react';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { AuthProvider } from '@/components/auth/AuthProvider';
import type { SessionUser } from '@/lib/auth/session';

export function AppShell({ user, children }: { user: SessionUser | null; children: React.ReactNode }) {
  if (!user) {
    // Halaman publik (login, reset, upload-mandiri): tanpa navigasi panitia
    return <AuthProvider user={null}><div className="min-h-screen bg-slate-50 dark:bg-slate-950">{children}</div></AuthProvider>;
  }
  return (
    <AuthProvider user={user}>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        <DesktopSidebar />
        <main className="flex-1 min-w-0 pb-28 md:pb-12 pt-4 md:pt-8 px-4 sm:px-8 max-w-7xl mx-auto w-full">{children}</main>
        <MobileBottomNav />
      </div>
    </AuthProvider>
  );
}
```

- [ ] **Step 4: `components/auth/UserMenu.tsx`** (dipakai sidebar & bottom nav)

```tsx
'use client';
import { SignOut, UserCircle } from '@phosphor-icons/react';
import { useAuth } from './AuthProvider';
import { getRoleLabel } from '@/lib/auth/roles';

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { user, role, logout } = useAuth();
  if (!user) return null;
  return (
    <div className={`flex items-center gap-3 ${compact ? '' : 'p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800'}`}>
      <UserCircle size={compact ? 22 : 32} weight="duotone" className="text-teal-600 shrink-0" />
      {!compact && (
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate">{user.nama}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{getRoleLabel(role)}</p>
        </div>
      )}
      <button type="button" onClick={logout} aria-label="Keluar"
        className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-500 hover:text-rose-600 transition-colors">
        <SignOut size={20} weight="bold" />
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Sidebar & bottom nav**

`DesktopSidebar.tsx`: hapus import `DemoRoleSwitcher`; ganti blok "Peran Akun" (`<div className="flex items-center justify-between"> … <DemoRoleSwitcher /> </div>`) dengan `<UserMenu />`; tambahkan item nav `{ href: '/pengguna', label: 'Kelola Pengguna', icon: ShieldCheck }` **hanya jika** `useAuth().canManageUsers`. `MobileBottomNav.tsx`: tambahkan `<UserMenu compact />` di ujung kanan bar (maks 5 item, jadi hapus item paling tidak penting jika sudah 5). Hapus `components/auth/DemoRoleSwitcher.tsx`.

- [ ] **Step 6: `components/auth/LoginForm.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EnvelopeSimple, LockKey, SignIn, BookOpen } from '@phosphor-icons/react';
import { createBrowserSupabase } from '@/lib/supabase/client';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(params.get('error') === 'tautan-tidak-valid' ? 'Tautan tidak valid atau sudah kedaluwarsa.' : null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    const { error } = await createBrowserSupabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setError('Email atau kata sandi salah.'); return; }
    const next = params.get('next') || '/';
    router.push(next.startsWith('/') ? next : '/'); router.refresh();
  };

  const forgot = async () => {
    if (!email) { setError('Isi email dulu untuk mengirim tautan atur ulang.'); return; }
    setBusy(true); setError(null);
    const { error } = await createBrowserSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (error) setError('Gagal mengirim tautan. Coba lagi.');
    else setInfo('Tautan atur ulang kata sandi telah dikirim ke email Anda.');
  };

  const field = 'w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500';
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center text-white"><BookOpen size={24} weight="duotone" /></div>
          <div><h1 className="font-extrabold text-lg leading-tight">Baitul Qowwam</h1><p className="text-xs text-slate-500">Masuk panitia administrasi</p></div>
        </div>
        {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl px-3 py-2">{error}</p>}
        {info && <p role="status" className="text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2">{info}</p>}
        <label className="block space-y-1"><span className="text-xs font-semibold">Email</span>
          <div className="relative"><EnvelopeSimple size={20} className="absolute left-4 top-3.5 text-slate-400" />
            <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={field} /></div></label>
        <label className="block space-y-1"><span className="text-xs font-semibold">Kata sandi</span>
          <div className="relative"><LockKey size={20} className="absolute left-4 top-3.5 text-slate-400" />
            <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={field} /></div></label>
        <button type="submit" disabled={busy} className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2">
          <SignIn size={20} weight="bold" /> {busy ? 'Memproses…' : 'Masuk'}
        </button>
        <button type="button" onClick={forgot} disabled={busy} className="w-full text-xs text-slate-500 hover:text-teal-600">Lupa kata sandi?</button>
      </form>
    </div>
  );
}
```

`app/login/page.tsx`:
```tsx
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
export const metadata = { title: 'Masuk — BQ-ku' };
export default function LoginPage() { return <Suspense><LoginForm /></Suspense>; }
```

- [ ] **Step 7: `components/auth/ResetPasswordForm.tsx`** + `app/reset-password/page.tsx`

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKey } from '@phosphor-icons/react';
import { createBrowserSupabase } from '@/lib/supabase/client';

export function ResetPasswordForm() {
  const router = useRouter();
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setError('Kata sandi minimal 8 karakter.');
    if (pw !== pw2) return setError('Konfirmasi kata sandi tidak sama.');
    setBusy(true); setError(null);
    const { error } = await createBrowserSupabase().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError('Gagal menyimpan kata sandi. Buka ulang tautan dari email.');
    router.push('/'); router.refresh();
  };
  const field = 'w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500';
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <h1 className="font-extrabold text-lg">Atur kata sandi</h1>
        {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl px-3 py-2">{error}</p>}
        <label className="block space-y-1"><span className="text-xs font-semibold">Kata sandi baru</span>
          <div className="relative"><LockKey size={20} className="absolute left-4 top-3.5 text-slate-400" /><input type="password" required minLength={8} autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} className={field} /></div></label>
        <label className="block space-y-1"><span className="text-xs font-semibold">Ulangi kata sandi</span>
          <div className="relative"><LockKey size={20} className="absolute left-4 top-3.5 text-slate-400" /><input type="password" required autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} className={field} /></div></label>
        <button type="submit" disabled={busy} className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold">{busy ? 'Menyimpan…' : 'Simpan & masuk'}</button>
      </form>
    </div>
  );
}
```
```tsx
// app/reset-password/page.tsx
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
export const metadata = { title: 'Atur kata sandi — BQ-ku' };
export default function ResetPasswordPage() { return <ResetPasswordForm />; }
```
Catatan: `/reset-password` publik di proxy, tetapi `updateUser` hanya berhasil jika session recovery/invite sudah ditukar oleh `/auth/callback`. Pengguna yang diundang juga mendarat di sini (lihat Task 9: `redirectTo` undangan = `/auth/callback?next=/reset-password`).

- [ ] **Step 8: `scripts/seed-admin.mjs`**

```js
// Buat/naikkan SUPERADMIN pertama. Jalankan:
// node --env-file=.env.local scripts/seed-admin.mjs --email admin@x.id --nama "Admin" --password "rahasia-awal"
import { createClient } from '@supabase/supabase-js';

const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : undefined; };
const email = arg('email'), nama = arg('nama') || 'Superadmin', password = arg('password');
if (!email || !password) { console.error('Wajib: --email, --password (opsional --nama)'); process.exit(1); }
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset'); process.exit(1); }

const admin = createClient(url, key, { auth: { persistSession: false } });
const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
let user = list?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nama, role: 'SUPERADMIN' } });
  if (error) { console.error('Gagal membuat user:', error.message); process.exit(1); }
  user = data.user; console.log('User dibuat:', user.id);
} else {
  console.log('User sudah ada:', user.id);
}
const { error: pErr } = await admin.from('profiles').upsert({ id: user.id, nama, email, role: 'SUPERADMIN', aktif: true });
if (pErr) { console.error('Gagal set profil:', pErr.message); process.exit(1); }
console.log(`SUPERADMIN siap: ${email}`);
```

`package.json` scripts: `"seed:admin": "node --env-file=.env.local scripts/seed-admin.mjs"`.

- [ ] **Step 9: Verifikasi** — `npx vitest run` PASS; `grep -rn "DemoRoleSwitcher" app components tests` → kosong. Jalankan `npm run dev`, buka `/santri` tanpa login → redirect `/login`. (Login nyata membutuhkan migrasi & seed di proyek Supabase pemilik — catat di laporan jika belum dilakukan.)

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(auth): login/reset pages, AuthProvider from server session, user menu, seed-admin script

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Storage private — route upload/OCR/upload-mandiri, client direct upload, endpoint signed URL

**Files:**
- Create: `app/api/documents/[id]/url/route.ts`, `lib/storage/upload.ts`
- Modify: `app/api/upload/route.ts`, `app/api/ocr/batch/route.ts`, `app/api/ocr/route.ts`, `app/api/upload-mandiri/route.ts`, `components/forms/DocumentUploadBox.tsx`, `components/forms/BatchScanModal.tsx`, `components/forms/SantriForm.tsx`
- Test: `tests/storage/upload.test.ts`

**Interfaces:**
- Produces: `uploadToBucket(client, path, buffer, contentType): Promise<{ storagePath: string; fileUrl: string }>` (unggah + signed URL) di `lib/storage/upload.ts`.
- Respons `/api/upload` dan tiap item `/api/ocr/batch`: `{ storagePath, fileUrl (signed), fileName, … }`. Client **tetap** memakai `fileUrl` untuk preview/OCR; saat menyimpan dokumen ia mengirim `fileUrl` (signed) yang dinormalisasi server (Task 5 `documentInputSchema`).

- [ ] **Step 1: `lib/storage/upload.ts` + test**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { signPaths } from './signed';

export async function uploadToBucket(
  client: SupabaseClient, storagePath: string, body: Buffer | Blob | File, contentType: string,
  bucket = process.env.SUPABASE_STORAGE_BUCKET || 'berkas',
): Promise<{ storagePath: string; fileUrl: string }> {
  const { error } = await client.storage.from(bucket).upload(storagePath, body, { contentType, upsert: true });
  if (error) throw new Error(`Gagal mengunggah ke storage: ${error.message}`);
  const map = await signPaths(client, [storagePath], bucket);
  return { storagePath, fileUrl: map[storagePath] || '' };
}
```

`tests/storage/upload.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { uploadToBucket } from '@/lib/storage/upload';

const mkClient = (uploadErr: any = null) => ({
  storage: { from: () => ({
    upload: vi.fn().mockResolvedValue({ error: uploadErr }),
    createSignedUrls: vi.fn().mockResolvedValue({ data: [{ path: 'a/b.pdf', signedUrl: 'https://x/sign/a/b.pdf?token=1' }], error: null }),
  }) },
}) as any;

describe('uploadToBucket', () => {
  it('mengembalikan path & signed URL', async () => {
    const r = await uploadToBucket(mkClient(), 'a/b.pdf', Buffer.from('x'), 'application/pdf');
    expect(r).toEqual({ storagePath: 'a/b.pdf', fileUrl: 'https://x/sign/a/b.pdf?token=1' });
  });
  it('melempar jika upload gagal', async () => {
    await expect(uploadToBucket(mkClient({ message: 'boom' }), 'a', Buffer.from('x'), 'text/plain')).rejects.toThrow(/boom/);
  });
});
```
Run: `npx vitest run tests/storage/upload.test.ts` → PASS.

- [ ] **Step 2: `app/api/upload/route.ts`** — di dalam `try` setelah `requireUser`: hapus seluruh blok "Local fallback" & `public/uploads` (`uploadDir`, `fs.mkdirSync`, `canCheckLocalDir`); temp dir untuk Ghostscript selalu `os.tmpdir()` (`import os from 'os'`). Ganti bagian 4:

```ts
const { storagePath, fileUrl } = await uploadToBucket(supabase, fileName, finalBuffer, mimeType);
// ...
return NextResponse.json({ success: true, storagePath, fileUrl, fileName, originalSize, compressedSize, savingsPercent, mimeType });
```
`generateStandardizedFileName(opts)` dipanggil tanpa argumen direktori kedua.

- [ ] **Step 3: `app/api/ocr/batch/route.ts`** — `optimizeAndUpload` menerima `client: SupabaseClient` sebagai argumen pertama dan memakai `uploadToBucket`; mengembalikan `{ storagePath, fileUrl, fileName, finalBuffer, finalMime }`. `BatchResult` mendapat `storagePath: string`. Di jalur JSON: `items` bertipe `{ fileUrl: string; storagePath: string; fileName: string }`; `fetch(item.fileUrl)` tetap (signed URL valid 1 jam) — tetapi tambahkan guard: `if (!item.fileUrl.startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL!)) throw new Error('URL berkas tidak dikenal')` agar server tidak mengunduh URL sembarang. Setiap `results.push` menyertakan `storagePath` (`item.storagePath` atau hasil `optimizeAndUpload`). Hapus `getSupabaseServerClient`; klien = `supabase` dari `requireUser`.

- [ ] **Step 4: `app/api/ocr/route.ts`** — tambahkan `requireUser(['SUPERADMIN','PANITIA'])` (Task 6) dan guard yang sama: jika `fileUrl` tidak diawali `NEXT_PUBLIC_SUPABASE_URL` → 400 `URL berkas tidak dikenal`.

- [ ] **Step 5: `app/api/upload-mandiri/route.ts`** — `const supabase = createAdminSupabase();` di awal kedua handler; semua repo call mendapat `supabase` sebagai argumen pertama; upload via `uploadToBucket(supabase, fileName, finalBuffer, uploadMime)`; `saveDocument(supabase, { …, storagePath })`. Respons GET: `documents` memetakan `{ kategori, statusVerifikasi, fileUrl: d.fileUrl }` (sudah signed oleh repo) dan `fotoProfilUrl: santri.fotoProfilUrl || santri.fotoFormalUrl`.

- [ ] **Step 6: `app/api/documents/[id]/url/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, authErrorResponse } from '@/lib/auth/session';
import { getDocumentById } from '@/lib/db/santri-repo';
import { signPaths } from '@/lib/storage/signed';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireUser();
    const { id } = await ctx.params;
    const doc = await getDocumentById(supabase, id);
    if (!doc) return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 });
    const map = await signPaths(supabase, [doc.storagePath]);
    return NextResponse.json({ success: true, url: map[doc.storagePath] || null, expiresIn: 3600 });
  } catch (e) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal membuat tautan' }, { status: 500 });
  }
}
```

- [ ] **Step 7: Client direct upload (>4MB)** — `DocumentUploadBox.tsx` & `BatchScanModal.tsx`: ganti `import { supabase } from '@/lib/supabase/client'` → `import { createBrowserSupabase } from '@/lib/supabase/client'`, `const supabase = createBrowserSupabase();` di awal handler; ganti `getPublicUrl(pathName)` dengan:

```ts
const { data: signed, error: signErr } = await supabase.storage.from('berkas').createSignedUrl(pathName, 3600);
if (signErr || !signed) throw new Error('Gagal membuat tautan berkas');
fileUrl = signed.signedUrl; // DocumentUploadBox
// BatchScanModal: uploadedItems.push({ fileUrl: signed.signedUrl, storagePath: pathName, fileName: file.name });
```
Hapus kondisi `if (supabase && …)` menjadi `if (selectedFile.size > 4 * 1024 * 1024)` (klien selalu ada). `BatchItemResult` mendapat `storagePath?: string`.

- [ ] **Step 8: `SantriForm.tsx`** — hanya dua perubahan kecil:
  1. `handlePhotoUpload`: `setFormData(prev => ({ ...prev, [targetField]: data.fileUrl }))` tetap (signed URL; server memetakan ke `*Path` lewat `santriInputSchema`).
  2. Saat submit dokumen (`for (const doc of pendingDocuments)`): body sudah berisi `fileUrl` → `documentInputSchema` menormalisasi. Tidak ada perubahan kode; **verifikasi** saja bahwa `pendingDocuments` item memiliki `fileUrl` non-kosong.

- [ ] **Step 9: Bersihkan sisa** — `grep -rn "getPublicUrl\|/uploads/\|public/uploads\|isSupabaseConfigured\|getSupabaseServerClient" app components lib` → kosong. Hapus folder `public/uploads/*` file contoh (biarkan `.gitkeep`).

- [ ] **Step 10: Verifikasi** — `npx vitest run` PASS; `npx tsc --noEmit -p .` → 0 error; `npm run build` → sukses.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(storage): private bucket — store storagePath, serve signed URLs, guard remote fetches

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Kelola pengguna (`/pengguna`) — API + UI

**Files:**
- Create: `lib/validation/pengguna.ts`, `app/api/pengguna/route.ts`, `app/api/pengguna/[id]/route.ts`, `app/pengguna/page.tsx`, `components/pengguna/PenggunaTable.tsx`, `components/pengguna/UndangPenggunaModal.tsx`
- Test: `tests/validation/pengguna.test.ts`

**Interfaces:**
- `GET /api/pengguna` → `{ data: Array<{ id, nama, email, role, aktif, createdAt, lastSignInAt }> }`
- `POST /api/pengguna` body `{ nama, email, role }` → 201; 409 jika email sudah ada.
- `PATCH /api/pengguna/[id]` body `{ role?, aktif? }`; 400 jika target = diri sendiri dan (`aktif=false` atau `role!=='SUPERADMIN'`).

- [ ] **Step 1: Skema + test**

`lib/validation/pengguna.ts`:
```ts
import { z } from 'zod';
export const roleEnum = z.enum(['SUPERADMIN', 'PANITIA', 'VIEWER']);
export const invitePenggunaSchema = z.object({
  nama: z.string().trim().min(2, 'Nama minimal 2 huruf'),
  email: z.string().trim().toLowerCase().email('Email tidak valid'),
  role: roleEnum,
});
export const updatePenggunaSchema = z.object({ role: roleEnum.optional(), aktif: z.boolean().optional() })
  .refine(d => d.role !== undefined || d.aktif !== undefined, 'Tidak ada perubahan');
```
`tests/validation/pengguna.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { invitePenggunaSchema, updatePenggunaSchema } from '@/lib/validation/pengguna';
describe('pengguna schemas', () => {
  it('menormalisasi email', () => {
    const r = invitePenggunaSchema.safeParse({ nama: 'Ani', email: ' Ani@X.ID ', role: 'PANITIA' });
    expect(r.success && r.data.email).toBe('ani@x.id');
  });
  it('menolak role tidak dikenal', () => expect(invitePenggunaSchema.safeParse({ nama: 'A', email: 'a@b.c', role: 'BOS' }).success).toBe(false));
  it('update kosong ditolak', () => expect(updatePenggunaSchema.safeParse({}).success).toBe(false));
});
```
Run → PASS setelah file dibuat.

- [ ] **Step 2: `app/api/pengguna/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, authErrorResponse } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { invitePenggunaSchema } from '@/lib/validation/pengguna';
import { validationResponse } from '@/lib/validation/errors';
import { env } from '@/lib/env';

export async function GET() {
  try {
    await requireUser(['SUPERADMIN']);
    const admin = createAdminSupabase();
    const [{ data: profiles, error }, { data: users }] = await Promise.all([
      admin.from('profiles').select('*').order('createdAt', { ascending: true }),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    if (error) throw error;
    const last = new Map((users?.users || []).map(u => [u.id, u.last_sign_in_at || null]));
    return NextResponse.json({ success: true, data: (profiles || []).map(p => ({ ...p, lastSignInAt: last.get(p.id) ?? null })) });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal memuat pengguna: ' + e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser(['SUPERADMIN']);
    const parsed = invitePenggunaSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const { nama, email, role } = parsed.data;
    const admin = createAdminSupabase();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nama, role },
      redirectTo: `${env.APP_URL}/auth/callback?next=/reset-password`,
    });
    if (error) {
      const dup = /already|registered|exists/i.test(error.message);
      return NextResponse.json({ error: dup ? 'Email sudah terdaftar' : 'Gagal mengundang: ' + error.message }, { status: dup ? 409 : 500 });
    }
    // Trigger membuat profil; pastikan nama/role sesuai input (idempoten)
    await admin.from('profiles').upsert({ id: data.user.id, nama, email, role, aktif: true });
    return NextResponse.json({ success: true, data: { id: data.user.id, nama, email, role, aktif: true } }, { status: 201 });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal mengundang: ' + e.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: `app/api/pengguna/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, authErrorResponse } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { updatePenggunaSchema } from '@/lib/validation/pengguna';
import { validationResponse } from '@/lib/validation/errors';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser(['SUPERADMIN']);
    const { id } = await ctx.params;
    const parsed = updatePenggunaSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const { role, aktif } = parsed.data;
    if (id === user.id && (aktif === false || (role && role !== 'SUPERADMIN'))) {
      return NextResponse.json({ error: 'Anda tidak dapat menonaktifkan atau menurunkan akun sendiri' }, { status: 400 });
    }
    const admin = createAdminSupabase();
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (role !== undefined) patch.role = role;
    if (aktif !== undefined) patch.aktif = aktif;
    const { data, error } = await admin.from('profiles').update(patch).eq('id', id).select().single();
    if (error) throw error;
    if (aktif === false) await admin.auth.admin.signOut(id).catch(() => {});
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal memperbarui pengguna: ' + e.message }, { status: 500 });
  }
}
```
(Catatan: `admin.auth.admin.signOut(id)` — jika versi SDK tidak menyediakannya, ganti dengan `admin.auth.admin.updateUserById(id, { ban_duration: '876000h' })` saat `aktif=false` dan `ban_duration: 'none'` saat `aktif=true`.)

- [ ] **Step 4: `app/pengguna/page.tsx`** (server) — redirect non-superadmin:

```tsx
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { canManageUsers } from '@/lib/auth/roles';
import { PenggunaTable } from '@/components/pengguna/PenggunaTable';

export const metadata = { title: 'Kelola Pengguna — BQ-ku' };
export default async function PenggunaPage() {
  const user = await getSessionUser();
  if (!user || !canManageUsers(user.role)) redirect('/');
  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-extrabold">Kelola Pengguna</h1>
        <p className="text-sm text-slate-500">Undang panitia, atur peran, dan nonaktifkan akun.</p></header>
      <PenggunaTable currentUserId={user.id} />
    </div>
  );
}
```

- [ ] **Step 5: `components/pengguna/PenggunaTable.tsx`** — client: `useEffect` fetch `/api/pengguna`; tabel (desktop) / kartu (mobile) dengan kolom Nama, Email, Peran (`<select>` inline → PATCH), Aktif (toggle → PATCH), Terakhir masuk; baris diri sendiri: select & toggle `disabled`. Tombol "Undang pengguna" membuka `UndangPenggunaModal`. Setelah aksi sukses, refetch. Error tampil sebagai toast/inline (`role="alert"`). Gaya: tabel dalam `rounded-3xl bg-white dark:bg-slate-900 border`, header `text-xs font-bold uppercase text-slate-500`, badge peran `rounded-full px-2 py-0.5 text-[11px]` (SUPERADMIN `bg-emerald-100 text-emerald-800`, PANITIA `bg-teal-100 text-teal-800`, VIEWER `bg-slate-100 text-slate-700`). Ikon: `UserPlus`, `ShieldCheck`, `Power`.

- [ ] **Step 6: `components/pengguna/UndangPenggunaModal.tsx`** — modal (`role="dialog" aria-modal`) dengan input Nama, Email, select Peran (default PANITIA); submit POST `/api/pengguna`; 400 → tampilkan `fields` di bawah input; 409 → pesan di atas form; sukses → tutup & `onInvited()`. Esc/klik backdrop menutup. Tombol ≥44px tinggi.

- [ ] **Step 7: Verifikasi** — `npx vitest run` PASS; `npx tsc --noEmit` 0 error; dev: login SUPERADMIN → `/pengguna` tampil; login PANITIA → `/pengguna` redirect `/` dan menu tidak tampil; `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/pengguna` → `401`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(pengguna): superadmin user management — invite, change role, deactivate

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: `SantriForm` — error inline dari Zod & toast NIK ganda

**Files:**
- Modify: `components/forms/SantriForm.tsx` (hanya `handleSubmit` dan render error), `lib/validation/santri.ts` (ekspor `santriClientSchema`)

- [ ] **Step 1: Ekspor skema client** — di `lib/validation/santri.ts` tambahkan `export const santriClientSchema = santriBase.pick({ namaLengkap: true, nik: true, noKk: true, nisn: true, tempatLahir: true, tanggalLahir: true, jenisKelamin: true, jenjang: true, kelas: true, sekolahSekarang: true, kontakWali: true }).refine(kelasCocokJenjang, { path: ['kelas'], message: 'Kelas tidak sesuai jenjang (SMP 7–9, SMA/SMK 10–12)' });` — dipakai form sebelum kirim.

- [ ] **Step 2: State error field** — di `SantriForm.tsx` tambahkan `const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});`. Di awal `handleSubmit` (sebelum `fetch`):

```ts
const check = santriClientSchema.safeParse(formData);
if (!check.success) {
  const errs = zodFieldErrors(check.error);
  setFieldErrors(errs);
  const first = Object.keys(errs)[0];
  setErrorMessage(`Periksa kembali: ${errs[first]}`);
  document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  setIsSubmitting(false);
  return;
}
setFieldErrors({});
```
Setelah `const data = await res.json();`:
```ts
if (res.status === 400 && data.fields) { setFieldErrors(data.fields); throw new Error('Validasi gagal: ' + Object.values(data.fields)[0]); }
if (res.status === 409 && data.existingId) {
  setDuplicateNik({ existingId: data.existingId });
  throw new Error('NIK sudah terdaftar atas nama santri lain.');
}
```
Tambahkan `const [duplicateNik, setDuplicateNik] = useState<{ existingId: string } | null>(null);` dan render di dekat pesan error yang sudah ada (mekanisme toast dari commit `eb9b9b5`):
```tsx
{duplicateNik && (
  <a href={`/santri/${duplicateNik.existingId}`} className="inline-flex items-center gap-1 text-sm font-bold text-teal-700 underline">
    Buka data santri yang sudah ada →
  </a>
)}
```
Di bawah setiap input inti (`nik`, `noKk`, `nisn`, `tanggalLahir`, `kelas`, `kontakWali`): `{fieldErrors.nik && <p className="text-xs text-rose-600 mt-1">{fieldErrors.nik}</p>}` (sesuaikan nama field) dan tambahkan `name="nik"` dst. pada input jika belum ada agar `focus()` bekerja.

- [ ] **Step 3: Verifikasi** — dev: isi NIK 5 digit → pesan inline & fokus; simpan NIK yang sudah ada → tautan "Buka data santri". `npx tsc --noEmit` 0 error.

- [ ] **Step 4: Commit**

```bash
git add lib/validation/santri.ts components/forms/SantriForm.tsx
git commit -m "feat(form): inline zod errors and duplicate-NIK link in SantriForm

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Verifikasi akhir & laporan

- [ ] **Step 1: Otomatis**

```bash
npx vitest run && npx tsc --noEmit -p . && npm run build
```
Expected: semua PASS, 0 error TS, build sukses, tidak ada SIGSEGV. `grep -n "better-sqlite3\|\"pg\"" package.json` → kosong.

- [ ] **Step 2: Manual (dev server, setelah pemilik menjalankan migrasi + seed)**
  - Tanpa login: `/`, `/santri`, `/tambah` → redirect `/login`; `curl -i /api/santri` → 401.
  - `curl -H "apikey: <anon>" "<SUPABASE_URL>/rest/v1/santri?select=id"` → `[]` (RLS).
  - URL berkas lama `…/object/public/berkas/…` → 400/404.
  - Login PANITIA: tambah santri + unggah KK → preview terbuka (signed URL); hapus santri → 403; menu Pengguna tidak ada.
  - Login SUPERADMIN: `/pengguna` undang email → email undangan diterima → set kata sandi → masuk sebagai PANITIA.
  - Link upload mandiri (`/upload-mandiri/<token>`) tetap bekerja tanpa login.
- [ ] **Step 3: Perbarui spec** — di §4.3 spec tambahkan kalimat: "Implementasi: signed URL disematkan saat membaca (`attachSignedUrls`) dan URL dinormalisasi ke path saat menyimpan (`storagePathFromUrl`), sehingga komponen client tidak berubah; endpoint `/api/documents/[id]/url` tersedia untuk refresh." Commit `docs(spec): note signed-url embedding approach`.
- [ ] **Step 4: Laporan ke pemilik** — daftar langkah yang harus dilakukan pemilik: jalankan migrasi, set Redirect URL di Supabase Auth, `npm run seed:admin`, set env di Vercel (`NEXT_PUBLIC_APP_URL`, 3 var Supabase, `GEMINI_API_KEY`), deploy.
