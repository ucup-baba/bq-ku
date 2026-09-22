# Modul Donatur & Surat Ucapan Terima Kasih — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ruang Donatur baru: catat donatur & donasi (uang/barang), buat surat ucapan terima kasih sebagai PNG dari template digital, kirim sebagai gambar lewat WhatsApp, dan rekap donasi — dengan peran & navigasi terpisah dari ruang santri.

**Architecture:** Peran jadi multi-role (`roles text[]`), aplikasi dibagi dua "ruangan" lewat route group Next.js (`app/(santri)`, `app/(donatur)`) dengan layout & navigasi masing-masing; `proxy.ts` menjaga batas ruangan. Surat dirender dari satu komponen `SuratTemplate` — dipakai untuk pratinjau HTML dan untuk PNG A4 via `ImageResponse` (`next/og`), disimpan di bucket privat. Pengiriman WhatsApp memakai Web Share API di HP (gambar terlampir) dan unduh + WhatsApp Web di desktop.

**Tech Stack:** Next.js 16 (App Router, route groups, `next/og`), React 19, TypeScript, Supabase (Postgres + Storage + RLS), Zod 4, Tailwind 3, Phosphor Icons, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-09-22-modul-donatur-design.md`

## Global Constraints

- Baca `node_modules/next/dist/docs/` sebelum memakai API Next yang belum pasti (AGENTS.md). `proxy.ts` (bukan `middleware.ts`); `cookies()`, `params`, `searchParams` adalah Promise.
- Node 22 (`.nvmrc`). Jangan menambah dependency native; tidak boleh puppeteer/playwright untuk render.
- Semua teks UI berbahasa Indonesia. Ikon hanya `@phosphor-icons/react` (`weight="duotone"`/`"bold"`), tanpa emoji. Gaya claymorphism seperti ruang santri; **ruang donatur beraksen biru-hijau logo yayasan** (`#0B5FA5` biru, `#0E9F54` hijau) agar beda dari teal ruang santri.
- Target sentuh minimal 44×44 px; tabel lebar → kartu di mobile; setiap kontrol ikon punya `aria-label`.
- Semua route `/api/*` memakai `requireUser([...])` + klien ber-RLS (`supabase` dari `requireUser`), kecuali jalur publik yang sudah ada. Service-role hanya di `lib/supabase/admin.ts`.
- Nama kolom Postgres camelCase dikutip ganda (`"donaturId"`), mengikuti skema yang ada.
- Nominal disimpan sebagai **bigint rupiah penuh** (bukan sen). Nomor WA dinormalisasi ke `62…` dengan `normalizeWa()` dari `lib/validation/santri.ts`.
- Bucket berkas: `process.env.SUPABASE_STORAGE_BUCKET || 'berkas'`; signed URL 3600 detik (`SIGNED_URL_TTL`).
- Commit kecil per task, pesan `type(scope): ...`, diakhiri `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Migrasi SQL **dijalankan pemilik** di Supabase SQL Editor (agen tidak punya akses). Setiap task yang butuh migrasi berhenti dan meminta konfirmasi bahwa migrasi sudah dijalankan.

---

## File Structure

| Path | Tanggung jawab |
|---|---|
| `supabase/migrations/0003_multi_role.sql` | `roles text[]`, `auth_roles()`, `has_role()`, policy memakai fungsi baru |
| `supabase/migrations/0004_donatur.sql` | Tabel `donatur`, `donasi`, `surat`, `nomor_surat_counter` + RLS |
| `lib/auth/roles.ts` | Tipe `UserRole`, `Room`, helper izin berbasis array, `roomsFor()`, label |
| `lib/auth/session.ts` | `SessionUser.roles`, `requireUser(roles?)`, `requireRoom(room)` |
| `lib/auth/rooms.ts` | Konstanta ruangan, `roomOfPath()`, `homeOfRoom()`, cookie `bq_room` |
| `proxy.ts` | Penjaga login + penjaga ruangan |
| `app/(santri)/…` | Halaman ruang santri (pindahan dari `app/…`) + layout ruang santri |
| `app/(donatur)/donatur/…` | Halaman ruang donatur + layoutnya |
| `components/layout/RoomSwitchButton.tsx` | Tombol pindah ruangan (HP menggantikan tombol tema) |
| `components/layout/DonaturSidebar.tsx`, `DonaturBottomNav.tsx` | Navigasi ruang donatur |
| `lib/utils/terbilang.ts` | `terbilang(n)`, `formatRupiah(n)` |
| `lib/utils/nomor-surat.ts` | `bulanRomawi()`, `formatNomorSurat()`, `parseNomorSurat()` |
| `lib/validation/donatur.ts` | Skema Zod donatur, donasi, surat |
| `lib/db/donatur-repo.ts` | CRUD donatur/donasi/surat + rekap + counter nomor |
| `components/donatur/SuratTemplate.tsx` | Tata letak surat (dipakai pratinjau **dan** PNG) |
| `app/api/donatur/**` | Endpoint donatur, donasi, surat, nomor, rekap |
| `components/donatur/*` | Form surat, daftar, detail donatur, rekap, tombol kirim WA |
| `public/fonts/*.ttf` | Font untuk `ImageResponse` (Plus Jakarta Sans 400/700, Noto Naskh Arabic 400) |
| `public/brand/*` | `logo.webp`, `stempel.webp`, `ttd.png` (sudah ada) |

---

### Task 1: Migrasi multi-role di database

**Files:**
- Create: `supabase/migrations/0003_multi_role.sql`

**Interfaces:**
- Produces: kolom `profiles.roles text[]`, `allowed_emails.roles text[]`; fungsi `public.auth_roles() → text[]`, `public.has_role(text) → boolean`; nilai peran `SUPERADMIN | ADMIN_SANTRI | ADMIN_DONATUR | VIEWER`.

- [ ] **Step 1: Tulis migrasi**

```sql
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
```

- [ ] **Step 2: Minta pemilik menjalankan migrasi**

Tampilkan pesan: "Jalankan `supabase/migrations/0003_multi_role.sql` di Supabase → SQL Editor, lalu balas 'sudah'." **Berhenti** sampai dikonfirmasi.

- [ ] **Step 3: Verifikasi**

Run:
```bash
node --env-file=.env.local -e "
const {createClient}=require('@supabase/supabase-js');
const c=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
c.from('profiles').select('email,role,roles').then(r=>console.log(r.error||r.data));
"
```
Expected: setiap baris punya `roles` array (mis. `['SUPERADMIN']`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0003_multi_role.sql
git commit -m "feat(db): multi-role columns, has_role() and ADMIN_SANTRI policies

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Helper peran & ruangan di aplikasi

**Files:**
- Modify: `lib/auth/roles.ts`, `lib/auth/session.ts`, `components/auth/AuthProvider.tsx`, `components/layout/AccountDrawer.tsx`, `components/auth/UserMenu.tsx`, `components/pengguna/PenggunaTable.tsx` (tipe saja), `app/pengguna/page.tsx`
- Create: `lib/auth/rooms.ts`
- Test: `tests/auth/roles.test.ts` (ganti isi), `tests/auth/rooms.test.ts`

**Interfaces:**
- Produces:
  - `type UserRole = 'SUPERADMIN' | 'ADMIN_SANTRI' | 'ADMIN_DONATUR' | 'VIEWER'`
  - `canEditSantri(roles: UserRole[]): boolean`, `canDeleteSantri`, `canVerifyDocuments`, `canManageUsers`, `canManageDonatur`, `getRoleLabel(role: UserRole): string`
  - `type Room = 'santri' | 'donatur'`; `roomsFor(roles: UserRole[]): Room[]`; `ROOM_HOME: Record<Room,string>`; `roomOfPath(pathname: string): Room`; `ROOM_COOKIE = 'bq_room'`
  - `SessionUser = { id, email, nama, roles: UserRole[] }`; `requireUser(roles?: UserRole[])` lolos bila user punya **salah satu** peran itu.

- [ ] **Step 1: Tulis test peran (gagal dulu)** — `tests/auth/roles.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { canEditSantri, canDeleteSantri, canManageUsers, canManageDonatur, getRoleLabel } from '@/lib/auth/roles';

describe('izin berbasis banyak peran', () => {
  it('ADMIN_SANTRI boleh mengubah santri, tidak boleh menghapus', () => {
    expect(canEditSantri(['ADMIN_SANTRI'])).toBe(true);
    expect(canDeleteSantri(['ADMIN_SANTRI'])).toBe(false);
  });
  it('ADMIN_DONATUR tidak menyentuh santri', () => {
    expect(canEditSantri(['ADMIN_DONATUR'])).toBe(false);
    expect(canManageDonatur(['ADMIN_DONATUR'])).toBe(true);
  });
  it('SUPERADMIN boleh semuanya', () => {
    expect(canDeleteSantri(['SUPERADMIN'])).toBe(true);
    expect(canManageUsers(['SUPERADMIN'])).toBe(true);
    expect(canManageDonatur(['SUPERADMIN'])).toBe(true);
  });
  it('peran ganda menggabungkan izin', () => {
    expect(canEditSantri(['ADMIN_SANTRI', 'ADMIN_DONATUR'])).toBe(true);
    expect(canManageDonatur(['ADMIN_SANTRI', 'ADMIN_DONATUR'])).toBe(true);
  });
  it('label peran berbahasa Indonesia', () => {
    expect(getRoleLabel('ADMIN_DONATUR')).toMatch(/Donatur/i);
  });
});
```

- [ ] **Step 2: Tulis test ruangan** — `tests/auth/rooms.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { roomsFor, roomOfPath, ROOM_HOME } from '@/lib/auth/rooms';

describe('ruangan', () => {
  it('memetakan peran ke ruangan', () => {
    expect(roomsFor(['ADMIN_SANTRI'])).toEqual(['santri']);
    expect(roomsFor(['ADMIN_DONATUR'])).toEqual(['donatur']);
    expect(roomsFor(['SUPERADMIN'])).toEqual(['santri', 'donatur']);
    expect(roomsFor(['ADMIN_SANTRI', 'ADMIN_DONATUR'])).toEqual(['santri', 'donatur']);
    expect(roomsFor(['VIEWER'])).toEqual(['santri']);
  });
  it('menentukan ruangan dari path', () => {
    expect(roomOfPath('/donatur')).toBe('donatur');
    expect(roomOfPath('/donatur/surat/baru')).toBe('donatur');
    expect(roomOfPath('/api/donatur/surat')).toBe('donatur');
    expect(roomOfPath('/santri')).toBe('santri');
    expect(roomOfPath('/')).toBe('santri');
  });
  it('punya beranda tiap ruangan', () => {
    expect(ROOM_HOME.santri).toBe('/');
    expect(ROOM_HOME.donatur).toBe('/donatur');
  });
});
```

Run: `npx vitest run tests/auth` → FAIL.

- [ ] **Step 3: Tulis `lib/auth/roles.ts`**

```ts
export type UserRole = 'SUPERADMIN' | 'ADMIN_SANTRI' | 'ADMIN_DONATUR' | 'VIEWER';

export interface UserSession {
  id: string;
  username: string;
  nama: string;
  roles: UserRole[];
}

const has = (roles: UserRole[], ...wanted: UserRole[]) => roles.some(r => wanted.includes(r));

export function canEditSantri(roles: UserRole[]): boolean { return has(roles, 'SUPERADMIN', 'ADMIN_SANTRI'); }
export function canDeleteSantri(roles: UserRole[]): boolean { return has(roles, 'SUPERADMIN'); }
export function canVerifyDocuments(roles: UserRole[]): boolean { return has(roles, 'SUPERADMIN', 'ADMIN_SANTRI'); }
export function canManageUsers(roles: UserRole[]): boolean { return has(roles, 'SUPERADMIN'); }
export function canManageDonatur(roles: UserRole[]): boolean { return has(roles, 'SUPERADMIN', 'ADMIN_DONATUR'); }

export const ALL_ROLES: UserRole[] = ['SUPERADMIN', 'ADMIN_SANTRI', 'ADMIN_DONATUR', 'VIEWER'];

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'SUPERADMIN': return 'Superadmin (Penuh)';
    case 'ADMIN_SANTRI': return 'Admin Santri';
    case 'ADMIN_DONATUR': return 'Admin Donatur';
    case 'VIEWER': return 'Viewer / Wali Santri';
    default: return role;
  }
}
```

- [ ] **Step 4: Tulis `lib/auth/rooms.ts`**

```ts
import type { UserRole } from './roles';

export type Room = 'santri' | 'donatur';

export const ROOM_COOKIE = 'bq_room';
export const ROOM_HOME: Record<Room, string> = { santri: '/', donatur: '/donatur' };
export const ROOM_LABEL: Record<Room, string> = { santri: 'Ruang Santri', donatur: 'Ruang Donatur' };

export function roomsFor(roles: UserRole[]): Room[] {
  const out: Room[] = [];
  if (roles.some(r => r === 'SUPERADMIN' || r === 'ADMIN_SANTRI' || r === 'VIEWER')) out.push('santri');
  if (roles.some(r => r === 'SUPERADMIN' || r === 'ADMIN_DONATUR')) out.push('donatur');
  return out;
}

/** Ruangan yang dituju sebuah path. Default: santri. */
export function roomOfPath(pathname: string): Room {
  return pathname === '/donatur' || pathname.startsWith('/donatur/') || pathname.startsWith('/api/donatur')
    ? 'donatur'
    : 'santri';
}
```

- [ ] **Step 5: Perbarui `lib/auth/session.ts`**

Ganti `role: UserRole` menjadi `roles: UserRole[]`:
```ts
export type SessionUser = { id: string; email: string; nama: string; roles: UserRole[] };
```
Di `getSessionUserWith`: `select('nama, roles, aktif')`, kembalikan `roles: (profile.roles ?? []) as UserRole[]`.
Di `requireUser(roles?)`: `if (roles && !roles.some(r => user.roles.includes(r))) throw new AuthError(403, …)`.
Tambahkan:
```ts
import { roomsFor, type Room } from '@/lib/auth/rooms';

/** Menjamin user berhak atas ruangan tertentu. */
export async function requireRoom(room: Room): Promise<{ user: SessionUser; supabase: SupabaseClient }> {
  const ctx = await requireUser();
  if (!roomsFor(ctx.user.roles).includes(room)) {
    throw new AuthError(403, 'FORBIDDEN', 'Anda tidak memiliki akses ke ruangan ini');
  }
  return ctx;
}
```

- [ ] **Step 6: Sesuaikan pemakai `role`**

`components/auth/AuthProvider.tsx`: context jadi `{ user, roles, canEdit, canDelete, canManageUsers, canManageDonatur, rooms, logout }` (`roles = user?.roles ?? []`, `rooms = roomsFor(roles)`), semua helper dipanggil dengan `roles`.
`AccountDrawer.tsx` & `UserMenu.tsx`: ganti `role` → `roles`, tampilkan semua label dipisah "·" (`roles.map(getRoleLabel).join(' · ')`).
`app/pengguna/page.tsx`: `canManageUsers(user.roles)`.
`components/pengguna/PenggunaTable.tsx`: tipe `Row.role: UserRole` → `roles: UserRole[]` (UI multi-peran menyusul di Task 5; sementara tampilkan `roles.map(getRoleLabel).join(', ')` dan sembunyikan `<select>`).
`app/api/pengguna/route.ts` & `[id]/route.ts`: `select('*')` sudah membawa `roles`; ganti `requireUser(['SUPERADMIN'])` tetap; pada PATCH terima `roles` (validasi menyusul di Task 5) — untuk sementara teruskan `role` lama agar kompilasi tetap jalan.

- [ ] **Step 7: Jalankan test**

Run: `npx vitest run && npx tsc --noEmit -p .`
Expected: semua PASS, 0 error TS.

- [ ] **Step 8: Commit**

```bash
git add lib/auth components/auth components/layout components/pengguna app/pengguna app/api/pengguna tests/auth
git commit -m "refactor(auth): multi-role model and room helpers

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Penjaga ruangan di proxy & pengalihan setelah login

**Files:**
- Modify: `proxy.ts`, `app/auth/callback/route.ts`, `components/auth/LoginForm.tsx`
- Test: `tests/auth/rooms.test.ts` (tambah kasus)

**Interfaces:**
- Consumes: `roomsFor`, `roomOfPath`, `ROOM_HOME`, `ROOM_COOKIE` (Task 2).
- Produces: cookie `bq_room` berisi ruangan terakhir; proxy mengalihkan akses lintas ruangan.

- [ ] **Step 1: Tambah test pemilihan ruangan tujuan**

Tambahkan di `tests/auth/rooms.test.ts`:
```ts
import { resolveLandingPath } from '@/lib/auth/rooms';

describe('resolveLandingPath', () => {
  it('mengarahkan ke satu-satunya ruangan yang dimiliki', () => {
    expect(resolveLandingPath(['ADMIN_DONATUR'], null)).toBe('/donatur');
    expect(resolveLandingPath(['ADMIN_SANTRI'], null)).toBe('/');
  });
  it('menghormati ruangan terakhir bila punya dua', () => {
    expect(resolveLandingPath(['SUPERADMIN'], 'donatur')).toBe('/donatur');
    expect(resolveLandingPath(['SUPERADMIN'], null)).toBe('/');
  });
  it('mengabaikan cookie yang tidak berhak', () => {
    expect(resolveLandingPath(['ADMIN_SANTRI'], 'donatur')).toBe('/');
  });
  it('null bila tidak punya ruangan', () => {
    expect(resolveLandingPath([], null)).toBeNull();
  });
});
```
Run: `npx vitest run tests/auth/rooms.test.ts` → FAIL.

- [ ] **Step 2: Tambah `resolveLandingPath` di `lib/auth/rooms.ts`**

```ts
export function resolveLandingPath(roles: UserRole[], lastRoom: string | null): string | null {
  const rooms = roomsFor(roles);
  if (rooms.length === 0) return null;
  const last = lastRoom as Room | null;
  if (last && rooms.includes(last)) return ROOM_HOME[last];
  return ROOM_HOME[rooms[0]];
}
```
Run: `npx vitest run tests/auth/rooms.test.ts` → PASS.

- [ ] **Step 3: Penjaga ruangan di `proxy.ts`**

Setelah blok "belum login", tambahkan (memakai anon client yang sudah dibuat):
```ts
  if (user && !isPublicPath(pathname)) {
    const { data: profile } = await supabase
      .from('profiles').select('roles, aktif').eq('id', user.id).maybeSingle();
    const roles = (profile?.aktif ? profile.roles : []) as UserRole[] | undefined ?? [];
    const rooms = roomsFor(roles);
    const target = roomOfPath(pathname);

    if (roles.length > 0 && !rooms.includes(target)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses ke ruangan ini', code: 'FORBIDDEN' },
          { status: 403 },
        );
      }
      const url = request.nextUrl.clone();
      url.pathname = ROOM_HOME[rooms[0] ?? 'santri'];
      url.search = '';
      return NextResponse.redirect(url);
    }
    if (rooms.includes(target)) response.cookies.set(ROOM_COOKIE, target, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' });
  }
```
Import yang dibutuhkan: `import { roomsFor, roomOfPath, ROOM_HOME, ROOM_COOKIE } from '@/lib/auth/rooms'; import type { UserRole } from '@/lib/auth/roles';`

- [ ] **Step 4: Pengalihan setelah login di `app/auth/callback/route.ts`**

Setelah `exchangeCodeForSession` sukses dan sebelum redirect:
```ts
      const { data: { user: authUser } } = await supabase.auth.getUser();
      let dest = next.startsWith('/') ? next : '/';
      if (dest === '/' && authUser) {
        const { data: profile } = await supabase.from('profiles').select('roles, aktif').eq('id', authUser.id).maybeSingle();
        const roles = (profile?.aktif ? profile.roles : []) as UserRole[] ?? [];
        dest = resolveLandingPath(roles, req.cookies.get(ROOM_COOKIE)?.value ?? null) ?? '/';
      }
      const res = NextResponse.redirect(`${origin}${dest}`);
```
Import `resolveLandingPath`, `ROOM_COOKIE`, `UserRole`.

- [ ] **Step 5: Verifikasi manual**

Jalankan `npm run dev`. Dengan akun SUPERADMIN: buka `/donatur` (belum ada halaman → 404, itu wajar di task ini); pastikan **tidak** ter-redirect ke `/`. Ubah sementara `roles` akun di Supabase jadi `{ADMIN_SANTRI}` lalu buka `/donatur` → harus redirect ke `/`; kembalikan ke `{SUPERADMIN}` setelah uji.

- [ ] **Step 6: Commit**

```bash
git add proxy.ts app/auth/callback/route.ts lib/auth/rooms.ts tests/auth
git commit -m "feat(auth): room guard in proxy and post-login landing per room

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Route group dua ruangan + navigasi & tombol pindah ruang

**Files:**
- Move: `app/page.tsx`, `app/santri/**`, `app/tambah/**`, `app/pengguna/**` → `app/(santri)/…` (URL tidak berubah)
- Create: `app/(santri)/layout.tsx`, `app/(donatur)/layout.tsx`, `app/(donatur)/donatur/page.tsx` (sementara), `components/layout/RoomSwitchButton.tsx`, `components/layout/DonaturSidebar.tsx`, `components/layout/DonaturBottomNav.tsx`
- Modify: `app/layout.tsx`, `components/layout/AppShell.tsx`, `components/layout/MobileBottomNav.tsx`, `components/layout/DesktopSidebar.tsx`

**Interfaces:**
- Consumes: `roomsFor`, `ROOM_HOME`, `ROOM_LABEL`, `SessionUser.roles`.
- Produces: `<RoomSwitchButton variant="nav" | "sidebar" />` (render null bila hanya satu ruangan); `AppShell` menerima `room: Room`.

- [ ] **Step 1: Pindahkan halaman ruang santri ke route group**

```bash
mkdir -p "app/(santri)"
git mv app/page.tsx "app/(santri)/page.tsx"
git mv app/santri "app/(santri)/santri"
git mv app/tambah "app/(santri)/tambah"
git mv app/pengguna "app/(santri)/pengguna"
```
Route group tidak mengubah URL (`/`, `/santri`, `/tambah`, `/pengguna` tetap sama).

- [ ] **Step 2: `app/layout.tsx` hanya menyiapkan html/body & provider**

Hapus `AppShell` dari root layout; sisakan:
```tsx
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, pending } = await getSessionState();
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} ${caveat.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider>
          <AuthProvider user={user}>
            {pending ? <PendingGate email={pending.email} /> : children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```
Buat `components/auth/PendingGate.tsx` (client) yang membungkus `AkunBelumAktif` dengan `logout` dari `useAuth()` — memindahkan logika yang tadinya di `AppShell`.

- [ ] **Step 3: Layout ruang santri** — `app/(santri)/layout.tsx`

```tsx
import { AppShell } from '@/components/layout/AppShell';

export default function SantriRoomLayout({ children }: { children: React.ReactNode }) {
  return <AppShell room="santri">{children}</AppShell>;
}
```

- [ ] **Step 4: Layout ruang donatur** — `app/(donatur)/layout.tsx`

```tsx
import { AppShell } from '@/components/layout/AppShell';

export default function DonaturRoomLayout({ children }: { children: React.ReactNode }) {
  return <AppShell room="donatur">{children}</AppShell>;
}
```

- [ ] **Step 5: `AppShell` memilih navigasi sesuai ruangan**

```tsx
'use client';
import React from 'react';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { DonaturSidebar } from './DonaturSidebar';
import { DonaturBottomNav } from './DonaturBottomNav';
import { useAuth } from '@/components/auth/AuthProvider';
import type { Room } from '@/lib/auth/rooms';

export function AppShell({ room, children }: { room: Room; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950">{children}</div>;
  const Sidebar = room === 'donatur' ? DonaturSidebar : DesktopSidebar;
  const BottomNav = room === 'donatur' ? DonaturBottomNav : MobileBottomNav;
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-28 md:pb-12 pt-4 md:pt-8 px-4 sm:px-8 max-w-7xl mx-auto w-full">{children}</main>
      <BottomNav />
    </div>
  );
}
```
(`AuthProvider` kini di root layout, jadi `AppShell` tidak lagi membungkusnya.)

- [ ] **Step 6: `components/layout/RoomSwitchButton.tsx`**

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowsLeftRight, HandHeart, Users } from '@phosphor-icons/react';
import { useAuth } from '@/components/auth/AuthProvider';
import { ROOM_HOME, ROOM_LABEL, roomOfPath, type Room } from '@/lib/auth/rooms';

export function RoomSwitchButton({ variant }: { variant: 'nav' | 'sidebar' }) {
  const { rooms } = useAuth();
  const pathname = usePathname();
  if (rooms.length < 2) return null;

  const current: Room = roomOfPath(pathname);
  const target: Room = current === 'santri' ? 'donatur' : 'santri';
  const Icon = target === 'donatur' ? HandHeart : Users;
  const label = ROOM_LABEL[target];

  if (variant === 'nav') {
    return (
      <Link href={ROOM_HOME[target]} aria-label={`Pindah ke ${label}`}
        className="flex flex-col items-center gap-1 p-1.5 min-w-[44px] text-slate-500 dark:text-slate-400 hover:text-teal-600">
        <Icon size={22} weight="duotone" />
        <span className="text-[10px] font-bold">Pindah</span>
      </Link>
    );
  }
  return (
    <Link href={ROOM_HOME[target]} aria-label={`Pindah ke ${label}`}
      className="flex items-center gap-2 h-11 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800">
      <ArrowsLeftRight size={18} weight="bold" /> {label}
    </Link>
  );
}
```

- [ ] **Step 7: Bottom nav ruang santri — tombol tema diganti tombol pindah**

Di `MobileBottomNav.tsx`: hapus tombol Sun/Moon beserta `useTheme`, sisipkan `<RoomSwitchButton variant="nav" />` di posisinya (toggle tema sudah tersedia di `AccountDrawer`). Bila pengguna hanya punya satu ruangan, komponen mengembalikan `null` sehingga bar berisi 4 item — tambahkan `justify-around` tetap rapi.

- [ ] **Step 8: Navigasi ruang donatur**

`DonaturBottomNav.tsx` — item: Beranda (`/donatur`, `House`), Donatur (`/donatur/daftar`, `HandHeart`), tombol bulat **+ Surat** (`/donatur/surat/baru`, `Plus`, gradien `from-[#0B5FA5] to-[#0E9F54]`), Rekap (`/donatur/rekap`, `ChartBar`), lalu `<RoomSwitchButton variant="nav" />`, dan avatar pembuka `AccountDrawer` (pakai pola yang sama dengan `MobileBottomNav`).

`DonaturSidebar.tsx` — salin struktur `DesktopSidebar` dengan judul "Ruang Donatur", aksen biru-hijau, menu: Beranda, Daftar Donatur, Buat Surat, Daftar Surat (`/donatur/surat`), Rekap; footer: `<RoomSwitchButton variant="sidebar" />`, `<UserMenu />`, `<ThemeToggle />`.

- [ ] **Step 9: Halaman sementara** — `app/(donatur)/donatur/page.tsx`

```tsx
export const metadata = { title: 'Ruang Donatur — BQ-ku' };

export default function DonaturHomePage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-extrabold">Ruang Donatur</h1>
      <p className="text-sm text-slate-500">Ringkasan donasi akan tampil di sini.</p>
    </div>
  );
}
```

- [ ] **Step 10: Verifikasi**

Run: `npx tsc --noEmit -p . && npx vitest run && npm run build`
Lalu `npm run dev`: sebagai SUPERADMIN, `/` menampilkan nav santri; klik "Pindah" → `/donatur` dengan nav donatur; di HP (viewport 375) tombol tema sudah tidak ada di bar, tema tetap bisa diubah dari drawer akun.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(rooms): split app into santri and donatur route groups with room switcher

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Kelola pengguna multi-peran

**Files:**
- Modify: `lib/validation/pengguna.ts`, `app/api/pengguna/route.ts`, `app/api/pengguna/[id]/route.ts`, `components/pengguna/PenggunaTable.tsx`, `components/pengguna/UndangPenggunaModal.tsx`
- Test: `tests/validation/pengguna.test.ts`

**Interfaces:**
- Produces: `invitePenggunaSchema` (`{ nama, email, roles: UserRole[] }`), `updatePenggunaSchema` (`{ roles?, aktif? }`); API menerima & mengembalikan `roles: UserRole[]`.

- [ ] **Step 1: Perbarui test validasi**

Ganti isi `tests/validation/pengguna.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { invitePenggunaSchema, updatePenggunaSchema } from '@/lib/validation/pengguna';

describe('skema pengguna', () => {
  it('menormalisasi email dan menerima banyak peran', () => {
    const r = invitePenggunaSchema.safeParse({ nama: 'Ani', email: ' Ani@X.ID ', roles: ['ADMIN_SANTRI', 'ADMIN_DONATUR'] });
    expect(r.success).toBe(true);
    if (r.success) { expect(r.data.email).toBe('ani@x.id'); expect(r.data.roles).toHaveLength(2); }
  });
  it('menolak peran tidak dikenal', () => {
    expect(invitePenggunaSchema.safeParse({ nama: 'A', email: 'a@b.c', roles: ['BOS'] }).success).toBe(false);
  });
  it('menolak daftar peran kosong', () => {
    expect(invitePenggunaSchema.safeParse({ nama: 'A', email: 'a@b.c', roles: [] }).success).toBe(false);
  });
  it('membuang peran ganda', () => {
    const r = invitePenggunaSchema.safeParse({ nama: 'A', email: 'a@b.c', roles: ['VIEWER', 'VIEWER'] });
    expect(r.success && r.data.roles).toEqual(['VIEWER']);
  });
  it('update kosong ditolak', () => {
    expect(updatePenggunaSchema.safeParse({}).success).toBe(false);
  });
});
```
Run → FAIL.

- [ ] **Step 2: Tulis `lib/validation/pengguna.ts`**

```ts
import { z } from 'zod';

export const roleEnum = z.enum(['SUPERADMIN', 'ADMIN_SANTRI', 'ADMIN_DONATUR', 'VIEWER']);

const rolesArray = z.array(roleEnum).min(1, 'Pilih minimal satu peran')
  .transform(list => Array.from(new Set(list)));

export const invitePenggunaSchema = z.object({
  nama: z.string().trim().min(2, 'Nama minimal 2 huruf'),
  email: z.string().trim().toLowerCase().email('Email tidak valid'),
  roles: rolesArray,
});

export const updatePenggunaSchema = z.object({
  roles: rolesArray.optional(),
  aktif: z.boolean().optional(),
}).refine(d => d.roles !== undefined || d.aktif !== undefined, 'Tidak ada perubahan');
```
Run → PASS.

- [ ] **Step 3: API pengguna**

`POST /api/pengguna`: `upsert({ email, nama, roles, role: roles[0] })` ke `allowed_emails`.
`PATCH /api/pengguna/[id]`:
- entri `allowed:<email>` → `update({ roles, role: roles[0] })`, hapus bila `aktif === false`;
- profil → `patch.roles = roles; patch.role = roles[0]`; larangan menurunkan/menonaktifkan diri sendiri jadi: `if (id === user.id && (aktif === false || (roles && !roles.includes('SUPERADMIN'))))` → 400;
- sinkronisasi `allowed_emails` memakai `roles`.
`GET /api/pengguna`: baris menyertakan `roles` (dari `profiles`/`allowed_emails`).

- [ ] **Step 4: UI multi-peran**

`UndangPenggunaModal.tsx`: ganti `<select>` peran dengan daftar checkbox (Admin Santri, Admin Donatur, Viewer, Superadmin), state `roles: UserRole[]`, default `['ADMIN_SANTRI']`; validasi minimal satu.
`PenggunaTable.tsx`: kolom Peran menampilkan lencana per peran + tombol "Ubah" yang membuka popover berisi checkbox yang sama; simpan → `PATCH { roles }`. Baris milik sendiri tetap `disabled`. Tambahkan filter ruangan (Semua / Ruang Santri / Ruang Donatur) memakai `roomsFor(row.roles)`.

- [ ] **Step 5: Verifikasi**

Run: `npx vitest run && npx tsc --noEmit -p .`
Dev: sebagai SUPERADMIN buka `/pengguna`, undang email dengan dua peran, pastikan lencana muncul dan filter ruangan bekerja.

- [ ] **Step 6: Commit**

```bash
git add lib/validation/pengguna.ts app/api/pengguna components/pengguna tests/validation/pengguna.test.ts
git commit -m "feat(pengguna): multi-role invite, edit and room filter

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Migrasi tabel donatur, donasi, surat

**Files:**
- Create: `supabase/migrations/0004_donatur.sql`

**Interfaces:**
- Produces: tabel `donatur`, `donasi`, `surat`, `nomor_surat_counter` + RLS (akses hanya `SUPERADMIN`/`ADMIN_DONATUR`).

- [ ] **Step 1: Tulis migrasi**

```sql
-- 0004_donatur.sql — Ruang Donatur: donatur, donasi, surat ucapan terima kasih.

create table if not exists public.donatur (
  id text primary key,
  nama text not null,
  sapaan text not null default 'BAPAK' check (sapaan in ('BAPAK','IBU','SDR','SDRI','BAPAK_IBU')),
  "noWa" text,
  alamat text,
  catatan text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists donatur_nama_idx on public.donatur (lower(nama));

create table if not exists public.donasi (
  id text primary key,
  "donaturId" text not null references public.donatur(id) on delete cascade,
  tanggal date not null,
  jenis text not null check (jenis in ('ZAKAT','INFAQ','SHADAQAH','LAINNYA')),
  bentuk text not null check (bentuk in ('UANG','BARANG')),
  nominal bigint,
  "deskripsiBarang" text,
  keterangan text,
  "createdAt" timestamptz not null default now(),
  "createdBy" uuid references public.profiles(id),
  constraint donasi_bentuk_isi check (
    (bentuk = 'UANG' and nominal is not null and nominal > 0 and "deskripsiBarang" is null)
    or (bentuk = 'BARANG' and "deskripsiBarang" is not null and nominal is null)
  )
);
create index if not exists donasi_tanggal_idx on public.donasi (tanggal desc);
create index if not exists donasi_donatur_idx on public.donasi ("donaturId");

create table if not exists public.surat (
  id text primary key,
  "donasiId" text not null references public.donasi(id) on delete cascade,
  "nomorSurat" text not null unique,
  "tanggalSurat" date not null,
  "storagePath" text,
  "terkirimWa" boolean not null default false,
  "dikirimAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "createdBy" uuid references public.profiles(id)
);
create index if not exists surat_tanggal_idx on public.surat ("tanggalSurat" desc);

create table if not exists public.nomor_surat_counter (
  tahun int not null,
  bulan int not null,
  "urutanTerakhir" int not null default 0,
  primary key (tahun, bulan)
);

alter table public.donatur enable row level security;
alter table public.donasi enable row level security;
alter table public.surat enable row level security;
alter table public.nomor_surat_counter enable row level security;

do $$
declare t text;
begin
  foreach t in array array['donatur','donasi','surat','nomor_surat_counter'] loop
    execute format('create policy "%1$s: baca" on public.%1$I for select to authenticated using (public.has_role(''SUPERADMIN'') or public.has_role(''ADMIN_DONATUR''))', t);
    execute format('create policy "%1$s: tulis" on public.%1$I for insert to authenticated with check (public.has_role(''SUPERADMIN'') or public.has_role(''ADMIN_DONATUR''))', t);
    execute format('create policy "%1$s: ubah" on public.%1$I for update to authenticated using (public.has_role(''SUPERADMIN'') or public.has_role(''ADMIN_DONATUR'')) with check (public.has_role(''SUPERADMIN'') or public.has_role(''ADMIN_DONATUR''))', t);
    execute format('create policy "%1$s: hapus" on public.%1$I for delete to authenticated using (public.has_role(''SUPERADMIN''))', t);
  end loop;
end $$;

-- Nomor surat berikutnya, aman dari balapan (dipanggil lewat RPC).
create or replace function public.next_nomor_surat(p_tahun int, p_bulan int)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if not (public.has_role('SUPERADMIN') or public.has_role('ADMIN_DONATUR')) then
    raise exception 'Tidak berhak';
  end if;
  insert into public.nomor_surat_counter (tahun, bulan, "urutanTerakhir")
  values (p_tahun, p_bulan, 1)
  on conflict (tahun, bulan) do update set "urutanTerakhir" = public.nomor_surat_counter."urutanTerakhir" + 1
  returning "urutanTerakhir" into v;
  return v;
end $$;
grant execute on function public.next_nomor_surat(int, int) to authenticated;

-- Menaikkan counter bila panitia memakai nomor manual yang lebih besar.
create or replace function public.bump_nomor_surat(p_tahun int, p_bulan int, p_urut int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.has_role('SUPERADMIN') or public.has_role('ADMIN_DONATUR')) then
    raise exception 'Tidak berhak';
  end if;
  insert into public.nomor_surat_counter (tahun, bulan, "urutanTerakhir")
  values (p_tahun, p_bulan, p_urut)
  on conflict (tahun, bulan) do update
    set "urutanTerakhir" = greatest(public.nomor_surat_counter."urutanTerakhir", p_urut);
end $$;
grant execute on function public.bump_nomor_surat(int, int, int) to authenticated;
```

- [ ] **Step 2: Minta pemilik menjalankan migrasi**

Tampilkan instruksi menjalankan `supabase/migrations/0004_donatur.sql` di SQL Editor. **Berhenti** sampai dikonfirmasi.

- [ ] **Step 3: Verifikasi**

Run:
```bash
node --env-file=.env.local -e "
const {createClient}=require('@supabase/supabase-js');
const c=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
Promise.all(['donatur','donasi','surat','nomor_surat_counter'].map(t=>c.from(t).select('*').limit(1).then(r=>[t,r.error?r.error.message:'ok'])))
 .then(x=>console.log(x));
"
```
Expected: keempat tabel `ok`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0004_donatur.sql
git commit -m "feat(db): donatur, donasi, surat tables with RLS and letter-number RPCs

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Terbilang, format rupiah, dan nomor surat

**Files:**
- Create: `lib/utils/terbilang.ts`, `lib/utils/nomor-surat.ts`
- Test: `tests/utils/terbilang.test.ts`, `tests/utils/nomor-surat.test.ts`

**Interfaces:**
- Produces: `terbilang(n: number): string` (huruf kapital di awal kata, tanpa "Rupiah"), `formatRupiah(n: number): string` (`"2.500.000"`), `bulanRomawi(month1to12: number): string`, `formatNomorSurat(urut: number, tanggal: Date | string): string`, `parseNomorSurat(nomor: string): { urut: number; bulan: number; tahun: number } | null`.

- [ ] **Step 1: Test terbilang (gagal dulu)** — `tests/utils/terbilang.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { terbilang, formatRupiah } from '@/lib/utils/terbilang';

describe('terbilang', () => {
  it('angka dasar', () => {
    expect(terbilang(0)).toBe('Nol');
    expect(terbilang(7)).toBe('Tujuh');
    expect(terbilang(11)).toBe('Sebelas');
    expect(terbilang(19)).toBe('Sembilan Belas');
    expect(terbilang(21)).toBe('Dua Puluh Satu');
  });
  it('ratusan dan seratus/seribu', () => {
    expect(terbilang(100)).toBe('Seratus');
    expect(terbilang(250)).toBe('Dua Ratus Lima Puluh');
    expect(terbilang(1000)).toBe('Seribu');
    expect(terbilang(1500)).toBe('Seribu Lima Ratus');
  });
  it('nominal surat contoh', () => {
    expect(terbilang(2500000)).toBe('Dua Juta Lima Ratus Ribu');
  });
  it('angka besar', () => {
    expect(terbilang(1000000)).toBe('Satu Juta');
    expect(terbilang(1250750)).toBe('Satu Juta Dua Ratus Lima Puluh Ribu Tujuh Ratus Lima Puluh');
    expect(terbilang(2000000000)).toBe('Dua Miliar');
  });
  it('menolak negatif', () => {
    expect(() => terbilang(-5)).toThrow();
  });
});

describe('formatRupiah', () => {
  it('memakai titik ribuan', () => {
    expect(formatRupiah(2500000)).toBe('2.500.000');
    expect(formatRupiah(750)).toBe('750');
  });
});
```
Run: `npx vitest run tests/utils/terbilang.test.ts` → FAIL.

- [ ] **Step 2: Tulis `lib/utils/terbilang.ts`**

```ts
const SATUAN = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

function keKata(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${SATUAN[n - 10]} Belas`;
  if (n < 100) {
    const sisa = n % 10;
    return `${SATUAN[Math.floor(n / 10)]} Puluh${sisa ? ' ' + SATUAN[sisa] : ''}`;
  }
  if (n < 200) return `Seratus${n - 100 ? ' ' + keKata(n - 100) : ''}`;
  if (n < 1000) {
    const sisa = n % 100;
    return `${SATUAN[Math.floor(n / 100)]} Ratus${sisa ? ' ' + keKata(sisa) : ''}`;
  }
  if (n < 2000) return `Seribu${n - 1000 ? ' ' + keKata(n - 1000) : ''}`;

  const skala: Array<[number, string]> = [
    [1_000_000_000_000, 'Triliun'],
    [1_000_000_000, 'Miliar'],
    [1_000_000, 'Juta'],
    [1_000, 'Ribu'],
  ];
  for (const [nilai, nama] of skala) {
    if (n >= nilai) {
      const depan = Math.floor(n / nilai);
      const sisa = n % nilai;
      return `${keKata(depan)} ${nama}${sisa ? ' ' + keKata(sisa) : ''}`;
    }
  }
  return keKata(n);
}

/** Bilangan Indonesia dalam huruf, mis. 2500000 -> "Dua Juta Lima Ratus Ribu". */
export function terbilang(n: number): string {
  if (!Number.isFinite(n) || n < 0) throw new Error('Terbilang hanya untuk bilangan bulat non-negatif');
  const bulat = Math.floor(n);
  if (bulat === 0) return 'Nol';
  return keKata(bulat).replace(/\s+/g, ' ').trim();
}

/** 2500000 -> "2.500.000" */
export function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID').format(Math.floor(n));
}
```
Run → PASS.

- [ ] **Step 3: Test nomor surat** — `tests/utils/nomor-surat.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { bulanRomawi, formatNomorSurat, parseNomorSurat } from '@/lib/utils/nomor-surat';

describe('nomor surat', () => {
  it('bulan romawi', () => {
    expect(bulanRomawi(1)).toBe('I');
    expect(bulanRomawi(9)).toBe('IX');
    expect(bulanRomawi(12)).toBe('XII');
  });
  it('format lengkap', () => {
    expect(formatNomorSurat(270, '2026-09-21')).toBe('270/PBQ/IX/2026');
  });
  it('parse kembali', () => {
    expect(parseNomorSurat('270/PBQ/IX/2026')).toEqual({ urut: 270, bulan: 9, tahun: 2026 });
  });
  it('parse menolak format asing', () => {
    expect(parseNomorSurat('abc')).toBeNull();
    expect(parseNomorSurat('270/XYZ/IX/2026')).toBeNull();
  });
});
```
Run → FAIL.

- [ ] **Step 4: Tulis `lib/utils/nomor-surat.ts`**

```ts
const ROMAWI = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function bulanRomawi(bulan: number): string {
  if (bulan < 1 || bulan > 12) throw new Error('Bulan harus 1-12');
  return ROMAWI[bulan];
}

/** 270 + 2026-09-21 -> "270/PBQ/IX/2026" */
export function formatNomorSurat(urut: number, tanggal: Date | string): string {
  const d = typeof tanggal === 'string' ? new Date(tanggal + (tanggal.length === 10 ? 'T00:00:00' : '')) : tanggal;
  return `${urut}/PBQ/${bulanRomawi(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function parseNomorSurat(nomor: string): { urut: number; bulan: number; tahun: number } | null {
  const m = /^(\d+)\/PBQ\/([IVX]+)\/(\d{4})$/.exec(nomor.trim());
  if (!m) return null;
  const bulan = ROMAWI.indexOf(m[2]);
  if (bulan < 1) return null;
  return { urut: Number(m[1]), bulan, tahun: Number(m[3]) };
}
```
Run: `npx vitest run tests/utils` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/terbilang.ts lib/utils/nomor-surat.ts tests/utils/terbilang.test.ts tests/utils/nomor-surat.test.ts
git commit -m "feat(utils): Indonesian number-to-words and letter numbering helpers

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Validasi & repository donatur

**Files:**
- Create: `lib/validation/donatur.ts`, `lib/db/donatur-repo.ts`
- Test: `tests/validation/donatur.test.ts`, `tests/db/donatur-repo.test.ts` (integrasi bersyarat)

**Interfaces:**
- Produces:
  - `donaturSchema`, `donaturUpdateSchema`, `donasiSchema`, `suratSchema`, `rekapQuerySchema`
  - Tipe `Donatur`, `Donasi`, `Surat`, `DonasiWithDonatur`, `Rekap`
  - `listDonatur(client, q?)`, `getDonatur(client, id)`, `createDonatur(client, input)`, `updateDonatur(client, id, patch)`,
    `listDonasi(client, filter)`, `createDonasi(client, input, userId)`,
    `createSurat(client, { donasiId, nomorSurat, tanggalSurat }, userId)`, `getSurat(client, id)`, `listSurat(client, filter)`,
    `setSuratStoragePath(client, id, path)`, `markSuratTerkirim(client, id)`,
    `nextNomorUrut(client, tahun, bulan)`, `bumpNomorUrut(client, tahun, bulan, urut)`, `rekap(client, dari, sampai)`

- [ ] **Step 1: Test validasi (gagal dulu)** — `tests/validation/donatur.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { donaturSchema, donasiSchema, suratSchema } from '@/lib/validation/donatur';

const donaturValid = { nama: 'H. Pradana', sapaan: 'BAPAK', noWa: '0812-3456-7890' };

describe('donaturSchema', () => {
  it('menormalisasi nomor WA', () => {
    const r = donaturSchema.safeParse(donaturValid);
    expect(r.success && r.data.noWa).toBe('6281234567890');
  });
  it('menerima donatur tanpa WA', () => {
    expect(donaturSchema.safeParse({ nama: 'Hamba Allah', sapaan: 'BAPAK' }).success).toBe(true);
  });
  it('menolak nama terlalu pendek', () => {
    expect(donaturSchema.safeParse({ ...donaturValid, nama: 'A' }).success).toBe(false);
  });
});

describe('donasiSchema', () => {
  const dasar = { donaturId: 'd1', tanggal: '2026-09-21', jenis: 'INFAQ' as const };
  it('uang wajib punya nominal > 0', () => {
    expect(donasiSchema.safeParse({ ...dasar, bentuk: 'UANG', nominal: 2500000 }).success).toBe(true);
    expect(donasiSchema.safeParse({ ...dasar, bentuk: 'UANG', nominal: 0 }).success).toBe(false);
    expect(donasiSchema.safeParse({ ...dasar, bentuk: 'UANG' }).success).toBe(false);
  });
  it('barang wajib punya deskripsi dan tanpa nominal', () => {
    expect(donasiSchema.safeParse({ ...dasar, bentuk: 'BARANG', deskripsiBarang: '50 kg beras' }).success).toBe(true);
    expect(donasiSchema.safeParse({ ...dasar, bentuk: 'BARANG' }).success).toBe(false);
  });
  it('menolak tanggal di masa depan', () => {
    expect(donasiSchema.safeParse({ ...dasar, tanggal: '2999-01-01', bentuk: 'UANG', nominal: 1000 }).success).toBe(false);
  });
});

describe('suratSchema', () => {
  it('menerima nomor surat berformat benar', () => {
    expect(suratSchema.safeParse({ donasiId: 'x', nomorSurat: '271/PBQ/IX/2026', tanggalSurat: '2026-09-22' }).success).toBe(true);
  });
  it('menolak nomor surat asal-asalan', () => {
    expect(suratSchema.safeParse({ donasiId: 'x', nomorSurat: '271', tanggalSurat: '2026-09-22' }).success).toBe(false);
  });
});
```
Run → FAIL.

- [ ] **Step 2: Tulis `lib/validation/donatur.ts`**

```ts
import { z } from 'zod';
import { normalizeWa } from '@/lib/validation/santri';
import { parseNomorSurat } from '@/lib/utils/nomor-surat';

const teksOpsional = z.string().trim().transform(v => (v === '' ? null : v)).nullable().optional();
const tanggalIso = z.string().trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
  .refine(v => !Number.isNaN(Date.parse(v)), 'Tanggal tidak valid')
  .refine(v => Date.parse(v) <= Date.now() + 86_400_000, 'Tanggal tidak boleh di masa depan');

export const sapaanEnum = z.enum(['BAPAK', 'IBU', 'SDR', 'SDRI', 'BAPAK_IBU']);
export const jenisEnum = z.enum(['ZAKAT', 'INFAQ', 'SHADAQAH', 'LAINNYA']);
export const bentukEnum = z.enum(['UANG', 'BARANG']);

export const donaturSchema = z.object({
  nama: z.string().trim().min(3, 'Nama donatur minimal 3 huruf'),
  sapaan: sapaanEnum.default('BAPAK'),
  noWa: z.string().trim().transform(v => (v === '' ? null : normalizeWa(v))).nullable().optional()
    .refine(v => v == null || /^62\d{8,13}$/.test(v), 'Nomor WhatsApp tidak valid'),
  alamat: teksOpsional,
  catatan: teksOpsional,
});
export const donaturUpdateSchema = donaturSchema.partial();

export const donasiSchema = z.object({
  donaturId: z.string().trim().min(1, 'Donatur wajib dipilih'),
  tanggal: tanggalIso,
  jenis: jenisEnum,
  bentuk: bentukEnum,
  nominal: z.coerce.number().int().positive('Nominal harus lebih dari 0').optional(),
  deskripsiBarang: teksOpsional,
  keterangan: teksOpsional,
}).superRefine((d, ctx) => {
  if (d.bentuk === 'UANG' && !d.nominal) {
    ctx.addIssue({ code: 'custom', path: ['nominal'], message: 'Nominal wajib diisi untuk donasi uang' });
  }
  if (d.bentuk === 'BARANG' && !d.deskripsiBarang) {
    ctx.addIssue({ code: 'custom', path: ['deskripsiBarang'], message: 'Tuliskan barang yang didonasikan' });
  }
});

export const suratSchema = z.object({
  donasiId: z.string().trim().min(1),
  nomorSurat: z.string().trim().refine(v => parseNomorSurat(v) !== null, 'Format nomor surat harus 271/PBQ/IX/2026'),
  tanggalSurat: tanggalIso,
});

export const rekapQuerySchema = z.object({
  dari: tanggalIso,
  sampai: tanggalIso,
});

export type DonaturInput = z.infer<typeof donaturSchema>;
export type DonasiInput = z.infer<typeof donasiSchema>;
export type SuratInput = z.infer<typeof suratSchema>;
```
Run: `npx vitest run tests/validation/donatur.test.ts` → PASS.

- [ ] **Step 3: Tulis `lib/db/donatur-repo.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DonaturInput, DonasiInput, SuratInput } from '@/lib/validation/donatur';

export type Sapaan = 'BAPAK' | 'IBU' | 'SDR' | 'SDRI' | 'BAPAK_IBU';
export type JenisDonasi = 'ZAKAT' | 'INFAQ' | 'SHADAQAH' | 'LAINNYA';
export type BentukDonasi = 'UANG' | 'BARANG';

export type Donatur = {
  id: string; nama: string; sapaan: Sapaan; noWa: string | null;
  alamat: string | null; catatan: string | null; createdAt: string; updatedAt: string;
};
export type Donasi = {
  id: string; donaturId: string; tanggal: string; jenis: JenisDonasi; bentuk: BentukDonasi;
  nominal: number | null; deskripsiBarang: string | null; keterangan: string | null;
  createdAt: string; createdBy: string | null;
};
export type Surat = {
  id: string; donasiId: string; nomorSurat: string; tanggalSurat: string;
  storagePath: string | null; terkirimWa: boolean; dikirimAt: string | null;
  createdAt: string; createdBy: string | null;
};
export type DonasiWithDonatur = Donasi & { donatur: Donatur; surat?: Surat | null };
export type SuratWithRelasi = Surat & { donasi: Donasi & { donatur: Donatur } };
export type Rekap = {
  totalUang: number;
  jumlahDonasiUang: number;
  perBulan: Array<{ bulan: string; total: number }>;   // bulan = 'YYYY-MM'
  barang: Array<{ tanggal: string; donatur: string; deskripsi: string }>;
};

export class NomorSuratDipakaiError extends Error {
  constructor(public nomor: string) { super('Nomor surat sudah dipakai'); this.name = 'NomorSuratDipakaiError'; }
}

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export async function listDonatur(client: SupabaseClient, q?: string): Promise<Donatur[]> {
  let query = client.from('donatur').select('*').order('nama');
  if (q) query = query.or(`nama.ilike.%${q}%,noWa.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) throw new Error(`Gagal memuat donatur: ${error.message}`);
  return (data || []) as Donatur[];
}

export async function getDonatur(client: SupabaseClient, donaturId: string): Promise<(Donatur & { donasi: Donasi[] }) | null> {
  const { data, error } = await client.from('donatur').select('*, donasi(*)').eq('id', donaturId).maybeSingle();
  if (error || !data) return null;
  const row = data as Donatur & { donasi: Donasi[] };
  row.donasi = (row.donasi || []).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  return row;
}

export async function createDonatur(client: SupabaseClient, input: DonaturInput): Promise<Donatur> {
  const row = { ...input, id: id(), createdAt: now(), updatedAt: now() };
  const { data, error } = await client.from('donatur').insert(row).select().single();
  if (error) throw new Error(`Gagal menyimpan donatur: ${error.message}`);
  return data as Donatur;
}

export async function updateDonatur(client: SupabaseClient, donaturId: string, patch: Partial<DonaturInput>): Promise<Donatur> {
  const { data, error } = await client.from('donatur')
    .update({ ...patch, updatedAt: now() }).eq('id', donaturId).select().single();
  if (error) throw new Error(`Gagal memperbarui donatur: ${error.message}`);
  return data as Donatur;
}

export async function listDonasi(
  client: SupabaseClient,
  filter: { dari?: string; sampai?: string; donaturId?: string; limit?: number } = {},
): Promise<DonasiWithDonatur[]> {
  let q = client.from('donasi').select('*, donatur(*), surat(*)').order('tanggal', { ascending: false });
  if (filter.dari) q = q.gte('tanggal', filter.dari);
  if (filter.sampai) q = q.lte('tanggal', filter.sampai);
  if (filter.donaturId) q = q.eq('donaturId', filter.donaturId);
  if (filter.limit) q = q.limit(filter.limit);
  const { data, error } = await q;
  if (error) throw new Error(`Gagal memuat donasi: ${error.message}`);
  return (data || []).map((d: any) => ({ ...d, surat: Array.isArray(d.surat) ? d.surat[0] ?? null : d.surat ?? null })) as DonasiWithDonatur[];
}

export async function createDonasi(client: SupabaseClient, input: DonasiInput, userId: string): Promise<Donasi> {
  const row = {
    id: id(),
    donaturId: input.donaturId,
    tanggal: input.tanggal,
    jenis: input.jenis,
    bentuk: input.bentuk,
    nominal: input.bentuk === 'UANG' ? input.nominal! : null,
    deskripsiBarang: input.bentuk === 'BARANG' ? input.deskripsiBarang! : null,
    keterangan: input.keterangan ?? null,
    createdAt: now(),
    createdBy: userId,
  };
  const { data, error } = await client.from('donasi').insert(row).select().single();
  if (error) throw new Error(`Gagal menyimpan donasi: ${error.message}`);
  return data as Donasi;
}

export async function nextNomorUrut(client: SupabaseClient, tahun: number, bulan: number): Promise<number> {
  const { data, error } = await client.rpc('next_nomor_surat', { p_tahun: tahun, p_bulan: bulan });
  if (error) throw new Error(`Gagal mengambil nomor surat: ${error.message}`);
  return data as number;
}

export async function bumpNomorUrut(client: SupabaseClient, tahun: number, bulan: number, urut: number): Promise<void> {
  await client.rpc('bump_nomor_surat', { p_tahun: tahun, p_bulan: bulan, p_urut: urut });
}

export async function createSurat(client: SupabaseClient, input: SuratInput, userId: string): Promise<Surat> {
  const row = { id: id(), ...input, storagePath: null, terkirimWa: false, dikirimAt: null, createdAt: now(), createdBy: userId };
  const { data, error } = await client.from('surat').insert(row).select().single();
  if (error) {
    if (error.code === '23505') throw new NomorSuratDipakaiError(input.nomorSurat);
    throw new Error(`Gagal menyimpan surat: ${error.message}`);
  }
  return data as Surat;
}

export async function getSurat(client: SupabaseClient, suratId: string): Promise<SuratWithRelasi | null> {
  const { data, error } = await client.from('surat').select('*, donasi(*, donatur(*))').eq('id', suratId).maybeSingle();
  if (error || !data) return null;
  return data as SuratWithRelasi;
}

export async function listSurat(
  client: SupabaseClient,
  filter: { dari?: string; sampai?: string; terkirim?: boolean; limit?: number } = {},
): Promise<SuratWithRelasi[]> {
  let q = client.from('surat').select('*, donasi(*, donatur(*))').order('tanggalSurat', { ascending: false });
  if (filter.dari) q = q.gte('tanggalSurat', filter.dari);
  if (filter.sampai) q = q.lte('tanggalSurat', filter.sampai);
  if (filter.terkirim !== undefined) q = q.eq('terkirimWa', filter.terkirim);
  if (filter.limit) q = q.limit(filter.limit);
  const { data, error } = await q;
  if (error) throw new Error(`Gagal memuat surat: ${error.message}`);
  return (data || []) as SuratWithRelasi[];
}

export async function setSuratStoragePath(client: SupabaseClient, suratId: string, path: string): Promise<void> {
  const { error } = await client.from('surat').update({ storagePath: path }).eq('id', suratId);
  if (error) throw new Error(`Gagal menyimpan berkas surat: ${error.message}`);
}

export async function markSuratTerkirim(client: SupabaseClient, suratId: string): Promise<Surat> {
  const { data, error } = await client.from('surat')
    .update({ terkirimWa: true, dikirimAt: now() }).eq('id', suratId).select().single();
  if (error) throw new Error(`Gagal menandai surat: ${error.message}`);
  return data as Surat;
}

export async function rekap(client: SupabaseClient, dari: string, sampai: string): Promise<Rekap> {
  const rows = await listDonasi(client, { dari, sampai });
  const uang = rows.filter(r => r.bentuk === 'UANG');
  const perBulanMap = new Map<string, number>();
  for (const r of uang) {
    const key = r.tanggal.slice(0, 7);
    perBulanMap.set(key, (perBulanMap.get(key) ?? 0) + (r.nominal ?? 0));
  }
  return {
    totalUang: uang.reduce((s, r) => s + (r.nominal ?? 0), 0),
    jumlahDonasiUang: uang.length,
    perBulan: Array.from(perBulanMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([bulan, total]) => ({ bulan, total })),
    barang: rows.filter(r => r.bentuk === 'BARANG').map(r => ({
      tanggal: r.tanggal, donatur: r.donatur?.nama ?? '-', deskripsi: r.deskripsiBarang ?? '-',
    })),
  };
}
```

- [ ] **Step 4: Test integrasi bersyarat** — `tests/db/donatur-repo.test.ts`

```ts
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createDonatur, createDonasi, listDonasi, rekap, createSurat, NomorSuratDipakaiError } from '@/lib/db/donatur-repo';

const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const run = url && key ? describe : describe.skip;

run('donatur-repo (integrasi Supabase)', () => {
  let client: SupabaseClient;
  const dibuat: string[] = [];
  beforeAll(() => { client = createClient(url!, key!, { auth: { persistSession: false } }); });
  afterAll(async () => { if (dibuat.length) await client.from('donatur').delete().in('id', dibuat); });

  it('mencatat donasi uang & barang lalu merekapnya', async () => {
    const d = await createDonatur(client, { nama: 'TEST Donatur', sapaan: 'BAPAK', noWa: '628111111111' } as any);
    dibuat.push(d.id);
    await createDonasi(client, { donaturId: d.id, tanggal: '2026-09-01', jenis: 'INFAQ', bentuk: 'UANG', nominal: 2500000 } as any, '00000000-0000-0000-0000-000000000000');
    await createDonasi(client, { donaturId: d.id, tanggal: '2026-09-02', jenis: 'SHADAQAH', bentuk: 'BARANG', deskripsiBarang: '50 kg beras' } as any, '00000000-0000-0000-0000-000000000000');

    const list = await listDonasi(client, { donaturId: d.id });
    expect(list).toHaveLength(2);

    const r = await rekap(client, '2026-09-01', '2026-09-30');
    expect(r.totalUang).toBeGreaterThanOrEqual(2500000);
    expect(r.barang.some(b => b.deskripsi === '50 kg beras')).toBe(true);
  });

  it('menolak nomor surat ganda', async () => {
    const d = await createDonatur(client, { nama: 'TEST Donatur 2', sapaan: 'IBU' } as any);
    dibuat.push(d.id);
    const donasi = await createDonasi(client, { donaturId: d.id, tanggal: '2026-09-03', jenis: 'ZAKAT', bentuk: 'UANG', nominal: 1000 } as any, '00000000-0000-0000-0000-000000000000');
    const nomor = `9${Date.now() % 100000}/PBQ/IX/2026`;
    await createSurat(client, { donasiId: donasi.id, nomorSurat: nomor, tanggalSurat: '2026-09-03' }, '00000000-0000-0000-0000-000000000000');
    await expect(createSurat(client, { donasiId: donasi.id, nomorSurat: nomor, tanggalSurat: '2026-09-03' }, '00000000-0000-0000-0000-000000000000'))
      .rejects.toBeInstanceOf(NomorSuratDipakaiError);
  });
});
```

- [ ] **Step 5: Jalankan**

Run: `npx vitest run tests/validation/donatur.test.ts tests/db/donatur-repo.test.ts && npx tsc --noEmit -p .`
Expected: validasi PASS; integrasi PASS bila env test diset, `skipped` bila tidak.

- [ ] **Step 6: Commit**

```bash
git add lib/validation/donatur.ts lib/db/donatur-repo.ts tests/validation/donatur.test.ts tests/db/donatur-repo.test.ts
git commit -m "feat(donatur): zod schemas and repository for donatur, donasi, surat

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: API donatur & donasi

**Files:**
- Create: `app/api/donatur/route.ts`, `app/api/donatur/[id]/route.ts`, `app/api/donatur/donasi/route.ts`, `app/api/donatur/nomor-berikutnya/route.ts`
- Test: manual lewat `curl` (logika murni sudah diuji di Task 7–8)

**Interfaces:**
- Consumes: repo & skema Task 8, `requireRoom('donatur')` (Task 2), `formatNomorSurat`/`parseNomorSurat` (Task 7).
- Produces:
  - `GET /api/donatur?q=` → `{ success, data: Donatur[] }`
  - `POST /api/donatur` (body `donaturSchema`) → 201 `{ data: Donatur }`
  - `GET /api/donatur/[id]` → `{ data: Donatur & { donasi: Donasi[] } }`; `PATCH` → `{ data: Donatur }`; `DELETE` (SUPERADMIN) → `{ success }`
  - `GET /api/donatur/donasi?dari=&sampai=&donaturId=` → `{ data: DonasiWithDonatur[] }`; `POST` (body `donasiSchema`) → 201
  - `GET /api/donatur/nomor-berikutnya?tanggal=YYYY-MM-DD` → `{ nomor: '271/PBQ/IX/2026', urut: 271 }`

- [ ] **Step 1: `app/api/donatur/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listDonatur, createDonatur } from '@/lib/db/donatur-repo';
import { donaturSchema } from '@/lib/validation/donatur';
import { validationResponse } from '@/lib/validation/errors';

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('donatur');
    const q = new URL(req.url).searchParams.get('q') || undefined;
    return NextResponse.json({ success: true, data: await listDonatur(supabase, q) });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal memuat donatur: ' + e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('donatur');
    const parsed = donaturSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await createDonatur(supabase, parsed.data) }, { status: 201 });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal menyimpan donatur: ' + e.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: `app/api/donatur/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, requireUser, authErrorResponse } from '@/lib/auth/session';
import { getDonatur, updateDonatur } from '@/lib/db/donatur-repo';
import { donaturUpdateSchema } from '@/lib/validation/donatur';
import { validationResponse } from '@/lib/validation/errors';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireRoom('donatur');
    const { id } = await ctx.params;
    const donatur = await getDonatur(supabase, id);
    if (!donatur) return NextResponse.json({ error: 'Donatur tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ success: true, data: donatur });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal memuat donatur: ' + e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireRoom('donatur');
    const { id } = await ctx.params;
    const parsed = donaturUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await updateDonatur(supabase, id, parsed.data) });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal memperbarui donatur: ' + e.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireUser(['SUPERADMIN']);
    const { id } = await ctx.params;
    const { error } = await supabase.from('donatur').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal menghapus donatur: ' + e.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: `app/api/donatur/donasi/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listDonasi, createDonasi } from '@/lib/db/donatur-repo';
import { donasiSchema } from '@/lib/validation/donatur';
import { validationResponse } from '@/lib/validation/errors';

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('donatur');
    const p = new URL(req.url).searchParams;
    const data = await listDonasi(supabase, {
      dari: p.get('dari') || undefined,
      sampai: p.get('sampai') || undefined,
      donaturId: p.get('donaturId') || undefined,
      limit: p.get('limit') ? Number(p.get('limit')) : undefined,
    });
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal memuat donasi: ' + e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireRoom('donatur');
    const parsed = donasiSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await createDonasi(supabase, parsed.data, user.id) }, { status: 201 });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal menyimpan donasi: ' + e.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: `app/api/donatur/nomor-berikutnya/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { nextNomorUrut } from '@/lib/db/donatur-repo';
import { formatNomorSurat } from '@/lib/utils/nomor-surat';

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('donatur');
    const tanggal = new URL(req.url).searchParams.get('tanggal') || new Date().toISOString().slice(0, 10);
    const d = new Date(tanggal + 'T00:00:00');
    const urut = await nextNomorUrut(supabase, d.getFullYear(), d.getMonth() + 1);
    return NextResponse.json({ success: true, urut, nomor: formatNomorSurat(urut, d) });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal mengambil nomor surat: ' + e.message }, { status: 500 });
  }
}
```

- [ ] **Step 5: Verifikasi**

Run: `npx tsc --noEmit -p . && npm run dev`, lalu dari terminal:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/donatur
```
Expected: `401` tanpa login. Dengan login SUPERADMIN di browser, buka `http://localhost:3000/api/donatur` → `{"success":true,"data":[]}`; `/api/donatur/nomor-berikutnya` → nomor pertama (mis. `1/PBQ/IX/2026`).

- [ ] **Step 6: Commit**

```bash
git add app/api/donatur
git commit -m "feat(api): donatur, donasi and next-letter-number endpoints

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Template surat & render PNG

**Files:**
- Create: `components/donatur/SuratTemplate.tsx`, `lib/surat/data.ts`, `lib/surat/assets.ts`, `app/api/donatur/surat/[id]/png/route.ts`, `public/fonts/PlusJakartaSans-Regular.ttf`, `public/fonts/PlusJakartaSans-Bold.ttf`, `public/fonts/NotoNaskhArabic-Regular.ttf`
- Test: `tests/surat/data.test.ts`

**Interfaces:**
- Consumes: `terbilang`, `formatRupiah`, `formatDateIndonesian` (sudah ada di `lib/utils/formatters.ts`), repo Task 8.
- Produces:
  - `type SuratData = { nomorSurat: string; tanggalSurat: string; namaDonatur: string; sapaan: Sapaan; barisNilai: { tipe: 'UANG'; rupiah: string; terbilang: string } | { tipe: 'BARANG'; deskripsi: string } }`
  - `buildSuratData(surat: SuratWithRelasi): SuratData`
  - `<SuratTemplate data={SuratData} assets={SuratAssets} />` — satu tata letak, dipakai pratinjau HTML & `ImageResponse`
  - `loadSuratAssets(): Promise<SuratAssets>` (`{ logo: string; stempel: string; ttd: string }`, semua data URI) dan `loadSuratFonts()`
  - `GET /api/donatur/surat/[id]/png` → PNG (dan menyimpannya ke storage)

- [ ] **Step 1: Unduh font ke `public/fonts`**

```bash
mkdir -p public/fonts
curl -sL -o public/fonts/PlusJakartaSans-Regular.ttf "https://github.com/tokotype/PlusJakartaSans/raw/master/fonts/ttf/PlusJakartaSans-Regular.ttf"
curl -sL -o public/fonts/PlusJakartaSans-Bold.ttf    "https://github.com/tokotype/PlusJakartaSans/raw/master/fonts/ttf/PlusJakartaSans-Bold.ttf"
curl -sL -o public/fonts/NotoNaskhArabic-Regular.ttf "https://github.com/notofonts/arabic/raw/main/fonts/NotoNaskhArabic/hinted/ttf/NotoNaskhArabic-Regular.ttf"
ls -la public/fonts
```
Jika salah satu URL gagal (404), cari rilis terbaru di repo yang sama dan sesuaikan; pastikan ketiga berkas > 50 KB.

- [ ] **Step 2: Test `buildSuratData` (gagal dulu)** — `tests/surat/data.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { buildSuratData } from '@/lib/surat/data';

const dasar = {
  id: 's1', donasiId: 'x', nomorSurat: '271/PBQ/IX/2026', tanggalSurat: '2026-09-21',
  storagePath: null, terkirimWa: false, dikirimAt: null, createdAt: '', createdBy: null,
  donasi: {
    id: 'x', donaturId: 'd', tanggal: '2026-09-21', jenis: 'INFAQ', bentuk: 'UANG',
    nominal: 2500000, deskripsiBarang: null, keterangan: null, createdAt: '', createdBy: null,
    donatur: { id: 'd', nama: 'pradana', sapaan: 'BAPAK', noWa: '628123', alamat: null, catatan: null, createdAt: '', updatedAt: '' },
  },
} as any;

describe('buildSuratData', () => {
  it('menyusun baris nilai untuk donasi uang', () => {
    const d = buildSuratData(dasar);
    expect(d.namaDonatur).toBe('Pradana');
    expect(d.barisNilai).toEqual({ tipe: 'UANG', rupiah: '2.500.000', terbilang: 'Dua Juta Lima Ratus Ribu' });
    expect(d.tanggalTeks).toMatch(/September 2026/);
  });
  it('menyusun baris nilai untuk donasi barang', () => {
    const barang = { ...dasar, donasi: { ...dasar.donasi, bentuk: 'BARANG', nominal: null, deskripsiBarang: '50 kg beras' } };
    expect(buildSuratData(barang as any).barisNilai).toEqual({ tipe: 'BARANG', deskripsi: '50 kg beras' });
  });
});
```
Run → FAIL.

- [ ] **Step 3: `lib/surat/data.ts`**

```ts
import { terbilang, formatRupiah } from '@/lib/utils/terbilang';
import { formatDateIndonesian, toTitleCase } from '@/lib/utils/formatters';
import type { SuratWithRelasi, Sapaan } from '@/lib/db/donatur-repo';

export type BarisNilai =
  | { tipe: 'UANG'; rupiah: string; terbilang: string }
  | { tipe: 'BARANG'; deskripsi: string };

export type SuratData = {
  nomorSurat: string;
  tanggalTeks: string;      // "21 September 2026"
  sapaan: Sapaan;
  namaDonatur: string;
  barisNilai: BarisNilai;
  keterangan: string | null;
};

const LABEL_SAPAAN: Record<Sapaan, string> = {
  BAPAK: 'Bapak', IBU: 'Ibu', SDR: 'Sdr.', SDRI: 'Sdri.', BAPAK_IBU: 'Bapak/Ibu',
};

export function labelSapaan(s: Sapaan): string { return LABEL_SAPAAN[s]; }

export function buildSuratData(surat: SuratWithRelasi): SuratData {
  const d = surat.donasi;
  return {
    nomorSurat: surat.nomorSurat,
    tanggalTeks: formatDateIndonesian(surat.tanggalSurat),
    sapaan: d.donatur.sapaan,
    namaDonatur: toTitleCase(d.donatur.nama),
    barisNilai: d.bentuk === 'UANG'
      ? { tipe: 'UANG', rupiah: formatRupiah(d.nominal ?? 0), terbilang: terbilang(d.nominal ?? 0) }
      : { tipe: 'BARANG', deskripsi: d.deskripsiBarang ?? '-' },
    keterangan: d.keterangan ?? null,
  };
}
```
Run → PASS.

- [ ] **Step 4: `lib/surat/assets.ts`**

```ts
import 'server-only';
import fs from 'fs/promises';
import path from 'path';

export type SuratAssets = { logo: string; stempel: string; ttd: string };

const asDataUri = async (rel: string, mime: string) => {
  const buf = await fs.readFile(path.join(process.cwd(), 'public', rel));
  return `data:${mime};base64,${buf.toString('base64')}`;
};

export async function loadSuratAssets(): Promise<SuratAssets> {
  const [logo, stempel, ttd] = await Promise.all([
    asDataUri('brand/logo.webp', 'image/webp'),
    asDataUri('brand/stempel.webp', 'image/webp'),
    asDataUri('brand/ttd.png', 'image/png'),
  ]);
  return { logo, stempel, ttd };
}

export async function loadSuratFonts() {
  const read = (f: string) => fs.readFile(path.join(process.cwd(), 'public', 'fonts', f));
  const [reg, bold, arab] = await Promise.all([
    read('PlusJakartaSans-Regular.ttf'),
    read('PlusJakartaSans-Bold.ttf'),
    read('NotoNaskhArabic-Regular.ttf'),
  ]);
  return [
    { name: 'Jakarta', data: reg, weight: 400 as const, style: 'normal' as const },
    { name: 'Jakarta', data: bold, weight: 700 as const, style: 'normal' as const },
    { name: 'Naskh', data: arab, weight: 400 as const, style: 'normal' as const },
  ];
}
```

- [ ] **Step 5: `components/donatur/SuratTemplate.tsx`**

Komponen murni (tanpa hook, tanpa `'use client'`) agar bisa dirender `ImageResponse` maupun di halaman server. Kanvas 1240×1754 px, semua ukuran dalam px, `display:flex` di setiap wadah (syarat Satori).

```tsx
import type { SuratData } from '@/lib/surat/data';
import { labelSapaan } from '@/lib/surat/data';
import type { SuratAssets } from '@/lib/surat/assets';

const HIJAU = '#0E9F54';
const BIRU = '#0B5FA5';

export function SuratTemplate({ data, assets }: { data: SuratData; assets: SuratAssets }) {
  const garis = (isi: string) => (
    <div style={{ display: 'flex', borderBottom: '2px dotted #555', minWidth: 420, paddingBottom: 2, fontSize: 26, fontWeight: 700 }}>{isi}</div>
  );

  return (
    <div style={{ width: 1240, height: 1754, display: 'flex', flexDirection: 'column', backgroundColor: '#fff', color: '#111', fontFamily: 'Jakarta', padding: '56px 72px' }}>
      {/* KOP */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <img src={assets.logo} width={132} height={132} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontFamily: 'Naskh', fontSize: 24, color: HIJAU }}>منظمة الحضانة بيت القوام</div>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, color: HIJAU, letterSpacing: -0.5 }}>PANTI ASUHAN</div>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, color: BIRU, letterSpacing: -0.5 }}>BAITUL QOWWAM</div>
          <div style={{ display: 'flex', fontSize: 16, color: '#333' }}>Izin operasional No. 466/0574/P2/2020 · akte notaris m. gunardi widyastuti no.02/2010</div>
          <div style={{ display: 'flex', fontSize: 16, color: '#333' }}>Plumbon Mororejo Tempel Sleman Yogyakarta 55552</div>
        </div>
      </div>
      <div style={{ display: 'flex', height: 4, backgroundColor: HIJAU, margin: '18px 0 28px' }} />

      {/* Nomor & tanggal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex' }}>No&nbsp;&nbsp;: {data.nomorSurat}</div>
          <div style={{ display: 'flex' }}>Hal&nbsp;: Ucapan Terima Kasih</div>
        </div>
        <div style={{ display: 'flex' }}>Tempel, {data.tanggalTeks}</div>
      </div>

      {/* Tujuan */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 36, fontSize: 24 }}>
        <div style={{ display: 'flex' }}>Kepada Yth.</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex' }}>{labelSapaan(data.sapaan)} :</div>
          {garis(data.namaDonatur)}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex' }}>Di</div>
          {garis('Tempat')}
        </div>
      </div>

      {/* Isi */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 36, fontSize: 24, lineHeight: 1.5 }}>
        <div style={{ display: 'flex' }}>Assalammu’alaikum Wr. Wb</div>
        <div style={{ display: 'flex' }}>
          Dengan surat ini kami mengucapkan banyak terima kasih kepada {labelSapaan(data.sapaan)} {data.namaDonatur} atas penyaluran zakat/infaq/shadaqah kepada Panti Asuhan BAITUL QOWWAM, sebesar:
        </div>

        {data.barisNilai.tipe === 'UANG' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 60 }}>
            <div style={{ display: 'flex', gap: 12 }}><div style={{ display: 'flex', width: 140 }}>Rp.</div>{garis(data.barisNilai.rupiah)}</div>
            <div style={{ display: 'flex', gap: 12 }}><div style={{ display: 'flex', width: 140 }}>Terbilang</div>{garis(`${data.barisNilai.terbilang} Rupiah`)}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, paddingLeft: 60 }}>
            <div style={{ display: 'flex', width: 140 }}>Berupa</div>{garis(data.barisNilai.deskripsi)}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 12 }}>
          <div style={{ display: 'flex', fontSize: 22 }}>Teriring Do’a</div>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: HIJAU }}>JAZAKUMULLAHU KHAIRAN JAZAA</div>
          <div style={{ display: 'flex', fontFamily: 'Naskh', fontSize: 28, marginTop: 4 }}>بارك الله فيما أعطيت وبارك الله فيما أبقيت وجعله لك طهورا</div>
          <div style={{ display: 'flex', fontSize: 20, fontStyle: 'italic', textAlign: 'center', marginTop: 8, maxWidth: 880 }}>
            “Semoga Allah memberi pahala dengan apa yang engkau berikan dan Allah memberkahi apa saja yang masih ada pada diri engkau dan semoga Allah menjadikannya suci bagi engkau” Aamiin...
          </div>
        </div>

        <div style={{ display: 'flex' }}>
          Dana yang kami terima dialokasikan untuk penyelenggaraan Panti Asuhan Baitul Qowwam. Demikian surat ini kami sampaikan, atas perhatian dan kepercayaannya kami ucapkan banyak terima kasih.
        </div>
        <div style={{ display: 'flex' }}>Wassalammu’alaikum Wr. Wb</div>
      </div>

      {/* Tanda tangan */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: 420 }}>
          <div style={{ display: 'flex', fontSize: 22 }}>Pengurus Panti Asuhan</div>
          <div style={{ display: 'flex', fontSize: 22 }}>Baitul Qowwam</div>
          <div style={{ display: 'flex', position: 'relative', height: 150, width: 380, alignItems: 'center', justifyContent: 'center' }}>
            <img src={assets.stempel} width={210} height={210} style={{ position: 'absolute', left: 20, top: -20, opacity: 0.9 }} />
            <img src={assets.ttd} width={150} height={150} style={{ position: 'absolute', left: 150, top: -6 }} />
          </div>
          <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, borderTop: '1px solid #111', paddingTop: 6 }}>Dr. H. Agus Triyanta</div>
        </div>
      </div>

      {/* NB */}
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', fontSize: 18, color: '#333' }}>
        <div style={{ display: 'flex' }}>NB :</div>
        <div style={{ display: 'flex' }}>No.Telpon : 08121 5520 406 dan 0813 7297 3706</div>
        <div style={{ display: 'flex' }}>No. Rek : BSI 0307075359</div>
        <div style={{ display: 'flex' }}>A.n Agus T. QQ. Baitul Qowwam</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: `app/api/donatur/surat/[id]/png/route.ts`**

```ts
import { ImageResponse } from 'next/og';
import { NextResponse, type NextRequest } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { getSurat, setSuratStoragePath } from '@/lib/db/donatur-repo';
import { buildSuratData } from '@/lib/surat/data';
import { loadSuratAssets, loadSuratFonts } from '@/lib/surat/assets';
import { SuratTemplate } from '@/components/donatur/SuratTemplate';
import { parseNomorSurat } from '@/lib/utils/nomor-surat';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireRoom('donatur');
    const { id } = await ctx.params;
    const surat = await getSurat(supabase, id);
    if (!surat) return NextResponse.json({ error: 'Surat tidak ditemukan' }, { status: 404 });

    const [assets, fonts] = await Promise.all([loadSuratAssets(), loadSuratFonts()]);
    const image = new ImageResponse(
      <SuratTemplate data={buildSuratData(surat)} assets={assets} />,
      { width: 1240, height: 1754, fonts },
    );
    const png = Buffer.from(await image.arrayBuffer());

    // Simpan ke bucket privat agar bisa diunduh ulang tanpa render berulang
    const parsed = parseNomorSurat(surat.nomorSurat);
    const tahun = parsed?.tahun ?? new Date(surat.tanggalSurat).getFullYear();
    const path = `surat/${tahun}/${surat.nomorSurat.replace(/\//g, '-')}.png`;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'berkas';
    const { error: upErr } = await supabase.storage.from(bucket)
      .upload(path, png, { contentType: 'image/png', upsert: true });
    if (!upErr && surat.storagePath !== path) await setSuratStoragePath(supabase, id, path);

    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="${surat.nomorSurat.replace(/\//g, '-')}.png"`,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal membuat gambar surat: ' + e.message }, { status: 500 });
  }
}
```

- [ ] **Step 7: Verifikasi render**

Run: `npx vitest run tests/surat && npx tsc --noEmit -p . && npm run dev`.
Buat satu donasi + surat lewat `curl` (pakai cookie sesi dari browser) atau sementara lewat SQL Editor, lalu buka `http://localhost:3000/api/donatur/surat/<id>/png` di browser yang sudah login. Periksa: kop lengkap, nama & nominal benar, terbilang benar, stempel & TTD tampak, baris Arab terbaca (tidak kotak-kotak).

- [ ] **Step 8: Commit**

```bash
git add components/donatur/SuratTemplate.tsx lib/surat app/api/donatur/surat public/fonts tests/surat
git commit -m "feat(surat): A4 letter template rendered to PNG via next/og and stored privately

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: API surat (buat, daftar, tandai terkirim)

**Files:**
- Create: `app/api/donatur/surat/route.ts`, `app/api/donatur/surat/[id]/route.ts`

**Interfaces:**
- Produces:
  - `POST /api/donatur/surat` body `{ donasi?: DonasiInput; donasiId?: string; nomorSurat: string; tanggalSurat: string }` → 201 `{ data: Surat }`; 409 `{ error, nomorUsulan }` bila nomor dipakai. Bila `donasi` dikirim, donasi dibuat dulu lalu suratnya.
  - `GET /api/donatur/surat?dari=&sampai=&terkirim=` → `{ data: SuratWithRelasi[] }`
  - `PATCH /api/donatur/surat/[id]` body `{ terkirimWa: true }` → `{ data: Surat }`

- [ ] **Step 1: `app/api/donatur/surat/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { createDonasi, createSurat, listSurat, nextNomorUrut, bumpNomorUrut, NomorSuratDipakaiError } from '@/lib/db/donatur-repo';
import { donasiSchema, suratSchema } from '@/lib/validation/donatur';
import { validationResponse } from '@/lib/validation/errors';
import { formatNomorSurat, parseNomorSurat } from '@/lib/utils/nomor-surat';

const bodySchema = z.object({
  donasi: donasiSchema.optional(),
  donasiId: z.string().trim().min(1).optional(),
  nomorSurat: suratSchema.shape.nomorSurat,
  tanggalSurat: suratSchema.shape.tanggalSurat,
}).refine(d => d.donasi || d.donasiId, { path: ['donasi'], message: 'Data donasi wajib ada' });

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('donatur');
    const p = new URL(req.url).searchParams;
    const terkirimParam = p.get('terkirim');
    const data = await listSurat(supabase, {
      dari: p.get('dari') || undefined,
      sampai: p.get('sampai') || undefined,
      terkirim: terkirimParam === null ? undefined : terkirimParam === 'true',
      limit: p.get('limit') ? Number(p.get('limit')) : undefined,
    });
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal memuat surat: ' + e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireRoom('donatur');
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    const { donasi, donasiId, nomorSurat, tanggalSurat } = parsed.data;

    const donasiRow = donasi ? await createDonasi(supabase, donasi, user.id) : null;
    const idDonasi = donasiRow?.id ?? donasiId!;

    try {
      const surat = await createSurat(supabase, { donasiId: idDonasi, nomorSurat, tanggalSurat }, user.id);
      const p = parseNomorSurat(nomorSurat)!;
      await bumpNomorUrut(supabase, p.tahun, p.bulan, p.urut);
      return NextResponse.json({ success: true, data: surat }, { status: 201 });
    } catch (e) {
      if (e instanceof NomorSuratDipakaiError) {
        const d = new Date(tanggalSurat + 'T00:00:00');
        const urut = await nextNomorUrut(supabase, d.getFullYear(), d.getMonth() + 1);
        return NextResponse.json(
          { error: `Nomor ${nomorSurat} sudah dipakai`, nomorUsulan: formatNomorSurat(urut, d) },
          { status: 409 },
        );
      }
      throw e;
    }
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal membuat surat: ' + e.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: `app/api/donatur/surat/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { getSurat, markSuratTerkirim } from '@/lib/db/donatur-repo';
import { validationResponse } from '@/lib/validation/errors';

type Ctx = { params: Promise<{ id: string }> };
const patchSchema = z.object({ terkirimWa: z.literal(true) });

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireRoom('donatur');
    const { id } = await ctx.params;
    const surat = await getSurat(supabase, id);
    if (!surat) return NextResponse.json({ error: 'Surat tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ success: true, data: surat });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal memuat surat: ' + e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await requireRoom('donatur');
    const { id } = await ctx.params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await markSuratTerkirim(supabase, id) });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal menandai surat: ' + e.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verifikasi**

Run: `npx tsc --noEmit -p .` → 0 error. Dev + login: `POST /api/donatur/surat` dengan nomor yang sama dua kali → yang kedua 409 beserta `nomorUsulan`.

- [ ] **Step 4: Commit**

```bash
git add app/api/donatur/surat
git commit -m "feat(api): create/list letters and mark as sent

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Form buat surat + pratinjau

**Files:**
- Create: `app/(donatur)/donatur/surat/baru/page.tsx`, `components/donatur/FormSurat.tsx`, `components/donatur/PilihDonatur.tsx`, `components/donatur/PratinjauSurat.tsx`
- Test: `tests/components/form-surat.test.ts` (logika murni)

**Interfaces:**
- Consumes: API Task 9 & 11, `buildSuratData`, `SuratTemplate`, `terbilang`.
- Produces: alur `/donatur/surat/baru` → simpan → diarahkan ke `/donatur/surat/<id>` (Task 13).

- [ ] **Step 1: Test bantu form (gagal dulu)** — `tests/components/form-surat.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { hitungPratinjau } from '@/components/donatur/FormSurat';

describe('hitungPratinjau', () => {
  it('menyusun data pratinjau donasi uang tanpa memanggil server', () => {
    const p = hitungPratinjau({
      nama: 'pradana', sapaan: 'BAPAK', bentuk: 'UANG', nominal: 2500000,
      deskripsiBarang: '', tanggalSurat: '2026-09-21', nomorSurat: '271/PBQ/IX/2026', keterangan: '',
    });
    expect(p.namaDonatur).toBe('Pradana');
    expect(p.barisNilai).toEqual({ tipe: 'UANG', rupiah: '2.500.000', terbilang: 'Dua Juta Lima Ratus Ribu' });
  });
  it('menyusun data pratinjau donasi barang', () => {
    const p = hitungPratinjau({
      nama: 'Ibu Sri', sapaan: 'IBU', bentuk: 'BARANG', nominal: 0,
      deskripsiBarang: '50 kg beras', tanggalSurat: '2026-09-21', nomorSurat: '272/PBQ/IX/2026', keterangan: '',
    });
    expect(p.barisNilai).toEqual({ tipe: 'BARANG', deskripsi: '50 kg beras' });
  });
});
```
Run → FAIL.

- [ ] **Step 2: `components/donatur/FormSurat.tsx`**

Ekspor fungsi murni + komponen:
```tsx
'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FloppyDisk, Warning } from '@phosphor-icons/react';
import { terbilang, formatRupiah } from '@/lib/utils/terbilang';
import { formatDateIndonesian, toTitleCase } from '@/lib/utils/formatters';
import type { SuratData } from '@/lib/surat/data';
import type { Sapaan } from '@/lib/db/donatur-repo';

export type FormState = {
  nama: string; sapaan: Sapaan; bentuk: 'UANG' | 'BARANG'; nominal: number;
  deskripsiBarang: string; tanggalSurat: string; nomorSurat: string; keterangan: string;
};

/** Menyusun data pratinjau tanpa memanggil server. */
export function hitungPratinjau(s: FormState): SuratData {
  return {
    nomorSurat: s.nomorSurat,
    tanggalTeks: formatDateIndonesian(s.tanggalSurat),
    sapaan: s.sapaan,
    namaDonatur: toTitleCase(s.nama || ''),
    barisNilai: s.bentuk === 'UANG'
      ? { tipe: 'UANG', rupiah: formatRupiah(s.nominal || 0), terbilang: terbilang(s.nominal || 0) }
      : { tipe: 'BARANG', deskripsi: s.deskripsiBarang || '-' },
    keterangan: s.keterangan || null,
  };
}
```
Komponen `FormSurat`:
- State awal: `tanggalSurat` = hari ini, `sapaan` = `BAPAK`, `bentuk` = `UANG`.
- Saat mount dan tiap `tanggalSurat` berubah: `GET /api/donatur/nomor-berikutnya?tanggal=…` → isi `nomorSurat` (boleh diedit manual).
- `<PilihDonatur />` untuk memilih donatur lama (mengisi `nama`, `sapaan`, dan menyimpan `donaturId`) atau membuat baru (nama, sapaan, no. WA) — donatur baru dibuat lewat `POST /api/donatur` saat disimpan.
- Input nominal memakai `inputMode="numeric"`, tampil terformat (`2.500.000`) dan di bawahnya teks kecil "Terbilang: …" langsung dari `terbilang()`.
- Bentuk BARANG menyembunyikan nominal dan menampilkan input deskripsi.
- Tombol **Simpan & Buat Surat**: `POST /api/donatur/surat` dengan `{ donasi: {...}, nomorSurat, tanggalSurat }`; 409 → tampilkan pesan + tombol "Pakai nomor <nomorUsulan>"; 400 → tampilkan error per field; sukses → `router.push('/donatur/surat/' + data.id)`.
- Panel pratinjau (kanan di desktop, di bawah form pada HP) memakai `<PratinjauSurat data={hitungPratinjau(state)} />`.

- [ ] **Step 3: `components/donatur/PratinjauSurat.tsx`**

```tsx
'use client';
import type { SuratData } from '@/lib/surat/data';
import { labelSapaan } from '@/lib/surat/data';

/** Pratinjau ringkas — tata letak PNG final dibuat server (SuratTemplate). */
export function PratinjauSurat({ data }: { data: SuratData }) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3 text-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pratinjau surat</p>
      <p className="font-bold">{data.nomorSurat}</p>
      <p>Tempel, {data.tanggalTeks}</p>
      <p>Kepada Yth. {labelSapaan(data.sapaan)} <span className="font-bold">{data.namaDonatur || '—'}</span></p>
      {data.barisNilai.tipe === 'UANG' ? (
        <div className="space-y-1">
          <p>Rp. <span className="font-bold">{data.barisNilai.rupiah}</span></p>
          <p className="italic">Terbilang: {data.barisNilai.terbilang} Rupiah</p>
        </div>
      ) : (
        <p>Berupa: <span className="font-bold">{data.barisNilai.deskripsi}</span></p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: `components/donatur/PilihDonatur.tsx`**

Client component: kolom cari (`GET /api/donatur?q=`), daftar hasil (nama + no. WA) yang dapat diklik, dan tombol "Donatur baru" yang membuka blok input (nama, sapaan, no. WA). Props: `value: { donaturId?: string; nama: string; sapaan: Sapaan; noWa: string }`, `onChange(value)`. Tombol/baris hasil tingginya ≥44 px.

- [ ] **Step 5: Halaman** — `app/(donatur)/donatur/surat/baru/page.tsx`

```tsx
import { FormSurat } from '@/components/donatur/FormSurat';

export const metadata = { title: 'Buat Surat — BQ-ku' };

export default function BuatSuratPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Buat Surat Ucapan Terima Kasih</h1>
        <p className="text-sm text-slate-500">Isi data donatur dan donasi, surat akan dibuat otomatis.</p>
      </header>
      <FormSurat />
    </div>
  );
}
```

- [ ] **Step 6: Verifikasi**

Run: `npx vitest run tests/components/form-surat.test.ts && npx tsc --noEmit -p .` → PASS.
Dev: buat satu surat untuk donatur baru; pastikan nomor otomatis terisi, terbilang berubah saat nominal diketik, dan setelah simpan diarahkan ke halaman detail surat.

- [ ] **Step 7: Commit**

```bash
git add app/\(donatur\)/donatur/surat components/donatur tests/components/form-surat.test.ts
git commit -m "feat(donatur): letter form with live preview and auto letter number

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Detail surat, unduh PNG, dan kirim WhatsApp

**Files:**
- Create: `app/(donatur)/donatur/surat/[id]/page.tsx`, `app/(donatur)/donatur/surat/page.tsx`, `components/donatur/TombolKirimWa.tsx`, `components/donatur/DaftarSurat.tsx`
- Test: `tests/donatur/pesan-wa.test.ts`

**Interfaces:**
- Produces: `pesanUcapan(nama: string, nomorSurat: string): string` (di `lib/surat/pesan.ts`), `<TombolKirimWa surat={...} />`.

- [ ] **Step 1: Test teks pesan (gagal dulu)** — `tests/donatur/pesan-wa.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { pesanUcapan, waLink } from '@/lib/surat/pesan';

describe('pesan WhatsApp', () => {
  it('menyebut nama donatur dan nomor surat', () => {
    const t = pesanUcapan('Bapak Pradana', '271/PBQ/IX/2026');
    expect(t).toContain('Bapak Pradana');
    expect(t).toContain('271/PBQ/IX/2026');
    expect(t).toMatch(/terima kasih/i);
  });
  it('membuat tautan wa dengan nomor 62', () => {
    expect(waLink('628123456789', 'halo')).toBe('https://wa.me/628123456789?text=halo');
  });
  it('mengabaikan nomor kosong', () => {
    expect(waLink(null, 'halo')).toBeNull();
  });
});
```
Run → FAIL.

- [ ] **Step 2: `lib/surat/pesan.ts`**

```ts
export function pesanUcapan(namaLengkapDenganSapaan: string, nomorSurat: string): string {
  return [
    `Assalamu'alaikum Wr. Wb.`,
    ``,
    `${namaLengkapDenganSapaan}, terima kasih atas zakat/infaq/shadaqah yang telah disalurkan kepada Panti Asuhan Baitul Qowwam.`,
    `Berikut kami lampirkan surat ucapan terima kasih (No. ${nomorSurat}).`,
    ``,
    `Jazakumullahu khairan jazaa.`,
    `Pengurus Panti Asuhan Baitul Qowwam`,
  ].join('\n');
}

export function waLink(noWa: string | null | undefined, pesan: string): string | null {
  if (!noWa) return null;
  return `https://wa.me/${noWa}?text=${encodeURIComponent(pesan)}`;
}
```
Run → PASS.

- [ ] **Step 3: `components/donatur/TombolKirimWa.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { WhatsappLogo, DownloadSimple, CheckCircle } from '@phosphor-icons/react';
import { pesanUcapan, waLink } from '@/lib/surat/pesan';
import { labelSapaan } from '@/lib/surat/data';
import type { SuratWithRelasi } from '@/lib/db/donatur-repo';

export function TombolKirimWa({ surat, onTerkirim }: { surat: SuratWithRelasi; onTerkirim?: () => void }) {
  const [sibuk, setSibuk] = useState(false);
  const [pesanError, setPesanError] = useState<string | null>(null);
  const donatur = surat.donasi.donatur;
  const sapaanNama = `${labelSapaan(donatur.sapaan)} ${donatur.nama}`;
  const teks = pesanUcapan(sapaanNama, surat.nomorSurat);
  const namaFile = `${surat.nomorSurat.replace(/\//g, '-')}.png`;

  const ambilFile = async () => {
    const res = await fetch(`/api/donatur/surat/${surat.id}/png`);
    if (!res.ok) throw new Error('Gagal mengambil gambar surat');
    return new File([await res.blob()], namaFile, { type: 'image/png' });
  };

  const kirim = async () => {
    setSibuk(true); setPesanError(null);
    try {
      const file = await ambilFile();
      const bisaShare = typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [file] });
      if (bisaShare) {
        await navigator.share({ files: [file], text: teks });
      } else {
        // Desktop: unduh gambar, salin teks, buka WhatsApp Web ke nomor donatur
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url; a.download = namaFile; a.click();
        URL.revokeObjectURL(url);
        try { await navigator.clipboard.writeText(teks); } catch { /* clipboard bisa ditolak */ }
        const link = waLink(donatur.noWa, teks);
        if (link) window.open(link.replace('https://wa.me/', 'https://web.whatsapp.com/send?phone=').replace('?text=', '&text='), '_blank');
        setPesanError('Gambar sudah diunduh dan teks disalin. Tempel gambarnya (Ctrl+V) di chat WhatsApp yang terbuka.');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') setPesanError(e.message || 'Gagal mengirim');
    } finally { setSibuk(false); }
  };

  const tandai = async () => {
    await fetch(`/api/donatur/surat/${surat.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ terkirimWa: true }),
    });
    onTerkirim?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={kirim} disabled={sibuk || !donatur.noWa}
          className="h-12 px-5 rounded-2xl bg-[#0E9F54] hover:bg-[#0c8a49] disabled:opacity-50 text-white font-bold inline-flex items-center gap-2">
          <WhatsappLogo size={22} weight="bold" /> {sibuk ? 'Menyiapkan…' : 'Kirim WhatsApp'}
        </button>
        <a href={`/api/donatur/surat/${surat.id}/png`} download={namaFile}
          className="h-12 px-5 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold inline-flex items-center gap-2">
          <DownloadSimple size={20} weight="bold" /> Unduh PNG
        </a>
        {!surat.terkirimWa && (
          <button type="button" onClick={tandai}
            className="h-12 px-5 rounded-2xl border border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300 font-bold inline-flex items-center gap-2">
            <CheckCircle size={20} weight="bold" /> Tandai sudah terkirim
          </button>
        )}
      </div>
      {!donatur.noWa && <p className="text-xs text-amber-600">Donatur belum punya nomor WhatsApp — lengkapi dulu di data donatur.</p>}
      {pesanError && <p role="status" className="text-xs text-slate-600 dark:text-slate-300">{pesanError}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Halaman detail surat** — `app/(donatur)/donatur/surat/[id]/page.tsx`

Server component: `requireRoom('donatur')` lewat `createServerSupabase()` + `getSurat`; `notFound()` bila kosong. Tampilkan: nomor & tanggal, donatur (nama, sapaan, no. WA), nilai donasi (Rp + terbilang atau barang), status terkirim, gambar surat (`<img src={'/api/donatur/surat/'+id+'/png'} className="w-full rounded-2xl border" />`), dan `<TombolKirimWa surat={surat} />` (client, `surat` dioper sebagai prop serializable).

- [ ] **Step 5: Daftar surat** — `app/(donatur)/donatur/surat/page.tsx` + `components/donatur/DaftarSurat.tsx`

Client: `GET /api/donatur/surat?dari=&sampai=`; filter bulan (default bulan berjalan) dan status (Semua / Belum terkirim / Sudah terkirim). Desktop tabel (Nomor, Tanggal, Donatur, Nilai, Status, Aksi), mobile kartu. Aksi: buka detail, unduh PNG.

- [ ] **Step 6: Verifikasi**

Run: `npx vitest run tests/donatur && npx tsc --noEmit -p .`
Dev di HP (viewport 375 / perangkat asli): tombol Kirim WhatsApp memunculkan share sheet dengan gambar; di desktop: PNG terunduh, WhatsApp Web terbuka ke nomor donatur.

- [ ] **Step 7: Commit**

```bash
git add app/\(donatur\)/donatur/surat components/donatur lib/surat/pesan.ts tests/donatur
git commit -m "feat(donatur): letter detail, PNG download and WhatsApp image sharing

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: Daftar donatur, detail, dan "Donasi lagi"

**Files:**
- Create: `app/(donatur)/donatur/daftar/page.tsx`, `app/(donatur)/donatur/daftar/[id]/page.tsx`, `components/donatur/DaftarDonatur.tsx`, `components/donatur/DetailDonatur.tsx`

- [ ] **Step 1: `components/donatur/DaftarDonatur.tsx`**

Client: kolom cari (debounce 300 ms) → `GET /api/donatur?q=`; daftar kartu berisi nama, sapaan, no. WA, jumlah donasi; klik → `/donatur/daftar/<id>`; tombol "Donatur baru" membuka modal (nama, sapaan, no. WA, alamat) → `POST /api/donatur`.

- [ ] **Step 2: `components/donatur/DetailDonatur.tsx`**

Menerima `donatur` (dengan `donasi[]`) dari server component. Menampilkan identitas + tombol **Donasi lagi** yang menuju `/donatur/surat/baru?donaturId=<id>` (FormSurat membaca `searchParams` dan langsung memuat donatur itu), serta riwayat donasi (tanggal, jenis, nilai/barang, nomor surat bila ada).

- [ ] **Step 3: Halaman**

`app/(donatur)/donatur/daftar/page.tsx` → header + `<DaftarDonatur />`.
`app/(donatur)/donatur/daftar/[id]/page.tsx` → server: `getDonatur(await createServerSupabase(), id)`, `notFound()` bila kosong, render `<DetailDonatur donatur={donatur} />`.

- [ ] **Step 4: Dukungan `?donaturId=` di FormSurat**

Di `FormSurat`, baca `useSearchParams().get('donaturId')`; bila ada, panggil `GET /api/donatur/<id>` sekali dan isi state donatur (nama, sapaan, noWa) serta tandai sebagai donatur lama. Bungkus halaman dengan `<Suspense>` karena `useSearchParams` memerlukannya.

- [ ] **Step 5: Verifikasi**

Run: `npx tsc --noEmit -p . && npx vitest run`.
Dev: buat donatur, buka detailnya, klik "Donasi lagi" → form terisi nama & sapaan, tinggal isi nominal.

- [ ] **Step 6: Commit**

```bash
git add app/\(donatur\)/donatur/daftar components/donatur
git commit -m "feat(donatur): donor list, detail and repeat-donation shortcut

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 15: Rekap donasi + export

**Files:**
- Create: `app/api/donatur/rekap/route.ts`, `app/(donatur)/donatur/rekap/page.tsx`, `components/donatur/Rekap.tsx`, `lib/utils/csv.ts`
- Test: `tests/utils/csv.test.ts`

**Interfaces:**
- Produces: `GET /api/donatur/rekap?dari=&sampai=` → `{ data: Rekap }`; `toCsv(rows: Array<Record<string, string | number>>): string`.

- [ ] **Step 1: Test CSV (gagal dulu)** — `tests/utils/csv.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { toCsv } from '@/lib/utils/csv';

describe('toCsv', () => {
  it('menulis header dari kunci baris pertama', () => {
    expect(toCsv([{ nama: 'Ani', total: 1000 }])).toBe('nama,total\nAni,1000');
  });
  it('mengutip nilai yang mengandung koma atau kutip', () => {
    expect(toCsv([{ nama: 'Ani, S.Pd', ket: 'dia bilang "ya"' }]))
      .toBe('nama,ket\n"Ani, S.Pd","dia bilang ""ya"""');
  });
  it('mengembalikan string kosong untuk data kosong', () => {
    expect(toCsv([])).toBe('');
  });
});
```
Run → FAIL.

- [ ] **Step 2: `lib/utils/csv.ts`**

```ts
export function toCsv(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return '';
  const kolom = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [kolom.join(','), ...rows.map(r => kolom.map(k => escape(r[k] ?? '')).join(','))].join('\n');
}
```
Run → PASS.

- [ ] **Step 3: `app/api/donatur/rekap/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { rekap } from '@/lib/db/donatur-repo';
import { rekapQuerySchema } from '@/lib/validation/donatur';
import { validationResponse } from '@/lib/validation/errors';

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('donatur');
    const p = new URL(req.url).searchParams;
    const parsed = rekapQuerySchema.safeParse({ dari: p.get('dari'), sampai: p.get('sampai') });
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await rekap(supabase, parsed.data.dari, parsed.data.sampai) });
  } catch (e: any) {
    return authErrorResponse(e) ?? NextResponse.json({ error: 'Gagal memuat rekap: ' + e.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: `components/donatur/Rekap.tsx`**

Client. Filter periode: pilihan cepat (Bulan ini, 3 bulan, Tahun ini) + rentang tanggal manual. Tampilkan:
- Tiga kartu angka: **Total donasi uang** (Rp), **Jumlah donasi uang**, **Jumlah donasi barang**.
- Grafik batang per bulan dari `perBulan`, dibuat dengan `div` ber-`height` proporsional (tanpa pustaka grafik), setiap batang punya `title` dan label bulan; nilai ditulis di atas batang.
- Tabel "Donasi barang" (Tanggal, Donatur, Barang).
- Tombol **Export CSV**: `toCsv` dari `perBulan` (bulan,total) digabung bagian barang; unduh via `Blob` + `<a download="rekap-<dari>-<sampai>.csv">`.

- [ ] **Step 5: Halaman** — `app/(donatur)/donatur/rekap/page.tsx`

```tsx
import { Rekap } from '@/components/donatur/Rekap';

export const metadata = { title: 'Rekap Donasi — BQ-ku' };

export default function RekapPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Rekap Donasi</h1>
        <p className="text-sm text-slate-500">Total donasi uang per periode dan daftar donasi barang.</p>
      </header>
      <Rekap />
    </div>
  );
}
```

- [ ] **Step 6: Verifikasi**

Run: `npx vitest run tests/utils/csv.test.ts && npx tsc --noEmit -p .`
Dev: buat beberapa donasi uang & barang lintas bulan, buka `/donatur/rekap`, pastikan total benar, grafik proporsional, CSV terunduh dan terbuka rapi di spreadsheet.

- [ ] **Step 7: Commit**

```bash
git add app/api/donatur/rekap app/\(donatur\)/donatur/rekap components/donatur/Rekap.tsx lib/utils/csv.ts tests/utils/csv.test.ts
git commit -m "feat(donatur): donation recap with monthly chart and CSV export

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 16: Beranda ruang donatur & verifikasi akhir

**Files:**
- Modify: `app/(donatur)/donatur/page.tsx`
- Create: `components/donatur/RingkasanDonatur.tsx`

- [ ] **Step 1: `components/donatur/RingkasanDonatur.tsx`**

Client. Saat mount: `GET /api/donatur/rekap?dari=<awal bulan>&sampai=<akhir bulan>` dan `GET /api/donatur/surat?limit=5`. Tampilkan empat kartu (Total uang bulan ini, Jumlah donasi, Donasi barang, Surat terkirim bulan ini), daftar 5 surat terakhir (nomor, donatur, status), dan tombol besar **Buat Surat** (`/donatur/surat/baru`). Gaya kartu mengikuti beranda ruang santri, aksen biru-hijau.

- [ ] **Step 2: Ganti halaman sementara**

```tsx
import { RingkasanDonatur } from '@/components/donatur/RingkasanDonatur';

export const metadata = { title: 'Ruang Donatur — BQ-ku' };

export default function DonaturHomePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Ruang Donatur</h1>
        <p className="text-sm text-slate-500">Ringkasan donasi dan surat ucapan terima kasih.</p>
      </header>
      <RingkasanDonatur />
    </div>
  );
}
```

- [ ] **Step 3: Verifikasi otomatis**

```bash
npx vitest run && npx tsc --noEmit -p . && npm run build
```
Expected: semua PASS, 0 error, build sukses.

- [ ] **Step 4: Verifikasi manual (dev)**

- Akun hanya `ADMIN_SANTRI`: `/donatur` → redirect `/`; `curl /api/donatur` → 403.
- Akun hanya `ADMIN_DONATUR`: `/` → redirect `/donatur`; menu santri tidak muncul; `/api/santri` → 403.
- Akun `SUPERADMIN`: tombol Pindah Ruang muncul di sidebar dan di bottom nav HP (menggantikan tombol tema); tema masih bisa diubah lewat drawer akun.
- Alur penuh: buat donatur → buat surat → PNG tampil benar (kop, nominal, terbilang, stempel, TTD, baris Arab) → kirim WA dari HP dengan gambar terlampir → tandai terkirim → muncul di daftar surat & rekap.
- Uji nomor surat ganda: buat surat dengan nomor yang sudah ada → 409 + tawaran nomor baru.

- [ ] **Step 5: Commit & laporan**

```bash
git add app/\(donatur\)/donatur/page.tsx components/donatur/RingkasanDonatur.tsx
git commit -m "feat(donatur): room dashboard with monthly summary and recent letters

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
Laporkan ke pemilik: dua migrasi yang harus dijalankan (`0003`, `0004`), dan bahwa peran akun lama `PANITIA` kini menjadi `ADMIN_SANTRI`.
