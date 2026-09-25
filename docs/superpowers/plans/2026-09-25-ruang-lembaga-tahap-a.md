# Ruang Lembaga Tahap A — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah peran `PENGURUS` dan ruangan ketiga "Lembaga" (baca saja) berisi daftar/detail santri, donatur, surat, serta beranda ringkasan.

**Architecture:** Ruangan = mode kerja. `PENGURUS` mendapat izin RLS *select* saja (tanpa tabel `documents` & scan storage) plus fungsi `status_berkas_santri()`. Halaman `/lembaga/*` memakai ulang komponen yang ada lewat konstanta mode (`lib/ruang/mode.ts`) + context klien `ModeRuang`; mode bawaan = mode kerja sehingga Ruang Santri/Donatur tidak berubah. Angka beranda dihitung fungsi murni `lib/lembaga/ringkasan.ts` dari satu endpoint.

**Tech Stack:** Next.js 16 App Router (baca `node_modules/next/dist/docs/` bila ragu), React 19, TypeScript, Supabase (RLS, storage), Tailwind, Vitest + `react-dom/server` untuk tes komponen, Phosphor icons.

**Spec:** `docs/superpowers/specs/2026-09-25-ruang-lembaga-tahap-a-design.md`

## Global Constraints

- Bahasa UI & komentar: Indonesia; nama variabel mengikuti gaya kode sekitar (Indonesia).
- Label peran: `PENGURUS` → **"Pengurus Yayasan"**.
- Ruangan: `'santri' | 'donatur' | 'lembaga'`; `ROOM_HOME.lembaga = '/lembaga'`, `ROOM_LABEL.lembaga = 'Ruang Lembaga'`, `ROOM_AKUN.lembaga = '/lembaga/akun'`.
- Pengurus **tidak pernah** mendapat akses ke tabel `documents` atau scan berkas di storage; tidak ada policy insert/update/delete untuk `PENGURUS`.
- Semua halaman `/lembaga/*` & route `/api/lembaga/*` memakai klien Supabase ber-RLS milik pengguna — **jangan** `createAdminSupabase`.
- Ruang Santri & Ruang Donatur tidak boleh berubah perilaku; semua tes yang ada harus tetap lulus.
- Warna ruangan: Santri hijau (`BookOpen`), Donatur biru (`HandCoins`), Lembaga ungu (`Buildings`).
- Perintah tes: `npx vitest run <path>`; seluruh tes: `npx vitest run`; tipe: `npx tsc --noEmit -p .`.
- Setiap commit diakhiri baris `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Setelah `next build`, jalankan `git checkout next-env.d.ts` (build dev/prod mengubahnya; jangan di-commit).

---

## File Structure

| File | Tanggung jawab |
|---|---|
| `supabase/migrations/0010_peran_pengurus.sql` (baru) | Constraint peran, policy select Pengurus, fungsi `status_berkas_santri()`, policy storage foto & PNG surat |
| `lib/auth/roles.ts`, `lib/validation/pengguna.ts`, `components/pengguna/PenggunaTable.tsx` | Peran `PENGURUS` |
| `lib/auth/rooms.ts`, `proxy.ts` | Ruangan `lembaga` |
| `components/layout/ikon-ruang.ts` (baru) | Ikon & warna tiap ruangan |
| `lib/nav/menu.ts`, `components/layout/ikon-menu.ts`, `RailSidebar.tsx`, `RoomSwitchButton.tsx`, `components/akun/HalamanAkun.tsx` | Navigasi 3 ruangan |
| `lib/ruang/mode.ts` (baru) | Konstanta `MODE_KERJA`/`MODE_LEMBAGA`, `padananKerja()` |
| `components/ruang/ModeRuang.tsx` (baru) | Provider & hook `useModeRuang()` |
| `components/ruang/BilahModeBaca.tsx` (baru) | Bilah "Mode baca · Ubah di Ruang …" |
| `components/santri/BarisSantri.tsx`, `components/directory/SantriDirectory.tsx`, `components/profile/DetailSantri.tsx`, `components/profile/TabBerkas.tsx` | Mode baca santri |
| `lib/db/lembaga-repo.ts` (baru) | Santri tanpa `documents(*)` + status berkas dari RPC + tanda tangan foto saja |
| `components/donatur/DaftarDonatur.tsx`, `DetailDonatur.tsx`, `DaftarSurat.tsx` | Mode baca donatur & surat |
| `lib/surat/render-png.tsx` (baru) | Render PNG surat + respons, dipakai route donatur & lembaga |
| `app/api/lembaga/{donatur,surat,surat/[id]/png,ringkasan}/route.ts(x)` (baru) | API baca-saja |
| `app/(lembaga)/…` (baru) | Layout, loading, semua halaman Lembaga |
| `components/ruang/SegeraHadir.tsx` (baru) | Halaman placeholder |
| `lib/lembaga/ringkasan.ts` (baru) | Perhitungan ringkasan (fungsi murni) + CSV |
| `components/lembaga/BerandaLembaga.tsx`, `components/lembaga/BagianRingkasan.tsx` (baru) | Beranda |
| `components/donatur/beranda/GrafikTren.tsx` | Prop `judul` opsional |

---

### Task 1: Peran `PENGURUS` + migrasi `0010`

**Files:**
- Create: `supabase/migrations/0010_peran_pengurus.sql`
- Modify: `lib/auth/roles.ts`, `lib/validation/pengguna.ts`, `components/pengguna/PenggunaTable.tsx:14-24`
- Test: `tests/auth/roles.test.ts`, `tests/validation/pengguna.test.ts`

**Interfaces:**
- Produces: `UserRole` termasuk `'PENGURUS'`; `ALL_ROLES` = `['SUPERADMIN','PENGURUS','ADMIN_SANTRI','ADMIN_DONATUR','VIEWER']`; `getRoleLabel('PENGURUS') === 'Pengurus Yayasan'`; RPC `status_berkas_santri()` → `{ santriId, kategori, statusVerifikasi }[]`.

- [ ] **Step 1: Tulis tes gagal**

Tambahkan ke akhir `describe` di `tests/auth/roles.test.ts`:

```ts
  it('peran Pengurus Yayasan terdaftar', () => {
    expect(getRoleLabel('PENGURUS')).toBe('Pengurus Yayasan');
    expect(ALL_ROLES).toContain('PENGURUS');
  });
```
dan ubah import menjadi `import { canEditSantri, canDeleteSantri, canManageUsers, canManageDonatur, getRoleLabel, ALL_ROLES } from '@/lib/auth/roles';`.

Tambahkan ke `tests/validation/pengguna.test.ts` (di dalam `describe` yang ada untuk `invitePenggunaSchema`, atau `describe` baru):

```ts
import { invitePenggunaSchema } from '@/lib/validation/pengguna';

describe('peran PENGURUS', () => {
  it('diterima saat mengundang', () => {
    const r = invitePenggunaSchema.safeParse({ nama: 'Ketua', email: 'k@x.id', roles: ['PENGURUS', 'ADMIN_SANTRI'] });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/auth/roles.test.ts tests/validation/pengguna.test.ts`
Expected: FAIL (label mengembalikan `'PENGURUS'`, zod menolak `PENGURUS`).

- [ ] **Step 3: Implementasi**

`lib/auth/roles.ts`:
```ts
export type UserRole = 'SUPERADMIN' | 'PENGURUS' | 'ADMIN_SANTRI' | 'ADMIN_DONATUR' | 'VIEWER';
// ...
export const ALL_ROLES: UserRole[] = ['SUPERADMIN', 'PENGURUS', 'ADMIN_SANTRI', 'ADMIN_DONATUR', 'VIEWER'];
// di getRoleLabel, sebelum case 'ADMIN_SANTRI':
    case 'PENGURUS': return 'Pengurus Yayasan';
```

`lib/validation/pengguna.ts`:
```ts
export const roleEnum = z.enum(['SUPERADMIN', 'PENGURUS', 'ADMIN_SANTRI', 'ADMIN_DONATUR', 'VIEWER']);
```

`components/pengguna/PenggunaTable.tsx` — tambah ke `ROLE_BADGE` (filter ruangan Lembaga ditambahkan di Task 2):
```ts
  PENGURUS: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
```

`supabase/migrations/0010_peran_pengurus.sql`:
```sql
-- 0010: Peran PENGURUS (Pengurus Yayasan) untuk Ruang Lembaga — BACA SAJA.
-- Pengurus boleh membaca santri, donatur, donasi, surat, foto santri, dan PNG surat.
-- Pengurus TIDAK boleh membaca tabel documents (memuat rawOcrText/extractedFields)
-- maupun file scan berkas santri; status berkas hanya lewat status_berkas_santri().
-- Tidak ada izin tulis. Izin peran lain tidak berubah. Aman dijalankan ulang.

-- A. Nilai peran yang sah
alter table public.profiles drop constraint if exists profiles_roles_valid;
alter table public.allowed_emails drop constraint if exists allowed_emails_roles_valid;
alter table public.profiles add constraint profiles_roles_valid
  check (roles <@ array['SUPERADMIN','PENGURUS','ADMIN_SANTRI','ADMIN_DONATUR','VIEWER'] and cardinality(roles) >= 1);
alter table public.allowed_emails add constraint allowed_emails_roles_valid
  check (roles <@ array['SUPERADMIN','PENGURUS','ADMIN_SANTRI','ADMIN_DONATUR','VIEWER'] and cardinality(roles) >= 1);

-- B. Baca santri
drop policy if exists "santri: baca" on public.santri;
create policy "santri: baca" on public.santri for select to authenticated
  using (public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI') or public.has_role('VIEWER') or public.has_role('PENGURUS'));

-- C. Baca donatur, donasi, surat (nomor_surat_counter sengaja tidak)
do $$
declare t text;
begin
  foreach t in array array['donatur','donasi','surat'] loop
    execute format('drop policy if exists "%1$s: baca" on public.%1$I', t);
    execute format('create policy "%1$s: baca" on public.%1$I for select to authenticated using (public.has_role(''SUPERADMIN'') or public.has_role(''ADMIN_DONATUR'') or public.has_role(''PENGURUS''))', t);
  end loop;
end $$;

-- D. Status berkas tanpa isi berkas
create or replace function public.status_berkas_santri()
returns table ("santriId" text, kategori text, "statusVerifikasi" text)
language sql stable security definer set search_path = public as $$
  select d."santriId", d.kategori, d."statusVerifikasi"
  from public.documents d
  where public.has_role('SUPERADMIN') or public.has_role('ADMIN_SANTRI')
     or public.has_role('VIEWER') or public.has_role('PENGURUS');
$$;
revoke all on function public.status_berkas_santri() from public;
grant execute on function public.status_berkas_santri() to authenticated;

-- E. Storage: foto santri (hanya path yang tercatat sebagai foto)
drop policy if exists "foto santri: baca pengurus" on storage.objects;
create policy "foto santri: baca pengurus" on storage.objects for select to authenticated
  using (
    bucket_id = 'berkas'
    and public.has_role('PENGURUS')
    and exists (
      select 1 from public.santri s
      where s."fotoFormalPath" = storage.objects.name or s."fotoProfilPath" = storage.objects.name
    )
  );

-- F. Storage: PNG surat
drop policy if exists "berkas surat: baca" on storage.objects;
create policy "berkas surat: baca" on storage.objects for select to authenticated
  using (
    bucket_id = 'berkas'
    and (storage.foldername(name))[1] = 'surat'
    and (public.has_role('SUPERADMIN') or public.has_role('ADMIN_DONATUR') or public.has_role('PENGURUS'))
  );
```

- [ ] **Step 4: Jalankan tes & tipe**

Run: `npx vitest run tests/auth/roles.test.ts tests/validation/pengguna.test.ts && npx tsc --noEmit -p .`
Expected: PASS, tanpa galat tipe.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0010_peran_pengurus.sql lib/auth/roles.ts lib/validation/pengguna.ts components/pengguna/PenggunaTable.tsx tests/auth/roles.test.ts tests/validation/pengguna.test.ts
git commit -m "feat(auth): peran PENGURUS (Pengurus Yayasan) + migrasi 0010 izin baca saja"
```

---

### Task 2: Ruangan `lembaga` di penjaga ruangan

**Files:**
- Modify: `lib/auth/rooms.ts`, `proxy.ts:71`, `components/pengguna/PenggunaTable.tsx` (filter ruangan)
- Test: `tests/auth/rooms.test.ts`, `tests/auth/proxy.test.ts`

**Interfaces:**
- Consumes: `UserRole` dengan `'PENGURUS'` (Task 1).
- Produces: `Room = 'santri' | 'donatur' | 'lembaga'`; `roomsFor(['PENGURUS'])` → `['lembaga']`; `roomsFor(['SUPERADMIN'])` → `['santri','donatur','lembaga']`; `roomOfPath('/lembaga/x')` → `'lembaga'`; `ROOM_HOME/ROOM_LABEL/ROOM_AKUN.lembaga`.

- [ ] **Step 1: Tulis tes gagal**

Di `tests/auth/rooms.test.ts`, ubah harapan Superadmin dan tambah kasus:
```ts
    expect(roomsFor(['SUPERADMIN'])).toEqual(['santri', 'donatur', 'lembaga']);
    expect(roomsFor(['PENGURUS'])).toEqual(['lembaga']);
    expect(roomsFor(['PENGURUS', 'ADMIN_SANTRI'])).toEqual(['santri', 'lembaga']);
```
```ts
    expect(roomOfPath('/lembaga')).toBe('lembaga');
    expect(roomOfPath('/lembaga/santri/abc')).toBe('lembaga');
    expect(roomOfPath('/api/lembaga/ringkasan')).toBe('lembaga');
    expect(roomOfPath('/lembagaku')).toBe('santri');
```
```ts
    expect(ROOM_HOME.lembaga).toBe('/lembaga');
```
dan di `resolveLandingPath`:
```ts
  it('pengguna yang hanya Pengurus masuk ke Ruang Lembaga', () => {
    expect(resolveLandingPath(['PENGURUS'], null)).toBe('/lembaga');
    expect(resolveLandingPath(['SUPERADMIN'], 'lembaga')).toBe('/lembaga');
  });
```

Di `tests/auth/proxy.test.ts` (dalam `describe('proxy: penjaga ruangan')`):
```ts
  it('PENGURUS membuka /santri → redirect ke /lembaga', async () => {
    loggedIn(['PENGURUS']);
    const res = await proxy(req('/santri'));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/lembaga');
  });

  it('PENGURUS memanggil /api/donatur → 403', async () => {
    loggedIn(['PENGURUS']);
    expect((await proxy(req('/api/donatur'))).status).toBe(403);
  });

  it('PENGURUS membuka /lembaga → diteruskan, cookie bq_room=lembaga', async () => {
    loggedIn(['PENGURUS']);
    const res = await proxy(req('/lembaga'));
    expect(res.headers.get('location')).toBeNull();
    expect(res.cookies.get('bq_room')?.value).toBe('lembaga');
  });

  it('ADMIN_SANTRI membuka /lembaga → redirect ke /', async () => {
    loggedIn(['ADMIN_SANTRI']);
    const res = await proxy(req('/lembaga'));
    expect(new URL(res.headers.get('location')!).pathname).toBe('/');
  });

  it('tanpa peran membuka /lembaga → redirect ke /', async () => {
    loggedIn([], false);
    const res = await proxy(req('/lembaga'));
    expect(new URL(res.headers.get('location')!).pathname).toBe('/');
  });
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/auth`
Expected: FAIL pada kasus lembaga.

- [ ] **Step 3: Implementasi**

`lib/auth/rooms.ts`:
```ts
export type Room = 'santri' | 'donatur' | 'lembaga';

export const ROOM_COOKIE = 'bq_room';
export const ROOM_HOME: Record<Room, string> = { santri: '/', donatur: '/donatur', lembaga: '/lembaga' };
export const ROOM_LABEL: Record<Room, string> = { santri: 'Ruang Santri', donatur: 'Ruang Donatur', lembaga: 'Ruang Lembaga' };

export function roomsFor(roles: UserRole[]): Room[] {
  const out: Room[] = [];
  if (roles.some(r => r === 'SUPERADMIN' || r === 'ADMIN_SANTRI' || r === 'VIEWER')) out.push('santri');
  if (roles.some(r => r === 'SUPERADMIN' || r === 'ADMIN_DONATUR')) out.push('donatur');
  if (roles.some(r => r === 'SUPERADMIN' || r === 'PENGURUS')) out.push('lembaga');
  return out;
}
```
`ROOM_AKUN`:
```ts
export const ROOM_AKUN: Record<Room, string> = { santri: '/akun', donatur: '/donatur/akun', lembaga: '/lembaga/akun' };
```
`roomOfPath`:
```ts
/** Ruangan yang dituju sebuah path. Default: santri. */
export function roomOfPath(pathname: string): Room {
  const di = (awal: string) => pathname === awal || pathname.startsWith(awal + '/');
  if (di('/lembaga') || di('/api/lembaga')) return 'lembaga';
  if (di('/donatur') || di('/api/donatur')) return 'donatur';
  return 'santri';
}
```
(Perhatikan: versi lama memakai `pathname.startsWith('/api/donatur')` tanpa batas segmen; `di('/api/donatur')` setara untuk semua route yang ada — `/api/donatur` dan `/api/donatur/...`.)

`proxy.ts` — blok "tidak punya ruangan": ganti `target === 'donatur'` menjadi `target !== 'santri'` dan perbarui komentar:
```ts
    if (rooms.length === 0 && target !== 'santri') {
      // Tidak punya ruangan sama sekali (profil belum ada/nonaktif/gagal dimuat): ruang santri
      // tetap dilewatkan (halaman "Akun belum diaktifkan" yang menangani, tanpa loop redirect),
      // tapi ruang donatur & lembaga tetap ditolak.
```

`components/pengguna/PenggunaTable.tsx` — `RUANGAN_FILTER` tambah `{ value: 'lembaga', label: ROOM_LABEL.lembaga }`.

- [ ] **Step 4: Jalankan tes & tipe**

Run: `npx vitest run tests/auth && npx tsc --noEmit -p .`
Expected: PASS. Bila `tsc` menunjuk `Record<Room, …>` lain yang kurang kunci `lembaga`, lengkapi di file itu (mis. `components/layout/RailSidebar.tsx` belum memakai Record — dibereskan di Task 3).

- [ ] **Step 5: Commit**

```bash
git add lib/auth/rooms.ts proxy.ts components/pengguna/PenggunaTable.tsx tests/auth/rooms.test.ts tests/auth/proxy.test.ts
git commit -m "feat(auth): ruangan ketiga lembaga untuk Superadmin & Pengurus"
```

---

### Task 3: Navigasi 3 ruangan (menu, rail, bottom nav, Akun)

**Files:**
- Create: `components/layout/ikon-ruang.ts`
- Modify: `lib/nav/menu.ts`, `components/layout/ikon-menu.ts`, `components/layout/RailSidebar.tsx:43-46`, `components/layout/RoomSwitchButton.tsx`, `components/akun/HalamanAkun.tsx:43,185-196`
- Test: `tests/layout/menu.test.ts`, `tests/layout/rail-sidebar.test.tsx`, `tests/layout/bottom-nav.test.tsx`, `tests/components/halaman-akun.test.tsx` (baru)

**Interfaces:**
- Consumes: `Room`, `ROOM_*` (Task 2).
- Produces: `KunciIkon` bertambah `'folder' | 'keuangan'`; `menuRail('lembaga')` → href `['/lembaga','/lembaga/santri','/lembaga/donatur','/lembaga/surat','/lembaga/berkas','/lembaga/keuangan']`; `slotHp('lembaga')` → `[tautan /lembaga, tautan /lembaga/santri, tautan utama /lembaga/berkas, tautan /lembaga/donatur, akun]`; `RUANG_TAMPILAN: Record<Room, { ikon: Icon; warna: WarnaUbin }>`.

- [ ] **Step 1: Tulis tes gagal**

`tests/layout/menu.test.ts` — tambah:
```ts
describe('Ruang Lembaga', () => {
  it('rail: Beranda, Santri, Donatur, Surat, Berkas lembaga, Keuangan', () => {
    expect(menuRail('lembaga', dua).map(i => i.href)).toEqual(
      ['/lembaga', '/lembaga/santri', '/lembaga/donatur', '/lembaga/surat', '/lembaga/berkas', '/lembaga/keuangan']);
  });
  it('bottom nav: 5 slot, tombol tengah Berkas lembaga', () => {
    const s = slotHp('lembaga', dua);
    expect(s.map(x => x.jenis)).toEqual(['tautan', 'tautan', 'tautan', 'tautan', 'akun']);
    expect(s[2]).toMatchObject({ utama: true, item: { href: '/lembaga/berkas' } });
    expect(s[3]).toMatchObject({ utama: false, item: { href: '/lembaga/donatur' } });
  });
  it('beranda lembaga hanya aktif di path persis', () => {
    expect(itemAktif('/lembaga', '/lembaga')).toBe(true);
    expect(itemAktif('/lembaga/santri', '/lembaga')).toBe(false);
  });
});
```
Perbarui juga loop `for (const room of ['donatur', 'santri'] as const)` di tes "tidak ada tujuan ganda" dan "label pendek" menjadi `['donatur', 'santri', 'lembaga'] as const`.

`tests/layout/rail-sidebar.test.tsx` — ubah mock `useAuth` agar `rooms: ['santri', 'donatur', 'lembaga']`, lalu:
```ts
  it('pindah ke setiap ruangan lain', () => {
    expect(h).toContain('Pindah ke Ruang Santri');
    expect(h).toContain('Pindah ke Ruang Lembaga');
    expect(h).not.toContain('Pindah ke Ruang Donatur');
  });
```

`tests/layout/bottom-nav.test.tsx` — tambah:
```ts
  it('ruang lembaga: tombol tengah Berkas lembaga, akun ke /lembaga/akun', () => {
    s.path = '/lembaga'; s.rooms = ['lembaga'];
    const h = renderToStaticMarkup(<BottomNav room="lembaga" />);
    expect(h.match(/<li/g)).toHaveLength(5);
    expect(h).toContain('aria-label="Berkas lembaga"');
    expect(h).toContain('href="/lembaga/akun"');
  });
```

`tests/components/halaman-akun.test.tsx` (baru):
```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));
vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { nama: 'Ucup', email: 'u@x' }, roles: ['SUPERADMIN'], rooms: ['santri', 'donatur', 'lembaga'], canManageUsers: true, logout: async () => {} }),
}));
vi.mock('@/components/theme/ThemeProvider', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: () => {} }) }));
vi.mock('@/components/notifikasi/NotifikasiProvider', () => ({ useNotifikasi: () => ({ daftar: [], total: 0, muatUlang: () => {} }) }));

import { HalamanAkun } from '@/components/akun/HalamanAkun';

describe('HalamanAkun dengan 3 ruangan', () => {
  it('satu baris pindah untuk setiap ruangan lain', () => {
    const h = renderToStaticMarkup(<HalamanAkun room="lembaga" />);
    expect(h).toContain('Pindah ke Ruang Santri');
    expect(h).toContain('Pindah ke Ruang Donatur');
    expect(h).not.toContain('Pindah ke Ruang Lembaga');
    expect(h).toContain('href="/donatur"');
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/layout tests/components/halaman-akun.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementasi**

`components/layout/ikon-ruang.ts` (baru):
```ts
import { BookOpen, HandCoins, Buildings, type Icon } from '@phosphor-icons/react';
import type { WarnaUbin } from '@/components/ui/IkonUbin';
import type { Room } from '@/lib/auth/rooms';

/** Ikon & warna identitas tiap ruangan (header rail, tombol pindah ruangan). */
export const RUANG_TAMPILAN: Record<Room, { ikon: Icon; warna: WarnaUbin }> = {
  santri: { ikon: BookOpen, warna: 'hijau' },
  donatur: { ikon: HandCoins, warna: 'biru' },
  lembaga: { ikon: Buildings, warna: 'ungu' },
};
```

`components/layout/ikon-menu.ts` — import `FolderSimple, Wallet` dan tambah:
```ts
  folder: FolderSimple,
  keuangan: Wallet,
```

`lib/nav/menu.ts`:
```ts
export type KunciIkon = 'beranda' | 'donatur' | 'surat' | 'direktori' | 'berkas' | 'pengguna' | 'tambah' | 'folder' | 'keuangan';
```
Tambah konstanta:
```ts
const BERANDA_LEMBAGA: ItemMenu = { href: '/lembaga', label: 'Beranda', labelPendek: 'Beranda', ikon: 'beranda', warna: 'hijau' };
const SANTRI_LEMBAGA: ItemMenu = { href: '/lembaga/santri', label: 'Santri', labelPendek: 'Santri', ikon: 'direktori', warna: 'biru' };
const DONATUR_LEMBAGA: ItemMenu = { href: '/lembaga/donatur', label: 'Donatur', labelPendek: 'Donatur', ikon: 'donatur', warna: 'biru' };
const SURAT_LEMBAGA: ItemMenu = { href: '/lembaga/surat', label: 'Surat', labelPendek: 'Surat', ikon: 'surat', warna: 'jingga' };
const BERKAS_LEMBAGA: ItemMenu = { href: '/lembaga/berkas', label: 'Berkas lembaga', labelPendek: 'Berkas', ikon: 'folder', warna: 'ungu' };
const KEUANGAN_LEMBAGA: ItemMenu = { href: '/lembaga/keuangan', label: 'Keuangan', labelPendek: 'Keuangan', ikon: 'keuangan', warna: 'hijau' };
```
`menuRail`:
```ts
export function menuRail(room: Room, o: OpsiMenu): ItemMenu[] {
  if (room === 'lembaga') return [BERANDA_LEMBAGA, SANTRI_LEMBAGA, DONATUR_LEMBAGA, SURAT_LEMBAGA, BERKAS_LEMBAGA, KEUANGAN_LEMBAGA];
  if (room === 'donatur') return [BERANDA_DONATUR, DAFTAR_DONATUR, DAFTAR_SURAT];
  return [BERANDA_SANTRI, DIREKTORI, INPUT_BERKAS, ...(o.canManageUsers ? [PENGGUNA] : [])];
}
```
`slotHp` — tambahkan cabang di awal:
```ts
  if (room === 'lembaga') {
    return [tautan(BERANDA_LEMBAGA), tautan(SANTRI_LEMBAGA), tautan(BERKAS_LEMBAGA, true), tautan(DONATUR_LEMBAGA), { jenis: 'akun' }];
  }
```
(pindahkan definisi `const tautan = …` ke baris pertama fungsi agar bisa dipakai cabang ini). Perbarui komentar JSDoc `slotHp` dengan satu kalimat: "Ruang Lembaga: Beranda, Santri, Berkas lembaga (tengah), Donatur, Akun."
`BERANDA`:
```ts
const BERANDA = new Set(['/', '/donatur', '/lembaga']);
```

`components/layout/RailSidebar.tsx` — ganti header ruangan:
```tsx
import { RUANG_TAMPILAN } from './ikon-ruang';
import { ROOM_HOME, ROOM_AKUN, ROOM_LABEL, type Room } from '@/lib/auth/rooms';
// ...
        <Link href={ROOM_HOME[room]} className={`${kelasBaris} mb-3`}>
          <IkonUbin ikon={RUANG_TAMPILAN[room].ikon} warna={RUANG_TAMPILAN[room].warna} doodle="bintang" />
          <span className={`${kelasLabel} font-extrabold text-bq-tinta`}>{ROOM_LABEL[room]}</span>
        </Link>
```
dan hapus import `BookOpen, HandCoins` yang tak terpakai.

`components/layout/RoomSwitchButton.tsx` — ganti seluruh isi:
```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { ROOM_HOME, ROOM_LABEL, roomOfPath } from '@/lib/auth/rooms';
import { RUANG_TAMPILAN } from './ikon-ruang';

/** Rail: satu tombol "Pindah ke …" untuk setiap ruangan lain yang dimiliki pengguna. */
export function RoomSwitchButton({ labelClassName }: { variant: 'rail'; labelClassName?: string }) {
  const { rooms } = useAuth();
  const pathname = usePathname();
  const current = roomOfPath(pathname);
  const lain = rooms.filter(r => r !== current);
  if (lain.length === 0) return null;
  return (
    <>
      {lain.map(r => (
        <Link key={r} href={ROOM_HOME[r]}
          className="goyang-saat-hover flex h-12 items-center gap-3 rounded-2xl px-1.5 text-bq-redup hover:bg-slate-100 hover:text-bq-tinta dark:hover:bg-slate-800/60">
          <IkonUbin ikon={RUANG_TAMPILAN[r].ikon} warna={RUANG_TAMPILAN[r].warna} />
          <span className={labelClassName}>Pindah ke {ROOM_LABEL[r]}</span>
        </Link>
      ))}
    </>
  );
}
```

`components/akun/HalamanAkun.tsx`:
- baris 43: `const ruangLain = rooms.filter(r => r !== room);`
- ganti blok `{ruangLain && (…)}` dengan:
```tsx
            {ruangLain.map(r => (
              <Link key={r} href={ROOM_HOME[r]} className={kelasBaris}>
                <span className="flex items-center gap-3">
                  <IkonUbin ikon={RUANG_TAMPILAN[r].ikon} warna={RUANG_TAMPILAN[r].warna} />
                  <span>
                    <span className="block text-sm font-bold text-bq-tinta">Pindah ke {ROOM_LABEL[r]}</span>
                    <span className="block text-xs text-bq-redup">Sekarang di {ROOM_LABEL[room]}</span>
                  </span>
                </span>
                <CaretRight size={16} weight="bold" className="text-bq-redup" aria-hidden="true" />
              </Link>
            ))}
```
- import `RUANG_TAMPILAN` dari `@/components/layout/ikon-ruang`; hapus `ArrowsLeftRight` dari import bila tak terpakai.

- [ ] **Step 4: Jalankan tes & tipe**

Run: `npx vitest run tests/layout tests/components && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/nav/menu.ts components/layout components/akun/HalamanAkun.tsx tests/layout tests/components/halaman-akun.test.tsx
git commit -m "feat(nav): menu Ruang Lembaga & pindah ruangan untuk tiga ruangan"
```

---

### Task 4: Mode ruang (konstanta, context, bilah Mode baca)

**Files:**
- Create: `lib/ruang/mode.ts`, `components/ruang/ModeRuang.tsx`, `components/ruang/BilahModeBaca.tsx`
- Test: `tests/ruang/mode.test.ts`, `tests/components/bilah-mode-baca.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  type NamaMode = 'kerja' | 'lembaga';
  type ModeRuang = {
    nama: NamaMode; bacaSaja: boolean;
    rute: { santriDaftar: string; santri: (id: string) => string; donaturDaftar: string; donatur: (id: string) => string; suratDaftar: string; surat: (id: string) => string };
    api: { donatur: string; surat: string; pngSurat: (id: string) => string };
  };
  MODE_KERJA, MODE_LEMBAGA, modeDari(nama): ModeRuang
  padananKerja(pathname): { room: 'santri' | 'donatur'; href: string } | null
  ModeRuangProvider({ mode: NamaMode, children }), useModeRuang(): ModeRuang
  BilahModeBaca()
  ```

- [ ] **Step 1: Tulis tes gagal**

`tests/ruang/mode.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { MODE_KERJA, MODE_LEMBAGA, modeDari, padananKerja } from '@/lib/ruang/mode';

describe('mode ruang', () => {
  it('mode kerja = alamat yang sudah ada', () => {
    expect(MODE_KERJA.bacaSaja).toBe(false);
    expect(MODE_KERJA.rute.santri('s1')).toBe('/santri/s1');
    expect(MODE_KERJA.rute.donatur('p1')).toBe('/donatur/daftar/p1');
    expect(MODE_KERJA.rute.surat('x')).toBe('/donatur/surat/x');
    expect(MODE_KERJA.api.donatur).toBe('/api/donatur');
    expect(MODE_KERJA.api.pngSurat('x')).toBe('/api/donatur/surat/x/png');
  });
  it('mode lembaga = baca saja, alamat /lembaga', () => {
    expect(MODE_LEMBAGA.bacaSaja).toBe(true);
    expect(MODE_LEMBAGA.rute.santriDaftar).toBe('/lembaga/santri');
    expect(MODE_LEMBAGA.rute.donatur('p1')).toBe('/lembaga/donatur/p1');
    expect(MODE_LEMBAGA.api.surat).toBe('/api/lembaga/surat');
    expect(MODE_LEMBAGA.api.pngSurat('x')).toBe('/api/lembaga/surat/x/png');
    expect(modeDari('lembaga')).toBe(MODE_LEMBAGA);
    expect(modeDari('kerja')).toBe(MODE_KERJA);
  });
  it('padanan halaman kerja dari halaman lembaga', () => {
    expect(padananKerja('/lembaga/santri/s1')).toEqual({ room: 'santri', href: '/santri/s1' });
    expect(padananKerja('/lembaga/santri')).toEqual({ room: 'santri', href: '/santri' });
    expect(padananKerja('/lembaga/donatur/p1')).toEqual({ room: 'donatur', href: '/donatur/daftar/p1' });
    expect(padananKerja('/lembaga/surat/x')).toEqual({ room: 'donatur', href: '/donatur/surat/x' });
    expect(padananKerja('/lembaga')).toBeNull();
    expect(padananKerja('/lembaga/berkas')).toBeNull();
  });
});
```

`tests/components/bilah-mode-baca.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const s = vi.hoisted(() => ({ path: '/lembaga/santri/s1', rooms: ['santri', 'lembaga'] as string[] }));
vi.mock('next/navigation', () => ({ usePathname: () => s.path }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));
vi.mock('@/components/auth/AuthProvider', () => ({ useAuth: () => ({ rooms: s.rooms }) }));

import { BilahModeBaca } from '@/components/ruang/BilahModeBaca';

describe('BilahModeBaca', () => {
  it('menampilkan Mode baca + tautan ubah bila berhak atas ruangan kerja', () => {
    const h = renderToStaticMarkup(<BilahModeBaca />);
    expect(h).toContain('Mode baca');
    expect(h).toContain('href="/santri/s1"');
    expect(h).toContain('Ubah di Ruang Santri');
  });
  it('tanpa tautan bila tidak punya ruangan kerja padanannya', () => {
    s.rooms = ['lembaga'];
    const h = renderToStaticMarkup(<BilahModeBaca />);
    expect(h).toContain('Mode baca');
    expect(h).not.toContain('Ubah di');
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/ruang tests/components/bilah-mode-baca.test.tsx`
Expected: FAIL (modul belum ada).

- [ ] **Step 3: Implementasi**

`lib/ruang/mode.ts`:
```ts
/**
 * Mode ruangan: "kerja" (Ruang Santri/Donatur, bisa mengubah) atau "lembaga" (baca saja).
 * Konstanta di sini boleh dipakai komponen server; komponen klien memakai useModeRuang().
 */
export type NamaMode = 'kerja' | 'lembaga';

export type ModeRuang = {
  nama: NamaMode;
  bacaSaja: boolean;
  rute: {
    santriDaftar: string; santri: (id: string) => string;
    donaturDaftar: string; donatur: (id: string) => string;
    suratDaftar: string; surat: (id: string) => string;
  };
  api: { donatur: string; surat: string; pngSurat: (id: string) => string };
};

export const MODE_KERJA: ModeRuang = {
  nama: 'kerja',
  bacaSaja: false,
  rute: {
    santriDaftar: '/santri', santri: id => `/santri/${id}`,
    donaturDaftar: '/donatur/daftar', donatur: id => `/donatur/daftar/${id}`,
    suratDaftar: '/donatur/surat', surat: id => `/donatur/surat/${id}`,
  },
  api: { donatur: '/api/donatur', surat: '/api/donatur/surat', pngSurat: id => `/api/donatur/surat/${id}/png` },
};

export const MODE_LEMBAGA: ModeRuang = {
  nama: 'lembaga',
  bacaSaja: true,
  rute: {
    santriDaftar: '/lembaga/santri', santri: id => `/lembaga/santri/${id}`,
    donaturDaftar: '/lembaga/donatur', donatur: id => `/lembaga/donatur/${id}`,
    suratDaftar: '/lembaga/surat', surat: id => `/lembaga/surat/${id}`,
  },
  api: { donatur: '/api/lembaga/donatur', surat: '/api/lembaga/surat', pngSurat: id => `/api/lembaga/surat/${id}/png` },
};

export function modeDari(nama: NamaMode): ModeRuang {
  return nama === 'lembaga' ? MODE_LEMBAGA : MODE_KERJA;
}

/** Halaman kerja yang setara dengan halaman Lembaga (untuk tautan "Ubah di Ruang …"). */
export function padananKerja(pathname: string): { room: 'santri' | 'donatur'; href: string } | null {
  const m = /^\/lembaga\/(santri|donatur|surat)(?:\/([^/]+))?\/?$/.exec(pathname);
  if (!m) return null;
  const [, jenis, id] = m;
  if (jenis === 'santri') return { room: 'santri', href: id ? `/santri/${id}` : '/santri' };
  if (jenis === 'donatur') return { room: 'donatur', href: id ? `/donatur/daftar/${id}` : '/donatur/daftar' };
  return { room: 'donatur', href: id ? `/donatur/surat/${id}` : '/donatur/surat' };
}
```

`components/ruang/ModeRuang.tsx`:
```tsx
'use client';
import { createContext, useContext } from 'react';
import { MODE_KERJA, modeDari, type ModeRuang, type NamaMode } from '@/lib/ruang/mode';

const Ctx = createContext<ModeRuang>(MODE_KERJA);

/** Menerima nama mode (string) karena fungsi tidak bisa dikirim dari layout server. */
export function ModeRuangProvider({ mode, children }: { mode: NamaMode; children: React.ReactNode }) {
  return <Ctx.Provider value={modeDari(mode)}>{children}</Ctx.Provider>;
}

/** Bawaan: mode kerja (Ruang Santri/Donatur tidak perlu provider). */
export const useModeRuang = () => useContext(Ctx);
```

`components/ruang/BilahModeBaca.tsx`:
```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye, ArrowRight } from '@phosphor-icons/react';
import { useAuth } from '@/components/auth/AuthProvider';
import { ROOM_LABEL } from '@/lib/auth/rooms';
import { padananKerja } from '@/lib/ruang/mode';

/** Bilah tipis di atas konten Ruang Lembaga: penanda baca saja + jalan pintas ke ruang kerja. */
export function BilahModeBaca() {
  const pathname = usePathname();
  const { rooms } = useAuth();
  const padanan = padananKerja(pathname);
  const bisaUbah = padanan && rooms.includes(padanan.room);
  return (
    <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl bg-violet-50 px-3 py-2 text-xs text-violet-900 dark:bg-violet-950/40 dark:text-violet-100 print:hidden">
      <span className="inline-flex items-center gap-1.5 font-bold">
        <Eye size={15} weight="bold" aria-hidden="true" /> Mode baca
      </span>
      {bisaUbah && (
        <Link href={padanan.href} className="inline-flex items-center gap-1 font-bold underline-offset-2 hover:underline">
          Ubah di {ROOM_LABEL[padanan.room]} <ArrowRight size={13} weight="bold" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Jalankan tes**

Run: `npx vitest run tests/ruang tests/components/bilah-mode-baca.test.tsx && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ruang components/ruang tests/ruang tests/components/bilah-mode-baca.test.tsx
git commit -m "feat(ruang): mode kerja/lembaga, context ModeRuang, bilah Mode baca"
```

---

### Task 5: Mode baca santri + repo Lembaga

**Files:**
- Create: `lib/db/lembaga-repo.ts`
- Modify: `components/santri/BarisSantri.tsx`, `components/directory/SantriDirectory.tsx:68`, `components/profile/DetailSantri.tsx`, `components/profile/TabBerkas.tsx`
- Test: `tests/db/lembaga-repo.test.ts`, `tests/components/detail-santri.test.tsx`, `tests/components/direktori.test.tsx`

**Interfaces:**
- Consumes: `useModeRuang()` (Task 4), RPC `status_berkas_santri` (Task 1).
- Produces:
  ```ts
  // lib/db/lembaga-repo.ts
  type DokStatus = { kategori: string; statusVerifikasi: string };
  ambilStatusBerkas(client): Promise<Map<string, DokStatus[]> | null>   // null bila RPC gagal
  listSantriLembaga(client): Promise<Santri[]>          // documents = DokStatus berbentuk SantriDocument minimal (fileUrl '')
  getSantriLembaga(client, id): Promise<Santri | null>
  ```
  `BarisSantri` prop baru `href?: string`.

- [ ] **Step 1: Tulis tes gagal**

`tests/db/lembaga-repo.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { listSantriLembaga, getSantriLembaga, ambilStatusBerkas } from '@/lib/db/lembaga-repo';

function rantai(hasil: unknown, catat: unknown[][] = []) {
  const r: any = new Proxy({}, {
    get: (_t, k) => (k === 'then' ? (ok: (v: unknown) => void) => ok(hasil) : (...a: unknown[]) => { catat.push([k, ...a]); return r; }),
  });
  return r;
}

const baris = [{ id: 's1', namaLengkap: 'Faiz', fotoProfilPath: 'santri/s1/foto.jpg', fotoFormalPath: null }];
const status = [{ santriId: 's1', kategori: 'KARTU_KELUARGA', statusVerifikasi: 'VERIFIED' }];

function klien(catatSantri: unknown[][] = []) {
  const signed = vi.fn(async (paths: string[]) => ({ data: paths.map(p => ({ path: p, signedUrl: `https://tt/${p}` })), error: null }));
  return {
    client: {
      from: vi.fn(() => rantai({ data: baris, error: null }, catatSantri)),
      rpc: vi.fn(async () => ({ data: status, error: null })),
      storage: { from: () => ({ createSignedUrls: signed }) },
    } as never,
    signed,
  };
}

describe('lembaga-repo', () => {
  it('daftar santri tanpa documents(*), status dari RPC, hanya foto yang ditandatangani', async () => {
    const catat: unknown[][] = [];
    const { client, signed } = klien(catat);
    const [s] = await listSantriLembaga(client);
    expect(catat).toContainEqual(['select', '*']);
    expect(s.documents).toEqual([{ kategori: 'KARTU_KELUARGA', statusVerifikasi: 'VERIFIED', fileUrl: '', catatanVerifikasi: null }]);
    expect(s.fotoProfilUrl).toBe('https://tt/santri/s1/foto.jpg');
    expect(signed).toHaveBeenCalledWith(['santri/s1/foto.jpg'], expect.any(Number));
  });
  it('RPC gagal → status null, santri tetap dimuat dengan documents kosong', async () => {
    const { client } = klien();
    (client as any).rpc = vi.fn(async () => ({ data: null, error: { message: 'x' } }));
    expect(await ambilStatusBerkas(client)).toBeNull();
    const [s] = await listSantriLembaga(client);
    expect(s.documents).toEqual([]);
  });
  it('detail satu santri', async () => {
    const { client } = klien();
    (client as any).from = vi.fn(() => rantai({ data: baris[0], error: null }));
    const s = await getSantriLembaga(client, 's1');
    expect(s?.id).toBe('s1');
  });
});
```

Tambahkan ke `tests/components/detail-santri.test.tsx` (setelah `describe` yang ada):
```tsx
import { ModeRuangProvider } from '@/components/ruang/ModeRuang';

describe('DetailSantri mode baca (Ruang Lembaga)', () => {
  const h = renderToStaticMarkup(<ModeRuangProvider mode="lembaga"><DetailSantri santri={santri} /></ModeRuangProvider>);
  it('tanpa Edit & Lengkapi berkas, kembali ke direktori Lembaga', () => {
    expect(h).not.toContain('/edit');
    expect(h).not.toContain('Lengkapi berkas');
    expect(h).toContain('href="/lembaga/santri"');
  });
  it('status berkas tampil tetapi tidak bisa dibuka', () => {
    expect(h).toContain('Kartu Keluarga');
    expect(h).toContain('Terverifikasi');
    expect(h).not.toContain('aria-label="Lihat Kartu Keluarga"');
  });
});
```
(pindahkan `import { ModeRuangProvider } …` ke deretan import di atas file.)

Tambahkan ke `tests/components/direktori.test.tsx` (sesuaikan dengan pola render yang ada di file itu):
```tsx
  it('mode lembaga: kartu santri menuju /lembaga/santri/[id]', () => {
    const h = renderToStaticMarkup(
      <ModeRuangProvider mode="lembaga"><SantriDirectory initialSantriList={[{ id: 's1', namaLengkap: 'Faiz', jenjang: 'SMP', kelas: '7', jenisKelamin: 'IKHWAN', documents: [] } as never]} /></ModeRuangProvider>);
    expect(h).toContain('href="/lembaga/santri/s1"');
  });
```
dengan import `ModeRuangProvider` dari `@/components/ruang/ModeRuang` dan `SantriDirectory` bila belum.

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/db/lembaga-repo.test.ts tests/components/detail-santri.test.tsx tests/components/direktori.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementasi**

`lib/db/lembaga-repo.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { signPaths } from '@/lib/storage/signed';
import { isPathSuratDonatur } from '@/lib/storage/paths';
import type { Santri, SantriDocument } from '@/lib/db/santri-repo';

/**
 * Data santri untuk Ruang Lembaga (baca saja). Sengaja TIDAK memilih documents(*):
 * Pengurus tidak punya akses ke tabel itu (isi OCR) maupun file scan. Status berkas
 * diambil dari RPC status_berkas_santri() yang hanya mengembalikan kategori & status.
 */
export type DokStatus = { kategori: string; statusVerifikasi: string };

export async function ambilStatusBerkas(client: SupabaseClient): Promise<Map<string, DokStatus[]> | null> {
  const { data, error } = await client.rpc('status_berkas_santri');
  if (error || !data) return null;
  const peta = new Map<string, DokStatus[]>();
  for (const r of data as Array<{ santriId: string; kategori: string; statusVerifikasi: string }>) {
    const list = peta.get(r.santriId) ?? [];
    list.push({ kategori: r.kategori, statusVerifikasi: r.statusVerifikasi });
    peta.set(r.santriId, list);
  }
  return peta;
}

const fotoAman = (p?: string | null): p is string => !!p && !isPathSuratDonatur(p);

async function lengkapi(client: SupabaseClient, rows: Santri[], status: Map<string, DokStatus[]> | null): Promise<Santri[]> {
  const map = await signPaths(client, rows.flatMap(s => [s.fotoFormalPath, s.fotoProfilPath].filter(fotoAman)));
  return rows.map(s => ({
    ...s,
    fotoFormalUrl: fotoAman(s.fotoFormalPath) ? map[s.fotoFormalPath] || null : null,
    fotoProfilUrl: fotoAman(s.fotoProfilPath) ? map[s.fotoProfilPath] || null : null,
    documents: (status?.get(s.id) ?? []).map(d => ({ ...d, fileUrl: '', catatanVerifikasi: null })) as unknown as SantriDocument[],
  }));
}

export async function listSantriLembaga(client: SupabaseClient): Promise<Santri[]> {
  const [{ data, error }, status] = await Promise.all([
    client.from('santri').select('*').order('createdAt', { ascending: false }),
    ambilStatusBerkas(client),
  ]);
  if (error) throw new Error(`Gagal mengambil daftar santri: ${error.message}`);
  return lengkapi(client, (data || []) as Santri[], status);
}

export async function getSantriLembaga(client: SupabaseClient, id: string): Promise<Santri | null> {
  const [{ data, error }, status] = await Promise.all([
    client.from('santri').select('*').eq('id', id).maybeSingle(),
    ambilStatusBerkas(client),
  ]);
  if (error || !data) return null;
  const [s] = await lengkapi(client, [data as Santri], status);
  return s;
}
```
Periksa nama properti foto di `Santri` (`fotoFormalPath`, `fotoProfilPath`, `fotoFormalUrl`, `fotoProfilUrl`) di `lib/db/santri-repo.ts:27-60` — sesuaikan cast bila `tsc` mengeluh.

`components/santri/BarisSantri.tsx`:
```tsx
export function BarisSantri({ santri, indeks = 0, href }: { santri: SantriBaris; indeks?: number; href?: string }) {
  const foto = santri.fotoProfilUrl || santri.fotoFormalUrl;
  return (
    <Link href={href ?? `/santri/${santri.id}`} className={…sama seperti sebelumnya…}>
```

`components/directory/SantriDirectory.tsx`:
```tsx
import { useModeRuang } from '@/components/ruang/ModeRuang';
// di dalam komponen:
  const mode = useModeRuang();
// baris 68:
          {tersaring.map((s, i) => <li key={s.id}><BarisSantri santri={s} indeks={i} href={mode.rute.santri(s.id)} /></li>)}
```

`components/profile/DetailSantri.tsx`:
```tsx
import { useModeRuang } from '@/components/ruang/ModeRuang';
// di dalam komponen:
  const mode = useModeRuang();
// KepalaHalaman:
        <KepalaHalaman judul={santri.namaLengkap} kembali={{ href: mode.rute.santriDaftar, label: 'Kembali ke direktori' }}
          aksi={<>
            {!mode.bacaSaja && <TautanUtama href={`/santri/${santri.id}/edit`} ikon={PencilSimple}>Edit</TautanUtama>}
            <MenuSantri nama={santri.namaLengkap} />
          </>} />
```

`components/profile/TabBerkas.tsx`:
```tsx
import { useModeRuang } from '@/components/ruang/ModeRuang';
// BarisBerkas: onBuka opsional
function BarisBerkas({ label, dok, onBuka }: { label: string; dok?: Dok; onBuka?: (d: Dok) => void }) {
  // ... isi sama; ganti kondisi return:
  return dok && onBuka
    ? <button type="button" onClick={() => onBuka(dok)} aria-label={`Lihat ${label}`} className="…sama…">{isi}</button>
    : <div className="flex items-center gap-3 p-2.5">{isi}</div>;
}
// panah CaretRight hanya bila bisa dibuka:
      {dok && onBuka && <CaretRight … />}
```
Karena `isi` dibangun sebelum `return`, ubah kondisi panah di dalam `isi` menjadi `{dok && onBuka && <CaretRight size={16} weight="bold" className="shrink-0 text-bq-redup" aria-hidden="true" />}`.
Di `TabBerkas`:
```tsx
  const { bacaSaja } = useModeRuang();
  const buka = (label: string) => (bacaSaja ? undefined : (d: Dok) => setPratinjau({ judul: `${label} - ${santri.namaLengkap}`, dok: d }));
// …
      {!st.lengkap && !bacaSaja && (
        <TautanUtama href={`/santri/${santri.id}/edit?langkah=1`} className="w-full sm:w-auto">Lengkapi berkas</TautanUtama>
      )}
// …
      {!bacaSaja && <DocumentPreviewModal … />}
```

- [ ] **Step 4: Jalankan tes**

Run: `npx vitest run tests/db/lembaga-repo.test.ts tests/components && npx tsc --noEmit -p .`
Expected: PASS (termasuk tes `DetailSantri` & direktori lama).

- [ ] **Step 5: Commit**

```bash
git add lib/db/lembaga-repo.ts components/santri/BarisSantri.tsx components/directory/SantriDirectory.tsx components/profile tests/db/lembaga-repo.test.ts tests/components/detail-santri.test.tsx tests/components/direktori.test.tsx
git commit -m "feat(lembaga): mode baca santri & repo tanpa akses berkas"
```

---

### Task 6: Mode baca donatur & surat

**Files:**
- Modify: `components/donatur/DaftarDonatur.tsx`, `components/donatur/DetailDonatur.tsx`, `components/donatur/DaftarSurat.tsx`
- Test: `tests/components/daftar-donatur.test.tsx`, `tests/components/detail-donatur.test.tsx`, `tests/components/daftar-surat.test.tsx`

**Interfaces:**
- Consumes: `useModeRuang()`, `MODE_KERJA`, `MODE_LEMBAGA`, `modeDari` (Task 4).
- Produces: `DetailDonatur({ donatur, mode?: NamaMode })` (bawaan `'kerja'`).

- [ ] **Step 1: Tulis tes gagal**

`tests/components/daftar-donatur.test.tsx` — tambah:
```tsx
import { ModeRuangProvider } from '@/components/ruang/ModeRuang';

describe('DaftarDonatur mode baca', () => {
  const h = renderToStaticMarkup(<ModeRuangProvider mode="lembaga"><DaftarDonatur /></ModeRuangProvider>);
  it('tanpa tombol tambah donatur', () => {
    expect(h).not.toContain('aria-label="Tambah donatur"');
    expect(h).toContain('aria-label="Cari donatur"');
  });
});
```

`tests/components/detail-donatur.test.tsx` — tambah:
```tsx
describe('DetailDonatur mode lembaga', () => {
  const h = renderToStaticMarkup(<DetailDonatur donatur={{ ...donatur, noWa: null }} mode="lembaga" />);
  it('tanpa menu, Donasi lagi, dan ajakan tambah WA; kembali ke /lembaga/donatur', () => {
    expect(h).not.toContain('Menu donatur');
    expect(h).not.toContain('Donasi lagi');
    expect(h).not.toContain('?ubah=1');
    expect(h).toContain('href="/lembaga/donatur"');
    expect(h).toContain('Nomor WhatsApp belum diisi');
  });
});
```

`tests/components/daftar-surat.test.tsx` — tambah:
```tsx
import { ModeRuangProvider } from '@/components/ruang/ModeRuang';

describe('DaftarSurat mode baca', () => {
  const h = renderToStaticMarkup(<ModeRuangProvider mode="lembaga"><DaftarSurat /></ModeRuangProvider>);
  it('tanpa Buat Surat & saklar otomatis tandai', () => {
    expect(h).not.toContain('Buat Surat');
    expect(h).not.toContain('Otomatis tandai WA');
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/components/daftar-donatur.test.tsx tests/components/detail-donatur.test.tsx tests/components/daftar-surat.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementasi**

`components/donatur/DaftarDonatur.tsx`:
```tsx
import { useModeRuang } from '@/components/ruang/ModeRuang';
// dalam komponen:
  const mode = useModeRuang();
// fetch:
        const res = await fetch(`${mode.api.donatur}?q=${encodeURIComponent(q)}`);
// KepalaHalaman aksi:
        aksi={mode.bacaSaja ? undefined : <TombolIkon ikon={UserPlus} label="Tambah donatur" varian="utama" onClick={() => setTambahBuka(true)} />}
// tautan kartu:
                <Link href={mode.rute.donatur(d.id)} className="min-w-0 flex-1">
// ikon oranye lengkapi WA:
                {!d.noWa && !mode.bacaSaja && ( …tautan ?ubah=1… )}
// tombol Donasi lagi:
                {!mode.bacaSaja && <TombolIkon ikon={ArrowClockwise} … />}
// LembarBawah FormDonatur:
      {!mode.bacaSaja && <LembarBawah …>…</LembarBawah>}
```
Tambahkan `mode.api.donatur` ke dependency array `useEffect` pencarian (`[q, mode.api.donatur]`).
Tombol hapus saringan `?tanpaWa=1` memakai `router.replace(mode.rute.donaturDaftar, { scroll: false })`.

`components/donatur/DetailDonatur.tsx` (komponen server — tanpa hook):
```tsx
import { modeDari, type NamaMode } from '@/lib/ruang/mode';

export function DetailDonatur({ donatur, mode: namaMode = 'kerja' }: { donatur: Donatur & { donasi: Donasi[] }; mode?: NamaMode }) {
  const mode = modeDari(namaMode);
  const r = ringkasRiwayat(donatur.donasi);
  return (
    <div className="space-y-4 md:space-y-5">
      <KepalaHalaman
        judul={`${labelSapaan(donatur.sapaan)} ${donatur.nama}`}
        kembali={{ href: mode.rute.donaturDaftar, label: 'Kembali ke daftar donatur' }}
        aksi={mode.bacaSaja ? undefined : <>
          …TautanUtama & TombolIkon Donasi lagi seperti sekarang…
          <MenuDonatur donatur={donatur} jumlahDonasi={r.jumlah} />
        </>}
      />
```
dan chip WA kosong:
```tsx
          {donatur.noWa
            ? <a …>…</a>
            : mode.bacaSaja
              ? <span className={kelasChip}>Nomor WhatsApp belum diisi</span>
              : <Link href="?ubah=1" …>Tambah nomor WhatsApp</Link>}
```

`components/donatur/DaftarSurat.tsx`:
```tsx
import { useModeRuang } from '@/components/ruang/ModeRuang';
// dalam komponen:
  const mode = useModeRuang();
// fetch:
        const res = await fetch(`${mode.api.surat}?${new URLSearchParams({ dari, sampai, limit: '500' })}`);
// tombolHapus:
  const tombolHapus = (s: SuratWithRelasi) => (mode.bacaSaja ? null : (
    <TombolIkon … />
  ));
// ganti setiap `/donatur/surat/${s.id}` menjadi mode.rute.surat(s.id) (Link HP, onClick baris tabel, Link nomor, Link donatur, tombol aksi)
// Buat Surat:
          {!mode.bacaSaja && <TautanUtama href="/donatur/surat/baru" ikon={Plus} className="hidden md:inline-flex">Buat Surat</TautanUtama>}
// saklar Otomatis tandai WA: bungkus seluruh <div> saklar dengan {!mode.bacaSaja && ( … )}
// kolom aksi tabel: pada mode baca selalu tampilkan tautan "Detail" (bukan "Kirim WA"):
                          {!s.terkirimWa && !mode.bacaSaja ? ( …Kirim WA… ) : ( …Detail… )}
// dialog hapus:
      {!mode.bacaSaja && <DialogHapusSurat … />}
```
Tambahkan `mode.api.surat` ke dependency array `useEffect` pemuatan (`[dari, sampai, mode.api.surat]`).

- [ ] **Step 4: Jalankan tes**

Run: `npx vitest run tests/components && npx tsc --noEmit -p .`
Expected: PASS (tes mode kerja lama tetap lulus).

- [ ] **Step 5: Commit**

```bash
git add components/donatur/DaftarDonatur.tsx components/donatur/DetailDonatur.tsx components/donatur/DaftarSurat.tsx tests/components
git commit -m "feat(lembaga): mode baca daftar/detail donatur & daftar surat"
```

---

### Task 7: API baca-saja Lembaga (donatur, surat, PNG surat)

**Files:**
- Create: `lib/surat/render-png.tsx`, `app/api/lembaga/donatur/route.ts`, `app/api/lembaga/surat/route.ts`, `app/api/lembaga/surat/[id]/png/route.tsx`
- Modify: `app/api/donatur/surat/[id]/png/route.tsx`
- Test: `tests/api/lembaga-route.test.ts`, `tests/api/surat-png-route.test.ts` (tetap lulus)

**Interfaces:**
- Produces:
  ```ts
  // lib/surat/render-png.tsx
  renderPngSurat(surat: SuratWithRelasi): Promise<Uint8Array>
  responsPng(png: Uint8Array, nomorSurat: string): NextResponse
  ```

- [ ] **Step 1: Tulis tes gagal**

`tests/api/lembaga-route.test.ts`:
```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const listDonatur = vi.fn();
const listSurat = vi.fn();
const getSurat = vi.fn();
const requireRoom = vi.fn();
const download = vi.fn();
const upload = vi.fn();
const renderPngSurat = vi.fn();

vi.mock('@/lib/db/donatur-repo', () => ({
  listDonatur: (...a: unknown[]) => listDonatur(...a),
  listSurat: (...a: unknown[]) => listSurat(...a),
  getSurat: (...a: unknown[]) => getSurat(...a),
}));
vi.mock('@/lib/surat/render-png', async () => {
  const { NextResponse } = await import('next/server');
  return {
    renderPngSurat: (...a: unknown[]) => renderPngSurat(...a),
    responsPng: (png: Uint8Array) => new NextResponse(png as BodyInit, { headers: { 'Content-Type': 'image/png' } }),
  };
});
const fakeSupabase = { storage: { from: () => ({ download, upload }) } };
vi.mock('@/lib/auth/session', () => ({
  requireRoom: (...a: unknown[]) => requireRoom(...a),
  authErrorResponse: () => null,
}));

import { GET as DONATUR } from '@/app/api/lembaga/donatur/route';
import { GET as SURAT } from '@/app/api/lembaga/surat/route';
import { GET as PNG } from '@/app/api/lembaga/surat/[id]/png/route';

const req = (url: string) => ({ url }) as never;

beforeEach(() => {
  requireRoom.mockReset().mockResolvedValue({ user: { id: 'u1' }, supabase: fakeSupabase });
  listDonatur.mockReset().mockResolvedValue([{ id: 'p1' }]);
  listSurat.mockReset().mockResolvedValue([]);
  getSurat.mockReset().mockResolvedValue({ id: 's1', nomorSurat: '5/PBQ/IX/2026', tanggalSurat: '2026-09-10', storagePath: null });
  download.mockReset();
  upload.mockReset();
  renderPngSurat.mockReset().mockResolvedValue(new Uint8Array([1, 2]));
});

describe('/api/lembaga/*', () => {
  it('donatur: memakai ruangan lembaga', async () => {
    const res = await DONATUR(req('http://x/api/lembaga/donatur?q=ar'));
    expect(res.status).toBe(200);
    expect(requireRoom).toHaveBeenCalledWith('lembaga');
    expect(listDonatur).toHaveBeenCalledWith(fakeSupabase, 'ar');
  });
  it('surat: menolak tanggal tidak valid', async () => {
    expect((await SURAT(req('http://x/api/lembaga/surat?dari=2026/01/01'))).status).toBe(400);
  });
  it('surat: meneruskan filter', async () => {
    await SURAT(req('http://x/api/lembaga/surat?dari=2026-09-01&sampai=2026-09-30&terkirim=false&limit=5'));
    expect(listSurat).toHaveBeenCalledWith(fakeSupabase, { dari: '2026-09-01', sampai: '2026-09-30', terkirim: false, limit: 5 });
  });
  it('PNG belum tersimpan: dirender tetapi TIDAK diunggah', async () => {
    const res = await PNG({} as never, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(200);
    expect(renderPngSurat).toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });
  it('PNG 404 bila surat tidak ada', async () => {
    getSurat.mockResolvedValue(null);
    expect((await PNG({} as never, { params: Promise.resolve({ id: 'x' }) })).status).toBe(404);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/api/lembaga-route.test.ts`
Expected: FAIL (modul route belum ada).

- [ ] **Step 3: Implementasi**

`lib/surat/render-png.tsx` — pindahkan logika render dari route donatur:
```tsx
import { ImageResponse } from 'next/og';
import { NextResponse } from 'next/server';
import type { SuratWithRelasi } from '@/lib/db/donatur-repo';
import { buildSuratData } from '@/lib/surat/data';
import { loadSuratAssets, loadSuratFonts } from '@/lib/surat/assets';
import { SuratTemplate } from '@/components/donatur/SuratTemplate';

/** Render surat menjadi PNG 1240×1754 (A4 150 dpi). */
export async function renderPngSurat(surat: SuratWithRelasi): Promise<Uint8Array> {
  const [assets, fonts] = await Promise.all([loadSuratAssets(), loadSuratFonts()]);
  const image = new ImageResponse(
    <SuratTemplate data={buildSuratData(surat)} assets={assets} />,
    { width: 1240, height: 1754, fonts },
  );
  return new Uint8Array(await image.arrayBuffer());
}

/** Respons PNG surat dengan nama berkas aman & cache browser sehari. */
export function responsPng(png: Uint8Array, nomorSurat: string): NextResponse {
  // Nama berkas untuk header disaring dari karakter selain [A-Za-z0-9._-]
  // agar tidak menyisipkan karakter tak terduga ke header HTTP.
  const namaBerkas = `${nomorSurat.replace(/\//g, '-')}.png`.replace(/[^A-Za-z0-9._-]/g, '_');
  return new NextResponse(png as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="${namaBerkas}"`,
      // Isi surat tidak berubah setelah dibuat → aman di-cache sehari di browser.
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
```

`app/api/donatur/surat/[id]/png/route.tsx` — pakai helper (perilaku sama):
```tsx
import { NextResponse, after, type NextRequest } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { getSurat, setSuratStoragePath } from '@/lib/db/donatur-repo';
import { pathPngSurat } from '@/lib/surat/path-png';
import { renderPngSurat, responsPng } from '@/lib/surat/render-png';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireRoom('donatur');
    const { id } = await ctx.params;
    const surat = await getSurat(supabase, id);
    if (!surat) return NextResponse.json({ error: 'Surat tidak ditemukan' }, { status: 404 });

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'berkas';
    const path = pathPngSurat(surat.nomorSurat, surat.tanggalSurat);

    // Sudah pernah dirender dengan template versi ini → kirim dari storage tanpa render ulang.
    if (surat.storagePath === path) {
      const { data, error } = await supabase.storage.from(bucket).download(path);
      if (!error && data) return responsPng(new Uint8Array(await data.arrayBuffer()), surat.nomorSurat);
      console.error('PNG surat di storage tidak bisa diunduh, dirender ulang', { suratId: id, path, error: error?.message });
    }

    const png = await renderPngSurat(surat);

    // Simpan ke bucket privat SETELAH respons terkirim, agar pengguna tidak ikut menunggu unggahan.
    after(async () => {
      const { error: upErr } = await supabase.storage.from(bucket)
        .upload(path, png, { contentType: 'image/png', upsert: true });
      if (upErr) {
        // Jangan diam-diam: kegagalan menyimpan (mis. policy storage menolak) harus terlihat di log server.
        console.error('Gagal menyimpan PNG surat ke storage', { suratId: id, path, error: upErr.message });
        return;
      }
      await setSuratStoragePath(supabase, id, path);
    });

    return responsPng(png, surat.nomorSurat);
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Gagal membuat gambar surat', e);
    return NextResponse.json({ error: 'Gagal membuat gambar surat' }, { status: 500 });
  }
}
```

`app/api/lembaga/surat/[id]/png/route.tsx`:
```tsx
import { NextResponse, type NextRequest } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { getSurat } from '@/lib/db/donatur-repo';
import { pathPngSurat } from '@/lib/surat/path-png';
import { renderPngSurat, responsPng } from '@/lib/surat/render-png';

export const runtime = 'nodejs';

/** PNG surat untuk Ruang Lembaga: baca dari storage bila ada; bila belum, render TANPA menyimpan (Pengurus tak punya izin tulis). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireRoom('lembaga');
    const { id } = await ctx.params;
    const surat = await getSurat(supabase, id);
    if (!surat) return NextResponse.json({ error: 'Surat tidak ditemukan' }, { status: 404 });
    const path = pathPngSurat(surat.nomorSurat, surat.tanggalSurat);
    if (surat.storagePath === path) {
      const { data, error } = await supabase.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'berkas').download(path);
      if (!error && data) return responsPng(new Uint8Array(await data.arrayBuffer()), surat.nomorSurat);
    }
    return responsPng(await renderPngSurat(surat), surat.nomorSurat);
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Gagal membuat gambar surat (lembaga)', e);
    return NextResponse.json({ error: 'Gagal membuat gambar surat' }, { status: 500 });
  }
}
```

`app/api/lembaga/donatur/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listDonatur } from '@/lib/db/donatur-repo';

/** Daftar donatur untuk Ruang Lembaga (baca saja). */
export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('lembaga');
    const q = new URL(req.url).searchParams.get('q') || undefined;
    return NextResponse.json({ success: true, data: await listDonatur(supabase, q) });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('List donatur (lembaga) error:', e);
    return NextResponse.json({ error: 'Gagal memuat donatur' }, { status: 500 });
  }
}
```

`app/api/lembaga/surat/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listSurat } from '@/lib/db/donatur-repo';
import { isTanggalIso, parseLimit } from '@/lib/validation/query';

/** Daftar surat untuk Ruang Lembaga (baca saja). Parameter sama dengan GET /api/donatur/surat. */
export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('lembaga');
    const p = new URL(req.url).searchParams;
    const dari = p.get('dari') || undefined;
    const sampai = p.get('sampai') || undefined;
    if ((dari && !isTanggalIso(dari)) || (sampai && !isTanggalIso(sampai))) {
      return NextResponse.json({ error: 'Format tanggal harus YYYY-MM-DD' }, { status: 400 });
    }
    const terkirimParam = p.get('terkirim');
    const data = await listSurat(supabase, {
      dari, sampai,
      terkirim: terkirimParam === null ? undefined : terkirimParam === 'true',
      limit: parseLimit(p.get('limit')),
    });
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('List surat (lembaga) error:', e);
    return NextResponse.json({ error: 'Gagal memuat surat' }, { status: 500 });
  }
}
```
Periksa `parseLimit(null)` mengembalikan `undefined` (lihat `lib/validation/query.ts`); bila mengembalikan nilai bawaan lain, sesuaikan harapan tes Step 1 (`limit: 5` tetap valid karena parameter dikirim).

- [ ] **Step 4: Jalankan tes**

Run: `npx vitest run tests/api && npx tsc --noEmit -p .`
Expected: PASS (termasuk `surat-png-route.test.ts` lama — bila tes lama me-mock `next/og`/aset di jalur route lama, pindahkan mock yang sama agar berlaku untuk `lib/surat/render-png`).

- [ ] **Step 5: Commit**

```bash
git add lib/surat/render-png.tsx app/api/donatur/surat/[id]/png/route.tsx app/api/lembaga tests/api/lembaga-route.test.ts tests/api/surat-png-route.test.ts
git commit -m "feat(api): endpoint baca-saja Ruang Lembaga (donatur, surat, PNG tanpa simpan)"
```

---

### Task 8: Halaman Ruang Lembaga

**Files:**
- Create: `app/(lembaga)/layout.tsx`, `app/(lembaga)/loading.tsx`, `app/(lembaga)/lembaga/page.tsx` (sementara `SegeraHadir`, diganti di Task 11), `app/(lembaga)/lembaga/santri/page.tsx`, `app/(lembaga)/lembaga/santri/[id]/page.tsx`, `app/(lembaga)/lembaga/donatur/page.tsx`, `app/(lembaga)/lembaga/donatur/[id]/page.tsx`, `app/(lembaga)/lembaga/surat/page.tsx`, `app/(lembaga)/lembaga/surat/[id]/page.tsx`, `app/(lembaga)/lembaga/berkas/page.tsx`, `app/(lembaga)/lembaga/keuangan/page.tsx`, `app/(lembaga)/lembaga/akun/page.tsx`, `components/ruang/SegeraHadir.tsx`
- Test: `tests/components/segera-hadir.test.tsx`

**Interfaces:**
- Consumes: `ModeRuangProvider`, `BilahModeBaca` (Task 4), `listSantriLembaga`, `getSantriLembaga` (Task 5), `DetailDonatur mode` (Task 6), `MODE_LEMBAGA.api.pngSurat` (Task 4).
- Produces: `SegeraHadir({ judul, sub })`.

- [ ] **Step 1: Tulis tes gagal**

`tests/components/segera-hadir.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SegeraHadir } from '@/components/ruang/SegeraHadir';

describe('SegeraHadir', () => {
  it('judul halaman + pesan segera hadir', () => {
    const h = renderToStaticMarkup(<SegeraHadir judul="Keuangan" sub="Pemasukan & pengeluaran yayasan." />);
    expect(h).toMatch(/<h1[^>]*>Keuangan<\/h1>/);
    expect(h).toContain('Segera hadir');
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/components/segera-hadir.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementasi**

`components/ruang/SegeraHadir.tsx`:
```tsx
import { Hourglass } from '@phosphor-icons/react/dist/ssr';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { IkonUbin } from '@/components/ui/IkonUbin';

export function SegeraHadir({ judul, sub }: { judul: string; sub: string }) {
  return (
    <div className="space-y-4">
      <KepalaHalaman judul={judul} sub={sub} subTampilDiHp />
      <Kartu className="flex flex-col items-center gap-3 p-8 text-center">
        <IkonUbin ikon={Hourglass} warna="ungu" ukuran="lg" doodle="lingkaran" />
        <p className="text-sm font-bold text-bq-tinta">Segera hadir</p>
        <p className="max-w-sm text-xs text-bq-redup">Bagian ini sedang disiapkan dan akan tersedia di pembaruan berikutnya.</p>
      </Kartu>
    </div>
  );
}
```

`app/(lembaga)/layout.tsx`:
```tsx
import { AppShell } from '@/components/layout/AppShell';
import { ModeRuangProvider } from '@/components/ruang/ModeRuang';
import { BilahModeBaca } from '@/components/ruang/BilahModeBaca';

export default function LembagaRoomLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModeRuangProvider mode="lembaga">
      <AppShell room="lembaga">
        <BilahModeBaca />
        {children}
      </AppShell>
    </ModeRuangProvider>
  );
}
```

`app/(lembaga)/loading.tsx`:
```tsx
export default function LembagaLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-40 rounded-[26px] bg-slate-200/90 dark:bg-slate-800/80" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-56 rounded-[26px] bg-slate-100 dark:bg-slate-800/60" />
        <div className="h-56 rounded-[26px] bg-slate-100 dark:bg-slate-800/60" />
      </div>
    </div>
  );
}
```

`app/(lembaga)/lembaga/page.tsx` (sementara, diganti Task 11):
```tsx
import { SegeraHadir } from '@/components/ruang/SegeraHadir';

export const metadata = { title: 'Ruang Lembaga — BQ-ku' };

export default function LembagaHomePage() {
  return <SegeraHadir judul="Ruang Lembaga" sub="Ringkasan yayasan untuk pengurus." />;
}
```

`app/(lembaga)/lembaga/santri/page.tsx`:
```tsx
import { requireRoom } from '@/lib/auth/session';
import { listSantriLembaga } from '@/lib/db/lembaga-repo';
import { SantriDirectory } from '@/components/directory/SantriDirectory';

export const metadata = { title: 'Santri — Ruang Lembaga' };
export const revalidate = 0;

export default async function SantriLembagaPage() {
  const { supabase } = await requireRoom('lembaga');
  return <SantriDirectory initialSantriList={await listSantriLembaga(supabase)} />;
}
```

`app/(lembaga)/lembaga/santri/[id]/page.tsx`:
```tsx
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { requireRoom } from '@/lib/auth/session';
import { getSantriLembaga } from '@/lib/db/lembaga-repo';
import { DetailSantri } from '@/components/profile/DetailSantri';

export const metadata = { title: 'Detail Santri — Ruang Lembaga' };

export default async function DetailSantriLembagaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRoom('lembaga');
  const santri = await getSantriLembaga(supabase, id);
  if (!santri) notFound();
  return <Suspense><DetailSantri santri={santri} /></Suspense>;
}
```

`app/(lembaga)/lembaga/donatur/page.tsx`:
```tsx
import { Suspense } from 'react';
import { DaftarDonatur } from '@/components/donatur/DaftarDonatur';

export const metadata = { title: 'Donatur — Ruang Lembaga' };

export default function DonaturLembagaPage() {
  return <Suspense><DaftarDonatur /></Suspense>;
}
```

`app/(lembaga)/lembaga/donatur/[id]/page.tsx`:
```tsx
import { notFound } from 'next/navigation';
import { requireRoom } from '@/lib/auth/session';
import { getDonatur } from '@/lib/db/donatur-repo';
import { DetailDonatur } from '@/components/donatur/DetailDonatur';

export const metadata = { title: 'Detail Donatur — Ruang Lembaga' };

export default async function DetailDonaturLembagaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRoom('lembaga');
  const donatur = await getDonatur(supabase, id);
  if (!donatur) notFound();
  return <DetailDonatur donatur={donatur} mode="lembaga" />;
}
```

`app/(lembaga)/lembaga/surat/page.tsx`:
```tsx
import { Suspense } from 'react';
import { DaftarSurat } from '@/components/donatur/DaftarSurat';

export const metadata = { title: 'Surat — Ruang Lembaga' };

export default function SuratLembagaPage() {
  return <Suspense><DaftarSurat /></Suspense>;
}
```

`app/(lembaga)/lembaga/surat/[id]/page.tsx`:
```tsx
import { notFound } from 'next/navigation';
import { DownloadSimple } from '@phosphor-icons/react/dist/ssr';
import { requireRoom } from '@/lib/auth/session';
import { getSurat } from '@/lib/db/donatur-repo';
import { labelSapaan } from '@/lib/surat/data';
import { formatRupiah, terbilang } from '@/lib/utils/terbilang';
import { formatDateIndonesian, formatJam } from '@/lib/utils/formatters';
import { MODE_LEMBAGA } from '@/lib/ruang/mode';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { StatusSurat } from '@/components/donatur/StatusSurat';

export const metadata = { title: 'Detail Surat — Ruang Lembaga' };

export default async function DetailSuratLembagaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRoom('lembaga');
  const surat = await getSurat(supabase, id);
  if (!surat) notFound();
  const donatur = surat.donasi.donatur;
  const donasi = surat.donasi;
  const png = MODE_LEMBAGA.api.pngSurat(surat.id);

  return (
    <div className="space-y-4">
      <KepalaHalaman
        judul={`Surat ${surat.nomorSurat}`}
        sub={`${formatDateIndonesian(surat.tanggalSurat)}${surat.createdAt ? ` · Dibuat pukul ${formatJam(surat.createdAt)}` : ''}`}
        subTampilDiHp
        kembali={{ href: MODE_LEMBAGA.rute.suratDaftar, label: 'Kembali ke daftar surat' }}
        aksi={<a href={png} download={`${surat.nomorSurat.replace(/\//g, '-')}.png`} aria-label="Unduh gambar PNG" title="Unduh gambar PNG"
          className="tekan inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-bq-garis bg-bq-surface text-bq-tinta hover:border-bq-biru hover:text-bq-biru">
          <DownloadSimple size={20} weight="bold" aria-hidden="true" />
        </a>}
      />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="max-h-[62dvh] overflow-auto overscroll-contain rounded-kartu border border-bq-garis bg-white shadow-kartu [touch-action:pan-x_pan-y_pinch-zoom] lg:max-h-none">
          <img src={png} alt={`Surat ucapan terima kasih nomor ${surat.nomorSurat}`} className="h-auto w-full" />
        </div>
        <Kartu className="space-y-3 p-4 text-sm lg:sticky lg:top-6">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-bold text-bq-tinta">{labelSapaan(donatur.sapaan)} {donatur.nama}</p>
              <p className="truncate text-xs text-bq-redup">{donatur.noWa || 'Nomor WhatsApp belum diisi'}</p>
            </div>
            <StatusSurat terkirim={surat.terkirimWa} />
          </div>
          {donasi.bentuk === 'UANG' ? (
            <div>
              <p className="text-lg font-black text-bq-tinta">Rp {formatRupiah(donasi.nominal ?? 0)}</p>
              <p className="line-clamp-2 text-xs italic text-bq-redup">{terbilang(donasi.nominal ?? 0)} Rupiah</p>
            </div>
          ) : (
            <p className="font-bold text-bq-tinta">{donasi.deskripsiBarang || '-'}</p>
          )}
        </Kartu>
      </div>
    </div>
  );
}
```

`app/(lembaga)/lembaga/berkas/page.tsx`:
```tsx
import { SegeraHadir } from '@/components/ruang/SegeraHadir';

export const metadata = { title: 'Berkas Lembaga — BQ-ku' };

export default function BerkasLembagaPage() {
  return <SegeraHadir judul="Berkas lembaga" sub="SK Kemenkumham, akta pendirian, NPWP, dan izin operasional." />;
}
```

`app/(lembaga)/lembaga/keuangan/page.tsx`:
```tsx
import { SegeraHadir } from '@/components/ruang/SegeraHadir';

export const metadata = { title: 'Keuangan — BQ-ku' };

export default function KeuanganLembagaPage() {
  return <SegeraHadir judul="Keuangan" sub="Pemasukan & pengeluaran yayasan." />;
}
```

`app/(lembaga)/lembaga/akun/page.tsx`:
```tsx
import { HalamanAkun } from '@/components/akun/HalamanAkun';

export const metadata = { title: 'Akun — BQ-ku' };

export default function AkunLembagaPage() {
  return <HalamanAkun room="lembaga" />;
}
```

- [ ] **Step 4: Jalankan tes, tipe, dan build**

Run: `npx vitest run && npx tsc --noEmit -p . && npx next build`
Expected: semua PASS; build menampilkan rute `/lembaga`, `/lembaga/santri`, `/lembaga/santri/[id]`, `/lembaga/donatur`, `/lembaga/donatur/[id]`, `/lembaga/surat`, `/lembaga/surat/[id]`, `/lembaga/berkas`, `/lembaga/keuangan`, `/lembaga/akun`, `/api/lembaga/*`. Lalu `git checkout next-env.d.ts`.

- [ ] **Step 5: Commit**

```bash
git add app/(lembaga) components/ruang/SegeraHadir.tsx tests/components/segera-hadir.test.tsx
git commit -m "feat(lembaga): halaman Ruang Lembaga baca saja (santri, donatur, surat, akun)"
```

---

### Task 9: Perhitungan ringkasan (fungsi murni)

**Files:**
- Create: `lib/lembaga/ringkasan.ts`
- Test: `tests/lembaga/ringkasan.test.ts`

**Interfaces:**
- Consumes: `statusBerkas`, `DokRingkas` (`lib/santri/ringkasan.ts`); `isiBulanKosong`, `PerBulan` (`lib/utils/rekap.ts`).
- Produces:
  ```ts
  export type PeriodeLembaga = 'bulan-ini' | '3-bulan' | '12-bulan' | 'tahun-ini';
  export const PERIODE_LEMBAGA: PeriodeLembaga[];
  export function rentangLembaga(p: PeriodeLembaga, hariIni: Date): { dari: string; sampai: string };
  export function rentangSebelumnya(dari: string, sampai: string): { dari: string; sampai: string };
  export type BarisSantriRingkas = { id: string; namaLengkap: string; jenjang: string; jenisKelamin: string; statusSosial: string | null };
  export type BarisDonasiRingkas = { donaturId: string; tanggal: string; bentuk: 'UANG' | 'BARANG'; nominal: number | null; jenis: string };
  export type BarisSuratRingkas = { tanggalSurat: string; terkirimWa: boolean };
  export type Ringkasan = { … lihat kode … };
  export function hitungRingkasan(input: InputRingkasan): Ringkasan;
  export function csvRingkasan(r: Ringkasan): string;
  ```

- [ ] **Step 1: Tulis tes gagal**

`tests/lembaga/ringkasan.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { rentangLembaga, rentangSebelumnya, hitungRingkasan, csvRingkasan, type InputRingkasan } from '@/lib/lembaga/ringkasan';

const hariIni = new Date(2026, 8, 25); // 25 Sep 2026

describe('rentang periode', () => {
  it('bulan ini, 3 bulan, 12 bulan, tahun ini', () => {
    expect(rentangLembaga('bulan-ini', hariIni)).toEqual({ dari: '2026-09-01', sampai: '2026-09-30' });
    expect(rentangLembaga('3-bulan', hariIni)).toEqual({ dari: '2026-07-01', sampai: '2026-09-30' });
    expect(rentangLembaga('12-bulan', hariIni)).toEqual({ dari: '2025-10-01', sampai: '2026-09-30' });
    expect(rentangLembaga('tahun-ini', hariIni)).toEqual({ dari: '2026-01-01', sampai: '2026-12-31' });
  });
  it('periode sebelumnya sama panjang (dalam bulan)', () => {
    expect(rentangSebelumnya('2026-09-01', '2026-09-30')).toEqual({ dari: '2026-08-01', sampai: '2026-08-31' });
    expect(rentangSebelumnya('2026-07-01', '2026-09-30')).toEqual({ dari: '2026-04-01', sampai: '2026-06-30' });
    expect(rentangSebelumnya('2026-01-01', '2026-12-31')).toEqual({ dari: '2025-01-01', sampai: '2025-12-31' });
  });
});

const dasar: InputRingkasan = {
  hariIni,
  periode: { dari: '2026-09-01', sampai: '2026-09-30' },
  santri: [
    { id: 's1', namaLengkap: 'Budi', jenjang: 'SMP', jenisKelamin: 'IKHWAN', statusSosial: 'YATIM' },
    { id: 's2', namaLengkap: 'Aisyah', jenjang: 'SMA', jenisKelamin: 'AKHWAT', statusSosial: null },
    { id: 's3', namaLengkap: 'Cahya', jenjang: 'ALUMNI', jenisKelamin: 'IKHWAN', statusSosial: 'DHUAFA' },
  ],
  statusBerkas: new Map([
    ['s1', ['KARTU_KELUARGA', 'AKTA_KELAHIRAN', 'KTP_ORTU', 'SKL_IJAZAH'].map(k => ({ kategori: k, statusVerifikasi: 'VERIFIED' }))],
    ['s2', [{ kategori: 'KARTU_KELUARGA', statusVerifikasi: 'VERIFIED' }]],
  ]),
  donasi: [
    { donaturId: 'p1', tanggal: '2026-09-05', bentuk: 'UANG', nominal: 100000, jenis: 'ZIS' },
    { donaturId: 'p1', tanggal: '2026-07-05', bentuk: 'UANG', nominal: 50000, jenis: 'ZIS' },
    { donaturId: 'p1', tanggal: '2026-05-05', bentuk: 'UANG', nominal: 50000, jenis: 'INFAQ' },
    { donaturId: 'p2', tanggal: '2026-09-10', bentuk: 'BARANG', nominal: null, jenis: 'LAINNYA' },
    { donaturId: 'p3', tanggal: '2026-08-10', bentuk: 'UANG', nominal: 200000, jenis: 'WAKAF' },
  ],
  jumlahDonatur: 4,
  surat: [
    { tanggalSurat: '2026-09-05', terkirimWa: true },
    { tanggalSurat: '2026-09-10', terkirimWa: false },
    { tanggalSurat: '2026-06-01', terkirimWa: false },
  ],
};

describe('hitungRingkasan', () => {
  const r = hitungRingkasan(dasar);
  it('santri: aktif tanpa alumni, pengelompokan, status sosial kosong = Reguler', () => {
    expect(r.santri).toMatchObject({ total: 3, aktif: 2 });
    expect(r.santri.perJenjang).toEqual({ SMP: 1, SMA: 1, SMK: 0, ALUMNI: 1 });
    expect(r.santri.perGender).toEqual({ IKHWAN: 2, AKHWAT: 1 });
    expect(r.santri.perStatusSosial).toMatchObject({ REGULER: 1, YATIM: 1, DHUAFA: 1 });
  });
  it('kelengkapan berkas: hanya santri aktif', () => {
    expect(r.berkas).toMatchObject({ lengkap: 1, total: 2, persen: 50 });
    expect(r.berkas?.belumLengkap).toEqual([{ id: 's2', namaLengkap: 'Aisyah', kurang: ['Akta', 'KTP Ortu', 'SKL'] }]);
  });
  it('status berkas gagal dimuat → berkas null', () => {
    expect(hitungRingkasan({ ...dasar, statusBerkas: null }).berkas).toBeNull();
  });
  it('donasi periode, pembanding bulan lalu, per jenis, tren 12 bulan', () => {
    expect(r.donasi.totalUang).toBe(100000);
    expect(r.donasi.totalUangSebelumnya).toBe(200000);
    expect(r.donasi.persenPerubahan).toBe(-50);
    expect(r.donasi.jumlahBarang).toBe(1);
    expect(r.donasi.perJenis).toEqual([
      { jenis: 'LAINNYA', total: 0, jumlah: 1 },
      { jenis: 'ZIS', total: 100000, jumlah: 1 },
    ]);
    expect(r.donasi.tren).toHaveLength(12);
    expect(r.donasi.tren[11]).toEqual({ bulan: '2026-09', total: 100000 });
  });
  it('donatur: baru = donasi pertamanya di periode; rutin = ≥3 bulan berbeda dalam 12 bulan', () => {
    expect(r.donatur).toEqual({ total: 4, baru: 1, rutin: 1 });
  });
  it('surat: terbit periode ini; belum terkirim semua waktu', () => {
    expect(r.surat).toEqual({ terbit: 2, belumTerkirim: 2 });
  });
  it('data kosong tidak membagi nol', () => {
    const k = hitungRingkasan({ ...dasar, santri: [], statusBerkas: new Map(), donasi: [], jumlahDonatur: 0, surat: [] });
    expect(k.berkas).toMatchObject({ lengkap: 0, total: 0, persen: 0 });
    expect(k.donasi.persenPerubahan).toBeNull();
  });
});

describe('csvRingkasan', () => {
  it('berisi bagian utama dan angka', () => {
    const csv = csvRingkasan(hitungRingkasan(dasar));
    expect(csv).toContain('Periode,2026-09-01 s.d. 2026-09-30');
    expect(csv).toContain('Santri aktif,2');
    expect(csv).toContain('Total donasi uang,100000');
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/lembaga/ringkasan.test.ts`
Expected: FAIL (modul belum ada).

- [ ] **Step 3: Implementasi**

`lib/lembaga/ringkasan.ts`:
```ts
import { statusBerkas, BERKAS_WAJIB, type DokRingkas } from '@/lib/santri/ringkasan';
import { isiBulanKosong, type PerBulan } from '@/lib/utils/rekap';
import { toCsv } from '@/lib/utils/csv';

export type PeriodeLembaga = 'bulan-ini' | '3-bulan' | '12-bulan' | 'tahun-ini';
export const PERIODE_LEMBAGA: PeriodeLembaga[] = ['bulan-ini', '3-bulan', '12-bulan', 'tahun-ini'];

const dua = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;

/** Rentang tanggal lokal (bukan UTC) untuk pilihan periode. */
export function rentangLembaga(p: PeriodeLembaga, hariIni: Date): { dari: string; sampai: string } {
  const y = hariIni.getFullYear();
  const m = hariIni.getMonth();
  const akhir = iso(new Date(y, m + 1, 0));
  if (p === 'bulan-ini') return { dari: iso(new Date(y, m, 1)), sampai: akhir };
  if (p === '3-bulan') return { dari: iso(new Date(y, m - 2, 1)), sampai: akhir };
  if (p === '12-bulan') return { dari: iso(new Date(y, m - 11, 1)), sampai: akhir };
  return { dari: `${y}-01-01`, sampai: `${y}-12-31` };
}

/** Periode tepat sebelum [dari, sampai] dengan jumlah bulan yang sama. */
export function rentangSebelumnya(dari: string, sampai: string): { dari: string; sampai: string } {
  const [y1, m1] = dari.split('-').map(Number);
  const [y2, m2] = sampai.split('-').map(Number);
  const bulan = (y2 * 12 + m2) - (y1 * 12 + m1) + 1;
  const awal = new Date(y1, m1 - 1 - bulan, 1);
  const akhir = new Date(y1, m1 - 1, 0);
  return { dari: iso(awal), sampai: iso(akhir) };
}

export type BarisSantriRingkas = { id: string; namaLengkap: string; jenjang: string; jenisKelamin: string; statusSosial: string | null };
export type BarisDonasiRingkas = { donaturId: string; tanggal: string; bentuk: 'UANG' | 'BARANG'; nominal: number | null; jenis: string };
export type BarisSuratRingkas = { tanggalSurat: string; terkirimWa: boolean };

export type InputRingkasan = {
  hariIni: Date;
  periode: { dari: string; sampai: string };
  santri: BarisSantriRingkas[];
  statusBerkas: Map<string, DokRingkas[]> | null;
  donasi: BarisDonasiRingkas[];
  jumlahDonatur: number;
  surat: BarisSuratRingkas[];
};

export type Ringkasan = {
  periode: { dari: string; sampai: string };
  santri: {
    total: number; aktif: number;
    perJenjang: Record<'SMP' | 'SMA' | 'SMK' | 'ALUMNI', number>;
    perGender: Record<'IKHWAN' | 'AKHWAT', number>;
    perStatusSosial: Record<string, number>;
  };
  berkas: { lengkap: number; total: number; persen: number; belumLengkap: Array<{ id: string; namaLengkap: string; kurang: string[] }> } | null;
  donasi: {
    totalUang: number; totalUangSebelumnya: number; persenPerubahan: number | null;
    jumlahBarang: number; perJenis: Array<{ jenis: string; total: number; jumlah: number }>; tren: PerBulan[];
  };
  donatur: { total: number; baru: number; rutin: number };
  surat: { terbit: number; belumTerkirim: number };
};

const dalam = (t: string, r: { dari: string; sampai: string }) => t >= r.dari && t <= r.sampai;
const persen = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export function hitungRingkasan(i: InputRingkasan): Ringkasan {
  // ── Santri
  const aktif = i.santri.filter(s => s.jenjang !== 'ALUMNI');
  const perJenjang = { SMP: 0, SMA: 0, SMK: 0, ALUMNI: 0 };
  const perGender = { IKHWAN: 0, AKHWAT: 0 };
  const perStatusSosial: Record<string, number> = {};
  for (const s of i.santri) {
    if (s.jenjang in perJenjang) perJenjang[s.jenjang as keyof typeof perJenjang] += 1;
    if (s.jenisKelamin in perGender) perGender[s.jenisKelamin as keyof typeof perGender] += 1;
    const st = s.statusSosial || 'REGULER';
    perStatusSosial[st] = (perStatusSosial[st] ?? 0) + 1;
  }

  // ── Kelengkapan berkas (santri aktif saja)
  let berkas: Ringkasan['berkas'] = null;
  if (i.statusBerkas) {
    const hasil = aktif.map(s => ({ s, st: statusBerkas(i.statusBerkas!.get(s.id)) }));
    const lengkap = hasil.filter(h => h.st.lengkap).length;
    berkas = {
      lengkap, total: aktif.length, persen: persen(lengkap, aktif.length),
      belumLengkap: hasil.filter(h => !h.st.lengkap)
        .sort((a, b) => a.s.namaLengkap.localeCompare(b.s.namaLengkap, 'id'))
        .slice(0, 5)
        .map(h => ({ id: h.s.id, namaLengkap: h.s.namaLengkap, kurang: [...h.st.kurang, ...h.st.perluPerbaikan.map(k => `${k} (perbaiki)`)] })),
    };
  }

  // ── Donasi
  const sebelum = rentangSebelumnya(i.periode.dari, i.periode.sampai);
  const uang = i.donasi.filter(d => d.bentuk === 'UANG');
  const jumlahUang = (r: { dari: string; sampai: string }) =>
    uang.filter(d => dalam(d.tanggal, r)).reduce((a, d) => a + (d.nominal ?? 0), 0);
  const totalUang = jumlahUang(i.periode);
  const totalUangSebelumnya = jumlahUang(sebelum);
  const diPeriode = i.donasi.filter(d => dalam(d.tanggal, i.periode));
  const perJenisMap = new Map<string, { total: number; jumlah: number }>();
  for (const d of diPeriode) {
    const x = perJenisMap.get(d.jenis) ?? { total: 0, jumlah: 0 };
    x.jumlah += 1;
    if (d.bentuk === 'UANG') x.total += d.nominal ?? 0;
    perJenisMap.set(d.jenis, x);
  }
  const perJenis = [...perJenisMap].map(([jenis, v]) => ({ jenis, ...v }))
    .sort((a, b) => b.jumlah - a.jumlah || a.jenis.localeCompare(b.jenis));

  const duaBelas = rentangLembaga('12-bulan', i.hariIni);
  const perBulan = new Map<string, number>();
  for (const d of uang) if (dalam(d.tanggal, duaBelas)) perBulan.set(d.tanggal.slice(0, 7), (perBulan.get(d.tanggal.slice(0, 7)) ?? 0) + (d.nominal ?? 0));
  const tren = isiBulanKosong([...perBulan].map(([bulan, total]) => ({ bulan, total })), duaBelas.dari, duaBelas.sampai);

  // ── Donatur
  const pertama = new Map<string, string>();
  const bulanAktif = new Map<string, Set<string>>();
  for (const d of i.donasi) {
    const p = pertama.get(d.donaturId);
    if (!p || d.tanggal < p) pertama.set(d.donaturId, d.tanggal);
    if (dalam(d.tanggal, duaBelas)) {
      const set = bulanAktif.get(d.donaturId) ?? new Set<string>();
      set.add(d.tanggal.slice(0, 7));
      bulanAktif.set(d.donaturId, set);
    }
  }
  const baru = [...pertama.values()].filter(t => dalam(t, i.periode)).length;
  const rutin = [...bulanAktif.values()].filter(s => s.size >= 3).length;

  return {
    periode: i.periode,
    santri: { total: i.santri.length, aktif: aktif.length, perJenjang, perGender, perStatusSosial },
    berkas,
    donasi: {
      totalUang, totalUangSebelumnya,
      persenPerubahan: totalUangSebelumnya > 0 ? Math.round(((totalUang - totalUangSebelumnya) / totalUangSebelumnya) * 100) : null,
      jumlahBarang: diPeriode.filter(d => d.bentuk === 'BARANG').length,
      perJenis, tren,
    },
    donatur: { total: i.jumlahDonatur, baru, rutin },
    surat: {
      terbit: i.surat.filter(s => dalam(s.tanggalSurat, i.periode)).length,
      belumTerkirim: i.surat.filter(s => !s.terkirimWa).length,
    },
  };
}

/** Ringkasan sebagai CSV dua kolom (Indikator, Nilai) untuk lampiran laporan. */
export function csvRingkasan(r: Ringkasan): string {
  const baris: Array<{ Indikator: string; Nilai: string | number }> = [
    { Indikator: 'Periode', Nilai: `${r.periode.dari} s.d. ${r.periode.sampai}` },
    { Indikator: 'Santri total', Nilai: r.santri.total },
    { Indikator: 'Santri aktif', Nilai: r.santri.aktif },
    ...Object.entries(r.santri.perJenjang).map(([k, v]) => ({ Indikator: `Santri ${k}`, Nilai: v })),
    { Indikator: 'Santri ikhwan', Nilai: r.santri.perGender.IKHWAN },
    { Indikator: 'Santri akhwat', Nilai: r.santri.perGender.AKHWAT },
    ...Object.entries(r.santri.perStatusSosial).map(([k, v]) => ({ Indikator: `Status sosial ${k}`, Nilai: v })),
    ...(r.berkas ? [
      { Indikator: 'Santri aktif berkas lengkap', Nilai: r.berkas.lengkap },
      { Indikator: 'Kelengkapan berkas (%)', Nilai: r.berkas.persen },
    ] : []),
    { Indikator: 'Total donasi uang', Nilai: r.donasi.totalUang },
    { Indikator: 'Total donasi uang periode sebelumnya', Nilai: r.donasi.totalUangSebelumnya },
    { Indikator: 'Jumlah donasi barang', Nilai: r.donasi.jumlahBarang },
    ...r.donasi.perJenis.map(j => ({ Indikator: `Donasi ${j.jenis} (Rp / catatan)`, Nilai: `${j.total} / ${j.jumlah}` })),
    { Indikator: 'Donatur total', Nilai: r.donatur.total },
    { Indikator: 'Donatur baru', Nilai: r.donatur.baru },
    { Indikator: 'Donatur rutin', Nilai: r.donatur.rutin },
    { Indikator: 'Surat terbit', Nilai: r.surat.terbit },
    { Indikator: 'Surat belum terkirim', Nilai: r.surat.belumTerkirim },
  ];
  return toCsv(baris);
}
```
Catatan: `BERKAS_WAJIB` diimpor hanya bila dipakai; hapus dari import bila `tsc`/lint menandai tak terpakai.

- [ ] **Step 4: Jalankan tes**

Run: `npx vitest run tests/lembaga/ringkasan.test.ts && npx tsc --noEmit -p .`
Expected: PASS. Bila urutan `perJenis` di tes berbeda, periksa aturan sort (jumlah desc, lalu nama asc) — tes mengharapkan `LAINNYA` sebelum `ZIS` (keduanya jumlah 1).

- [ ] **Step 5: Commit**

```bash
git add lib/lembaga/ringkasan.ts tests/lembaga/ringkasan.test.ts
git commit -m "feat(lembaga): perhitungan ringkasan yayasan (santri, berkas, donasi, donatur, surat) + CSV"
```

---

### Task 10: API ringkasan

**Files:**
- Create: `app/api/lembaga/ringkasan/route.ts`
- Test: `tests/api/lembaga-ringkasan-route.test.ts`

**Interfaces:**
- Consumes: `hitungRingkasan`, `rentangLembaga`, `PERIODE_LEMBAGA` (Task 9), `ambilStatusBerkas` (Task 5).
- Produces: `GET /api/lembaga/ringkasan?periode=<PeriodeLembaga>&hariIni=YYYY-MM-DD` → `{ success: true, data: Ringkasan }`.

- [ ] **Step 1: Tulis tes gagal**

`tests/api/lembaga-ringkasan-route.test.ts`:
```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireRoom = vi.fn();
const ambilStatusBerkas = vi.fn();

function rantai(hasil: unknown) {
  const r: any = new Proxy({}, { get: (_t, k) => (k === 'then' ? (ok: (v: unknown) => void) => ok(hasil) : () => r) });
  return r;
}
const tabel: Record<string, unknown> = {
  santri: { data: [{ id: 's1', namaLengkap: 'A', jenjang: 'SMP', jenisKelamin: 'IKHWAN', statusSosial: null }], error: null },
  donasi: { data: [{ donaturId: 'p1', tanggal: '2026-09-02', bentuk: 'UANG', nominal: 1000, jenis: 'ZIS' }], error: null },
  donatur: { count: 3, error: null },
  surat: { data: [{ tanggalSurat: '2026-09-02', terkirimWa: false }], error: null },
};
const fakeSupabase = { from: (t: string) => rantai(tabel[t]) };

vi.mock('@/lib/auth/session', () => ({ requireRoom: (...a: unknown[]) => requireRoom(...a), authErrorResponse: () => null }));
vi.mock('@/lib/db/lembaga-repo', () => ({ ambilStatusBerkas: (...a: unknown[]) => ambilStatusBerkas(...a) }));

import { GET } from '@/app/api/lembaga/ringkasan/route';
const req = (url: string) => ({ url }) as never;

beforeEach(() => {
  requireRoom.mockReset().mockResolvedValue({ supabase: fakeSupabase });
  ambilStatusBerkas.mockReset().mockResolvedValue(new Map());
});

describe('GET /api/lembaga/ringkasan', () => {
  it('menghitung ringkasan untuk periode & hari ini dari klien', async () => {
    const res = await GET(req('http://x/api/lembaga/ringkasan?periode=bulan-ini&hariIni=2026-09-25'));
    expect(res.status).toBe(200);
    expect(requireRoom).toHaveBeenCalledWith('lembaga');
    const { data } = await res.json();
    expect(data.periode).toEqual({ dari: '2026-09-01', sampai: '2026-09-30' });
    expect(data.donasi.totalUang).toBe(1000);
    expect(data.donatur.total).toBe(3);
    expect(data.surat.belumTerkirim).toBe(1);
  });
  it('periode atau tanggal tidak valid → 400', async () => {
    expect((await GET(req('http://x/api/lembaga/ringkasan?periode=kemarin'))).status).toBe(400);
    expect((await GET(req('http://x/api/lembaga/ringkasan?periode=bulan-ini&hariIni=2026-13-40'))).status).toBe(400);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/api/lembaga-ringkasan-route.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementasi**

`app/api/lembaga/ringkasan/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { ambilStatusBerkas } from '@/lib/db/lembaga-repo';
import { isTanggalIso } from '@/lib/validation/query';
import {
  hitungRingkasan, rentangLembaga, PERIODE_LEMBAGA, type PeriodeLembaga,
  type BarisSantriRingkas, type BarisDonasiRingkas, type BarisSuratRingkas,
} from '@/lib/lembaga/ringkasan';

/**
 * Semua angka beranda Ruang Lembaga dalam satu respons. `hariIni` dikirim perangkat
 * pengguna agar batas bulan mengikuti WIB, bukan jam server (UTC).
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('lembaga');
    const p = new URL(req.url).searchParams;
    const periode = (p.get('periode') || 'bulan-ini') as PeriodeLembaga;
    if (!PERIODE_LEMBAGA.includes(periode)) return NextResponse.json({ error: 'Periode tidak dikenal' }, { status: 400 });
    const hariIniParam = p.get('hariIni');
    if (hariIniParam && !isTanggalIso(hariIniParam)) return NextResponse.json({ error: 'Format tanggal harus YYYY-MM-DD' }, { status: 400 });
    const hariIni = hariIniParam ? new Date(`${hariIniParam}T00:00:00`) : new Date();

    const [santri, donasi, donatur, surat, statusBerkas] = await Promise.all([
      supabase.from('santri').select('id, namaLengkap, jenjang, jenisKelamin, statusSosial'),
      supabase.from('donasi').select('donaturId, tanggal, bentuk, nominal, jenis'),
      supabase.from('donatur').select('id', { head: true, count: 'exact' }),
      supabase.from('surat').select('tanggalSurat, terkirimWa'),
      ambilStatusBerkas(supabase),
    ]);
    for (const r of [santri, donasi, donatur, surat]) if (r.error) throw r.error;

    const data = hitungRingkasan({
      hariIni,
      periode: rentangLembaga(periode, hariIni),
      santri: (santri.data ?? []) as BarisSantriRingkas[],
      statusBerkas,
      donasi: (donasi.data ?? []) as BarisDonasiRingkas[],
      jumlahDonatur: donatur.count ?? 0,
      surat: (surat.data ?? []) as BarisSuratRingkas[],
    });
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Ringkasan lembaga error:', e);
    return NextResponse.json({ error: 'Gagal memuat ringkasan' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Jalankan tes**

Run: `npx vitest run tests/api/lembaga-ringkasan-route.test.ts && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/lembaga/ringkasan tests/api/lembaga-ringkasan-route.test.ts
git commit -m "feat(api): ringkasan Ruang Lembaga dalam satu endpoint"
```

---

### Task 11: Beranda Lembaga (UI + ekspor CSV)

**Files:**
- Create: `components/lembaga/BagianRingkasan.tsx`, `components/lembaga/BerandaLembaga.tsx`
- Modify: `components/donatur/beranda/GrafikTren.tsx` (prop `judul`), `app/(lembaga)/lembaga/page.tsx`
- Test: `tests/components/beranda-lembaga.test.tsx`

**Interfaces:**
- Consumes: `Ringkasan`, `PeriodeLembaga`, `csvRingkasan` (Task 9); endpoint Task 10; `MODE_LEMBAGA.rute` (Task 4).
- Catatan tes SSR: `renderToStaticMarkup` menyisipkan `<!-- -->` di antara teks literal dan ekspresi `{…}` yang bersebelahan. Semua teks yang dicek tes (mis. "Rp 150.000", "0 dari 1 santri aktif lengkap") ditulis sebagai satu template literal `{`…`}`.
- Produces: `BagianRingkasan({ r }: { r: Ringkasan })` (presentasional, tanpa fetch); `BerandaLembaga()`; `GrafikTren({ tren, judul?, className? })`.

- [ ] **Step 1: Tulis tes gagal**

`tests/components/beranda-lembaga.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

import { BagianRingkasan } from '@/components/lembaga/BagianRingkasan';
import { hitungRingkasan } from '@/lib/lembaga/ringkasan';

const r = hitungRingkasan({
  hariIni: new Date(2026, 8, 25),
  periode: { dari: '2026-09-01', sampai: '2026-09-30' },
  santri: [{ id: 's2', namaLengkap: 'Aisyah', jenjang: 'SMA', jenisKelamin: 'AKHWAT', statusSosial: 'YATIM' }],
  statusBerkas: new Map(),
  donasi: [{ donaturId: 'p1', tanggal: '2026-09-05', bentuk: 'UANG', nominal: 150000, jenis: 'ZIS' }],
  jumlahDonatur: 7,
  surat: [{ tanggalSurat: '2026-09-05', terkirimWa: false }],
});

describe('BagianRingkasan', () => {
  const h = renderToStaticMarkup(<BagianRingkasan r={r} />);
  it('angka utama', () => {
    expect(h).toContain('Rp 150.000');
    expect(h).toContain('>7<');
  });
  it('santri belum lengkap menuju detail Lembaga', () => {
    expect(h).toContain('href="/lembaga/santri/s2"');
    expect(h).toContain('0 dari 1 santri aktif lengkap');
  });
  it('surat belum terkirim menuju daftar surat Lembaga tersaring', () => {
    expect(h).toContain('href="/lembaga/surat?status=BELUM"');
  });
  it('kartu berkas lembaga segera hadir & tren 12 bulan', () => {
    expect(h).toContain('Berkas lembaga');
    expect(h).toContain('Segera hadir');
    expect(h).toContain('Tren 12 bulan');
  });
  it('status berkas gagal dimuat → pesan, bagian lain tetap', () => {
    const t = renderToStaticMarkup(<BagianRingkasan r={{ ...r, berkas: null }} />);
    expect(t).toContain('Status berkas tidak dapat dimuat');
    expect(t).toContain('Rp 150.000');
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/components/beranda-lembaga.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementasi**

`components/donatur/beranda/GrafikTren.tsx`:
```tsx
export function GrafikTren({ tren, judul = 'Tren 6 bulan', className }: { tren: PerBulan[] | null; judul?: string; className?: string }) {
// …dan ganti teks judul tetap:
        <ChartBar size={18} weight="duotone" className="text-bq-biru" aria-hidden="true" /> {judul}
```

`components/lembaga/BagianRingkasan.tsx`:
```tsx
import Link from 'next/link';
import { Users, FileText, HandCoins, UserCircle, Scroll, FolderSimple, CaretRight, WarningCircle } from '@phosphor-icons/react';
import type { Ringkasan } from '@/lib/lembaga/ringkasan';
import { formatRupiah } from '@/lib/utils/terbilang';
import { labelJenis } from '@/lib/donatur/riwayat';
import { MODE_LEMBAGA } from '@/lib/ruang/mode';
import { Kartu, kelasKartu } from '@/components/ui/Kartu';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { GrafikTren } from '@/components/donatur/beranda/GrafikTren';

const LABEL_SOSIAL: Record<string, string> = { REGULER: 'Reguler', YATIM: 'Yatim', PIATU: 'Piatu', YATIM_PIATU: 'Yatim piatu', DHUAFA: 'Dhuafa' };
const LABEL_JENJANG: Record<string, string> = { SMP: 'SMP', SMA: 'SMA', SMK: 'SMK', ALUMNI: 'Alumni' };

function Batang({ label, nilai, maks }: { label: string; nilai: number; maks: number }) {
  return (
    <li className="grid grid-cols-[88px_minmax(0,1fr)_32px] items-center gap-2 text-xs">
      <span className="truncate text-bq-redup">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <span className="block h-full rounded-full bg-[#0B5FA5]" style={{ width: `${maks > 0 ? (nilai / maks) * 100 : 0}%` }} />
      </span>
      <span className="text-right font-bold tabular-nums text-bq-tinta">{nilai}</span>
    </li>
  );
}

function Kelompok({ judul, data, label }: { judul: string; data: Record<string, number>; label: Record<string, string> }) {
  const maks = Math.max(0, ...Object.values(data));
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-extrabold uppercase tracking-wider text-bq-redup">{judul}</h3>
      <ul className="space-y-1.5">{Object.entries(data).map(([k, v]) => <Batang key={k} label={label[k] ?? k} nilai={v} maks={maks} />)}</ul>
    </div>
  );
}

function Judul({ ikon, warna, children }: { ikon: typeof Users; warna: 'hijau' | 'biru' | 'jingga' | 'ungu'; children: React.ReactNode }) {
  return <h2 className="flex items-center gap-2 text-sm font-extrabold text-bq-tinta"><IkonUbin ikon={ikon} warna={warna} ukuran="sm" />{children}</h2>;
}

/** Isi beranda Ruang Lembaga dari satu objek Ringkasan (tanpa fetch — mudah dites). */
export function BagianRingkasan({ r }: { r: Ringkasan }) {
  const rute = MODE_LEMBAGA.rute;
  const ubah = r.donasi.persenPerubahan;
  return (
    <div className="space-y-4">
      {/* 1. Hero */}
      <Kartu varian="hero" className="grid grid-cols-3 gap-2 p-5 text-center">
        <div><p className="text-xs text-white/80">Santri aktif</p><p className="text-2xl font-black">{r.santri.aktif}</p></div>
        <div>
          <p className="text-xs text-white/80">Donasi uang</p>
          <p className="truncate text-lg font-black">{`Rp ${formatRupiah(r.donasi.totalUang)}`}</p>
          {ubah !== null && <p className="text-[11px] text-white/85">{`${ubah >= 0 ? '▲' : '▼'} ${Math.abs(ubah)}% dari periode lalu`}</p>}
        </div>
        <div><p className="text-xs text-white/80">Donatur</p><p className="text-2xl font-black">{r.donatur.total}</p></div>
      </Kartu>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* 2. Santri */}
        <Kartu className="space-y-4 p-5">
          <Judul ikon={Users} warna="biru">Santri <span className="font-normal text-bq-redup">({r.santri.total})</span></Judul>
          <Kelompok judul="Jenjang" data={r.santri.perJenjang} label={LABEL_JENJANG} />
          <Kelompok judul="Jenis kelamin" data={r.santri.perGender} label={{ IKHWAN: 'Ikhwan', AKHWAT: 'Akhwat' }} />
          <Kelompok judul="Status sosial" data={r.santri.perStatusSosial} label={LABEL_SOSIAL} />
        </Kartu>

        {/* 3. Kelengkapan berkas */}
        <Kartu className="space-y-3 p-5">
          <Judul ikon={FileText} warna="jingga">Kelengkapan berkas</Judul>
          {r.berkas === null ? (
            <p className="flex items-center gap-2 text-sm text-bq-redup"><WarningCircle size={16} weight="bold" aria-hidden="true" /> Status berkas tidak dapat dimuat.</p>
          ) : (
            <>
              <p className="text-sm text-bq-tinta"><strong className="text-2xl font-black">{`${r.berkas.persen}%`}</strong>{` · ${r.berkas.lengkap} dari ${r.berkas.total} santri aktif lengkap`}</p>
              <span className="block h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <span className="block h-full rounded-full bg-[#0E9F54]" style={{ width: `${r.berkas.persen}%` }} />
              </span>
              {r.berkas.belumLengkap.length > 0 && (
                <ul className="divide-y divide-bq-garis">
                  {r.berkas.belumLengkap.map(s => (
                    <li key={s.id}>
                      <Link href={rute.santri(s.id)} className="flex items-center gap-2 py-2 text-sm">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-bq-tinta">{s.namaLengkap}</span>
                          <span className="block truncate text-xs text-bq-redup">{`Kurang: ${s.kurang.join(', ')}`}</span>
                        </span>
                        <CaretRight size={14} weight="bold" className="text-bq-redup" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Kartu>

        {/* 4. Donasi */}
        <div className="space-y-4">
          <GrafikTren tren={r.donasi.tren} judul="Tren 12 bulan" />
          <Kartu className="space-y-3 p-5">
            <Judul ikon={HandCoins} warna="hijau">Donasi periode ini</Judul>
            <dl className="grid grid-cols-2 gap-2 text-center">
              <div><dt className="text-xs text-bq-redup">Uang</dt><dd className="truncate text-sm font-black text-bq-tinta">{`Rp ${formatRupiah(r.donasi.totalUang)}`}</dd></div>
              <div><dt className="text-xs text-bq-redup">Barang</dt><dd className="text-sm font-black text-bq-tinta">{`${r.donasi.jumlahBarang} catatan`}</dd></div>
            </dl>
            {r.donasi.perJenis.length > 0 && (
              <ul className="space-y-1 text-xs">
                {r.donasi.perJenis.map(j => (
                  <li key={j.jenis} className="flex justify-between gap-2">
                    <span className="text-bq-redup">{labelJenis(j.jenis as never)}</span>
                    <span className="font-bold text-bq-tinta">{`${j.total > 0 ? `Rp ${formatRupiah(j.total)} · ` : ''}${j.jumlah}×`}</span>
                  </li>
                ))}
              </ul>
            )}
          </Kartu>
        </div>

        <div className="space-y-4">
          {/* 5. Donatur */}
          <Kartu className="space-y-3 p-5">
            <Judul ikon={UserCircle} warna="biru">Donatur</Judul>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div><dt className="text-xs text-bq-redup">Total</dt><dd className="text-lg font-black text-bq-tinta">{r.donatur.total}</dd></div>
              <div><dt className="text-xs text-bq-redup">Baru</dt><dd className="text-lg font-black text-bq-tinta">{r.donatur.baru}</dd></div>
              <div><dt className="text-xs text-bq-redup">Rutin</dt><dd className="text-lg font-black text-bq-tinta">{r.donatur.rutin}</dd></div>
            </dl>
            <p className="text-[11px] text-bq-redup">Rutin = berdonasi di ≥ 3 bulan berbeda dalam 12 bulan terakhir.</p>
            <Link href={rute.donaturDaftar} className="text-xs font-bold text-bq-biru hover:underline">Lihat semua donatur</Link>
          </Kartu>

          {/* 6. Surat */}
          <Kartu className="space-y-3 p-5">
            <Judul ikon={Scroll} warna="jingga">Surat</Judul>
            <dl className="grid grid-cols-2 gap-2 text-center">
              <div><dt className="text-xs text-bq-redup">Terbit periode ini</dt><dd className="text-lg font-black text-bq-tinta">{r.surat.terbit}</dd></div>
              <div>
                <dt className="text-xs text-bq-redup">Belum terkirim</dt>
                <dd><Link href={`${rute.suratDaftar}?status=BELUM`} className="text-lg font-black text-bq-jingga hover:underline">{r.surat.belumTerkirim}</Link></dd>
              </div>
            </dl>
          </Kartu>

          {/* 7. Berkas lembaga (Tahap B) */}
          <Link href="/lembaga/berkas" className={kelasKartu('biasa', 'flex items-center gap-3 p-5')}>
            <IkonUbin ikon={FolderSimple} warna="ungu" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-bq-tinta">Berkas lembaga</span>
              <span className="block text-xs text-bq-redup">Segera hadir — SK, akta, NPWP, izin & masa berlakunya</span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
```
Periksa `labelJenis` di `lib/donatur/riwayat.ts` menerima jenis lama (ZAKAT/INFAQ/SHADAQAH); bila tipenya `JenisDonasi`, cast `as never` di atas cukup.

`components/lembaga/BerandaLembaga.tsx`:
```tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { DownloadSimple, ArrowClockwise } from '@phosphor-icons/react';
import { csvRingkasan, type PeriodeLembaga, type Ringkasan } from '@/lib/lembaga/ringkasan';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { ChipPilihan } from '@/components/ui/ChipPilihan';
import { TombolIkon } from '@/components/ui/Tombol';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { BagianRingkasan } from './BagianRingkasan';

const dua = (n: number) => String(n).padStart(2, '0');
const hariIniLokal = () => { const d = new Date(); return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`; };

function unduh(r: Ringkasan) {
  // BOM UTF-8 agar Excel versi Indonesia membaca karakter dengan benar.
  const blob = new Blob(['﻿' + csvRingkasan(r)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ringkasan-lembaga-${r.periode.dari}-${r.periode.sampai}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function BerandaLembaga({ namaDepan }: { namaDepan?: string }) {
  const [periode, setPeriode] = useState<PeriodeLembaga>('bulan-ini');
  const [data, setData] = useState<Ringkasan | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [ulang, setUlang] = useState(0);
  const coba = useCallback(() => setUlang(n => n + 1), []);

  useEffect(() => {
    let batal = false;
    setGalat(null);
    (async () => {
      try {
        const res = await fetch(`/api/lembaga/ringkasan?periode=${periode}&hariIni=${hariIniLokal()}`);
        const json = await res.json().catch(() => ({}));
        if (batal) return;
        if (!res.ok) { setGalat(json.error || 'Gagal memuat ringkasan.'); return; }
        setData(json.data);
      } catch {
        if (!batal) setGalat('Tidak dapat terhubung ke server.');
      }
    })();
    return () => { batal = true; };
  }, [periode, ulang]);

  return (
    <div className="space-y-4 md:space-y-6">
      <KepalaHalaman judul="Ruang Lembaga" sub={namaDepan ? `Assalamu'alaikum, ${namaDepan}` : "Assalamu'alaikum"} subTampilDiHp
        aksi={<TombolIkon ikon={DownloadSimple} label="Unduh ringkasan (CSV)" disabled={!data} onClick={() => data && unduh(data)} />} />
      <ChipPilihan<PeriodeLembaga> label="Periode" nilai={periode} onPilih={setPeriode}
        opsi={[
          { value: 'bulan-ini', label: 'Bulan ini' },
          { value: '3-bulan', label: '3 bulan' },
          { value: '12-bulan', label: '12 bulan' },
          { value: 'tahun-ini', label: 'Tahun ini' },
        ]} />
      {galat && (
        <div className="space-y-2">
          <PesanGalat pesan={galat} />
          <button type="button" onClick={coba} className="tekan inline-flex items-center gap-1.5 rounded-xl border border-bq-garis px-3 py-2 text-xs font-bold text-bq-tinta">
            <ArrowClockwise size={14} weight="bold" aria-hidden="true" /> Coba lagi
          </button>
        </div>
      )}
      {!data && !galat && <div className="h-40 animate-pulse rounded-kartu bg-slate-200/60 dark:bg-slate-800/60" />}
      {data && <BagianRingkasan r={data} />}
    </div>
  );
}
```

`app/(lembaga)/lembaga/page.tsx` (ganti isi sementara):
```tsx
import { getSessionUser } from '@/lib/auth/session';
import { BerandaLembaga } from '@/components/lembaga/BerandaLembaga';

export const metadata = { title: 'Ruang Lembaga — BQ-ku' };

export default async function LembagaHomePage() {
  const user = await getSessionUser();
  return <BerandaLembaga namaDepan={user?.nama?.trim().split(/\s+/)[0]} />;
}
```

- [ ] **Step 4: Jalankan tes**

Run: `npx vitest run && npx tsc --noEmit -p .`
Expected: PASS (termasuk tes beranda donatur yang memakai `GrafikTren` — judul bawaan tetap "Tren 6 bulan").

- [ ] **Step 5: Commit**

```bash
git add components/lembaga components/donatur/beranda/GrafikTren.tsx app/(lembaga)/lembaga/page.tsx tests/components/beranda-lembaga.test.tsx
git commit -m "feat(lembaga): beranda ringkasan yayasan + unduh CSV"
```

---

### Task 12: Verifikasi menyeluruh

**Files:** tidak ada perubahan kode kecuali perbaikan temuan.

- [ ] **Step 1: Tes, tipe, build**

Run: `npx vitest run && npx tsc --noEmit -p . && npx next build; git checkout next-env.d.ts`
Expected: semua lulus.

- [ ] **Step 2: Migrasi (manual, oleh pemilik proyek)**

Minta pengguna menjalankan `supabase/migrations/0010_peran_pengurus.sql` di Supabase Dashboard → SQL Editor. Setelah itu, verifikasi dengan akun yang **hanya** berperan `PENGURUS` (buat lewat Kelola Pengguna):
- `/lembaga` tampil dengan angka; `/santri` dialihkan ke `/lembaga`.
- `/lembaga/santri/[id]` menampilkan status berkas tanpa bisa membuka file.
- Di konsol browser: `await (await fetch('/api/donatur')).status` → `403`.

- [ ] **Step 3: Cek visual di browser pane**

Dengan akun Superadmin di dev server (`preview_start` nama `bq-ku-dev`): buka `/lembaga`, `/lembaga/santri`, `/lembaga/donatur`, `/lembaga/surat`, `/lembaga/surat/[id]`, `/lembaga/akun` di ukuran HP (375×812) dan desktop; pastikan tidak ada tombol tambah/ubah/hapus/kirim, bilah "Mode baca" tampil, bottom nav 5 slot dengan tombol tengah Berkas lembaga, dan halaman Akun menampilkan dua baris "Pindah ke …".

- [ ] **Step 4: Commit perbaikan (bila ada)**

```bash
git add -A && git commit -m "fix(lembaga): perbaikan hasil verifikasi"
```
