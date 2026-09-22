# Spesifikasi Desain — Fase A: Fondasi & Keamanan

**Tanggal:** 22 September 2026
**Status:** Disetujui (brainstorming selesai)
**Target produksi:** Vercel + Supabase (satu jalur DB, SQLite dihapus)
**Konteks:** Hasil brainstorming 22-09-2026 memetakan 13 peningkatan ke 4 fase (A Fondasi & Keamanan, B Refactor Form, C Fitur Panitia, D Ketahanan). Dokumen ini hanya mencakup Fase A. Fase lain mendapat spec sendiri setelah Fase A selesai.

---

## 1. Masalah yang Diselesaikan

Kondisi saat ini (commit `eb9b9b5`):

1. Tidak ada autentikasi. Role hanya `localStorage` (`components/auth/DemoRoleSwitcher.tsx`); semua route `/api/*` terbuka.
2. RLS Supabase memakai `USING (true)` dan anon key terekspos ke browser → seluruh tabel (NIK, KK, alamat anak) bisa di-query langsung via REST Supabase.
3. Bucket `berkas` public; scan KK/KTP dapat diakses siapa pun yang tahu URL.
4. Dual jalur DB (SQLite ↔ Supabase) di `lib/db/santri-repo.ts`; skema di-patch dengan `ALTER TABLE` try/catch; tidak ada migrasi versi.
5. Test data layer (`tests/db/santri-repo.test.ts`, `tests/e2e/integration.test.ts`) crash SIGSEGV (better-sqlite3 vs Node 26) → sebenarnya tidak berjalan.
6. Validasi server hanya cek field kosong; NIK/NISN/tanggal tidak diverifikasi formatnya. Tidak ada cegah NIK ganda.
7. File sampah ter-commit di repo.

Keputusan yang sudah diambil bersama pemilik proyek:

- Target = Vercel + Supabase. SQLite dihapus total.
- Hanya panitia yang login. Wali santri tetap tanpa akun, memakai link `/upload-mandiri/[token]`.
- Data di Supabase masih data uji coba → skema di-reset total, tidak ada migrasi data lama.

## 2. Ruang Lingkup

**Termasuk:** A1 Auth & otorisasi, A2 RLS + storage private + signed URL + migrasi versi, A3 satu DB + validasi Zod + dedup NIK + perbaikan test, A4 bersih-bersih repo.

**Tidak termasuk (fase berikutnya):** refactor `SantriForm`, dashboard kelengkapan, verifikasi dokumen, export, audit log, PWA. Identitas visual tidak diubah; halaman baru (login, kelola pengguna) mengikuti tema yang ada.

## 3. A1 — Autentikasi & Otorisasi

### 3.1 Mekanisme
- Supabase Auth, metode **email + password**. Tidak ada halaman pendaftaran publik.
- Paket `@supabase/ssr`. Tiga klien:
  - `lib/supabase/client.ts` — browser (anon key, session cookie).
  - `lib/supabase/server.ts` — server components & route handlers (anon key + cookie user → RLS berlaku).
  - `lib/supabase/admin.ts` — service-role, **hanya** untuk: `upload-mandiri` (token wali), `auth.admin.inviteUserByEmail`, skrip seed. Tidak pernah diimpor dari komponen client.
- `proxy.ts` (konvensi Next 16 pengganti middleware) di root: refresh session cookie; jika tidak ada user dan path bukan `/login` atau `/upload-mandiri/*` atau `/api/upload-mandiri` → redirect `/login?next=<path>`. Matcher mengecualikan `_next/static`, `_next/image`, `favicon.ico`, dan aset publik.

### 3.2 Tabel `profiles`
Menggantikan tabel `users` lama.

| kolom | tipe | keterangan |
|---|---|---|
| `id` | uuid PK, FK → `auth.users.id` ON DELETE CASCADE | |
| `nama` | text NOT NULL | |
| `email` | text NOT NULL | salinan untuk tampilan daftar |
| `role` | text NOT NULL CHECK IN ('SUPERADMIN','PANITIA','VIEWER') | |
| `aktif` | boolean NOT NULL DEFAULT true | nonaktif = tidak bisa akses apa pun |
| `createdAt`, `updatedAt` | timestamptz | |

Trigger `on_auth_user_created` membuat baris `profiles` otomatis dari `raw_user_meta_data` (`nama`, `role`) saat user diundang. Default role jika kosong: `VIEWER`.

### 3.3 Helper server `lib/auth/session.ts`
```ts
type SessionUser = { id: string; email: string; nama: string; role: UserRole };
getSessionUser(): Promise<SessionUser | null>        // baca cookie + profiles; null jika tidak login / aktif=false
requireUser(roles?: UserRole[]): Promise<SessionUser> // lempar AuthError(401) / AuthError(403)
```
Setiap route handler membungkus dengan `try { const user = await requireUser([...]) } catch (e) { return authErrorResponse(e) }` → JSON `{ error, code: 'UNAUTHENTICATED' | 'FORBIDDEN' }`.

Matriks hak akses (memakai fungsi di `lib/auth/roles.ts` yang sudah ada):

| Route | Role |
|---|---|
| `GET /api/santri`, `GET /api/santri/[id]` | semua yang login |
| `POST /api/santri`, `PUT/PATCH /api/santri/[id]`, `POST /api/upload`, `POST /api/ocr`, `POST /api/ocr/batch`, `POST /api/upload-token` | `canEditSantri` (SUPERADMIN, PANITIA) |
| `DELETE /api/santri/[id]` | `canDeleteSantri` (SUPERADMIN) |
| `GET /api/documents/[id]/url` | semua yang login |
| `/api/pengguna/*` | `canManageUsers` (SUPERADMIN) |
| `POST /api/upload-mandiri`, `GET /upload-mandiri/[token]` | publik, divalidasi oleh token (tidak berubah) |

### 3.4 UI
- `/login`: form email + password, pesan error inline, tautan "lupa password" (Supabase reset email). Mengikuti tema claymorphism yang ada; tanpa `DemoRoleSwitcher`.
- `/pengguna` (SUPERADMIN): tabel pengguna (nama, email, role, aktif, terakhir login), tombol **Undang** (modal: nama, email, role → `inviteUserByEmail` dengan metadata), ubah role inline, toggle aktif. Tidak bisa menonaktifkan/menurunkan diri sendiri.
- `AppShell`: menu "Pengguna" hanya tampil untuk SUPERADMIN; tombol keluar; nama + role user di sidebar/bottom nav.
- `useAuth()` di `components/auth/AuthProvider.tsx` (menggantikan `DemoRoleSwitcher.tsx`) mendapat `SessionUser` dari server component `app/layout.tsx` via props; API-nya (`role`, `canEdit`, `canDelete`) dipertahankan agar komponen lain tidak berubah.
- Skrip `npm run seed:admin -- --email x --nama y` membuat SUPERADMIN pertama via admin client (idempoten).

## 4. A2 — Keamanan Data

### 4.1 Migrasi versi
- Folder `supabase/migrations/0001_init.sql` berisi seluruh skema (santri, documents, profiles, upload_tokens, fungsi, trigger, policy, bucket). `supabase-setup.sql` dihapus.
- Proyek Supabase produksi (`zmltgsayohzbgdhewkfs`) tidak dapat diakses dari sesi agen; migrasi **diterapkan oleh pemilik proyek** lewat SQL Editor dashboard atau `supabase db push`. Bucket `berkas` juga diubah ke private oleh migrasi (`UPDATE storage.buckets SET public=false`). Agen menyiapkan file dan instruksi di README. Karena reset total: migrasi diawali `DROP TABLE IF EXISTS ... CASCADE` untuk tabel lama dan `DELETE FROM storage.objects WHERE bucket_id='berkas'`.
- Skema `santri` dan `documents` sama dengan `lib/db/schema.sql` sekarang, dengan perubahan: `documents.fileUrl` → `storagePath` (text NOT NULL); `santri.nik` mendapat `UNIQUE`; `santri.fotoFormalUrl`/`fotoProfilUrl` → `fotoFormalPath`/`fotoProfilPath`; kolom waktu memakai `timestamptz DEFAULT now()`.

### 4.2 RLS
Fungsi `public.auth_role()` → `select role from profiles where id = auth.uid() and aktif` (security definer, stable).

| tabel | SELECT | INSERT/UPDATE | DELETE |
|---|---|---|---|
| `santri`, `documents` | `auth_role() IS NOT NULL` | `auth_role() IN ('SUPERADMIN','PANITIA')` | `auth_role() = 'SUPERADMIN'` |
| `profiles` | baris sendiri, atau semua jika SUPERADMIN | SUPERADMIN (UPDATE); INSERT hanya via trigger | SUPERADMIN |
| `upload_tokens` | `auth_role() IN ('SUPERADMIN','PANITIA')` | sama | sama |

Anon: tidak ada policy → nol akses. Jalur wali (`upload-mandiri`) memakai admin client di server setelah token divalidasi.

### 4.3 Storage
- Bucket `berkas` → `public = false`. Policy `storage.objects`: SELECT/INSERT/UPDATE/DELETE untuk `authenticated` dengan `auth_role() IN ('SUPERADMIN','PANITIA')` (SELECT juga untuk VIEWER). Upload wali via admin client.
- Semua route yang sebelumnya `getPublicUrl` menyimpan **path** (`lib/utils/file-naming.ts` tetap menentukan namanya).
- `GET /api/documents/[id]/url` → `createSignedUrl(path, 3600)`; `GET /api/santri/[id]/foto?jenis=formal|profil` untuk foto. Client memakai hook `useSignedUrl(docId)` yang meng-cache hingga 50 menit.
- `DocumentPreviewModal`, `SantriPosterCv`, `SantriCard`, halaman `upload-mandiri` (yang menampilkan berkas sudah terunggah) beralih ke signed URL.
- **Implementasi:** signed URL disematkan saat membaca (`attachSignedUrls` di repo, kolom `fileUrl`/`fotoFormalUrl`/`fotoProfilUrl` tetap ada di respons) dan URL dinormalisasi ke path saat menyimpan (`storagePathFromUrl`), sehingga komponen client besar tidak perlu diubah di fase ini; endpoint `/api/documents/[id]/url` tersedia untuk menyegarkan tautan.

## 5. A3 — Satu DB, Validasi, Test

### 5.1 Satu jalur DB
- Hapus: `better-sqlite3`, `@types/better-sqlite3`, `pg`, `@types/pg`, `lib/db/index.ts`, `lib/db/schema.sql`, `lib/db/seed.ts` (seed dummy), `data/`, `DATABASE_PATH`.
- `lib/db/santri-repo.ts` hanya memakai klien Supabase yang di-inject: fungsi menerima `SupabaseClient` sebagai argumen pertama (server client = RLS user; admin client = jalur wali). Tanda tangan publik (`listSantri`, `getSantriById`, `createSantri`, `updateSantri`, `deleteSantri`, `addDocument`, `createUploadTokenRecord`, `getUploadToken`, …) dipertahankan selain argumen klien.
- `isSupabaseServerConfigured` dihapus; env yang wajib divalidasi saat startup di `lib/env.ts` (lempar error jelas jika kosong).

### 5.2 Validasi Zod
- `lib/validation/santri.ts`: `santriInputSchema` (NIK & noKk `^\d{16}$`, NISN `^\d{10}$` opsional, `tanggalLahir` ISO date & tidak di masa depan, `jenisKelamin`/`jenjang` enum, `kelas` cocok jenjang: SMP 7–9, SMA/SMK 10–12, ALUMNI bebas, `kontakWali` normalisasi ke `62…`), `santriUpdateSchema = partial`, `documentInputSchema`, `inviteUserSchema`.
- API: `safeParse` → 400 `{ error: 'Validasi gagal', fields: { nik: '…' } }`.
- `SantriForm`: memakai schema yang sama untuk error inline sebelum kirim (tanpa refactor struktur form — itu Fase B).

### 5.3 Dedup NIK
- Unique index `santri_nik_key`. `createSantri` menangkap kode `23505` → API 409 `{ error: 'NIK sudah terdaftar', existingId }`. `SantriForm` menampilkan toast dengan tombol "Buka data santri".

### 5.4 Test
- Unit (tetap, tanpa DB): parser, formatters, file-naming, roles, theme, validasi (baru), `session.ts` dengan klien Supabase di-mock.
- Integrasi (`tests/db/*`, `tests/e2e/*`): berjalan hanya jika `SUPABASE_TEST_URL` + `SUPABASE_TEST_SERVICE_ROLE_KEY` diset; jika tidak, `describe.skip` dengan pesan. Setiap test membuat data berprefiks `test-` dan membersihkannya di `afterAll`.
- `.nvmrc` = `22`; `engines.node` = `>=22 <23`. SIGSEGV hilang karena native binding tidak ada lagi.

## 6. A4 — Bersih-bersih Repo
Hapus dari git: `task-3-diff-utf8.txt`, `Masjid Baitul Qowwam UI.dc.html`, `.superpowers/` (tambah ke `.gitignore`), `ind.traineddata`/`eng.traineddata` di root (sudah di-gitignore tetapi masih ada di disk — biarkan di disk, pastikan tidak ter-track), (`lib/ocr/extract_pdf.py` dan `run_ocr.js` **dipertahankan** — masih dipakai `lib/ocr/engine.ts`), `supabase-setup.sql`. Perbarui `package.json` (`name: bq-ku`, `description`), `.env.example` (tambah `NEXT_PUBLIC_APP_URL`, variabel test), dan `README.md` singkat (setup, migrasi, seed admin).

## 7. Penanganan Error
- Auth: 401 → client redirect `/login?next=`; 403 → toast "Tidak punya hak akses". Session kedaluwarsa saat submit form: `SantriForm` sudah menyimpan draft ke `localStorage` (`DRAFT_STORAGE_KEY`), jadi redirect ke `/login?next=` lalu kembali tidak menghilangkan isian.
- Signed URL kedaluwarsa saat modal terbuka: hook mencoba ulang sekali sebelum menampilkan error.
- Undangan gagal (email sudah ada): 409 dengan pesan jelas.
- Env kosong: error saat build/startup dengan nama variabel yang hilang.

## 8. Urutan Implementasi (ringkas, dirinci di plan)
1. Bersih-bersih repo + `.nvmrc` + hapus SQLite (test unit tetap hijau).
2. Migrasi `0001_init.sql` + terapkan ke Supabase + `lib/env.ts`.
3. Klien Supabase ×3 + `santri-repo.ts` satu jalur + test integrasi bersyarat.
4. Zod + dedup NIK di API & form.
5. Auth: `proxy.ts`, `session.ts`, `/login`, `AuthProvider`, proteksi semua route, `seed:admin`.
6. Storage private + signed URL + migrasi komponen tampilan berkas/foto.
7. `/pengguna` + API undang/ubah role/nonaktif.
8. Verifikasi end-to-end di Vercel preview.

## 9. Kriteria Selesai
- Tanpa login: semua halaman selain `/login` & `/upload-mandiri/*` redirect; semua `/api/*` selain `upload-mandiri` balas 401; query REST Supabase dengan anon key balas 0 baris; URL berkas lama tidak dapat diakses.
- Login PANITIA bisa tambah/edit santri & unggah; tidak bisa hapus & tidak lihat menu Pengguna. SUPERADMIN bisa semuanya.
- `npm test` hijau tanpa SIGSEGV; test integrasi hijau saat env test diset.
- `npm run build` sukses tanpa `better-sqlite3`/`pg` di dependency.
