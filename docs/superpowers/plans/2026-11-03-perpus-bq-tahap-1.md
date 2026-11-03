# Perpus BQ — Tahap 1 (Fondasi & Data) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ruang Perpus di bq-ku untuk pustakawan: impor katalog/donasi/pengadaan dari Google Sheets, kelola buku dengan nomor panggil DDC baku (usulan kelas oleh Gemini), dan audit/perbaikan kode lama beserta daftar label cetak ulang.

**Architecture:** Peran baru `PUSTAKAWAN` membuka ruangan `perpus` (`/perpus`) dengan pola ruangan yang sudah ada (`AppShell`, `requireRoom`). Logika murni di `lib/perpus/*` (DDC, nomor panggil, parser CSV Sheets, rencana audit) diuji vitest; akses data di `lib/db/perpus-repo.ts`; API di `app/api/perpus/*`. AI memakai modul pusat `lib/ai` (pemakaian & batas tercatat) dengan model Gemini dipaksa untuk fitur `klasifikasi_buku`.

**Tech Stack:** Next.js 16 (App Router), React 19, Supabase (Postgres + RLS, `@supabase/ssr`), zod 4, Tailwind, `@phosphor-icons/react`, vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-11-03-perpus-bq-design.md` (bagian §2–§5, §6 "Ruang Perpus", §9–§11 tahap 1). Situs publik (domain perpusbq, tema, i18n) = rencana Tahap 2; anggota & peminjaman = rencana Tahap 3.

## Global Constraints

- Baca panduan Next di `node_modules/next/dist/docs/` sebelum menulis kode Next (lihat `AGENTS.md`): versi ini punya perubahan besar; `proxy.ts` menggantikan middleware.
- Nama kolom tabel baru memakai **camelCase berkutip** seperti tabel lain di repo (`"kelasDdc"`, `"createdAt"`), bukan snake_case seperti di spec. Nama tabel tetap `perpus_*`.
- Migrasi dijalankan **manual** di SQL Editor Supabase; file `supabase/migrations/0013_perpus.sql` harus aman dijalankan ulang (`if not exists`, `drop … if exists`).
- Nomor panggil: `[kelas] [3 huruf pengarang] [kode judul][.seri]`, unik di database; DDC baku (novel Indonesia `899.221`, dst.).
- Kelas DDC yang sah hanya yang ada di `lib/perpus/ddc.ts`.
- Jatuh tempo, anggota, pinjaman: **bukan** tahap ini.
- AI klasifikasi: Gemini `gemini-flash-lite-latest`, lewat `bacaDokumenAi`, fitur `klasifikasi_buku`; AI hanya mengusulkan kelas, nomor disusun kode.
- Bahasa UI Ruang Perpus: Indonesia, gaya komponen bq-ku yang ada (`Kartu`, `KepalaHalaman`, `TombolUtama`, `kelasInput`).
- Sumber impor: spreadsheet `1q4vDyNGHBKq8ZwU4s4-SxZrWToMPL7sB26Jwk9HQe5U`, sheet *Copy of Daftar Buku* (gid `1647509154`), *Infaq* (gid `1492384701`), *Pengadaan Buku* (gid `1507527752`), lewat `…/export?format=csv&gid=<gid>` (tanpa kunci API; sudah diuji 200 OK).
- Node lokal saat ini v20 (package meminta 22) — jangan memakai API Node 22-only (`Object.groupBy`, strip-types).
- Commit per task; pesan commit berbahasa Indonesia gaya `feat(perpus): …`, diakhiri `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Push tidak auto-deploy: deploy manual `npx vercel --prod` lalu cek `npx vercel ls`.

**Penyimpangan sadar dari spec (disetujui dalam rencana ini):**
- Route group admin bernama `app/(perpus)` (bukan `(perpus-admin)`), mengikuti pola `(lembaga)`, `(donatur)`.
- Impor berjalan lewat API + tombol di Beranda Ruang Perpus (bukan `scripts/impor-perpus.mjs`): logika parser TypeScript dipakai ulang tanpa perlu runner TS untuk skrip, dan pustakawan bisa melihat pratinjau. Impor ulang tetap hanya SUPERADMIN.
- View publik (`perpus_katalog_publik`, `perpus_donasi_publik`, `perpus_ringkasan_publik`) dipindah ke migrasi Tahap 2 (konsumennya baru ada di sana); halaman Anggota ke Tahap 3.
- Upload sampul & cetak label PDF ditunda ke Tahap 2; tahap ini mengekspor label CSV.
- Kolom `statusKode` (`baku` / `perlu_audit`) + `catatanAudit` ditambahkan: semua buku impor ditandai `perlu_audit` karena perpindahan ke DDC baku mengubah hampir semua nomor.

## File Structure

| File | Tanggung jawab |
|---|---|
| `lib/auth/roles.ts`, `lib/auth/rooms.ts`, `lib/validation/pengguna.ts` | peran `PUSTAKAWAN`, ruangan `perpus` |
| `lib/nav/menu.ts`, `components/layout/ikon-menu.ts`, `components/layout/ikon-ruang.ts`, `components/pengguna/PenggunaTable.tsx` | menu & tampilan ruangan perpus |
| `app/(perpus)/layout.tsx`, `app/(perpus)/perpus/**/page.tsx` | halaman Ruang Perpus |
| `supabase/migrations/0013_perpus.sql` | tabel, RLS, fungsi `perpus_terapkan_nomor` |
| `lib/perpus/tipe.ts` | tipe baris tabel perpus |
| `lib/perpus/ddc.ts` | daftar kelas DDC + genre, label id/en |
| `lib/perpus/nomor-panggil.ts` | kode pengarang/judul, susun/urai nomor, penyelesai bentrok |
| `lib/perpus/impor.ts` | parser CSV & tiga sheet → `RencanaImpor` |
| `lib/perpus/audit.ts` | rencana nomor baru saat audit, baris label, CSV |
| `lib/perpus/ringkasan.ts` | hitung ringkasan beranda |
| `lib/perpus/sumber.ts` | ambil CSV Sheets |
| `lib/perpus/klasifikasi.ts` | prompt & urai jawaban AI klasifikasi |
| `lib/db/perpus-repo.ts` | query Supabase |
| `lib/validation/perpus.ts` | skema zod input API |
| `lib/ai/baca.ts`, `lib/ai/pemakaian.ts`, `lib/ai/penyedia/{gemini,openai}.ts` | AI tanpa berkas + model paksa + fitur baru |
| `app/api/perpus/**/route.ts` | API Ruang Perpus |
| `components/perpus/*.tsx` | UI Ruang Perpus |
| `tests/perpus/*.test.ts`, `tests/api/perpus-*.test.ts`, `tests/db/perpus-repo.test.ts` | tes |

---

### Task 1: Peran PUSTAKAWAN & ruangan `perpus`

**Files:**
- Modify: `lib/auth/roles.ts`, `lib/auth/rooms.ts`, `lib/validation/pengguna.ts:3`
- Modify: `lib/nav/menu.ts`, `components/layout/ikon-menu.ts`, `components/layout/ikon-ruang.ts`, `components/pengguna/PenggunaTable.tsx:14-26`
- Create: `app/(perpus)/layout.tsx`, `app/(perpus)/perpus/page.tsx` (sementara), `app/(perpus)/perpus/akun/page.tsx`
- Test: `tests/auth/rooms.test.ts`, `tests/auth/roles.test.ts`, `tests/layout/menu-perpus.test.ts`

**Interfaces:**
- Produces: `UserRole` termasuk `'PUSTAKAWAN'`; `Room` termasuk `'perpus'`; `ROOM_HOME.perpus = '/perpus'`, `ROOM_AKUN.perpus = '/perpus/akun'`, `ROOM_LABEL.perpus = 'Ruang Perpus'`; `roomOfPath('/perpus…' | '/api/perpus…') === 'perpus'`; `requireRoom('perpus')` berlaku.

- [ ] **Step 1: Tulis tes yang gagal**

Ubah `tests/auth/rooms.test.ts`: baris `expect(roomsFor(['SUPERADMIN'])).toEqual(['santri', 'donatur', 'lembaga']);` menjadi `expect(roomsFor(['SUPERADMIN'])).toEqual(['santri', 'donatur', 'lembaga', 'perpus']);` lalu tambahkan di blok `describe('ruangan')`:

```ts
  it('ruang perpus untuk pustakawan', () => {
    expect(roomsFor(['PUSTAKAWAN'])).toEqual(['perpus']);
    expect(roomOfPath('/perpus')).toBe('perpus');
    expect(roomOfPath('/perpus/buku')).toBe('perpus');
    expect(roomOfPath('/api/perpus/buku')).toBe('perpus');
    expect(roomOfPath('/perpusbq')).toBe('santri');
    expect(ROOM_HOME.perpus).toBe('/perpus');
  });
```

Tambahkan di `tests/auth/roles.test.ts` (dalam `describe` yang ada atau baru):

```ts
import { ALL_ROLES, getRoleLabel } from '@/lib/auth/roles';
it('PUSTAKAWAN terdaftar', () => {
  expect(ALL_ROLES).toContain('PUSTAKAWAN');
  expect(getRoleLabel('PUSTAKAWAN')).toBe('Pustakawan');
});
```

Buat `tests/layout/menu-perpus.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { menuRail, slotHp, itemAktif } from '@/lib/nav/menu';

const o = { canManageUsers: false, jumlahRuang: 1 };

describe('menu Ruang Perpus', () => {
  it('rail berisi beranda, buku, donasi, audit', () => {
    expect(menuRail('perpus', o).map(i => i.href)).toEqual(['/perpus', '/perpus/buku', '/perpus/donasi', '/perpus/audit']);
  });
  it('HP: 5 slot, Buku di tengah', () => {
    const s = slotHp('perpus', o);
    expect(s).toHaveLength(5);
    expect(s[2]).toMatchObject({ jenis: 'tautan', utama: true, item: { href: '/perpus/buku' } });
    expect(s[4]).toEqual({ jenis: 'akun' });
  });
  it('beranda perpus hanya aktif persis di /perpus', () => {
    expect(itemAktif('/perpus/buku', '/perpus')).toBe(false);
    expect(itemAktif('/perpus', '/perpus')).toBe(true);
  });
});
```

- [ ] **Step 2: Jalankan tes, pastikan gagal**

Run: `npx vitest run tests/auth tests/layout/menu-perpus.test.ts`
Expected: FAIL (`'PUSTAKAWAN'`/`'perpus'` belum dikenal).

- [ ] **Step 3: Implementasi**

`lib/auth/roles.ts`:
```ts
export type UserRole = 'SUPERADMIN' | 'PENGURUS' | 'ADMIN_SANTRI' | 'ADMIN_DONATUR' | 'PUSTAKAWAN' | 'VIEWER';
// …
export const ALL_ROLES: UserRole[] = ['SUPERADMIN', 'PENGURUS', 'ADMIN_SANTRI', 'ADMIN_DONATUR', 'PUSTAKAWAN', 'VIEWER'];
// di switch getRoleLabel, sebelum VIEWER:
    case 'PUSTAKAWAN': return 'Pustakawan';
```

`lib/validation/pengguna.ts:3`:
```ts
export const roleEnum = z.enum(['SUPERADMIN', 'PENGURUS', 'ADMIN_SANTRI', 'ADMIN_DONATUR', 'PUSTAKAWAN', 'VIEWER']);
```

`lib/auth/rooms.ts`:
```ts
export type Room = 'santri' | 'donatur' | 'lembaga' | 'perpus';
export const ROOM_HOME: Record<Room, string> = { santri: '/', donatur: '/donatur', lembaga: '/lembaga', perpus: '/perpus' };
export const ROOM_LABEL: Record<Room, string> = { santri: 'Ruang Santri', donatur: 'Ruang Donatur', lembaga: 'Ruang Lembaga', perpus: 'Ruang Perpus' };
// roomsFor, setelah baris lembaga:
  if (roles.some(r => r === 'SUPERADMIN' || r === 'PUSTAKAWAN')) out.push('perpus');
export const ROOM_AKUN: Record<Room, string> = { santri: '/akun', donatur: '/donatur/akun', lembaga: '/lembaga/akun', perpus: '/perpus/akun' };
// roomOfPath, sebelum baris lembaga:
  if (di('/perpus') || di('/api/perpus')) return 'perpus';
```

`lib/nav/menu.ts`:
```ts
export type KunciIkon = 'beranda' | 'donatur' | 'surat' | 'direktori' | 'berkas' | 'pengguna' | 'tambah' | 'folder' | 'keuangan' | 'buku' | 'audit';
// konstanta baru di dekat BERANDA_LEMBAGA:
const BERANDA_PERPUS: ItemMenu = { href: '/perpus', label: 'Beranda', labelPendek: 'Beranda', ikon: 'beranda', warna: 'hijau' };
const BUKU_PERPUS: ItemMenu = { href: '/perpus/buku', label: 'Buku', labelPendek: 'Buku', ikon: 'buku', warna: 'jingga' };
const DONASI_PERPUS: ItemMenu = { href: '/perpus/donasi', label: 'Donasi & pengadaan', labelPendek: 'Donasi', ikon: 'donatur', warna: 'biru' };
const AUDIT_PERPUS: ItemMenu = { href: '/perpus/audit', label: 'Audit kode', labelPendek: 'Audit', ikon: 'audit', warna: 'ungu' };
// menuRail, baris pertama:
  if (room === 'perpus') return [BERANDA_PERPUS, BUKU_PERPUS, DONASI_PERPUS, AUDIT_PERPUS];
// slotHp, setelah blok lembaga:
  if (room === 'perpus') {
    return [tautan(BERANDA_PERPUS), tautan(DONASI_PERPUS), tautan(BUKU_PERPUS, true), tautan(AUDIT_PERPUS), { jenis: 'akun' }];
  }
const BERANDA = new Set(['/', '/donatur', '/lembaga', '/perpus']);
```

`components/layout/ikon-menu.ts`: tambahkan `Books, ListChecks` ke import phosphor, dan entri `buku: Books, audit: ListChecks,`.

`components/layout/ikon-ruang.ts`: import `Books`; tambah `perpus: { ikon: Books, warna: 'jingga' },`.

`components/pengguna/PenggunaTable.tsx`: di `ROLE_BADGE` tambah
`PUSTAKAWAN: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',` dan di `RUANGAN_FILTER` tambah `{ value: 'perpus', label: ROOM_LABEL.perpus },`.

`app/(perpus)/layout.tsx`:
```tsx
import { AppShell } from '@/components/layout/AppShell';

export default function PerpusRoomLayout({ children }: { children: React.ReactNode }) {
  return <AppShell room="perpus">{children}</AppShell>;
}
```

`app/(perpus)/perpus/akun/page.tsx`:
```tsx
import { HalamanAkun } from '@/components/akun/HalamanAkun';

export const metadata = { title: 'Akun — Ruang Perpus' };

export default function AkunPerpusPage() {
  return <HalamanAkun room="perpus" />;
}
```

`app/(perpus)/perpus/page.tsx` (sementara; diganti di Task 11):
```tsx
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';

export const metadata = { title: 'Ruang Perpus — BQ-ku' };

export default function BerandaPerpusPage() {
  return <KepalaHalaman judul="Ruang Perpus" sub="Perpustakaan Baitul Qowwam" />;
}
```

- [ ] **Step 4: Jalankan tes & cek tipe**

Run: `npx vitest run tests/auth tests/layout && npx tsc --noEmit`
Expected: PASS; `tsc` bersih. Jika `tsc` menunjuk `Record<Room, …>` / `Record<UserRole, …>` lain yang belum punya entri baru, tambahkan entrinya di file yang ditunjuk.

- [ ] **Step 5: Commit**

```bash
git add lib/auth lib/validation/pengguna.ts lib/nav/menu.ts components/layout components/pengguna "app/(perpus)" tests/auth tests/layout/menu-perpus.test.ts
git commit -m "feat(perpus): peran PUSTAKAWAN & Ruang Perpus

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Migrasi `0013_perpus.sql` & tipe baris

**Files:**
- Create: `supabase/migrations/0013_perpus.sql`, `lib/perpus/tipe.ts`, `supabase/tests/perpus_0013.sql`

**Interfaces:**
- Produces: tabel `perpus_donasi`, `perpus_pengadaan`, `perpus_buku`; RPC `perpus_terapkan_nomor(perubahan jsonb)`; tipe `Buku`, `DonasiPerpus`, `Pengadaan`, `AsalBuku`, `StatusKode`, `JenisDonasiPerpus`, `RingkasanPerpus`.

- [ ] **Step 1: Tulis migrasi**

`supabase/migrations/0013_perpus.sql`:
```sql
-- 0013: Perpus BQ tahap 1 — peran PUSTAKAWAN, katalog buku, donasi & pengadaan perpustakaan.
-- Hanya SUPERADMIN & PUSTAKAWAN yang membaca/menulis tabel ini (halaman publik menyusul di 0014 lewat view).
-- Aman dijalankan ulang.

-- A. Peran
alter table public.profiles drop constraint if exists profiles_roles_valid;
alter table public.allowed_emails drop constraint if exists allowed_emails_roles_valid;
alter table public.profiles add constraint profiles_roles_valid
  check (roles <@ array['SUPERADMIN','PENGURUS','ADMIN_SANTRI','ADMIN_DONATUR','PUSTAKAWAN','VIEWER'] and cardinality(roles) >= 1);
alter table public.allowed_emails add constraint allowed_emails_roles_valid
  check (roles <@ array['SUPERADMIN','PENGURUS','ADMIN_SANTRI','ADMIN_DONATUR','PUSTAKAWAN','VIEWER'] and cardinality(roles) >= 1);

-- B. Fitur AI baru
alter table public.pemakaian_ai drop constraint if exists pemakaian_ai_fitur_check;
alter table public.pemakaian_ai add constraint pemakaian_ai_fitur_check
  check (fitur in ('ocr_tunggal', 'ocr_massal', 'ocr_mandiri', 'klasifikasi_buku'));

-- C. Tabel
create table if not exists public.perpus_donasi (
  id uuid primary key default gen_random_uuid(),
  tanggal date,
  "tanggalTeks" text,
  nama text not null,
  jenis text not null check (jenis in ('uang', 'buku')),
  jumlah bigint check (jumlah is null or jumlah >= 0),
  "jumlahBuku" int check ("jumlahBuku" is null or "jumlahBuku" >= 1),
  catatan text,
  "createdAt" timestamptz not null default now(),
  "createdBy" uuid references public.profiles(id) on delete set null,
  constraint perpus_donasi_isi check ((jenis = 'uang' and jumlah is not null) or (jenis = 'buku' and jumlah is null))
);

create table if not exists public.perpus_pengadaan (
  id uuid primary key default gen_random_uuid(),
  tanggal date,
  "tanggalTeks" text,
  toko text,
  total bigint not null default 0 check (total >= 0),
  catatan text,
  "createdAt" timestamptz not null default now(),
  "createdBy" uuid references public.profiles(id) on delete set null
);

create table if not exists public.perpus_buku (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  penulis text not null default '',
  "kelasDdc" text not null default '',
  "kodePengarang" text not null default '',
  "kodeJudul" text not null default '',
  "noSeri" int,
  "nomorPanggil" text not null unique,
  "nomorPanggilLama" text,
  "statusKode" text not null default 'baku' check ("statusKode" in ('baku', 'perlu_audit')),
  "catatanAudit" text,
  eksemplar int not null default 1 check (eksemplar between 1 and 99),
  "sampulPath" text,
  asal text not null default 'koleksi_awal' check (asal in ('koleksi_awal', 'wakaf', 'pengadaan')),
  "donasiId" uuid references public.perpus_donasi(id) on delete set null,
  "pengadaanId" uuid references public.perpus_pengadaan(id) on delete set null,
  aktif boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "createdBy" uuid references public.profiles(id) on delete set null
);
create index if not exists perpus_buku_donasi_idx on public.perpus_buku ("donasiId");
create index if not exists perpus_buku_pengadaan_idx on public.perpus_buku ("pengadaanId");
create index if not exists perpus_buku_status_idx on public.perpus_buku ("statusKode");

-- D. RLS: kelola penuh hanya SUPERADMIN & PUSTAKAWAN
do $$
declare t text;
begin
  foreach t in array array['perpus_donasi', 'perpus_pengadaan', 'perpus_buku'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%1$s: kelola" on public.%1$I', t);
    execute format('create policy "%1$s: kelola" on public.%1$I for all to authenticated '
      'using (public.has_role(''SUPERADMIN'') or public.has_role(''PUSTAKAWAN'')) '
      'with check (public.has_role(''SUPERADMIN'') or public.has_role(''PUSTAKAWAN''))', t);
  end loop;
end $$;

-- E. Terapkan nomor panggil hasil audit dalam satu transaksi.
--    Nomor lama semua buku yang diubah dilepas dulu (AUDIT-<id>) supaya pertukaran nomor antarbuku tidak melanggar unique.
create or replace function public.perpus_terapkan_nomor(perubahan jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.perpus_buku set "nomorPanggil" = 'AUDIT-' || id
   where id in (select (e->>'id')::uuid from jsonb_array_elements(perubahan) e);
  update public.perpus_buku b set
    "kelasDdc" = e->>'kelasDdc',
    "kodePengarang" = e->>'kodePengarang',
    "kodeJudul" = e->>'kodeJudul',
    "noSeri" = (e->>'noSeri')::int,
    "nomorPanggil" = e->>'nomorPanggil',
    "statusKode" = 'baku',
    "catatanAudit" = null,
    "updatedAt" = now()
  from jsonb_array_elements(perubahan) e
  where b.id = (e->>'id')::uuid;
end $$;
revoke all on function public.perpus_terapkan_nomor(jsonb) from public;
grant execute on function public.perpus_terapkan_nomor(jsonb) to authenticated;
```

- [ ] **Step 2: Tulis skrip cek SQL**

`supabase/tests/perpus_0013.sql`:
```sql
-- Jalankan di SQL Editor setelah 0013. Setiap baris hasil harus bernilai true.
select 'role valid berisi PUSTAKAWAN' as cek,
  pg_get_constraintdef(oid) like '%PUSTAKAWAN%' as ok
  from pg_constraint where conname = 'profiles_roles_valid'
union all
select 'fitur AI klasifikasi_buku', pg_get_constraintdef(oid) like '%klasifikasi_buku%'
  from pg_constraint where conname = 'pemakaian_ai_fitur_check'
union all
select 'RLS aktif ' || relname, relrowsecurity
  from pg_class where relname in ('perpus_buku', 'perpus_donasi', 'perpus_pengadaan')
union all
select 'nomorPanggil unik', exists (
  select 1 from pg_indexes where tablename = 'perpus_buku' and indexdef like '%UNIQUE%nomorPanggil%')
union all
select 'fungsi terapkan nomor', exists (select 1 from pg_proc where proname = 'perpus_terapkan_nomor');
```

- [ ] **Step 3: Tipe baris**

`lib/perpus/tipe.ts`:
```ts
export type AsalBuku = 'koleksi_awal' | 'wakaf' | 'pengadaan';
export type StatusKode = 'baku' | 'perlu_audit';
export type JenisDonasiPerpus = 'uang' | 'buku';

export type Buku = {
  id: string; judul: string; penulis: string;
  kelasDdc: string; kodePengarang: string; kodeJudul: string; noSeri: number | null;
  nomorPanggil: string; nomorPanggilLama: string | null;
  statusKode: StatusKode; catatanAudit: string | null;
  eksemplar: number; sampulPath: string | null; asal: AsalBuku;
  donasiId: string | null; pengadaanId: string | null; aktif: boolean;
  createdAt: string; updatedAt: string; createdBy: string | null;
};

export type DonasiPerpus = {
  id: string; tanggal: string | null; tanggalTeks: string | null; nama: string;
  jenis: JenisDonasiPerpus; jumlah: number | null; jumlahBuku: number | null; catatan: string | null;
  createdAt: string; createdBy: string | null;
};

export type Pengadaan = {
  id: string; tanggal: string | null; tanggalTeks: string | null; toko: string | null;
  total: number; catatan: string | null; createdAt: string; createdBy: string | null;
};

export type RingkasanPerpus = {
  judul: number; eksemplar: number; perluAudit: number;
  totalInfaq: number; totalPengadaan: number; saldo: number; donatur: number;
};

export const LABEL_ASAL: Record<AsalBuku, string> = {
  koleksi_awal: 'Koleksi awal', wakaf: 'Wakaf', pengadaan: 'Pengadaan',
};
```

- [ ] **Step 4: Terapkan & verifikasi**

Jalankan isi `0013_perpus.sql` di SQL Editor Supabase (proyek bq-ku), lalu `supabase/tests/perpus_0013.sql`. Expected: semua `ok = true`. Jalankan `0013` sekali lagi → tanpa galat (idempoten). Run: `npx tsc --noEmit` → bersih.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0013_perpus.sql supabase/tests/perpus_0013.sql lib/perpus/tipe.ts
git commit -m "feat(perpus): migrasi 0013 — tabel buku, donasi, pengadaan + RLS pustakawan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Daftar kelas DDC & genre

**Files:**
- Create: `lib/perpus/ddc.ts`
- Test: `tests/perpus/ddc.test.ts`

**Interfaces:**
- Produces: `type Genre`, `type Bahasa = 'id' | 'en'`, `KELAS_DDC: KelasDdc[]`, `kelasSah(kode: string): boolean`, `genreDari(kode: string): Genre`, `labelKelas(kode: string, bahasa: Bahasa): string`, `LABEL_GENRE: Record<Genre, Record<Bahasa, string>>`.

- [ ] **Step 1: Tes yang gagal**

`tests/perpus/ddc.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { KELAS_DDC, kelasSah, genreDari, labelKelas, LABEL_GENRE } from '@/lib/perpus/ddc';

describe('kelas DDC', () => {
  it('kode unik & berformat DDC', () => {
    expect(new Set(KELAS_DDC.map(k => k.kode)).size).toBe(KELAS_DDC.length);
    for (const k of KELAS_DDC) expect(k.kode).toMatch(/^\d{3}(\.\d+)?$/);
  });
  it('kelasSah hanya untuk kode terdaftar', () => {
    expect(kelasSah('899.221')).toBe(true);
    expect(kelasSah('297.4')).toBe(true);
    expect(kelasSah('999')).toBe(false);
    expect(kelasSah('')).toBe(false);
  });
  it('genre dari kode persis atau awalan terpanjang', () => {
    expect(genreDari('899.221')).toBe('sastra');
    expect(genreDari('297.4')).toBe('islam');
    expect(genreDari('297.12')).toBe('islam');
    expect(genreDari('158')).toBe('pengembangan_diri');
    expect(genreDari('332')).toBe('ekonomi_bisnis');
    expect(genreDari('')).toBe('lainnya');
    expect(genreDari('999')).toBe('lainnya');
  });
  it('label dua bahasa', () => {
    expect(labelKelas('899.221', 'id')).toBe('Sastra Indonesia');
    expect(labelKelas('899.221', 'en')).toBe('Indonesian literature');
    expect(labelKelas('999', 'id')).toBe('999');
    expect(LABEL_GENRE.islam).toEqual({ id: 'Islam', en: 'Islam' });
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/perpus/ddc.test.ts` → FAIL (modul belum ada).

- [ ] **Step 3: Implementasi**

`lib/perpus/ddc.ts`:
```ts
/**
 * Kelas DDC yang dipakai Perpus BQ (subset DDC baku, cukup untuk koleksi saat ini).
 * Tambah baris di sini bila perlu kelas baru; AI & form hanya boleh memilih dari daftar ini.
 */
export type Bahasa = 'id' | 'en';
export type Genre =
  | 'islam' | 'agama' | 'sastra' | 'pengembangan_diri' | 'sains' | 'teknologi' | 'ekonomi_bisnis'
  | 'sosial' | 'bahasa' | 'filsafat' | 'sejarah' | 'seni' | 'referensi' | 'lainnya';
export type KelasDdc = { kode: string; id: string; en: string; genre: Genre };

export const LABEL_GENRE: Record<Genre, Record<Bahasa, string>> = {
  islam: { id: 'Islam', en: 'Islam' },
  agama: { id: 'Agama', en: 'Religion' },
  sastra: { id: 'Sastra & fiksi', en: 'Literature & fiction' },
  pengembangan_diri: { id: 'Pengembangan diri', en: 'Self-development' },
  sains: { id: 'Sains', en: 'Science' },
  teknologi: { id: 'Teknologi & komputer', en: 'Technology & computing' },
  ekonomi_bisnis: { id: 'Ekonomi & bisnis', en: 'Economics & business' },
  sosial: { id: 'Ilmu sosial', en: 'Social sciences' },
  bahasa: { id: 'Bahasa', en: 'Language' },
  filsafat: { id: 'Filsafat', en: 'Philosophy' },
  sejarah: { id: 'Sejarah & geografi', en: 'History & geography' },
  seni: { id: 'Seni & komik', en: 'Arts & comics' },
  referensi: { id: 'Referensi', en: 'Reference' },
  lainnya: { id: 'Lainnya', en: 'Other' },
};

export const KELAS_DDC: KelasDdc[] = [
  { kode: '004', id: 'Komputer & internet', en: 'Computers & internet', genre: 'teknologi' },
  { kode: '005', id: 'Pemrograman', en: 'Programming', genre: 'teknologi' },
  { kode: '006', id: 'Desain grafis & multimedia', en: 'Graphics & multimedia', genre: 'teknologi' },
  { kode: '030', id: 'Ensiklopedia', en: 'Encyclopedias', genre: 'referensi' },
  { kode: '100', id: 'Filsafat', en: 'Philosophy', genre: 'filsafat' },
  { kode: '150', id: 'Psikologi', en: 'Psychology', genre: 'pengembangan_diri' },
  { kode: '158', id: 'Psikologi terapan & pengembangan diri', en: 'Applied psychology & self-help', genre: 'pengembangan_diri' },
  { kode: '200', id: 'Agama', en: 'Religion', genre: 'agama' },
  { kode: '297', id: 'Islam', en: 'Islam', genre: 'islam' },
  { kode: '297.1', id: "Al-Qur'an & Hadis", en: "Qur'an & Hadith", genre: 'islam' },
  { kode: '297.4', id: 'Fikih', en: 'Islamic jurisprudence', genre: 'islam' },
  { kode: '297.5', id: 'Akhlak & tasawuf', en: 'Islamic ethics & Sufism', genre: 'islam' },
  { kode: '297.9', id: 'Sejarah & tokoh Islam', en: 'Islamic history & figures', genre: 'islam' },
  { kode: '302', id: 'Komunikasi & interaksi sosial', en: 'Communication & social interaction', genre: 'sosial' },
  { kode: '320', id: 'Ilmu politik', en: 'Political science', genre: 'sosial' },
  { kode: '330', id: 'Ekonomi', en: 'Economics', genre: 'ekonomi_bisnis' },
  { kode: '332', id: 'Keuangan', en: 'Finance', genre: 'ekonomi_bisnis' },
  { kode: '370', id: 'Pendidikan', en: 'Education', genre: 'sosial' },
  { kode: '398', id: 'Cerita rakyat', en: 'Folklore', genre: 'sastra' },
  { kode: '400', id: 'Bahasa', en: 'Language', genre: 'bahasa' },
  { kode: '492.7', id: 'Bahasa Arab', en: 'Arabic language', genre: 'bahasa' },
  { kode: '499.222', id: 'Bahasa Jawa', en: 'Javanese language', genre: 'bahasa' },
  { kode: '500', id: 'Sains', en: 'Science', genre: 'sains' },
  { kode: '510', id: 'Matematika', en: 'Mathematics', genre: 'sains' },
  { kode: '520', id: 'Astronomi', en: 'Astronomy', genre: 'sains' },
  { kode: '590', id: 'Hewan', en: 'Animals', genre: 'sains' },
  { kode: '600', id: 'Teknologi', en: 'Technology', genre: 'teknologi' },
  { kode: '630', id: 'Pertanian', en: 'Agriculture', genre: 'teknologi' },
  { kode: '641', id: 'Makanan & masakan', en: 'Food & cooking', genre: 'teknologi' },
  { kode: '649', id: 'Pengasuhan anak', en: 'Parenting', genre: 'pengembangan_diri' },
  { kode: '650', id: 'Bisnis & manajemen', en: 'Business & management', genre: 'ekonomi_bisnis' },
  { kode: '700', id: 'Seni', en: 'Arts', genre: 'seni' },
  { kode: '741.5', id: 'Komik', en: 'Comics', genre: 'seni' },
  { kode: '800', id: 'Sastra', en: 'Literature', genre: 'sastra' },
  { kode: '808', id: 'Retorika & menulis', en: 'Rhetoric & writing', genre: 'sastra' },
  { kode: '813', id: 'Sastra Amerika', en: 'American literature', genre: 'sastra' },
  { kode: '823', id: 'Sastra Inggris', en: 'English literature', genre: 'sastra' },
  { kode: '839.82', id: 'Sastra Norwegia', en: 'Norwegian literature', genre: 'sastra' },
  { kode: '869', id: 'Sastra Portugis', en: 'Portuguese literature', genre: 'sastra' },
  { kode: '892.7', id: 'Sastra Arab', en: 'Arabic literature', genre: 'sastra' },
  { kode: '895.6', id: 'Sastra Jepang', en: 'Japanese literature', genre: 'sastra' },
  { kode: '899.221', id: 'Sastra Indonesia', en: 'Indonesian literature', genre: 'sastra' },
  { kode: '900', id: 'Sejarah & geografi', en: 'History & geography', genre: 'sejarah' },
  { kode: '912', id: 'Atlas & peta', en: 'Atlases & maps', genre: 'sejarah' },
  { kode: '920', id: 'Biografi', en: 'Biography', genre: 'sejarah' },
  { kode: '959.8', id: 'Sejarah Indonesia', en: 'History of Indonesia', genre: 'sejarah' },
];

const PER_KODE = new Map(KELAS_DDC.map(k => [k.kode, k]));

export function kelasSah(kode: string): boolean {
  return PER_KODE.has(kode);
}

/** Kelas terdaftar dengan kode persis, atau awalan terpanjang (297.12 → 297.1). */
function cariKelas(kode: string): KelasDdc | undefined {
  if (!kode) return undefined;
  return PER_KODE.get(kode)
    ?? KELAS_DDC.filter(k => kode.startsWith(k.kode)).sort((a, b) => b.kode.length - a.kode.length)[0];
}

export function genreDari(kode: string): Genre {
  return cariKelas(kode)?.genre ?? 'lainnya';
}

export function labelKelas(kode: string, bahasa: Bahasa): string {
  const k = cariKelas(kode);
  return k ? k[bahasa] : kode;
}
```

- [ ] **Step 4: Jalankan tes** — Run: `npx vitest run tests/perpus/ddc.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/perpus/ddc.ts tests/perpus/ddc.test.ts
git commit -m "feat(perpus): daftar kelas DDC baku & genre dua bahasa

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Penyusun nomor panggil

**Files:**
- Create: `lib/perpus/nomor-panggil.ts`
- Test: `tests/perpus/nomor-panggil.test.ts`

**Interfaces:**
- Produces: `kodePengarang(penulis: string): string`; `kodeJudul(judul: string, panjang?: number): string`; `type BagianNomor = { kelasDdc: string; kodePengarang: string; kodeJudul: string; noSeri: number | null }`; `susunNomorPanggil(b: BagianNomor): string`; `uraiNomorPanggil(teks: string): BagianNomor | null`; `class NomorBentrokError extends Error { nomor: string }`; `selesaikanBentrok(dasar: { kelasDdc: string; kodePengarang: string; judul: string; seri: { kode: string; nomor: number } | null }, terpakai: ReadonlySet<string>): BagianNomor & { nomorPanggil: string }`.

- [ ] **Step 1: Tes yang gagal** (kasus diambil dari data sheet asli)

`tests/perpus/nomor-panggil.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  kodePengarang, kodeJudul, susunNomorPanggil, uraiNomorPanggil, selesaikanBentrok, NomorBentrokError,
} from '@/lib/perpus/nomor-panggil';

describe('kodePengarang', () => {
  it.each([
    ['Tere Liye', 'LIY'], ['Felix Y Siauw', 'SIA'], ['J.S. Khairen', 'KHA'], ['Habiburrahman El Shirazy', 'SHI'],
    ['@terimakasihayah', 'TER'], ['Ibnu Qayyim Al-Jauziyyah', 'JAU'], ['Dr. M. Zainuri Nur,M.S.I.', 'NUR'],
    ['Dr. Muhammad Fahd Ats-Tsuwaini', 'TSU'], ['Aan Wulandari U.', 'WUL'], ['Sahal Fikri,dkk', 'FIK'],
    ['Ulin Nuha, M.Pd.I.', 'NUH'], ['Abu Ahmad, Lc & Abu Fahya', 'AHM'], ['Ichiro Kishimi & Fumitake Koga', 'KIS'],
    ['Penerbit Andi', 'AND'], ['Sir Arthur Conan Doyle', 'DOY'], ['Orwell;', 'ORW'], ['(Herman Melville)', 'MEL'],
    ['Abu al-Qosim an-Naisaburi', 'NAI'], ['Susy Ong', 'ONG'], ['', ''],
  ])('%s → %s', (penulis, kode) => expect(kodePengarang(penulis)).toBe(kode));
});

describe('kodeJudul', () => {
  it('huruf pertama, artikel Inggris & awalan penerbit dilewati', () => {
    expect(kodeJudul('Bumi')).toBe('b');
    expect(kodeJudul('The Power of Habit')).toBe('p');
    expect(kodeJudul('Penerbit Andi - Crazy Corel')).toBe('c');
    expect(kodeJudul('[Mizan] Para Pencari Ilmu')).toBe('p');
    expect(kodeJudul('A')).toBe('a');
  });
  it('panjang melintasi kata', () => {
    expect(kodeJudul('Rasa', 2)).toBe('ra');
    expect(kodeJudul('Si Anak Badai', 3)).toBe('sia');
  });
});

describe('susun & urai', () => {
  it('susun dengan dan tanpa seri', () => {
    expect(susunNomorPanggil({ kelasDdc: '899.221', kodePengarang: 'LIY', kodeJudul: 'b', noSeri: 1 })).toBe('899.221 LIY b.01');
    expect(susunNomorPanggil({ kelasDdc: '823', kodePengarang: 'ORW', kodeJudul: 'a', noSeri: null })).toBe('823 ORW a');
  });
  it('urai kode lama yang tidak rapi', () => {
    expect(uraiNomorPanggil('158 NUR  T')).toEqual({ kelasDdc: '158', kodePengarang: 'NUR', kodeJudul: 't', noSeri: null });
    expect(uraiNomorPanggil('813 LIY b.01')).toEqual({ kelasDdc: '813', kodePengarang: 'LIY', kodeJudul: 'b', noSeri: 1 });
    expect(uraiNomorPanggil('004 AND Si ')).toEqual({ kelasDdc: '004', kodePengarang: 'AND', kodeJudul: 'si', noSeri: null });
    expect(uraiNomorPanggil('500 YAH p.10')?.noSeri).toBe(10);
    expect(uraiNomorPanggil('TMP-0001')).toBeNull();
    expect(uraiNomorPanggil('')).toBeNull();
  });
});

describe('selesaikanBentrok', () => {
  const dasar = { kelasDdc: '899.221', kodePengarang: 'LIY', judul: 'Rasa', seri: null };
  it('tanpa bentrok memakai 1 huruf', () => {
    expect(selesaikanBentrok(dasar, new Set()).nomorPanggil).toBe('899.221 LIY r');
  });
  it('bentrok → huruf judul diperpanjang', () => {
    const h = selesaikanBentrok(dasar, new Set(['899.221 LIY r']));
    expect(h).toEqual({ kelasDdc: '899.221', kodePengarang: 'LIY', kodeJudul: 'ra', noSeri: null, nomorPanggil: '899.221 LIY ra' });
  });
  it('semua perpanjangan terpakai → angka', () => {
    const terpakai = new Set(['332 KIY b', '332 KIY bu', '332 KIY bus', '332 KIY busi']);
    expect(selesaikanBentrok({ kelasDdc: '332', kodePengarang: 'KIY', judul: 'The Business School', seri: null }, terpakai).nomorPanggil)
      .toBe('332 KIY b2');
  });
  it('seri memakai kode seri; bentrok seri melempar', () => {
    const seri = { kelasDdc: '823', kodePengarang: 'DOY', judul: 'Seri Sherlock Holmes 3', seri: { kode: 's', nomor: 3 } };
    expect(selesaikanBentrok(seri, new Set()).nomorPanggil).toBe('823 DOY s.03');
    expect(() => selesaikanBentrok(seri, new Set(['823 DOY s.03']))).toThrow(NomorBentrokError);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal** — Run: `npx vitest run tests/perpus/nomor-panggil.test.ts` → FAIL.

- [ ] **Step 3: Implementasi** (sudah diuji terhadap 80+ nama penulis di sheet asli)

`lib/perpus/nomor-panggil.ts`:
```ts
/**
 * Nomor panggil DDC: `[kelas] [3 huruf pengarang] [kode judul][.seri]`, mis. `899.221 LIY b.01`.
 * Semua fungsi murni; keunikan dijamin oleh selesaikanBentrok + constraint unik di database.
 */

/** Gelar & sapaan yang tidak dipakai sebagai kode pengarang (huruf kecil, tanpa titik). */
const GELAR = new Set([
  'dr', 'prof', 'h', 'hj', 'ir', 'lc', 'ma', 'mpdi', 'mpd', 'msi', 'sag', 'spd', 'mag', 'phd', 'ssi', 'se', 'mm',
  'sir', 'kh', 'ust', 'ustadz', 'ustadzah', 'syaikh', 'syekh', 'dkk', 'penerbit',
]);
/** Awalan sandang Arab yang dilekatkan dengan tanda hubung: Al-Jauziyyah → Jauziyyah. */
const SANDANG_ARAB = /^(al|el|ats|as|an|ar|ad|az|at|asy|ash)-/i;
const ARTIKEL_INGGRIS = new Set(['the', 'a', 'an']);

const hurufSaja = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]/g, '');

/** 3 huruf kapital dari nama belakang pengarang pertama. Penulis kosong → ''. */
export function kodePengarang(penulis: string): string {
  const pertama = penulis
    .replace(/[@()[\]]/g, ' ')
    .split(/&|;|\s+dan\s+/i)[0]
    .split(',')[0];
  const kata = pertama
    .replace(/\./g, ' ')
    .split(/\s+/)
    .map(k => k.replace(SANDANG_ARAB, ''))
    .map(hurufSaja)
    .filter(k => k.length > 1 && !GELAR.has(k.toLowerCase()));
  const pilih = kata.at(-1) ?? hurufSaja(pertama);
  return pilih.slice(0, 3).toUpperCase();
}

/** Judul tanpa tag [..], awalan "Penerbit X - ", dan artikel Inggris di depan. */
function kataJudul(judul: string): string[] {
  const kata = judul
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/^\s*penerbit\s+[^-]+-\s*/i, '')
    .split(/\s+/)
    .map(hurufSaja)
    .filter(Boolean);
  if (kata.length > 1 && ARTIKEL_INGGRIS.has(kata[0].toLowerCase())) kata.shift();
  return kata;
}

/** `panjang` huruf pertama judul (lintas kata bila kata pertama terlalu pendek), huruf kecil. */
export function kodeJudul(judul: string, panjang = 1): string {
  return kataJudul(judul).join('').slice(0, panjang).toLowerCase();
}

export type BagianNomor = { kelasDdc: string; kodePengarang: string; kodeJudul: string; noSeri: number | null };

export function susunNomorPanggil(b: BagianNomor): string {
  const seri = b.noSeri != null ? `.${String(b.noSeri).padStart(2, '0')}` : '';
  return `${b.kelasDdc} ${b.kodePengarang} ${b.kodeJudul}${seri}`;
}

/** Urai kode lama dari sheet ("158 NUR  T", "813 LIY b.01"); format tak dikenal → null. */
export function uraiNomorPanggil(teks: string): BagianNomor | null {
  const m = teks.trim().replace(/\s+/g, ' ').match(/^(\d{3}(?:\.\d+)?) ([A-Za-z]{2,4}) ([A-Za-z0-9]+)(?:\.(\d+))?$/);
  if (!m) return null;
  return {
    kelasDdc: m[1], kodePengarang: m[2].toUpperCase(), kodeJudul: m[3].toLowerCase(),
    noSeri: m[4] ? Number(m[4]) : null,
  };
}

export class NomorBentrokError extends Error {
  constructor(public nomor: string) { super(`Nomor panggil ${nomor} sudah dipakai`); this.name = 'NomorBentrokError'; }
}

/**
 * Susun nomor yang belum ada di `terpakai`. Non-seri: kode judul diperpanjang (r → ra → ras),
 * lalu diberi angka (r2, r3). Seri: kode judul = kode seri, tidak diubah; bentrok → galat.
 */
export function selesaikanBentrok(
  dasar: { kelasDdc: string; kodePengarang: string; judul: string; seri: { kode: string; nomor: number } | null },
  terpakai: ReadonlySet<string>,
): BagianNomor & { nomorPanggil: string } {
  const coba = (kode: string, noSeri: number | null) => {
    const bagian = { kelasDdc: dasar.kelasDdc, kodePengarang: dasar.kodePengarang, kodeJudul: kode, noSeri };
    const nomorPanggil = susunNomorPanggil(bagian);
    return terpakai.has(nomorPanggil) ? null : { ...bagian, nomorPanggil };
  };
  if (dasar.seri) {
    const kode = dasar.seri.kode.toLowerCase();
    const hasil = coba(kode, dasar.seri.nomor);
    if (!hasil) throw new NomorBentrokError(susunNomorPanggil({ ...dasar, kodeJudul: kode, noSeri: dasar.seri.nomor }));
    return hasil;
  }
  const penuh = kodeJudul(dasar.judul, 99) || 'x';
  for (let n = 1; n <= Math.min(4, penuh.length); n++) {
    const hasil = coba(penuh.slice(0, n), null);
    if (hasil) return hasil;
  }
  const akar = penuh.slice(0, 1);
  for (let i = 2; i < 100; i++) {
    const hasil = coba(`${akar}${i}`, null);
    if (hasil) return hasil;
  }
  throw new NomorBentrokError(susunNomorPanggil({ ...dasar, kodeJudul: akar, noSeri: null }));
}
```

- [ ] **Step 4: Jalankan tes** — Run: `npx vitest run tests/perpus/nomor-panggil.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/perpus/nomor-panggil.ts tests/perpus/nomor-panggil.test.ts
git commit -m "feat(perpus): penyusun nomor panggil DDC (kode pengarang, judul, seri, bentrok)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Parser impor Google Sheets

**Files:**
- Create: `lib/perpus/impor.ts`
- Test: `tests/perpus/impor.test.ts`

**Interfaces:**
- Consumes: `uraiNomorPanggil`, `susunNomorPanggil`, `BagianNomor` (Task 4).
- Produces: `uraiCsv(teks): string[][]`, `rapikan`, `kunciJudul`, `uraiRupiah(s): number | null`, `uraiTanggal(s, tahunCadangan): string | null`, `uraiBuku(baris): BukuSheet[]`, `uraiInfaq(baris): { donasi: DonasiSheet[]; wakaf: { donatur: string; judul: string }[] }`, `uraiPengadaan(baris): PengadaanSheet[]`, `susunRencana({ buku, infaq, pengadaan }): RencanaImpor`, tipe `BukuSheet`, `DonasiSheet`, `PengadaanSheet`, `BukuRencana`, `RencanaImpor`.

- [ ] **Step 1: Tes yang gagal**

`tests/perpus/impor.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  uraiCsv, uraiRupiah, uraiTanggal, uraiBuku, uraiInfaq, uraiPengadaan, susunRencana, kunciJudul, type BukuSheet,
} from '@/lib/perpus/impor';

describe('uraiCsv', () => {
  it('kutip, koma & baris baru di dalam sel', () => {
    expect(uraiCsv('a,"b,c",d\n1,"x\r\n\r\ny",2\n')).toEqual([['a', 'b,c', 'd'], ['1', 'x\r\n\r\ny', '2']]);
    expect(uraiCsv('"a ""q"""')).toEqual([['a "q"']]);
  });
});

describe('nilai sel', () => {
  it('rupiah', () => {
    expect(uraiRupiah('Rp1.384.000')).toBe(1384000);
    expect(uraiRupiah(' Rp 256.015 ')).toBe(256015);
    expect(uraiRupiah('19 BUKU')).toBeNull();
  });
  it('tanggal', () => {
    expect(uraiTanggal('14/03/2025', null)).toBe('2025-03-14');
    expect(uraiTanggal('31/12/1899', null)).toBeNull();
    expect(uraiTanggal('07 Juni', 2025)).toBe('2025-06-07');
    expect(uraiTanggal('September', 2025)).toBeNull();
    expect(uraiTanggal('2025', 2025)).toBeNull();
  });
  it('kunci judul mengabaikan artikel & tanda baca', () => {
    expect(kunciJudul('The Psychology of Money')).toBe(kunciJudul('Psychology  of money'));
  });
});

describe('uraiBuku', () => {
  it('penulis diwariskan, sel dirapikan, baris kosong dilewati', () => {
    const csv = [',,,,', 'NO,Penulis,Daftar Buku ,Kode,', '1,Tere Liye,Bumi ,813 LIY b.01,', '2,,Bulan ,813 LIY b.02,',
      '3,(Herman Melville),Moby Dick ,813 MEL M,', '4,,,,'].join('\n');
    expect(uraiBuku(uraiCsv(csv))).toEqual([
      { no: 1, penulis: 'Tere Liye', judul: 'Bumi', kodeLama: '813 LIY b.01' },
      { no: 2, penulis: 'Tere Liye', judul: 'Bulan', kodeLama: '813 LIY b.02' },
      { no: 3, penulis: 'Herman Melville', judul: 'Moby Dick', kodeLama: '813 MEL M' },
    ]);
  });
});

describe('uraiInfaq', () => {
  it('donasi uang/buku dan daftar judul wakaf per donatur', () => {
    const csv = [
      'Total Infaq :,,,Rp16.000,,Pengadaan Buku,Rp0,,Saldo,Rp16.000',
      'No,Tanggal,Nama,Jumlah,,,,,,',
      '1,14/03/2025,Handoko,Rp6.000,,,,,Judul Buku,',
      '2,06/04/2025,Bu Siti,2 BUKU,,,Bu Siti,,Bumi,',
      '3,31/12/1899,Rongsokan,Rp10.000,,,,,Bulan,',
      ',,,,,,Bu Anis,,Munajat Cinta,',
    ].join('\n');
    const h = uraiInfaq(uraiCsv(csv));
    expect(h.donasi).toEqual([
      { kunci: 'infaq-1', tanggal: '2025-03-14', tanggalTeks: '14/03/2025', nama: 'Handoko', jenis: 'uang', jumlah: 6000, jumlahBuku: null },
      { kunci: 'infaq-2', tanggal: '2025-04-06', tanggalTeks: '06/04/2025', nama: 'Bu Siti', jenis: 'buku', jumlah: null, jumlahBuku: 2 },
      { kunci: 'infaq-3', tanggal: null, tanggalTeks: '31/12/1899', nama: 'Rongsokan', jenis: 'uang', jumlah: 10000, jumlahBuku: null },
    ]);
    expect(h.wakaf).toEqual([
      { donatur: 'Bu Siti', judul: 'Bumi' }, { donatur: 'Bu Siti', judul: 'Bulan' }, { donatur: 'Bu Anis', judul: 'Munajat Cinta' },
    ]);
  });
});

describe('uraiPengadaan', () => {
  it('mengelompokkan per pembelian; tahun diwariskan', () => {
    const csv = ['  ,,,Rp500,,', 'No,Tanggal,Nama Buku,Karangan,Harga,Ollshop', '1,28/03/2025,Bulan,Tere Liye,Rp300,',
      '2,,Moby Dick,,,', '3,07 Juni,The Psychology of Money,Morgan Housel, Rp 200 ,', '4,,,,,'].join('\n');
    expect(uraiPengadaan(uraiCsv(csv))).toEqual([
      { kunci: 'pengadaan-1', tanggal: '2025-03-28', tanggalTeks: '28/03/2025', total: 300, judul: ['Bulan', 'Moby Dick'] },
      { kunci: 'pengadaan-2', tanggal: '2025-06-07', tanggalTeks: '07 Juni', total: 200, judul: ['The Psychology of Money'] },
    ]);
  });
});

describe('susunRencana', () => {
  const buku: BukuSheet[] = [
    { no: 1, penulis: 'Tere Liye', judul: 'Bumi', kodeLama: '813 LIY b.01' },
    { no: 2, penulis: 'Tere Liye', judul: 'Bulan', kodeLama: '813 LIY b.02' },
    { no: 3, penulis: 'Tere Liye', judul: 'Rasa', kodeLama: '813 LIY R' },
    { no: 4, penulis: 'Tere Liye', judul: 'Rembulan', kodeLama: '813 LIY R' },
    { no: 5, penulis: 'Penerbit Andi', judul: 'Sapu Bersih', kodeLama: '500 AND Sa' },
    { no: 6, penulis: 'Penerbit Andi', judul: 'Sapu Bersih', kodeLama: '500 AND Sa' },
    { no: 7, penulis: 'Salim A Fillah', judul: 'Sang Pangeran', kodeLama: '' },
    { no: 8, penulis: 'Morgan Housel', judul: 'The Psychology of Money', kodeLama: '158 HOU T' },
  ];
  const infaq = {
    donasi: [
      { kunci: 'infaq-18', tanggal: '2025-06-01', tanggalTeks: '', nama: 'Bu Lestari', jenis: 'buku' as const, jumlah: null, jumlahBuku: 1 },
      { kunci: 'infaq-28', tanggal: '2025-10-10', tanggalTeks: '', nama: 'Bu Lestari', jenis: 'buku' as const, jumlah: null, jumlahBuku: 2 },
    ],
    wakaf: [{ donatur: 'Bu Lestari', judul: 'Judul Hilang' }, { donatur: 'Bu Lestari', judul: 'Bulan' }, { donatur: 'Bu Lestari', judul: 'Bumi' }],
  };
  const pengadaan = [{ kunci: 'pengadaan-1', tanggal: null, tanggalTeks: 'September', total: 200, judul: ['Psychology of Money', 'Bumi'] }];
  const r = susunRencana({ buku, infaq, pengadaan });
  const cari = (judul: string) => r.buku.find(b => b.judul === judul)!;

  it('buku kembar judul+penulis digabung jadi eksemplar', () => {
    expect(r.buku).toHaveLength(7);
    expect(cari('Sapu Bersih').eksemplar).toBe(2);
  });
  it('kode kembar & kosong → TMP + catatan audit', () => {
    expect(cari('Rasa').nomorPanggil).toBe('813 LIY r');
    expect(cari('Rembulan')).toMatchObject({ nomorPanggil: 'TMP-0004', catatanAudit: 'Kode kembar: 813 LIY r' });
    expect(cari('Sang Pangeran')).toMatchObject({ nomorPanggil: 'TMP-0007', catatanAudit: 'Belum berkode', kelasDdc: '' });
  });
  it('seri dari kode lama dipertahankan', () => {
    expect(cari('Bumi')).toMatchObject({ nomorPanggil: '813 LIY b.01', noSeri: 1, kodeJudul: 'b' });
  });
  it('judul wakaf tak cocok tetap memakai jatah donasi', () => {
    expect(cari('Bulan')).toMatchObject({ asal: 'wakaf', donasiKunci: 'infaq-28' });
    expect(r.tidakCocok).toContainEqual({ sumber: 'wakaf', judul: 'Judul Hilang' });
  });
  it('pengadaan: artikel diabaikan; wakaf tidak ditimpa', () => {
    expect(cari('The Psychology of Money')).toMatchObject({ asal: 'pengadaan', pengadaanKunci: 'pengadaan-1' });
    expect(cari('Bumi')).toMatchObject({ asal: 'wakaf', pengadaanKunci: 'pengadaan-1' });
    expect(r.tidakCocok).toContainEqual({ sumber: 'pengadaan', judul: 'Bumi (juga tercatat wakaf)' });
    expect(r.pengadaan).toEqual([{ kunci: 'pengadaan-1', tanggal: null, tanggalTeks: 'September', total: 200 }]);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal** — Run: `npx vitest run tests/perpus/impor.test.ts` → FAIL.

- [ ] **Step 3: Implementasi** (prototipe sudah dijalankan terhadap CSV asli: 234 baris → 232 judul, 29 donasi, 4 pengadaan; total infaq Rp1.384.000 & pengadaan Rp1.295.291 sama dengan sheet)

`lib/perpus/impor.ts`:
```ts
/**
 * Urai ekspor CSV Google Sheets "Daftar Buku" menjadi rencana impor Perpus BQ.
 * Murni (tanpa I/O): pemanggil mengambil CSV, modul ini menyusun baris siap simpan.
 */
import { uraiNomorPanggil, susunNomorPanggil, type BagianNomor } from '@/lib/perpus/nomor-panggil';

/** CSV RFC 4180: kutip ganda, "" di dalam kutip, sel bisa memuat baris baru. */
export function uraiCsv(teks: string): string[][] {
  const baris: string[][] = [];
  let sel = '', kini: string[] = [], dalamKutip = false;
  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (dalamKutip) {
      if (c === '"' && teks[i + 1] === '"') { sel += '"'; i++; }
      else if (c === '"') dalamKutip = false;
      else sel += c;
    } else if (c === '"') dalamKutip = true;
    else if (c === ',') { kini.push(sel); sel = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && teks[i + 1] === '\n') i++;
      kini.push(sel); baris.push(kini); kini = []; sel = '';
    } else sel += c;
  }
  if (sel !== '' || kini.length) { kini.push(sel); baris.push(kini); }
  return baris;
}

export const rapikan = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
/** Kunci pencocokan judul: huruf kecil, tanpa artikel Inggris di depan, hanya huruf & angka. */
export const kunciJudul = (s: string) =>
  rapikan(s).toLowerCase().normalize('NFD').replace(/^(the|a|an) /, '').replace(/[^a-z0-9]/g, '');

/** "Rp1.384.000" / " Rp 256.015 " → 1384000; bukan rupiah → null. */
export function uraiRupiah(s: string): number | null {
  const m = rapikan(s).match(/^Rp\s*([\d.]+)$/i);
  return m ? Number(m[1].replace(/\./g, '')) : null;
}

const BULAN: Record<string, number> = {
  januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
};
/** "14/03/2025" → "2025-03-14"; "07 Juni" + tahun cadangan → "2025-06-07"; selain itu null. 1899 = sel kosong di Sheets. */
export function uraiTanggal(s: string, tahunCadangan: number | null): string | null {
  const t = rapikan(s);
  const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return Number(m[3]) < 2000 ? null : iso(Number(m[3]), Number(m[2]), Number(m[1]));
  m = t.match(/^(\d{1,2}) ([A-Za-z]+)$/);
  if (m && tahunCadangan && BULAN[m[2].toLowerCase()]) return iso(tahunCadangan, BULAN[m[2].toLowerCase()], Number(m[1]));
  return null;
}

export type BukuSheet = { no: number; penulis: string; judul: string; kodeLama: string };
export type DonasiSheet = {
  kunci: string; tanggal: string | null; tanggalTeks: string; nama: string;
  jenis: 'uang' | 'buku'; jumlah: number | null; jumlahBuku: number | null;
};
export type PengadaanSheet = { kunci: string; tanggal: string | null; tanggalTeks: string; total: number; judul: string[] };

/** Sheet "Copy of Daftar Buku": A=NO, B=Penulis (hanya baris pertama tiap kelompok), C=Judul, D=Kode. */
export function uraiBuku(baris: string[][]): BukuSheet[] {
  const awal = baris.findIndex(r => rapikan(r[0]).toUpperCase() === 'NO');
  const hasil: BukuSheet[] = [];
  let penulis = '';
  for (const r of baris.slice(awal + 1)) {
    const judul = rapikan(r[2]);
    if (!/^\d+$/.test(rapikan(r[0])) || !judul) continue;
    if (rapikan(r[1])) penulis = rapikan(r[1]).replace(/^\(|\)$|;$/g, '').trim();
    hasil.push({ no: Number(rapikan(r[0])), penulis, judul, kodeLama: rapikan(r[3]) });
  }
  return hasil;
}

/**
 * Sheet "Infaq": A–D = No, Tanggal, Nama, Jumlah ("Rp…" = uang, "19 BUKU" = buku).
 * G = donatur wakaf (berlaku sampai nama berikutnya), I = judul buku wakaf (mulai setelah sel "Judul Buku").
 */
export function uraiInfaq(baris: string[][]): { donasi: DonasiSheet[]; wakaf: { donatur: string; judul: string }[] } {
  const donasi: DonasiSheet[] = [];
  const wakaf: { donatur: string; judul: string }[] = [];
  let tahun: number | null = null;
  let donaturWakaf = '';
  let mulaiWakaf = false;
  for (const r of baris) {
    const no = rapikan(r[0]);
    if (/^\d+$/.test(no) && rapikan(r[2])) {
      const tanggal = uraiTanggal(r[1], tahun);
      if (tanggal) tahun = Number(tanggal.slice(0, 4));
      const jumlahTeks = rapikan(r[3]);
      const buku = jumlahTeks.match(/^(\d+)\s*buku$/i);
      donasi.push({
        kunci: `infaq-${no}`, tanggal, tanggalTeks: rapikan(r[1]), nama: rapikan(r[2]),
        jenis: buku ? 'buku' : 'uang', jumlah: buku ? null : uraiRupiah(jumlahTeks) ?? 0, jumlahBuku: buku ? Number(buku[1]) : null,
      });
    }
    if (rapikan(r[8]).toLowerCase() === 'judul buku') { mulaiWakaf = true; continue; }
    if (!mulaiWakaf) continue;
    if (rapikan(r[6])) donaturWakaf = rapikan(r[6]);
    if (rapikan(r[8]) && donaturWakaf) wakaf.push({ donatur: donaturWakaf, judul: rapikan(r[8]) });
  }
  return { donasi, wakaf };
}

/** Sheet "Pengadaan Buku": B=Tanggal & E=Harga hanya di baris pertama tiap pembelian; C=Nama Buku. */
export function uraiPengadaan(baris: string[][]): PengadaanSheet[] {
  const awal = baris.findIndex(r => rapikan(r[0]).toLowerCase() === 'no');
  const hasil: PengadaanSheet[] = [];
  let tahun: number | null = null;
  for (const r of baris.slice(awal + 1)) {
    const judul = rapikan(r[2]);
    if (!judul) continue;
    const tanggalTeks = rapikan(r[1]);
    if (tanggalTeks || !hasil.length) {
      const tanggal = uraiTanggal(tanggalTeks, tahun);
      if (tanggal) tahun = Number(tanggal.slice(0, 4));
      hasil.push({ kunci: `pengadaan-${hasil.length + 1}`, tanggal, tanggalTeks, total: uraiRupiah(r[4]) ?? 0, judul: [] });
    }
    hasil.at(-1)!.judul.push(judul);
  }
  return hasil;
}

export type BukuRencana = BagianNomor & {
  judul: string; penulis: string; nomorPanggil: string; nomorPanggilLama: string | null;
  eksemplar: number; asal: 'koleksi_awal' | 'wakaf' | 'pengadaan';
  donasiKunci: string | null; pengadaanKunci: string | null; catatanAudit: string | null;
};
export type RencanaImpor = {
  buku: BukuRencana[]; donasi: DonasiSheet[]; pengadaan: Omit<PengadaanSheet, 'judul'>[];
  tidakCocok: { sumber: 'wakaf' | 'pengadaan'; judul: string }[];
};

/**
 * Gabungkan ketiga sheet. Baris buku dengan judul+penulis sama → satu buku, eksemplar bertambah.
 * Kode lama yang kosong, tak terurai, atau kembar → nomor sementara TMP-<no> + catatan audit.
 * Judul wakaf diisi berurutan ke donasi buku donatur yang sama (sesuai jumlahBuku, urut tanggal).
 */
export function susunRencana(input: { buku: BukuSheet[]; infaq: ReturnType<typeof uraiInfaq>; pengadaan: PengadaanSheet[] }): RencanaImpor {
  const perKunci = new Map<string, BukuRencana>();
  const terpakai = new Set<string>();
  for (const b of input.buku) {
    const kunci = `${kunciJudul(b.judul)}|${kunciJudul(b.penulis)}`;
    const ada = perKunci.get(kunci);
    if (ada) { ada.eksemplar++; continue; }
    const urai = b.kodeLama ? uraiNomorPanggil(b.kodeLama) : null;
    let nomorPanggil = urai ? susunNomorPanggil(urai) : '';
    let catatanAudit: string | null = null;
    if (!urai) catatanAudit = b.kodeLama ? `Kode lama tak terbaca: "${b.kodeLama}"` : 'Belum berkode';
    else if (terpakai.has(nomorPanggil)) catatanAudit = `Kode kembar: ${nomorPanggil}`;
    if (catatanAudit) nomorPanggil = `TMP-${String(b.no).padStart(4, '0')}`;
    terpakai.add(nomorPanggil);
    perKunci.set(kunci, {
      kelasDdc: urai?.kelasDdc ?? '', kodePengarang: urai?.kodePengarang ?? '', kodeJudul: urai?.kodeJudul ?? '',
      noSeri: urai?.noSeri ?? null, judul: b.judul, penulis: b.penulis, nomorPanggil,
      nomorPanggilLama: b.kodeLama || null, eksemplar: 1, asal: 'koleksi_awal',
      donasiKunci: null, pengadaanKunci: null, catatanAudit,
    });
  }
  const buku = [...perKunci.values()];
  const cariBuku = (judul: string) => buku.find(b => kunciJudul(b.judul) === kunciJudul(judul));
  const tidakCocok: RencanaImpor['tidakCocok'] = [];

  const sisaPerDonatur = new Map<string, { kunci: string; sisa: number }[]>();
  for (const d of input.infaq.donasi.filter(d => d.jenis === 'buku')) {
    const k = kunciJudul(d.nama);
    sisaPerDonatur.set(k, [...(sisaPerDonatur.get(k) ?? []), { kunci: d.kunci, sisa: d.jumlahBuku ?? 0 }]);
  }
  for (const w of input.infaq.wakaf) {
    const antre = sisaPerDonatur.get(kunciJudul(w.donatur)) ?? [];
    const slot = antre.find(s => s.sisa > 0) ?? antre.at(-1);
    if (slot) slot.sisa--; // judul tak cocok tetap memakai jatah agar urutan judul berikutnya tidak bergeser
    const b = cariBuku(w.judul);
    if (!b || !slot) { tidakCocok.push({ sumber: 'wakaf', judul: w.judul }); continue; }
    b.asal = 'wakaf'; b.donasiKunci = slot.kunci;
  }
  for (const p of input.pengadaan) {
    for (const judul of p.judul) {
      const b = cariBuku(judul);
      if (!b) { tidakCocok.push({ sumber: 'pengadaan', judul }); continue; }
      b.pengadaanKunci = p.kunci;
      if (b.asal === 'wakaf') tidakCocok.push({ sumber: 'pengadaan', judul: `${judul} (juga tercatat wakaf)` });
      else b.asal = 'pengadaan';
    }
  }
  return {
    buku, donasi: input.infaq.donasi,
    pengadaan: input.pengadaan.map(({ judul: _judul, ...p }) => p), tidakCocok,
  };
}
```

- [ ] **Step 4: Jalankan tes** — Run: `npx vitest run tests/perpus/impor.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/perpus/impor.ts tests/perpus/impor.test.ts
git commit -m "feat(perpus): parser impor Sheets (buku, infaq/wakaf, pengadaan)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Rencana audit, label CSV & ringkasan (logika murni)

**Files:**
- Create: `lib/perpus/audit.ts`, `lib/perpus/ringkasan.ts`
- Test: `tests/perpus/audit.test.ts`, `tests/perpus/ringkasan.test.ts`

**Interfaces:**
- Consumes: `selesaikanBentrok`, `kodePengarang`, `BagianNomor` (Task 4); `Buku`, `DonasiPerpus`, `Pengadaan`, `RingkasanPerpus` (Task 2).
- Produces: `type PerubahanNomor = BagianNomor & { id: string; nomorPanggil: string }`; `rencanakanNomorBaru(semua: BukuNomor[], items: { id: string; kelasDdc: string }[]): PerubahanNomor[]` dengan `BukuNomor = Pick<Buku, 'id' | 'judul' | 'penulis' | 'kodePengarang' | 'kodeJudul' | 'noSeri' | 'nomorPanggil'>`; `barisLabel(buku: Pick<Buku, 'judul' | 'nomorPanggil' | 'nomorPanggilLama' | 'eksemplar' | 'statusKode'>[]): { judul: string; lama: string; baru: string }[]`; `keCsv(baris: string[][]): string`; `hitungRingkasan(buku: Pick<Buku, 'eksemplar' | 'statusKode' | 'aktif'>[], donasi: Pick<DonasiPerpus, 'jenis' | 'jumlah' | 'nama'>[], pengadaan: Pick<Pengadaan, 'total'>[]): RingkasanPerpus`.

- [ ] **Step 1: Tes yang gagal**

`tests/perpus/audit.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { rencanakanNomorBaru, barisLabel, keCsv } from '@/lib/perpus/audit';

const buku = (id: string, judul: string, penulis: string, nomorPanggil: string, seri: { kode: string; no: number } | null = null) => ({
  id, judul, penulis, kodePengarang: '', kodeJudul: seri?.kode ?? '', noSeri: seri?.no ?? null, nomorPanggil,
});

describe('rencanakanNomorBaru', () => {
  it('kode pengarang dihitung ulang, bentrok antarbuku diselesaikan berurutan', () => {
    const semua = [
      buku('a', 'Rembulan Tenggelam di Wajahmu', 'Tere Liye', '813 LIY R'),
      buku('b', 'Rasa', 'Tere Liye', 'TMP-0035'),
      buku('c', 'Bumi', 'Tere Liye', '813 LIY b.01', { kode: 'b', no: 1 }),
      buku('d', 'Hujan', 'Tere Liye', '899.221 LIY h'),
    ];
    const h = rencanakanNomorBaru(semua, [{ id: 'a', kelasDdc: '899.221' }, { id: 'b', kelasDdc: '899.221' }, { id: 'c', kelasDdc: '899.221' }]);
    expect(h.map(x => [x.id, x.nomorPanggil])).toEqual([
      ['c', '899.221 LIY b.01'], ['b', '899.221 LIY r'], ['a', '899.221 LIY re'],
    ]);
    expect(h[0]).toMatchObject({ kodePengarang: 'LIY', kodeJudul: 'b', noSeri: 1 });
  });
  it('nomor buku yang tidak diaudit tetap dihormati', () => {
    const semua = [buku('x', 'Hujan', 'Tere Liye', '899.221 LIY h'), buku('y', 'Hello', 'Tere Liye', '813 LIY HE')];
    expect(rencanakanNomorBaru(semua, [{ id: 'y', kelasDdc: '899.221' }])[0].nomorPanggil).toBe('899.221 LIY he');
  });
  it('id tak dikenal diabaikan', () => {
    expect(rencanakanNomorBaru([], [{ id: 'z', kelasDdc: '297' }])).toEqual([]);
  });
});

describe('barisLabel & CSV', () => {
  it('hanya buku baku yang nomornya berubah; satu baris per eksemplar', () => {
    const h = barisLabel([
      { judul: 'Sapu Bersih', nomorPanggil: '510 AND s', nomorPanggilLama: '500 AND Sa', eksemplar: 2, statusKode: 'baku' },
      { judul: 'Tetap', nomorPanggil: '297 SIA k', nomorPanggilLama: '297 SIA k', eksemplar: 1, statusKode: 'baku' },
      { judul: 'Belum', nomorPanggil: 'TMP-0001', nomorPanggilLama: null, eksemplar: 1, statusKode: 'perlu_audit' },
      { judul: 'Baru', nomorPanggil: '158 CLE a', nomorPanggilLama: null, eksemplar: 1, statusKode: 'baku' },
    ]);
    expect(h).toEqual([
      { judul: 'Sapu Bersih', lama: '500 AND Sa', baru: '510 AND s c.1' },
      { judul: 'Sapu Bersih', lama: '500 AND Sa', baru: '510 AND s c.2' },
      { judul: 'Baru', lama: '', baru: '158 CLE a' },
    ]);
  });
  it('CSV meng-escape koma & kutip', () => {
    expect(keCsv([['Judul', 'Nomor'], ['Kau,Aku "Angpau"', '899.221 LIY k']]))
      .toBe('Judul,Nomor\r\n"Kau,Aku ""Angpau""",899.221 LIY k\r\n');
  });
});
```

`tests/perpus/ringkasan.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { hitungRingkasan } from '@/lib/perpus/ringkasan';

it('menghitung judul, eksemplar, audit, infaq, pengadaan, saldo, donatur unik', () => {
  const r = hitungRingkasan(
    [{ eksemplar: 2, statusKode: 'baku', aktif: true }, { eksemplar: 1, statusKode: 'perlu_audit', aktif: true }, { eksemplar: 5, statusKode: 'baku', aktif: false }],
    [{ jenis: 'uang', jumlah: 6000, nama: 'Raihan' }, { jenis: 'uang', jumlah: 10000, nama: 'raihan ' }, { jenis: 'buku', jumlah: null, nama: 'Bu Siti' }],
    [{ total: 5000 }],
  );
  expect(r).toEqual({ judul: 2, eksemplar: 3, perluAudit: 1, totalInfaq: 16000, totalPengadaan: 5000, saldo: 11000, donatur: 2 });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal** — Run: `npx vitest run tests/perpus/audit.test.ts tests/perpus/ringkasan.test.ts` → FAIL.

- [ ] **Step 3: Implementasi**

`lib/perpus/audit.ts`:
```ts
import { selesaikanBentrok, kodePengarang, type BagianNomor } from '@/lib/perpus/nomor-panggil';
import type { Buku } from '@/lib/perpus/tipe';

export type BukuNomor = Pick<Buku, 'id' | 'judul' | 'penulis' | 'kodePengarang' | 'kodeJudul' | 'noSeri' | 'nomorPanggil'>;
export type PerubahanNomor = BagianNomor & { id: string; nomorPanggil: string };

/**
 * Nomor panggil baru untuk buku yang diaudit. Kode pengarang dihitung ulang dari penulis (DDC baku),
 * seri lama dipertahankan. Urutan: kelas → pengarang → seri dulu → judul, supaya hasil stabil.
 * Nomor milik buku yang tidak ikut diaudit tidak boleh dipakai.
 */
export function rencanakanNomorBaru(semua: BukuNomor[], items: { id: string; kelasDdc: string }[]): PerubahanNomor[] {
  const perId = new Map(semua.map(b => [b.id, b]));
  const diubah = new Set(items.map(i => i.id));
  const terpakai = new Set(semua.filter(b => !diubah.has(b.id)).map(b => b.nomorPanggil));
  const antre = items
    .map(i => ({ item: i, buku: perId.get(i.id) }))
    .filter((x): x is { item: { id: string; kelasDdc: string }; buku: BukuNomor } => !!x.buku)
    .map(x => ({ ...x, pengarang: kodePengarang(x.buku.penulis) || x.buku.kodePengarang || 'XXX' }))
    .sort((a, b) => a.item.kelasDdc.localeCompare(b.item.kelasDdc)
      || a.pengarang.localeCompare(b.pengarang)
      || Number(b.buku.noSeri != null) - Number(a.buku.noSeri != null)
      || a.buku.judul.localeCompare(b.buku.judul, 'id'));
  return antre.map(({ item, buku, pengarang }) => {
    const seri = buku.noSeri != null && buku.kodeJudul ? { kode: buku.kodeJudul, nomor: buku.noSeri } : null;
    const hasil = selesaikanBentrok({ kelasDdc: item.kelasDdc, kodePengarang: pengarang, judul: buku.judul, seri }, terpakai);
    terpakai.add(hasil.nomorPanggil);
    return { id: buku.id, ...hasil };
  });
}

/** Label yang perlu dicetak (ulang): buku baku yang nomornya beda dari kode lama; c.N bila eksemplar > 1. */
export function barisLabel(
  buku: Pick<Buku, 'judul' | 'nomorPanggil' | 'nomorPanggilLama' | 'eksemplar' | 'statusKode'>[],
): { judul: string; lama: string; baru: string }[] {
  return buku
    .filter(b => b.statusKode === 'baku' && b.nomorPanggil !== b.nomorPanggilLama)
    .flatMap(b => Array.from({ length: b.eksemplar }, (_, i) => ({
      judul: b.judul,
      lama: b.nomorPanggilLama ?? '',
      baru: b.eksemplar > 1 ? `${b.nomorPanggil} c.${i + 1}` : b.nomorPanggil,
    })));
}

const selCsv = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
export function keCsv(baris: string[][]): string {
  return baris.map(r => r.map(selCsv).join(',')).join('\r\n') + '\r\n';
}
```

`lib/perpus/ringkasan.ts`:
```ts
import type { Buku, DonasiPerpus, Pengadaan, RingkasanPerpus } from '@/lib/perpus/tipe';

export function hitungRingkasan(
  buku: Pick<Buku, 'eksemplar' | 'statusKode' | 'aktif'>[],
  donasi: Pick<DonasiPerpus, 'jenis' | 'jumlah' | 'nama'>[],
  pengadaan: Pick<Pengadaan, 'total'>[],
): RingkasanPerpus {
  const aktif = buku.filter(b => b.aktif);
  const totalInfaq = donasi.reduce((s, d) => s + (d.jenis === 'uang' ? d.jumlah ?? 0 : 0), 0);
  const totalPengadaan = pengadaan.reduce((s, p) => s + p.total, 0);
  return {
    judul: aktif.length,
    eksemplar: aktif.reduce((s, b) => s + b.eksemplar, 0),
    perluAudit: aktif.filter(b => b.statusKode === 'perlu_audit').length,
    totalInfaq, totalPengadaan, saldo: totalInfaq - totalPengadaan,
    donatur: new Set(donasi.map(d => d.nama.trim().toLowerCase())).size,
  };
}
```

- [ ] **Step 4: Jalankan tes** — Run: `npx vitest run tests/perpus` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/perpus/audit.ts lib/perpus/ringkasan.ts tests/perpus/audit.test.ts tests/perpus/ringkasan.test.ts
git commit -m "feat(perpus): rencana nomor audit, label cetak ulang (CSV), ringkasan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Repositori Supabase & skema validasi

**Files:**
- Create: `lib/db/perpus-repo.ts`, `lib/validation/perpus.ts`
- Test: `tests/db/perpus-repo.test.ts`, `tests/validation/perpus.test.ts`

**Interfaces:**
- Consumes: Task 2 tipe, Task 4 `selesaikanBentrok`/`kodePengarang`/`NomorBentrokError`, Task 5 `RencanaImpor`, Task 6 `rencanakanNomorBaru`/`hitungRingkasan`.
- Produces (repo; `c: SupabaseClient`):
  - `listBuku(c, opsi?: { q?: string; statusKode?: StatusKode }): Promise<Buku[]>`
  - `tambahBuku(c, input: BukuInput, oleh: string): Promise<Buku>` — lempar `NomorBentrokError` bila unik dilanggar
  - `ubahBuku(c, id: string, input: BukuUbahInput): Promise<Buku>`
  - `listDonasi(c): Promise<DonasiPerpus[]>`, `tambahDonasi(c, input: DonasiPerpusInput, oleh: string): Promise<DonasiPerpus>`
  - `listPengadaan(c): Promise<Pengadaan[]>`, `tambahPengadaan(c, input: PengadaanInput, oleh: string): Promise<Pengadaan>`
  - `ambilRingkasan(c): Promise<RingkasanPerpus>`
  - `kosongkanPerpus(c): Promise<void>`
  - `simpanRencana(c, r: RencanaImpor, oleh: string): Promise<{ buku: number; donasi: number; pengadaan: number }>`
  - `terapkanAudit(c, items: { id: string; kelasDdc: string }[]): Promise<{ id: string; nomorPanggil: string }[]>`
- Produces (validasi): `bukuSchema`, `bukuUbahSchema`, `donasiPerpusSchema`, `pengadaanSchema`, `klasifikasiSchema`, `auditTerapkanSchema` + tipe `BukuInput`, `BukuUbahInput`, `DonasiPerpusInput`, `PengadaanInput`.

- [ ] **Step 1: Tes yang gagal**

`tests/validation/perpus.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { bukuSchema, donasiPerpusSchema, auditTerapkanSchema, klasifikasiSchema } from '@/lib/validation/perpus';

describe('validasi perpus', () => {
  it('buku: kelas harus terdaftar; nilai bawaan terisi', () => {
    expect(bukuSchema.safeParse({ judul: 'Rasa', penulis: 'Tere Liye', kelasDdc: '999' }).success).toBe(false);
    expect(bukuSchema.parse({ judul: ' Rasa ', penulis: 'Tere Liye', kelasDdc: '899.221' })).toEqual({
      judul: 'Rasa', penulis: 'Tere Liye', kelasDdc: '899.221', seri: null, eksemplar: 1, asal: 'koleksi_awal', donasiId: null, pengadaanId: null,
    });
  });
  it('buku: kode pengarang manual 2–4 huruf kapital; seri 1 huruf', () => {
    expect(bukuSchema.safeParse({ judul: 'x', kelasDdc: '297', kodePengarang: 'sia' }).success).toBe(false);
    expect(bukuSchema.safeParse({ judul: 'x', kelasDdc: '297', seri: { kode: 'gh', nomor: 1 } }).success).toBe(false);
    expect(bukuSchema.parse({ judul: 'Ghazi 2', kelasDdc: '297.9', seri: { kode: 'g', nomor: 2 } }).seri).toEqual({ kode: 'g', nomor: 2 });
  });
  it('donasi: uang wajib jumlah, buku wajib jumlahBuku', () => {
    expect(donasiPerpusSchema.safeParse({ nama: 'Raihan', jenis: 'uang', tanggal: '2025-03-14' }).success).toBe(false);
    expect(donasiPerpusSchema.safeParse({ nama: 'Bu Siti', jenis: 'buku', jumlahBuku: 19, tanggal: '2025-04-06' }).success).toBe(true);
  });
  it('klasifikasi maksimal 10 buku; audit butuh kelas sah', () => {
    expect(klasifikasiSchema.safeParse({ buku: Array(11).fill({ judul: 'a', penulis: '' }) }).success).toBe(false);
    expect(auditTerapkanSchema.safeParse({ items: [{ id: '2f9a2b4e-3c1d-4e5f-8a9b-0c1d2e3f4a5b', kelasDdc: '999' }] }).success).toBe(false);
  });
});
```

`tests/db/perpus-repo.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { tambahBuku, simpanRencana, terapkanAudit } from '@/lib/db/perpus-repo';
import { NomorBentrokError } from '@/lib/perpus/nomor-panggil';
import type { RencanaImpor } from '@/lib/perpus/impor';

/** Rantai kueri palsu: setiap metode mengembalikan dirinya; await menghasilkan `hasil`. */
function rantai(hasil: unknown, catat: unknown[][] = []) {
  const r: any = new Proxy({}, {
    get: (_t, k) => (k === 'then' ? (ok: (v: unknown) => void) => ok(hasil) : (...a: unknown[]) => { catat.push([k, ...a]); return r; }),
  });
  return r;
}
function klien(antrean: Record<string, unknown[]>, catat: Record<string, unknown[][]> = {}) {
  return {
    from: vi.fn((t: string) => rantai(antrean[t]?.shift(), (catat[t] ??= []))),
    rpc: vi.fn(async () => ({ error: null })),
  } as any;
}
const input = { judul: 'Rasa', penulis: 'Tere Liye', kelasDdc: '899.221', seri: null, eksemplar: 1, asal: 'koleksi_awal' as const, donasiId: null, pengadaanId: null };

describe('tambahBuku', () => {
  it('menyusun nomor yang belum terpakai', async () => {
    const catat: Record<string, unknown[][]> = {};
    const c = klien({ perpus_buku: [{ data: [{ nomorPanggil: '899.221 LIY r' }], error: null }, { data: { id: 'b1' }, error: null }] }, catat);
    await tambahBuku(c, input, 'u1');
    const insert = catat.perpus_buku.find(x => x[0] === 'insert')![1];
    expect(insert).toMatchObject({ nomorPanggil: '899.221 LIY ra', kodePengarang: 'LIY', kodeJudul: 'ra', statusKode: 'baku', createdBy: 'u1' });
  });
  it('pelanggaran unik → NomorBentrokError', async () => {
    const c = klien({ perpus_buku: [{ data: [], error: null }, { data: null, error: { code: '23505', message: 'dup' } }] });
    await expect(tambahBuku(c, input, 'u1')).rejects.toBeInstanceOf(NomorBentrokError);
  });
});

describe('simpanRencana', () => {
  it('menautkan buku ke id donasi/pengadaan dan menandai perlu audit', async () => {
    const catat: Record<string, unknown[][]> = {};
    const ok = { data: null, error: null };
    const c = klien({ perpus_donasi: [ok], perpus_pengadaan: [ok], perpus_buku: [ok] }, catat);
    const r: RencanaImpor = {
      donasi: [{ kunci: 'infaq-14', tanggal: '2025-04-06', tanggalTeks: '06/04/2025', nama: 'Bu Siti', jenis: 'buku', jumlah: null, jumlahBuku: 1 }],
      pengadaan: [{ kunci: 'pengadaan-1', tanggal: null, tanggalTeks: 'September', total: 1000 }],
      buku: [{
        judul: 'Guru Aini', penulis: 'Andrea Hirata', kelasDdc: '813', kodePengarang: 'HIR', kodeJudul: 'g', noSeri: null,
        nomorPanggil: '813 HIR g', nomorPanggilLama: '813 HIR G', eksemplar: 1, asal: 'wakaf',
        donasiKunci: 'infaq-14', pengadaanKunci: 'pengadaan-1', catatanAudit: null,
      }],
      tidakCocok: [],
    };
    expect(await simpanRencana(c, r, 'u1')).toEqual({ buku: 1, donasi: 1, pengadaan: 1 });
    const donasi = (catat.perpus_donasi.find(x => x[0] === 'insert')![1] as any[])[0];
    const pengadaan = (catat.perpus_pengadaan.find(x => x[0] === 'insert')![1] as any[])[0];
    const buku = (catat.perpus_buku.find(x => x[0] === 'insert')![1] as any[])[0];
    expect(donasi).not.toHaveProperty('kunci');
    expect(buku).toMatchObject({ donasiId: donasi.id, pengadaanId: pengadaan.id, statusKode: 'perlu_audit', createdBy: 'u1' });
    expect(buku).not.toHaveProperty('donasiKunci');
  });
});

describe('terapkanAudit', () => {
  it('memanggil RPC dengan perubahan nomor', async () => {
    const c = klien({ perpus_buku: [{ data: [
      { id: 'a', judul: 'Rasa', penulis: 'Tere Liye', kodePengarang: 'LIY', kodeJudul: 'r', noSeri: null, nomorPanggil: '813 LIY r' },
    ], error: null }] });
    const h = await terapkanAudit(c, [{ id: 'a', kelasDdc: '899.221' }]);
    expect(h).toEqual([{ id: 'a', nomorPanggil: '899.221 LIY r' }]);
    expect(c.rpc).toHaveBeenCalledWith('perpus_terapkan_nomor', {
      perubahan: [{ id: 'a', kelasDdc: '899.221', kodePengarang: 'LIY', kodeJudul: 'r', noSeri: null, nomorPanggil: '899.221 LIY r' }],
    });
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal** — Run: `npx vitest run tests/db/perpus-repo.test.ts tests/validation/perpus.test.ts` → FAIL.

- [ ] **Step 3: Implementasi**

`lib/validation/perpus.ts`:
```ts
import { z } from 'zod';
import { kelasSah } from '@/lib/perpus/ddc';
import { isTanggalIso } from '@/lib/validation/query';

const kelas = z.string().trim().refine(kelasSah, 'Kelas DDC tidak dikenal');
const teksOpsional = z.string().trim().transform(v => (v === '' ? null : v)).nullable().default(null);
const tanggalOpsional = z.string().trim().refine(isTanggalIso, 'Tanggal tidak valid').nullable().default(null);
const uuidOpsional = z.string().uuid().nullable().default(null);

export const bukuSchema = z.object({
  judul: z.string().trim().min(1, 'Judul wajib diisi').max(300),
  penulis: z.string().trim().max(200).default(''),
  kelasDdc: kelas,
  kodePengarang: z.string().trim().regex(/^[A-Z]{2,4}$/, 'Kode pengarang 2–4 huruf kapital').optional(),
  seri: z.object({ kode: z.string().regex(/^[a-z]$/, 'Kode seri 1 huruf kecil'), nomor: z.number().int().min(1).max(99) }).nullable().default(null),
  eksemplar: z.number().int().min(1).max(99).default(1),
  asal: z.enum(['koleksi_awal', 'wakaf', 'pengadaan']).default('koleksi_awal'),
  donasiId: uuidOpsional,
  pengadaanId: uuidOpsional,
});
export type BukuInput = z.infer<typeof bukuSchema>;

export const bukuUbahSchema = z.object({
  judul: z.string().trim().min(1).max(300).optional(),
  penulis: z.string().trim().max(200).optional(),
  kelasDdc: kelas.optional(),
  kodePengarang: z.string().trim().regex(/^[A-Z]{2,4}$/).optional(),
  eksemplar: z.number().int().min(1).max(99).optional(),
  asal: z.enum(['koleksi_awal', 'wakaf', 'pengadaan']).optional(),
  donasiId: z.string().uuid().nullable().optional(),
  pengadaanId: z.string().uuid().nullable().optional(),
  aktif: z.boolean().optional(),
});
export type BukuUbahInput = z.infer<typeof bukuUbahSchema>;

export const donasiPerpusSchema = z.object({
  tanggal: tanggalOpsional,
  nama: z.string().trim().min(2, 'Nama minimal 2 huruf').max(120),
  jenis: z.enum(['uang', 'buku']),
  jumlah: z.number().int().min(0).nullable().default(null),
  jumlahBuku: z.number().int().min(1).nullable().default(null),
  catatan: teksOpsional,
}).refine(d => (d.jenis === 'uang' ? d.jumlah != null : d.jumlahBuku != null), {
  message: 'Isi nominal (uang) atau jumlah buku (buku)', path: ['jumlah'],
});
export type DonasiPerpusInput = z.infer<typeof donasiPerpusSchema>;

export const pengadaanSchema = z.object({
  tanggal: tanggalOpsional,
  toko: teksOpsional,
  total: z.number().int().min(0),
  catatan: teksOpsional,
});
export type PengadaanInput = z.infer<typeof pengadaanSchema>;

export const klasifikasiSchema = z.object({
  buku: z.array(z.object({ judul: z.string().trim().min(1).max(300), penulis: z.string().trim().max(200).default('') })).min(1).max(10),
});

export const auditTerapkanSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), kelasDdc: kelas })).min(1).max(300),
});
```

`lib/db/perpus-repo.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { escapeOrFilterValue } from '@/lib/db/filters';
import { kodePengarang, selesaikanBentrok, NomorBentrokError } from '@/lib/perpus/nomor-panggil';
import { rencanakanNomorBaru } from '@/lib/perpus/audit';
import { hitungRingkasan } from '@/lib/perpus/ringkasan';
import type { RencanaImpor } from '@/lib/perpus/impor';
import type { Buku, DonasiPerpus, Pengadaan, RingkasanPerpus, StatusKode } from '@/lib/perpus/tipe';
import type { BukuInput, BukuUbahInput, DonasiPerpusInput, PengadaanInput } from '@/lib/validation/perpus';

const now = () => new Date().toISOString();
const UNIK_DILANGGAR = '23505';
/** PostgREST menolak delete tanpa filter; id ini tidak pernah ada. */
const ID_MUSTAHIL = '00000000-0000-0000-0000-000000000000';

export async function listBuku(c: SupabaseClient, opsi: { q?: string; statusKode?: StatusKode } = {}): Promise<Buku[]> {
  let query = c.from('perpus_buku').select('*').order('nomorPanggil');
  if (opsi.statusKode) query = query.eq('statusKode', opsi.statusKode);
  const aman = opsi.q ? escapeOrFilterValue(opsi.q) : '';
  if (aman) query = query.or(`judul.ilike.%${aman}%,penulis.ilike.%${aman}%,nomorPanggil.ilike.%${aman}%`);
  const { data, error } = await query;
  if (error) throw new Error(`Gagal memuat buku: ${error.message}`);
  return (data || []) as Buku[];
}

async function nomorTerpakai(c: SupabaseClient, kecualiId?: string): Promise<Set<string>> {
  const { data, error } = await c.from('perpus_buku').select('id, nomorPanggil');
  if (error) throw new Error(`Gagal memuat nomor panggil: ${error.message}`);
  return new Set((data || [])
    .filter((b: { id: string }) => !kecualiId || b.id !== kecualiId)
    .map((b: { nomorPanggil: string }) => b.nomorPanggil));
}

export async function tambahBuku(c: SupabaseClient, input: BukuInput, oleh: string): Promise<Buku> {
  const { seri, kodePengarang: kodeManual, ...isi } = input;
  const nomor = selesaikanBentrok(
    { kelasDdc: input.kelasDdc, kodePengarang: kodeManual || kodePengarang(input.penulis) || 'XXX', judul: input.judul, seri },
    await nomorTerpakai(c),
  );
  const { data, error } = await c.from('perpus_buku')
    .insert({ ...isi, ...nomor, statusKode: 'baku', createdBy: oleh, createdAt: now(), updatedAt: now() })
    .select('*').single();
  if (error?.code === UNIK_DILANGGAR) throw new NomorBentrokError(nomor.nomorPanggil);
  if (error) throw new Error(`Gagal menyimpan buku: ${error.message}`);
  return data as Buku;
}

/** Ubah buku; bila judul/penulis/kelas/kode pengarang berubah, nomor panggil disusun ulang (seri dipertahankan). */
export async function ubahBuku(c: SupabaseClient, id: string, input: BukuUbahInput): Promise<Buku> {
  const { data: lama, error: galatBaca } = await c.from('perpus_buku').select('*').eq('id', id).single();
  if (galatBaca || !lama) throw new Error('Buku tidak ditemukan');
  const b = lama as Buku;
  const { kodePengarang: kodeManual, ...isi } = input;
  const susunUlang = (['judul', 'penulis', 'kelasDdc'] as const).some(k => input[k] !== undefined && input[k] !== b[k])
    || (kodeManual !== undefined && kodeManual !== b.kodePengarang);
  let nomor = {};
  if (susunUlang) {
    const penulis = input.penulis ?? b.penulis;
    nomor = selesaikanBentrok({
      kelasDdc: input.kelasDdc ?? b.kelasDdc,
      kodePengarang: kodeManual || kodePengarang(penulis) || b.kodePengarang || 'XXX',
      judul: input.judul ?? b.judul,
      seri: b.noSeri != null && b.kodeJudul ? { kode: b.kodeJudul, nomor: b.noSeri } : null,
    }, await nomorTerpakai(c, id));
  }
  const { data, error } = await c.from('perpus_buku')
    .update({ ...isi, ...nomor, ...(susunUlang ? { statusKode: 'baku', catatanAudit: null } : {}), updatedAt: now() })
    .eq('id', id).select('*').single();
  if (error?.code === UNIK_DILANGGAR) throw new NomorBentrokError((nomor as { nomorPanggil?: string }).nomorPanggil ?? '');
  if (error) throw new Error(`Gagal mengubah buku: ${error.message}`);
  return data as Buku;
}

export async function listDonasi(c: SupabaseClient): Promise<DonasiPerpus[]> {
  const { data, error } = await c.from('perpus_donasi').select('*').order('tanggal', { ascending: false, nullsFirst: false });
  if (error) throw new Error(`Gagal memuat donasi: ${error.message}`);
  return (data || []) as DonasiPerpus[];
}

export async function tambahDonasi(c: SupabaseClient, input: DonasiPerpusInput, oleh: string): Promise<DonasiPerpus> {
  const baris = { ...input, jumlah: input.jenis === 'uang' ? input.jumlah : null, jumlahBuku: input.jenis === 'buku' ? input.jumlahBuku : null };
  const { data, error } = await c.from('perpus_donasi').insert({ ...baris, createdBy: oleh }).select('*').single();
  if (error) throw new Error(`Gagal menyimpan donasi: ${error.message}`);
  return data as DonasiPerpus;
}

export async function listPengadaan(c: SupabaseClient): Promise<Pengadaan[]> {
  const { data, error } = await c.from('perpus_pengadaan').select('*').order('tanggal', { ascending: false, nullsFirst: false });
  if (error) throw new Error(`Gagal memuat pengadaan: ${error.message}`);
  return (data || []) as Pengadaan[];
}

export async function tambahPengadaan(c: SupabaseClient, input: PengadaanInput, oleh: string): Promise<Pengadaan> {
  const { data, error } = await c.from('perpus_pengadaan').insert({ ...input, createdBy: oleh }).select('*').single();
  if (error) throw new Error(`Gagal menyimpan pengadaan: ${error.message}`);
  return data as Pengadaan;
}

export async function ambilRingkasan(c: SupabaseClient): Promise<RingkasanPerpus> {
  const [buku, donasi, pengadaan] = await Promise.all([
    c.from('perpus_buku').select('eksemplar, statusKode, aktif'),
    c.from('perpus_donasi').select('jenis, jumlah, nama'),
    c.from('perpus_pengadaan').select('total'),
  ]);
  const galat = buku.error ?? donasi.error ?? pengadaan.error;
  if (galat) throw new Error(`Gagal memuat ringkasan: ${galat.message}`);
  return hitungRingkasan(buku.data || [], donasi.data || [], pengadaan.data || []);
}

export async function kosongkanPerpus(c: SupabaseClient): Promise<void> {
  for (const t of ['perpus_buku', 'perpus_donasi', 'perpus_pengadaan']) {
    const { error } = await c.from(t).delete().neq('id', ID_MUSTAHIL);
    if (error) throw new Error(`Gagal mengosongkan ${t}: ${error.message}`);
  }
}

/** Simpan hasil impor. Id dibuat di sini agar tautan buku → donasi/pengadaan tidak bergantung urutan hasil insert. */
export async function simpanRencana(c: SupabaseClient, r: RencanaImpor, oleh: string): Promise<{ buku: number; donasi: number; pengadaan: number }> {
  const idDonasi = new Map(r.donasi.map(d => [d.kunci, crypto.randomUUID()]));
  const idPengadaan = new Map(r.pengadaan.map(p => [p.kunci, crypto.randomUUID()]));
  const sisipkan = async (tabel: string, baris: object[]) => {
    for (let i = 0; i < baris.length; i += 100) {
      const { error } = await c.from(tabel).insert(baris.slice(i, i + 100));
      if (error) throw new Error(`Gagal menyimpan ${tabel}: ${error.message}`);
    }
  };
  if (r.donasi.length) await sisipkan('perpus_donasi', r.donasi.map(({ kunci, ...d }) => ({ ...d, id: idDonasi.get(kunci), createdBy: oleh })));
  if (r.pengadaan.length) await sisipkan('perpus_pengadaan', r.pengadaan.map(({ kunci, ...p }) => ({ ...p, id: idPengadaan.get(kunci), createdBy: oleh })));
  await sisipkan('perpus_buku', r.buku.map(({ donasiKunci, pengadaanKunci, ...b }) => ({
    ...b,
    statusKode: 'perlu_audit',
    donasiId: donasiKunci ? idDonasi.get(donasiKunci) ?? null : null,
    pengadaanId: pengadaanKunci ? idPengadaan.get(pengadaanKunci) ?? null : null,
    createdBy: oleh,
  })));
  return { buku: r.buku.length, donasi: r.donasi.length, pengadaan: r.pengadaan.length };
}

export async function terapkanAudit(c: SupabaseClient, items: { id: string; kelasDdc: string }[]): Promise<{ id: string; nomorPanggil: string }[]> {
  const { data, error } = await c.from('perpus_buku').select('id, judul, penulis, kodePengarang, kodeJudul, noSeri, nomorPanggil');
  if (error) throw new Error(`Gagal memuat buku: ${error.message}`);
  const perubahan = rencanakanNomorBaru(data || [], items);
  const { error: galatRpc } = await c.rpc('perpus_terapkan_nomor', { perubahan });
  if (galatRpc) throw new Error(`Gagal menerapkan nomor: ${galatRpc.message}`);
  return perubahan.map(p => ({ id: p.id, nomorPanggil: p.nomorPanggil }));
}
```

- [ ] **Step 4: Jalankan tes** — Run: `npx vitest run tests/db/perpus-repo.test.ts tests/validation/perpus.test.ts && npx tsc --noEmit` → PASS, bersih.

- [ ] **Step 5: Commit**

```bash
git add lib/db/perpus-repo.ts lib/validation/perpus.ts tests/db/perpus-repo.test.ts tests/validation/perpus.test.ts
git commit -m "feat(perpus): repositori Supabase & validasi buku/donasi/pengadaan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: API buku, donasi, pengadaan, ringkasan

**Files:**
- Create: `app/api/perpus/buku/route.ts`, `app/api/perpus/buku/[id]/route.ts`, `app/api/perpus/donasi/route.ts`, `app/api/perpus/pengadaan/route.ts`, `app/api/perpus/ringkasan/route.ts`
- Test: `tests/api/perpus-route.test.ts`

**Interfaces:**
- Consumes: Task 7 repo & skema; `requireRoom('perpus')`, `authErrorResponse` (`lib/auth/session.ts`); `validationResponse` (`lib/validation/errors.ts`).
- Produces: `GET/POST /api/perpus/buku` (`?q=&status=perlu_audit|baku`), `PATCH /api/perpus/buku/[id]`, `GET/POST /api/perpus/donasi`, `GET/POST /api/perpus/pengadaan`, `GET /api/perpus/ringkasan`. Semua merespons `{ success: true, data }`; bentrok nomor → 409 `{ error, nomor }`; validasi → 400.

- [ ] **Step 1: Tes yang gagal**

`tests/api/perpus-route.test.ts`:
```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NomorBentrokError } from '@/lib/perpus/nomor-panggil';

const repo = vi.hoisted(() => ({
  listBuku: vi.fn(), tambahBuku: vi.fn(), ubahBuku: vi.fn(), listDonasi: vi.fn(), tambahDonasi: vi.fn(),
  listPengadaan: vi.fn(), tambahPengadaan: vi.fn(), ambilRingkasan: vi.fn(),
}));
const requireRoom = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/perpus-repo', () => repo);
vi.mock('@/lib/auth/session', () => ({ requireRoom: (...a: unknown[]) => requireRoom(...a), authErrorResponse: () => null }));

import { GET as LIST_BUKU, POST as TAMBAH_BUKU } from '@/app/api/perpus/buku/route';
import { PATCH as UBAH_BUKU } from '@/app/api/perpus/buku/[id]/route';
import { POST as TAMBAH_DONASI } from '@/app/api/perpus/donasi/route';

const json = (body: unknown) => ({ url: 'http://x/api', json: async () => body }) as never;

beforeEach(() => {
  Object.values(repo).forEach(f => f.mockReset());
  requireRoom.mockReset().mockResolvedValue({ user: { id: 'u1' }, supabase: {} });
});

describe('API perpus', () => {
  it('GET buku meneruskan q & status, memakai ruangan perpus', async () => {
    repo.listBuku.mockResolvedValue([{ id: 'b1' }]);
    const res = await LIST_BUKU({ url: 'http://x/api/perpus/buku?q=liye&status=perlu_audit' } as never);
    expect(requireRoom).toHaveBeenCalledWith('perpus');
    expect(repo.listBuku).toHaveBeenCalledWith({}, { q: 'liye', statusKode: 'perlu_audit' });
    expect((await res.json()).data).toEqual([{ id: 'b1' }]);
  });
  it('POST buku: validasi gagal → 400', async () => {
    const res = await TAMBAH_BUKU(json({ judul: '', kelasDdc: '899.221' }));
    expect(res.status).toBe(400);
    expect(repo.tambahBuku).not.toHaveBeenCalled();
  });
  it('POST buku: bentrok → 409', async () => {
    repo.tambahBuku.mockRejectedValue(new NomorBentrokError('823 DOY s.03'));
    const res = await TAMBAH_BUKU(json({ judul: 'Sherlock 3', kelasDdc: '823', seri: { kode: 's', nomor: 3 } }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ nomor: '823 DOY s.03' });
  });
  it('POST buku: sukses → 201 dengan id pembuat', async () => {
    repo.tambahBuku.mockResolvedValue({ id: 'b1' });
    const res = await TAMBAH_BUKU(json({ judul: 'Rasa', penulis: 'Tere Liye', kelasDdc: '899.221' }));
    expect(res.status).toBe(201);
    expect(repo.tambahBuku.mock.calls[0][2]).toBe('u1');
  });
  it('PATCH buku meneruskan id', async () => {
    repo.ubahBuku.mockResolvedValue({ id: 'b1', aktif: false });
    const res = await UBAH_BUKU(json({ aktif: false }), { params: Promise.resolve({ id: 'b1' }) });
    expect(res.status).toBe(200);
    expect(repo.ubahBuku).toHaveBeenCalledWith({}, 'b1', { aktif: false });
  });
  it('POST donasi buku tanpa jumlahBuku → 400', async () => {
    const res = await TAMBAH_DONASI(json({ nama: 'Bu Siti', jenis: 'buku' }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal** — Run: `npx vitest run tests/api/perpus-route.test.ts` → FAIL.

- [ ] **Step 3: Implementasi**

Baca dulu `node_modules/next/dist/docs/` bagian Route Handlers untuk bentuk `params` (Promise) di versi ini; contoh yang sudah ada: `app/api/santri/[id]/route.ts`.

`app/api/perpus/buku/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listBuku, tambahBuku } from '@/lib/db/perpus-repo';
import { bukuSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';
import { NomorBentrokError } from '@/lib/perpus/nomor-panggil';
import type { StatusKode } from '@/lib/perpus/tipe';

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('perpus');
    const p = new URL(req.url).searchParams;
    const status = p.get('status');
    const statusKode = status === 'baku' || status === 'perlu_audit' ? (status as StatusKode) : undefined;
    return NextResponse.json({ success: true, data: await listBuku(supabase, { q: p.get('q') || undefined, statusKode }) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('List buku error:', e);
    return NextResponse.json({ error: 'Gagal memuat buku' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireRoom('perpus');
    const parsed = bukuSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await tambahBuku(supabase, parsed.data, user.id) }, { status: 201 });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    if (e instanceof NomorBentrokError) return NextResponse.json({ error: e.message, nomor: e.nomor }, { status: 409 });
    console.error('Tambah buku error:', e);
    return NextResponse.json({ error: 'Gagal menyimpan buku' }, { status: 500 });
  }
}
```

`app/api/perpus/buku/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { ubahBuku } from '@/lib/db/perpus-repo';
import { bukuUbahSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';
import { NomorBentrokError } from '@/lib/perpus/nomor-panggil';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireRoom('perpus');
    const { id } = await params;
    const parsed = bukuUbahSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await ubahBuku(supabase, id, parsed.data) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    if (e instanceof NomorBentrokError) return NextResponse.json({ error: e.message, nomor: e.nomor }, { status: 409 });
    console.error('Ubah buku error:', e);
    return NextResponse.json({ error: 'Gagal mengubah buku' }, { status: 500 });
  }
}
```

`app/api/perpus/donasi/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listDonasi, tambahDonasi } from '@/lib/db/perpus-repo';
import { donasiPerpusSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';

export async function GET() {
  try {
    const { supabase } = await requireRoom('perpus');
    return NextResponse.json({ success: true, data: await listDonasi(supabase) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('List donasi perpus error:', e);
    return NextResponse.json({ error: 'Gagal memuat donasi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireRoom('perpus');
    const parsed = donasiPerpusSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await tambahDonasi(supabase, parsed.data, user.id) }, { status: 201 });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Tambah donasi perpus error:', e);
    return NextResponse.json({ error: 'Gagal menyimpan donasi' }, { status: 500 });
  }
}
```

`app/api/perpus/pengadaan/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listPengadaan, tambahPengadaan } from '@/lib/db/perpus-repo';
import { pengadaanSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';

export async function GET() {
  try {
    const { supabase } = await requireRoom('perpus');
    return NextResponse.json({ success: true, data: await listPengadaan(supabase) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('List pengadaan error:', e);
    return NextResponse.json({ error: 'Gagal memuat pengadaan' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireRoom('perpus');
    const parsed = pengadaanSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await tambahPengadaan(supabase, parsed.data, user.id) }, { status: 201 });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Tambah pengadaan error:', e);
    return NextResponse.json({ error: 'Gagal menyimpan pengadaan' }, { status: 500 });
  }
}
```

`app/api/perpus/ringkasan/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { ambilRingkasan } from '@/lib/db/perpus-repo';

export async function GET() {
  try {
    const { supabase } = await requireRoom('perpus');
    return NextResponse.json({ success: true, data: await ambilRingkasan(supabase) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Ringkasan perpus error:', e);
    return NextResponse.json({ error: 'Gagal memuat ringkasan' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Jalankan tes** — Run: `npx vitest run tests/api/perpus-route.test.ts && npx tsc --noEmit` → PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/perpus tests/api/perpus-route.test.ts
git commit -m "feat(perpus): API buku, donasi, pengadaan, ringkasan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: API impor dari Google Sheets

**Files:**
- Create: `lib/perpus/sumber.ts`, `app/api/perpus/impor/route.ts`
- Test: `tests/api/perpus-impor-route.test.ts`

**Interfaces:**
- Consumes: Task 5 parser, Task 7 `simpanRencana`/`kosongkanPerpus`/`ambilRingkasan`.
- Produces: `ambilRencanaDariSheets(): Promise<RencanaImpor>`; `GET /api/perpus/impor` → `{ data: { buku, donasi, pengadaan, perluAudit, tidakCocok, sudahAda } }` (pratinjau, tanpa menulis); `POST /api/perpus/impor` body `{ ulang?: boolean }` → menulis; 409 bila katalog sudah berisi dan `ulang` tidak dikirim; `ulang: true` hanya SUPERADMIN (403 selain itu).

- [ ] **Step 1: Tes yang gagal**

`tests/api/perpus-impor-route.test.ts`:
```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = vi.hoisted(() => ({ simpanRencana: vi.fn(), kosongkanPerpus: vi.fn(), ambilRingkasan: vi.fn() }));
const ambil = vi.hoisted(() => vi.fn());
const requireRoom = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/perpus-repo', () => repo);
vi.mock('@/lib/perpus/sumber', () => ({ ambilRencanaDariSheets: () => ambil() }));
vi.mock('@/lib/auth/session', () => ({ requireRoom: (...a: unknown[]) => requireRoom(...a), authErrorResponse: () => null }));

import { GET, POST } from '@/app/api/perpus/impor/route';

const rencana = {
  buku: [{ catatanAudit: 'Belum berkode' }, { catatanAudit: null }], donasi: [{}], pengadaan: [], tidakCocok: [{ sumber: 'wakaf', judul: 'X' }],
};
const post = (body: unknown) => ({ json: async () => body }) as never;

beforeEach(() => {
  Object.values(repo).forEach(f => f.mockReset());
  ambil.mockReset().mockResolvedValue(rencana);
  requireRoom.mockReset().mockResolvedValue({ user: { id: 'u1', roles: ['PUSTAKAWAN'] }, supabase: {} });
  repo.ambilRingkasan.mockResolvedValue({ judul: 0 });
  repo.simpanRencana.mockResolvedValue({ buku: 2, donasi: 1, pengadaan: 0 });
});

describe('impor perpus', () => {
  it('GET = pratinjau tanpa menulis', async () => {
    const res = await GET();
    expect((await res.json()).data).toEqual({ buku: 2, donasi: 1, pengadaan: 0, perluAudit: 1, tidakCocok: rencana.tidakCocok, sudahAda: 0 });
    expect(repo.simpanRencana).not.toHaveBeenCalled();
  });
  it('POST saat katalog kosong → simpan', async () => {
    const res = await POST(post({}));
    expect(res.status).toBe(201);
    expect(repo.simpanRencana).toHaveBeenCalledWith({}, rencana, 'u1');
    expect(repo.kosongkanPerpus).not.toHaveBeenCalled();
  });
  it('POST saat katalog berisi tanpa ulang → 409', async () => {
    repo.ambilRingkasan.mockResolvedValue({ judul: 5 });
    expect((await POST(post({}))).status).toBe(409);
  });
  it('ulang hanya untuk SUPERADMIN', async () => {
    repo.ambilRingkasan.mockResolvedValue({ judul: 5 });
    expect((await POST(post({ ulang: true }))).status).toBe(403);
    requireRoom.mockResolvedValue({ user: { id: 'u1', roles: ['SUPERADMIN'] }, supabase: {} });
    expect((await POST(post({ ulang: true }))).status).toBe(201);
    expect(repo.kosongkanPerpus).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal** — Run: `npx vitest run tests/api/perpus-impor-route.test.ts` → FAIL.

- [ ] **Step 3: Implementasi**

`lib/perpus/sumber.ts`:
```ts
import 'server-only';
import { uraiCsv, uraiBuku, uraiInfaq, uraiPengadaan, susunRencana, type RencanaImpor } from '@/lib/perpus/impor';

/** Spreadsheet "Daftar Buku" (dibagikan "siapa pun dengan tautan"); gid = id tab. */
const SPREADSHEET = '1q4vDyNGHBKq8ZwU4s4-SxZrWToMPL7sB26Jwk9HQe5U';
const GID = { buku: '1647509154', infaq: '1492384701', pengadaan: '1507527752' } as const;

async function ambilCsv(gid: string): Promise<string[][]> {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET}/export?format=csv&gid=${gid}`, {
    cache: 'no-store', signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Google Sheets HTTP ${res.status} (gid ${gid}) — pastikan berbagi "siapa pun dengan tautan"`);
  return uraiCsv(await res.text());
}

export async function ambilRencanaDariSheets(): Promise<RencanaImpor> {
  const [buku, infaq, pengadaan] = await Promise.all([ambilCsv(GID.buku), ambilCsv(GID.infaq), ambilCsv(GID.pengadaan)]);
  return susunRencana({ buku: uraiBuku(buku), infaq: uraiInfaq(infaq), pengadaan: uraiPengadaan(pengadaan) });
}
```

`app/api/perpus/impor/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { ambilRingkasan, kosongkanPerpus, simpanRencana } from '@/lib/db/perpus-repo';
import { ambilRencanaDariSheets } from '@/lib/perpus/sumber';

export const maxDuration = 60;

/** Pratinjau impor: hitungan & judul yang tidak tertaut, tanpa menulis apa pun. */
export async function GET() {
  try {
    const { supabase } = await requireRoom('perpus');
    const [r, ringkas] = await Promise.all([ambilRencanaDariSheets(), ambilRingkasan(supabase)]);
    return NextResponse.json({ success: true, data: {
      buku: r.buku.length, donasi: r.donasi.length, pengadaan: r.pengadaan.length,
      perluAudit: r.buku.filter(b => b.catatanAudit).length, tidakCocok: r.tidakCocok, sudahAda: ringkas.judul,
    } });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Pratinjau impor perpus error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Gagal membaca Google Sheets' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireRoom('perpus');
    const ulang = (await req.json().catch(() => ({})))?.ulang === true;
    const { judul } = await ambilRingkasan(supabase);
    if (judul > 0 && !ulang) {
      return NextResponse.json({ error: 'Katalog sudah berisi. Impor ulang akan menghapus data perpus yang ada.' }, { status: 409 });
    }
    if (ulang && judul > 0) {
      if (!user.roles.includes('SUPERADMIN')) {
        return NextResponse.json({ error: 'Impor ulang hanya untuk Superadmin' }, { status: 403 });
      }
      await kosongkanPerpus(supabase);
    }
    const r = await ambilRencanaDariSheets();
    return NextResponse.json({ success: true, data: await simpanRencana(supabase, r, user.id) }, { status: 201 });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Impor perpus error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Gagal mengimpor' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Jalankan tes** — Run: `npx vitest run tests/api/perpus-impor-route.test.ts && npx tsc --noEmit` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/perpus/sumber.ts app/api/perpus/impor tests/api/perpus-impor-route.test.ts
git commit -m "feat(perpus): impor katalog/donasi/pengadaan dari Google Sheets (pratinjau + simpan)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: AI klasifikasi buku (Gemini lewat `lib/ai`)

**Files:**
- Modify: `lib/ai/pemakaian.ts:6`, `lib/ai/baca.ts`, `lib/ai/penyedia/gemini.ts`, `lib/ai/penyedia/openai.ts`, `components/ai/HalamanAi.tsx:163`
- Create: `lib/perpus/klasifikasi.ts`, `app/api/perpus/klasifikasi/route.ts`
- Test: `tests/ai/baca.test.ts`, `tests/ai/penyedia.test.ts`, `tests/perpus/klasifikasi.test.ts`

**Interfaces:**
- Consumes: `bacaDokumenAi`, `PilihanModel`, `AiBatasError` (`lib/ai/batas.ts`); `KELAS_DDC`, `kelasSah` (Task 3); `klasifikasiSchema` (Task 7).
- Produces: `FiturAi` termasuk `'klasifikasi_buku'`; `bacaDokumenAi({ prompt, berkas: BerkasAi | null, konteks, batasTotalMs?, modelPaksa?: PilihanModel })`; `panggilGemini/panggilOpenai(model, prompt, berkas: BerkasAi | null, batasMs)`; `type UsulanKelas = { kelasDdc: string; alasan: string; yakin: number }`; `MODEL_KLASIFIKASI`; `promptKlasifikasi(buku)`, `uraiJawaban(teks, jumlah): (UsulanKelas | null)[]`, `usulkanKelas(buku, penggunaId): Promise<(UsulanKelas | null)[]>`; `POST /api/perpus/klasifikasi` body `{ buku: {judul, penulis}[] }` (1–10) → `{ data: (UsulanKelas | null)[] }`; batas AI habis → 429.

- [ ] **Step 1: Tes yang gagal**

Tambahkan di `tests/ai/baca.test.ts` (dalam `describe('bacaDokumenAi')`):
```ts
  it('modelPaksa: hanya model itu, tanpa cadangan; berkas boleh null', async () => {
    panggil.gemini.mockResolvedValue({ teks: '{"hasil":[]}', tokenMasuk: 3, tokenKeluar: 2 });
    const h = await bacaDokumenAi({
      prompt: 'JSON', berkas: null, konteks: { fitur: 'klasifikasi_buku', penggunaId: 'u1' },
      modelPaksa: { penyedia: 'gemini', model: 'gemini-flash-lite-latest' },
    });
    expect(h).toEqual({ teks: '{"hasil":[]}', penyedia: 'gemini', model: 'gemini-flash-lite-latest' });
    expect(panggil.openai).not.toHaveBeenCalled();
    expect(panggil.gemini.mock.calls[0][2]).toBeNull();
    expect(catatan[0]).toMatchObject({ fitur: 'klasifikasi_buku', peran: 'utama', berhasil: true });
  });
  it('modelPaksa gagal → tidak mencoba cadangan', async () => {
    panggil.gemini.mockRejectedValue(new Error('Gemini HTTP 503'));
    await expect(bacaDokumenAi({
      prompt: 'JSON', berkas: null, konteks: { fitur: 'klasifikasi_buku', penggunaId: null },
      modelPaksa: { penyedia: 'gemini', model: 'gemini-flash-lite-latest' },
    })).rejects.toThrow(/503/);
    expect(panggil.openai).not.toHaveBeenCalled();
  });
```

Tambahkan di `tests/ai/penyedia.test.ts`:
```ts
describe('tanpa berkas', () => {
  it('Gemini hanya mengirim teks', async () => {
    const f = jawab({ candidates: [{ content: { parts: [{ text: '{}' }] } }], usageMetadata: {} });
    vi.stubGlobal('fetch', f);
    await panggilGemini('gemini-flash-lite-latest', 'klasifikasi JSON', null, 10_000);
    const body = JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.contents[0].parts).toEqual([{ text: 'klasifikasi JSON' }]);
  });
  it('OpenAI hanya mengirim input_text', async () => {
    const f = jawab({ output_text: '{}', usage: {} });
    vi.stubGlobal('fetch', f);
    await panggilOpenai('gpt-5.4-mini', 'klasifikasi JSON', null, 10_000);
    const body = JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.input[0].content).toEqual([{ type: 'input_text', text: 'klasifikasi JSON' }]);
  });
});
```

`tests/perpus/klasifikasi.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const baca = vi.hoisted(() => vi.fn());
vi.mock('@/lib/ai/baca', () => ({ bacaDokumenAi: (...a: unknown[]) => baca(...a) }));

import { promptKlasifikasi, uraiJawaban, usulkanKelas, MODEL_KLASIFIKASI } from '@/lib/perpus/klasifikasi';

describe('klasifikasi buku', () => {
  it('prompt memuat daftar kelas & buku bernomor', () => {
    const p = promptKlasifikasi([{ judul: 'Laskar Pelangi', penulis: 'Andrea Hirata' }]);
    expect(p).toContain('899.221');
    expect(p).toContain('0. "Laskar Pelangi" — Andrea Hirata');
    expect(p).toContain('JSON');
  });
  it('jawaban: kelas tak terdaftar & indeks hilang → null; yakin dibatasi', () => {
    const teks = JSON.stringify({ hasil: [
      { i: 0, kelasDdc: '899.221', alasan: 'Novel Indonesia', yakin: 0.95 },
      { i: 1, kelasDdc: '899.2', alasan: 'x', yakin: 0.4 },
      { i: 3, kelasDdc: '332', alasan: 'keuangan', yakin: 7 },
    ] });
    expect(uraiJawaban(teks, 3)).toEqual([{ kelasDdc: '899.221', alasan: 'Novel Indonesia', yakin: 0.95 }, null, null]);
    expect(uraiJawaban('bukan json', 2)).toEqual([null, null]);
  });
  it('usulkanKelas memaksa model Gemini & fitur klasifikasi_buku', async () => {
    baca.mockResolvedValue({ teks: '{"hasil":[{"i":0,"kelasDdc":"332","alasan":"Keuangan pribadi","yakin":0.9}]}' });
    const h = await usulkanKelas([{ judul: 'Rich Dad Poor Dad', penulis: 'Robert Kiyosaki' }], 'u1');
    expect(h).toEqual([{ kelasDdc: '332', alasan: 'Keuangan pribadi', yakin: 0.9 }]);
    expect(baca.mock.calls[0][0]).toMatchObject({
      berkas: null, modelPaksa: MODEL_KLASIFIKASI, konteks: { fitur: 'klasifikasi_buku', penggunaId: 'u1' },
    });
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal** — Run: `npx vitest run tests/ai tests/perpus/klasifikasi.test.ts` → FAIL.

- [ ] **Step 3: Implementasi**

`lib/ai/pemakaian.ts:6`:
```ts
export type FiturAi = 'ocr_tunggal' | 'ocr_massal' | 'ocr_mandiri' | 'klasifikasi_buku';
```

`lib/ai/penyedia/gemini.ts` — ubah tanda tangan & `parts`:
```ts
export async function panggilGemini(model: string, prompt: string, berkas: BerkasAi | null, batasMs: number): Promise<HasilPanggil> {
  // …
      contents: [{ parts: [{ text: prompt }, ...(berkas ? [{ inlineData: { mimeType: berkas.mimeType, data: berkas.base64 } }] : [])] }],
```

`lib/ai/penyedia/openai.ts` — ubah tanda tangan, `lampiran`, dan `content`:
```ts
export async function panggilOpenai(model: string, prompt: string, berkas: BerkasAi | null, batasMs: number): Promise<HasilPanggil> {
  // …
  const lampiran = !berkas ? null : berkas.mimeType === 'application/pdf'
    ? { type: 'input_file', filename: 'berkas.pdf', file_data: `data:${berkas.mimeType};base64,${berkas.base64}` }
    : { type: 'input_image', image_url: `data:${berkas.mimeType};base64,${berkas.base64}`, detail: 'high' };
  // …
      input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }, ...(lampiran ? [lampiran] : [])] }],
```
(hapus variabel `dataUrl` lama yang kini tak terpakai).

`lib/ai/baca.ts`:
```ts
const PANGGIL: Record<Penyedia, (model: string, prompt: string, berkas: BerkasAi | null, batasMs: number) => Promise<HasilPanggil>> = {
// …
/**
 * Satu panggilan AI: cek batas → penyedia utama → cadangan (bila ada & sisa waktu cukup).
 * `modelPaksa` (mis. klasifikasi buku = Gemini) melewati setelan utama/cadangan. `berkas` null = teks saja.
 * Setiap percobaan dicatat ke pemakaian_ai dengan idPermintaan yang sama.
 */
export async function bacaDokumenAi({ prompt, berkas, konteks, batasTotalMs = BATAS_PER_PANGGILAN_MS, modelPaksa }: {
  prompt: string; berkas: BerkasAi | null; konteks: KonteksAi; batasTotalMs?: number; modelPaksa?: PilihanModel;
}): Promise<{ teks: string; penyedia: Penyedia; model: string }> {
  // … (cek batas tetap)
  const urutan: [PilihanModel, 'utama' | 'cadangan'][] = [[modelPaksa ?? setelan.utama, 'utama']];
  if (setelan.cadangan && !modelPaksa) urutan.push([setelan.cadangan, 'cadangan']);
```

`components/ai/HalamanAi.tsx:163` — label baris tanpa pengguna:
```tsx
{x.namaPengguna ?? (x.fitur === 'ocr_mandiri' ? 'Unggah mandiri wali' : x.fitur === 'klasifikasi_buku' ? 'Klasifikasi buku' : '—')}
```

`lib/perpus/klasifikasi.ts`:
```ts
import 'server-only';
import { z } from 'zod';
import { bacaDokumenAi } from '@/lib/ai/baca';
import type { PilihanModel } from '@/lib/ai/model';
import { KELAS_DDC, kelasSah } from '@/lib/perpus/ddc';

/** Permintaan pengguna: klasifikasi buku memakai Gemini, terlepas dari setelan OCR utama. */
export const MODEL_KLASIFIKASI: PilihanModel = { penyedia: 'gemini', model: 'gemini-flash-lite-latest' };

export type UsulanKelas = { kelasDdc: string; alasan: string; yakin: number };

export function promptKlasifikasi(buku: { judul: string; penulis: string }[]): string {
  const kelas = KELAS_DDC.map(k => `${k.kode} — ${k.id}`).join('\n');
  const daftar = buku.map((b, i) => `${i}. "${b.judul}" — ${b.penulis || 'penulis tidak diketahui'}`).join('\n');
  return [
    'Anda pustakawan yang mengklasifikasi buku perpustakaan pesantren dengan Dewey Decimal Classification (DDC) baku.',
    'Pilih SATU kode paling tepat untuk setiap buku, HANYA dari daftar berikut:',
    kelas,
    'Aturan: novel/cerpen karya penulis Indonesia → 899.221; fiksi terjemahan → kelas sastra bahasa aslinya (Inggris 823, Amerika 813, Portugis 869, Jepang 895.6, Norwegia 839.82);',
    'buku Islam pilih subkelas 297.x bila jelas (fikih 297.4, akhlak/tasawuf 297.5, sejarah/tokoh 297.9, Al-Qur\'an/hadis 297.1);',
    'komik edukasi ikut topiknya; motivasi/self-help → 158; keuangan pribadi → 332.',
    'Buku:',
    daftar,
    'Jawab JSON saja: {"hasil":[{"i":<nomor buku>,"kelasDdc":"<kode>","alasan":"<maks 12 kata, bahasa Indonesia>","yakin":<0..1>}]}',
  ].join('\n');
}

const jawabanSchema = z.object({
  hasil: z.array(z.object({
    i: z.number().int(), kelasDdc: z.string(), alasan: z.string().default(''), yakin: z.number().catch(0.5),
  })),
});

/** Urai jawaban AI menjadi array sejajar input; kelas di luar daftar / indeks hilang → null. */
export function uraiJawaban(teks: string, jumlah: number): (UsulanKelas | null)[] {
  const hasil: (UsulanKelas | null)[] = Array(jumlah).fill(null);
  let json: unknown;
  try { json = JSON.parse(teks); } catch { return hasil; }
  const parsed = jawabanSchema.safeParse(json);
  if (!parsed.success) return hasil;
  for (const h of parsed.data.hasil) {
    if (h.i < 0 || h.i >= jumlah || !kelasSah(h.kelasDdc)) continue;
    hasil[h.i] = { kelasDdc: h.kelasDdc, alasan: h.alasan.slice(0, 160), yakin: Math.min(1, Math.max(0, h.yakin)) };
  }
  return hasil;
}

export async function usulkanKelas(buku: { judul: string; penulis: string }[], penggunaId: string): Promise<(UsulanKelas | null)[]> {
  const { teks } = await bacaDokumenAi({
    prompt: promptKlasifikasi(buku), berkas: null, modelPaksa: MODEL_KLASIFIKASI,
    konteks: { fitur: 'klasifikasi_buku', penggunaId },
  });
  return uraiJawaban(teks, buku.length);
}
```

`app/api/perpus/klasifikasi/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { klasifikasiSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';
import { usulkanKelas } from '@/lib/perpus/klasifikasi';
import { AiBatasError } from '@/lib/ai/batas';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireRoom('perpus');
    const parsed = klasifikasiSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await usulkanKelas(parsed.data.buku, user.id) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    if (e instanceof AiBatasError) return NextResponse.json({ error: e.message }, { status: 429 });
    console.error('Klasifikasi buku error:', e);
    return NextResponse.json({ error: 'AI gagal mengusulkan kelas. Pilih kelas secara manual.' }, { status: 502 });
  }
}
```

- [ ] **Step 4: Jalankan tes** — Run: `npx vitest run tests/ai tests/perpus && npx tsc --noEmit` → PASS (tes OCR lama tetap lolos karena berkas tetap dikirim).

- [ ] **Step 5: Commit**

```bash
git add lib/ai components/ai/HalamanAi.tsx lib/perpus/klasifikasi.ts app/api/perpus/klasifikasi tests/ai tests/perpus/klasifikasi.test.ts
git commit -m "feat(perpus): usulan kelas DDC oleh Gemini (AI tanpa berkas + model paksa)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: API audit & label

**Files:**
- Create: `app/api/perpus/audit/route.ts`, `app/api/perpus/label/route.ts`
- Test: `tests/api/perpus-audit-route.test.ts`

**Interfaces:**
- Consumes: Task 7 `listBuku`, `terapkanAudit`, `auditTerapkanSchema`; Task 6 `barisLabel`, `keCsv`.
- Produces: `POST /api/perpus/audit` body `{ items: {id, kelasDdc}[] }` → `{ data: {id, nomorPanggil}[] }` (409 bila `NomorBentrokError`); `GET /api/perpus/label` → `text/csv` lampiran `label-perpus.csv` berkolom `Judul,Nomor lama,Nomor baru`. Daftar buku perlu audit memakai `GET /api/perpus/buku?status=perlu_audit` (Task 8).

- [ ] **Step 1: Tes yang gagal**

`tests/api/perpus-audit-route.test.ts`:
```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = vi.hoisted(() => ({ listBuku: vi.fn(), terapkanAudit: vi.fn() }));
const requireRoom = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/perpus-repo', () => repo);
vi.mock('@/lib/auth/session', () => ({ requireRoom: (...a: unknown[]) => requireRoom(...a), authErrorResponse: () => null }));

import { POST as TERAPKAN } from '@/app/api/perpus/audit/route';
import { GET as LABEL } from '@/app/api/perpus/label/route';

const ID = '2f9a2b4e-3c1d-4e5f-8a9b-0c1d2e3f4a5b';
beforeEach(() => {
  Object.values(repo).forEach(f => f.mockReset());
  requireRoom.mockReset().mockResolvedValue({ user: { id: 'u1' }, supabase: {} });
});

describe('audit perpus', () => {
  it('terapkan meneruskan item tervalidasi', async () => {
    repo.terapkanAudit.mockResolvedValue([{ id: ID, nomorPanggil: '899.221 LIY r' }]);
    const res = await TERAPKAN({ json: async () => ({ items: [{ id: ID, kelasDdc: '899.221' }] }) } as never);
    expect(res.status).toBe(200);
    expect(repo.terapkanAudit).toHaveBeenCalledWith({}, [{ id: ID, kelasDdc: '899.221' }]);
  });
  it('label → CSV lampiran', async () => {
    repo.listBuku.mockResolvedValue([{ judul: 'Rasa', nomorPanggil: '899.221 LIY r', nomorPanggilLama: '813 LIY R', eksemplar: 1, statusKode: 'baku' }]);
    const res = await LABEL();
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('label-perpus.csv');
    expect(await res.text()).toBe('Judul,Nomor lama,Nomor baru\r\nRasa,813 LIY R,899.221 LIY r\r\n');
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal** — Run: `npx vitest run tests/api/perpus-audit-route.test.ts` → FAIL.

- [ ] **Step 3: Implementasi**

`app/api/perpus/audit/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { terapkanAudit } from '@/lib/db/perpus-repo';
import { auditTerapkanSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';
import { NomorBentrokError } from '@/lib/perpus/nomor-panggil';

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('perpus');
    const parsed = auditTerapkanSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await terapkanAudit(supabase, parsed.data.items) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    if (e instanceof NomorBentrokError) return NextResponse.json({ error: e.message, nomor: e.nomor }, { status: 409 });
    console.error('Terapkan audit error:', e);
    return NextResponse.json({ error: 'Gagal menerapkan nomor baru' }, { status: 500 });
  }
}
```

`app/api/perpus/label/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listBuku } from '@/lib/db/perpus-repo';
import { barisLabel, keCsv } from '@/lib/perpus/audit';

/** Daftar label yang perlu dicetak (ulang), satu baris per eksemplar. */
export async function GET() {
  try {
    const { supabase } = await requireRoom('perpus');
    const baris = barisLabel(await listBuku(supabase, { statusKode: 'baku' }));
    const csv = keCsv([['Judul', 'Nomor lama', 'Nomor baru'], ...baris.map(b => [b.judul, b.lama, b.baru])]);
    return new NextResponse(csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="label-perpus.csv"' },
    });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Label perpus error:', e);
    return NextResponse.json({ error: 'Gagal menyusun label' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Jalankan tes** — Run: `npx vitest run tests/api/perpus-audit-route.test.ts && npx tsc --noEmit` → PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/perpus/audit app/api/perpus/label tests/api/perpus-audit-route.test.ts
git commit -m "feat(perpus): API terapkan audit nomor panggil & ekspor label CSV

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: UI Ruang Perpus (beranda + impor, buku, donasi, audit)

**Files:**
- Create: `components/perpus/BerandaPerpus.tsx`, `components/perpus/DaftarBuku.tsx`, `components/perpus/FormBuku.tsx`, `components/perpus/DonasiPerpus.tsx`, `components/perpus/AuditKode.tsx`, `components/perpus/format.ts`
- Modify: `app/(perpus)/perpus/page.tsx`
- Create: `app/(perpus)/perpus/buku/page.tsx`, `app/(perpus)/perpus/donasi/page.tsx`, `app/(perpus)/perpus/audit/page.tsx`

**Interfaces:**
- Consumes: semua endpoint Task 8–11; `KELAS_DDC`, `labelKelas`, `genreDari`, `LABEL_GENRE` (Task 3); `kodePengarang`, `kodeJudul`, `susunNomorPanggil` (Task 4); `LABEL_ASAL`, tipe (Task 2); komponen UI repo: `KepalaHalaman`, `Kartu`, `TombolUtama`, `PesanGalat`, `LembarBawah`, `kelasInput`, `kelasLabel`.

Komponen klien memuat data lewat `fetch` seperti `components/donatur/DaftarDonatur.tsx`. Tidak ada tes komponen; verifikasi di Task 13 lewat browser.

- [ ] **Step 1: Util format**

`components/perpus/format.ts`:
```ts
export const rupiah = (n: number) => `Rp${n.toLocaleString('id-ID')}`;
export const tanggalPendek = (iso: string | null, cadangan?: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : (cadangan || '—');
```

- [ ] **Step 2: Beranda + impor**

`components/perpus/BerandaPerpus.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CloudArrowDown, Books, ListChecks, Wallet } from '@phosphor-icons/react';
import type { RingkasanPerpus } from '@/lib/perpus/tipe';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { TombolUtama } from '@/components/ui/Tombol';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { rupiah } from './format';

type Pratinjau = { buku: number; donasi: number; pengadaan: number; perluAudit: number; tidakCocok: { sumber: string; judul: string }[]; sudahAda: number };

export function BerandaPerpus() {
  const [r, setR] = useState<RingkasanPerpus | null>(null);
  const [pratinjau, setPratinjau] = useState<Pratinjau | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const muat = async () => {
    const res = await fetch('/api/perpus/ringkasan');
    const d = await res.json();
    if (!res.ok) { setGalat(d.error || 'Gagal memuat ringkasan'); return; }
    setR(d.data);
  };
  useEffect(() => { muat(); }, []);

  const lihatPratinjau = async () => {
    setSibuk(true); setGalat(null);
    const res = await fetch('/api/perpus/impor');
    const d = await res.json();
    setSibuk(false);
    if (!res.ok) { setGalat(d.error || 'Gagal membaca Google Sheets'); return; }
    setPratinjau(d.data);
  };
  const impor = async () => {
    setSibuk(true); setGalat(null);
    const res = await fetch('/api/perpus/impor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const d = await res.json();
    setSibuk(false);
    if (!res.ok) { setGalat(d.error || 'Impor gagal'); return; }
    setPratinjau(null);
    await muat();
  };

  const ubin = (ikon: React.ReactNode, label: string, nilai: string, href?: string) => {
    const isi = (
      <Kartu className="p-4 flex items-center gap-3">
        {ikon}
        <div className="min-w-0">
          <p className="text-xs text-bq-redup">{label}</p>
          <p className="text-lg font-extrabold text-bq-tinta truncate">{nilai}</p>
        </div>
      </Kartu>
    );
    return href ? <Link href={href} className="block">{isi}</Link> : isi;
  };

  return (
    <div className="space-y-5">
      <KepalaHalaman judul="Ruang Perpus" sub="Perpustakaan Baitul Qowwam" subTampilDiHp />
      {galat && <PesanGalat pesan={galat} />}
      {r && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {ubin(<Books size={28} className="text-orange-600" aria-hidden />, 'Judul / eksemplar', `${r.judul} / ${r.eksemplar}`, '/perpus/buku')}
          {ubin(<ListChecks size={28} className="text-violet-600" aria-hidden />, 'Perlu audit kode', String(r.perluAudit), '/perpus/audit')}
          {ubin(<Wallet size={28} className="text-emerald-600" aria-hidden />, 'Infaq terkumpul', rupiah(r.totalInfaq), '/perpus/donasi')}
          {ubin(<Wallet size={28} className="text-sky-600" aria-hidden />, 'Saldo (infaq − pengadaan)', rupiah(r.saldo), '/perpus/donasi')}
        </div>
      )}
      {r && r.judul === 0 && (
        <Kartu className="p-5 space-y-3">
          <h2 className="font-extrabold text-bq-tinta">Impor dari Google Sheets</h2>
          <p className="text-sm text-bq-redup">Mengambil sheet <em>Copy of Daftar Buku</em>, <em>Infaq</em>, dan <em>Pengadaan Buku</em>. Semua buku hasil impor ditandai “perlu audit” untuk dipindah ke DDC baku.</p>
          {!pratinjau && <TombolUtama ikon={CloudArrowDown} onClick={lihatPratinjau} disabled={sibuk}>{sibuk ? 'Membaca…' : 'Lihat pratinjau'}</TombolUtama>}
          {pratinjau && (
            <div className="space-y-3 text-sm">
              <p>{pratinjau.buku} judul · {pratinjau.donasi} donasi · {pratinjau.pengadaan} pengadaan · {pratinjau.perluAudit} kode bermasalah</p>
              {pratinjau.tidakCocok.length > 0 && (
                <details>
                  <summary className="cursor-pointer font-semibold">{pratinjau.tidakCocok.length} judul wakaf/pengadaan tidak tertaut (tautkan manual nanti)</summary>
                  <ul className="mt-2 list-disc pl-5 text-bq-redup">{pratinjau.tidakCocok.map((t, i) => <li key={i}>{t.sumber}: {t.judul}</li>)}</ul>
                </details>
              )}
              <TombolUtama ikon={CloudArrowDown} onClick={impor} disabled={sibuk}>{sibuk ? 'Mengimpor…' : 'Impor sekarang'}</TombolUtama>
            </div>
          )}
        </Kartu>
      )}
    </div>
  );
}
```

`app/(perpus)/perpus/page.tsx`:
```tsx
import { BerandaPerpus } from '@/components/perpus/BerandaPerpus';

export const metadata = { title: 'Ruang Perpus — BQ-ku' };

export default function BerandaPerpusPage() {
  return <BerandaPerpus />;
}
```

- [ ] **Step 3: Daftar & form buku (dengan usulan AI)**

`components/perpus/FormBuku.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { Sparkle, FloppyDisk } from '@phosphor-icons/react';
import { KELAS_DDC } from '@/lib/perpus/ddc';
import { kodePengarang, kodeJudul, susunNomorPanggil } from '@/lib/perpus/nomor-panggil';
import type { AsalBuku, Buku, DonasiPerpus, Pengadaan } from '@/lib/perpus/tipe';
import { LABEL_ASAL } from '@/lib/perpus/tipe';
import { TombolUtama } from '@/components/ui/Tombol';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasInput, kelasLabel } from '@/components/ui/kelas';

export function FormBuku({ onSimpan }: { onSimpan: (b: Buku) => void }) {
  const [judul, setJudul] = useState('');
  const [penulis, setPenulis] = useState('');
  const [kelasDdc, setKelasDdc] = useState('');
  const [kodeManual, setKodeManual] = useState('');
  const [pakaiSeri, setPakaiSeri] = useState(false);
  const [seriKode, setSeriKode] = useState('');
  const [seriNomor, setSeriNomor] = useState(1);
  const [eksemplar, setEksemplar] = useState(1);
  const [asal, setAsal] = useState<AsalBuku>('koleksi_awal');
  const [donasiId, setDonasiId] = useState('');
  const [pengadaanId, setPengadaanId] = useState('');
  const [donasi, setDonasi] = useState<DonasiPerpus[]>([]);
  const [pengadaan, setPengadaan] = useState<Pengadaan[]>([]);
  const [usulan, setUsulan] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/perpus/donasi').then(r => r.json()).then(d => setDonasi((d.data || []).filter((x: DonasiPerpus) => x.jenis === 'buku')));
    fetch('/api/perpus/pengadaan').then(r => r.json()).then(d => setPengadaan(d.data || []));
  }, []);

  const pengarang = kodeManual || kodePengarang(penulis) || 'XXX';
  const pratinjau = kelasDdc && judul
    ? susunNomorPanggil({ kelasDdc, kodePengarang: pengarang, kodeJudul: pakaiSeri ? seriKode || '?' : kodeJudul(judul), noSeri: pakaiSeri ? seriNomor : null })
    : '—';

  const usulkan = async () => {
    setSibuk(true); setGalat(null); setUsulan(null);
    const res = await fetch('/api/perpus/klasifikasi', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buku: [{ judul, penulis }] }),
    });
    const d = await res.json();
    setSibuk(false);
    if (!res.ok) { setGalat(d.error || 'AI gagal'); return; }
    const u = d.data?.[0];
    if (!u) { setGalat('AI tidak yakin; pilih kelas manual.'); return; }
    setKelasDdc(u.kelasDdc);
    setUsulan(`${u.alasan} (yakin ${Math.round(u.yakin * 100)}%)`);
  };

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSibuk(true); setGalat(null);
    const res = await fetch('/api/perpus/buku', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        judul, penulis, kelasDdc, eksemplar, asal,
        ...(kodeManual ? { kodePengarang: kodeManual } : {}),
        seri: pakaiSeri ? { kode: seriKode, nomor: seriNomor } : null,
        donasiId: asal === 'wakaf' && donasiId ? donasiId : null,
        pengadaanId: asal === 'pengadaan' && pengadaanId ? pengadaanId : null,
      }),
    });
    const d = await res.json();
    setSibuk(false);
    if (!res.ok) { setGalat(d.fields ? Object.values(d.fields).join(' · ') : d.error || 'Gagal menyimpan'); return; }
    onSimpan(d.data);
  };

  return (
    <form onSubmit={simpan} className="space-y-3">
      <label className="block space-y-1"><span className={kelasLabel}>Judul</span>
        <input className={kelasInput} value={judul} onChange={e => setJudul(e.target.value)} required /></label>
      <label className="block space-y-1"><span className={kelasLabel}>Penulis</span>
        <input className={kelasInput} value={penulis} onChange={e => setPenulis(e.target.value)} /></label>
      <div className="flex items-end gap-2">
        <label className="block flex-1 space-y-1"><span className={kelasLabel}>Kelas DDC</span>
          <select className={kelasInput} value={kelasDdc} onChange={e => setKelasDdc(e.target.value)} required>
            <option value="">Pilih kelas…</option>
            {KELAS_DDC.map(k => <option key={k.kode} value={k.kode}>{k.kode} — {k.id}</option>)}
          </select></label>
        <TombolUtama ikon={Sparkle} onClick={usulkan} disabled={sibuk || !judul} className="shrink-0">Usulkan</TombolUtama>
      </div>
      {usulan && <p className="text-xs text-bq-redup">AI: {usulan}</p>}
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1"><span className={kelasLabel}>Kode pengarang (otomatis: {kodePengarang(penulis) || '—'})</span>
          <input className={kelasInput} value={kodeManual} onChange={e => setKodeManual(e.target.value.toUpperCase())} maxLength={4} placeholder="opsional" /></label>
        <label className="block space-y-1"><span className={kelasLabel}>Eksemplar</span>
          <input type="number" min={1} max={99} className={kelasInput} value={eksemplar} onChange={e => setEksemplar(Number(e.target.value))} /></label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pakaiSeri} onChange={e => setPakaiSeri(e.target.checked)} /> Bagian dari seri</label>
      {pakaiSeri && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1"><span className={kelasLabel}>Huruf seri (mis. b untuk seri Bumi)</span>
            <input className={kelasInput} value={seriKode} onChange={e => setSeriKode(e.target.value.toLowerCase().slice(0, 1))} required /></label>
          <label className="block space-y-1"><span className={kelasLabel}>Nomor seri</span>
            <input type="number" min={1} max={99} className={kelasInput} value={seriNomor} onChange={e => setSeriNomor(Number(e.target.value))} /></label>
        </div>
      )}
      <label className="block space-y-1"><span className={kelasLabel}>Asal</span>
        <select className={kelasInput} value={asal} onChange={e => setAsal(e.target.value as AsalBuku)}>
          {(Object.keys(LABEL_ASAL) as AsalBuku[]).map(a => <option key={a} value={a}>{LABEL_ASAL[a]}</option>)}
        </select></label>
      {asal === 'wakaf' && (
        <select className={kelasInput} value={donasiId} onChange={e => setDonasiId(e.target.value)} aria-label="Donasi buku">
          <option value="">Pilih donatur wakaf…</option>
          {donasi.map(d => <option key={d.id} value={d.id}>{d.nama} · {d.jumlahBuku} buku · {d.tanggalTeks || d.tanggal || ''}</option>)}
        </select>
      )}
      {asal === 'pengadaan' && (
        <select className={kelasInput} value={pengadaanId} onChange={e => setPengadaanId(e.target.value)} aria-label="Pengadaan">
          <option value="">Pilih pembelian…</option>
          {pengadaan.map(p => <option key={p.id} value={p.id}>{p.tanggalTeks || p.tanggal} · Rp{p.total.toLocaleString('id-ID')}</option>)}
        </select>
      )}
      <p className="text-sm">Nomor panggil: <span className="font-mono font-bold">{pratinjau}</span> <span className="text-xs text-bq-redup">(bila bentrok, server menambah huruf)</span></p>
      {galat && <PesanGalat pesan={galat} />}
      <TombolUtama type="submit" ikon={FloppyDisk} disabled={sibuk} className="w-full">Simpan buku</TombolUtama>
    </form>
  );
}
```

`components/perpus/DaftarBuku.tsx`:
```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlass, Plus, EyeSlash } from '@phosphor-icons/react';
import type { Buku } from '@/lib/perpus/tipe';
import { LABEL_ASAL } from '@/lib/perpus/tipe';
import { genreDari, LABEL_GENRE } from '@/lib/perpus/ddc';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { TombolUtama } from '@/components/ui/Tombol';
import { LembarBawah } from '@/components/ui/LembarBawah';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasInput } from '@/components/ui/kelas';
import { FormBuku } from './FormBuku';

export function DaftarBuku() {
  const [q, setQ] = useState('');
  const [buku, setBuku] = useState<Buku[] | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [tambah, setTambah] = useState(false);
  const permintaan = useRef(0);

  useEffect(() => {
    const t = setTimeout(async () => {
      const id = ++permintaan.current;
      const res = await fetch(`/api/perpus/buku?q=${encodeURIComponent(q)}`);
      const d = await res.json();
      if (id !== permintaan.current) return;
      if (!res.ok) { setGalat(d.error || 'Gagal memuat buku'); return; }
      setBuku(d.data);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const nonaktifkan = async (b: Buku) => {
    if (!confirm(`Sembunyikan "${b.judul}" dari katalog?`)) return;
    const res = await fetch(`/api/perpus/buku/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aktif: false }) });
    if (res.ok) setBuku(prev => prev?.map(x => (x.id === b.id ? { ...x, aktif: false } : x)) ?? null);
  };

  return (
    <div className="space-y-4">
      <KepalaHalaman judul="Buku" sub={buku ? `${buku.length} judul` : undefined} aksi={<TombolUtama ikon={Plus} onClick={() => setTambah(true)}>Tambah</TombolUtama>} />
      <label className="relative block">
        <MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-bq-redup" aria-hidden />
        <input className={`${kelasInput} pl-11`} placeholder="Cari judul, penulis, atau nomor panggil" value={q} onChange={e => setQ(e.target.value)} />
      </label>
      {galat && <PesanGalat pesan={galat} />}
      <div className="space-y-2">
        {buku?.map(b => (
          <Kartu key={b.id} className={`p-3 flex items-center gap-3 ${b.aktif ? '' : 'opacity-50'}`}>
            <span className="font-mono text-xs font-bold w-32 shrink-0 text-bq-tinta">{b.nomorPanggil}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-bq-tinta truncate">{b.judul}</p>
              <p className="text-xs text-bq-redup truncate">
                {b.penulis || '—'} · {LABEL_GENRE[genreDari(b.kelasDdc)].id} · {LABEL_ASAL[b.asal]}{b.eksemplar > 1 ? ` · ${b.eksemplar} eks` : ''}
                {b.statusKode === 'perlu_audit' ? ' · perlu audit' : ''}
              </p>
            </div>
            {b.aktif && <button type="button" onClick={() => nonaktifkan(b)} aria-label={`Sembunyikan ${b.judul}`} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><EyeSlash size={18} /></button>}
          </Kartu>
        ))}
      </div>
      <LembarBawah buka={tambah} onTutup={() => setTambah(false)} judul="Tambah buku">
        <FormBuku onSimpan={b => { setTambah(false); setBuku(prev => [b, ...(prev ?? [])]); }} />
      </LembarBawah>
    </div>
  );
}
```

`app/(perpus)/perpus/buku/page.tsx`:
```tsx
import { DaftarBuku } from '@/components/perpus/DaftarBuku';

export const metadata = { title: 'Buku — Ruang Perpus' };

export default function BukuPerpusPage() {
  return <DaftarBuku />;
}
```

- [ ] **Step 4: Donasi & pengadaan**

`components/perpus/DonasiPerpus.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import type { DonasiPerpus as Donasi, Pengadaan } from '@/lib/perpus/tipe';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { TombolUtama } from '@/components/ui/Tombol';
import { LembarBawah } from '@/components/ui/LembarBawah';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasInput, kelasLabel } from '@/components/ui/kelas';
import { rupiah, tanggalPendek } from './format';

export function DonasiPerpus() {
  const [donasi, setDonasi] = useState<Donasi[]>([]);
  const [pengadaan, setPengadaan] = useState<Pengadaan[]>([]);
  const [form, setForm] = useState<'donasi' | 'pengadaan' | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [isi, setIsi] = useState({ nama: '', jenis: 'uang', tanggal: '', angka: '', toko: '', catatan: '' });

  useEffect(() => {
    fetch('/api/perpus/donasi').then(r => r.json()).then(d => setDonasi(d.data || []));
    fetch('/api/perpus/pengadaan').then(r => r.json()).then(d => setPengadaan(d.data || []));
  }, []);

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault(); setGalat(null);
    const angka = Number(isi.angka.replace(/\D/g, ''));
    const body = form === 'donasi'
      ? { nama: isi.nama, jenis: isi.jenis, tanggal: isi.tanggal || null, catatan: isi.catatan, ...(isi.jenis === 'uang' ? { jumlah: angka } : { jumlahBuku: angka }) }
      : { toko: isi.toko, tanggal: isi.tanggal || null, total: angka, catatan: isi.catatan };
    const res = await fetch(`/api/perpus/${form}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json();
    if (!res.ok) { setGalat(d.fields ? Object.values(d.fields).join(' · ') : d.error || 'Gagal menyimpan'); return; }
    if (form === 'donasi') setDonasi(p => [d.data, ...p]); else setPengadaan(p => [d.data, ...p]);
    setForm(null); setIsi({ nama: '', jenis: 'uang', tanggal: '', angka: '', toko: '', catatan: '' });
  };

  return (
    <div className="space-y-5">
      <KepalaHalaman judul="Donasi & pengadaan" aksi={<>
        <TombolUtama ikon={Plus} onClick={() => setForm('donasi')}>Donasi</TombolUtama>
        <TombolUtama ikon={Plus} onClick={() => setForm('pengadaan')}>Pengadaan</TombolUtama>
      </>} />
      <section className="space-y-2">
        <h2 className="font-extrabold text-bq-tinta">Infaq & wakaf buku</h2>
        {donasi.map(d => (
          <Kartu key={d.id} className="p-3 flex justify-between gap-3 text-sm">
            <span className="min-w-0 truncate"><b>{d.nama}</b> · {tanggalPendek(d.tanggal, d.tanggalTeks)}</span>
            <span className="shrink-0 font-bold">{d.jenis === 'uang' ? rupiah(d.jumlah ?? 0) : `${d.jumlahBuku} buku`}</span>
          </Kartu>
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="font-extrabold text-bq-tinta">Pengadaan buku</h2>
        {pengadaan.map(p => (
          <Kartu key={p.id} className="p-3 flex justify-between gap-3 text-sm">
            <span>{tanggalPendek(p.tanggal, p.tanggalTeks)}{p.toko ? ` · ${p.toko}` : ''}</span>
            <span className="font-bold">{rupiah(p.total)}</span>
          </Kartu>
        ))}
      </section>
      <LembarBawah buka={form !== null} onTutup={() => setForm(null)} judul={form === 'pengadaan' ? 'Catat pengadaan' : 'Catat donasi'}>
        <form onSubmit={simpan} className="space-y-3">
          {form === 'donasi' ? (<>
            <label className="block space-y-1"><span className={kelasLabel}>Nama donatur</span>
              <input className={kelasInput} value={isi.nama} onChange={e => setIsi({ ...isi, nama: e.target.value })} required /></label>
            <label className="block space-y-1"><span className={kelasLabel}>Jenis</span>
              <select className={kelasInput} value={isi.jenis} onChange={e => setIsi({ ...isi, jenis: e.target.value })}>
                <option value="uang">Infaq uang</option><option value="buku">Wakaf buku</option>
              </select></label>
          </>) : (
            <label className="block space-y-1"><span className={kelasLabel}>Toko / olshop</span>
              <input className={kelasInput} value={isi.toko} onChange={e => setIsi({ ...isi, toko: e.target.value })} /></label>
          )}
          <label className="block space-y-1"><span className={kelasLabel}>Tanggal</span>
            <input type="date" className={kelasInput} value={isi.tanggal} onChange={e => setIsi({ ...isi, tanggal: e.target.value })} /></label>
          <label className="block space-y-1">
            <span className={kelasLabel}>{form === 'donasi' && isi.jenis === 'buku' ? 'Jumlah buku' : 'Nominal (Rp)'}</span>
            <input inputMode="numeric" className={kelasInput} value={isi.angka} onChange={e => setIsi({ ...isi, angka: e.target.value })} required /></label>
          <label className="block space-y-1"><span className={kelasLabel}>Catatan</span>
            <input className={kelasInput} value={isi.catatan} onChange={e => setIsi({ ...isi, catatan: e.target.value })} /></label>
          {galat && <PesanGalat pesan={galat} />}
          <TombolUtama type="submit" className="w-full">Simpan</TombolUtama>
        </form>
      </LembarBawah>
    </div>
  );
}
```

`app/(perpus)/perpus/donasi/page.tsx`:
```tsx
import { DonasiPerpus } from '@/components/perpus/DonasiPerpus';

export const metadata = { title: 'Donasi — Ruang Perpus' };

export default function DonasiPerpusPage() {
  return <DonasiPerpus />;
}
```

- [ ] **Step 5: Audit kode**

`components/perpus/AuditKode.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { Sparkle, CheckCircle, DownloadSimple } from '@phosphor-icons/react';
import type { Buku } from '@/lib/perpus/tipe';
import { KELAS_DDC } from '@/lib/perpus/ddc';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { TombolUtama, kelasTombolUtama } from '@/components/ui/Tombol';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasInput } from '@/components/ui/kelas';

type Usulan = { kelasDdc: string; alasan: string; yakin: number };
const UKURAN_BATCH = 10;

export function AuditKode() {
  const [buku, setBuku] = useState<Buku[]>([]);
  const [pilihan, setPilihan] = useState<Record<string, string>>({});
  const [usulan, setUsulan] = useState<Record<string, Usulan>>({});
  const [centang, setCentang] = useState<Set<string>>(new Set());
  const [progres, setProgres] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  const muat = async () => {
    const res = await fetch('/api/perpus/buku?status=perlu_audit');
    const d = await res.json();
    if (!res.ok) { setGalat(d.error || 'Gagal memuat'); return; }
    setBuku(d.data);
  };
  useEffect(() => { muat(); }, []);

  const usulkanSemua = async () => {
    setGalat(null);
    for (let i = 0; i < buku.length; i += UKURAN_BATCH) {
      const batch = buku.slice(i, i + UKURAN_BATCH);
      setProgres(`AI ${Math.min(i + UKURAN_BATCH, buku.length)}/${buku.length}…`);
      const res = await fetch('/api/perpus/klasifikasi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buku: batch.map(b => ({ judul: b.judul, penulis: b.penulis })) }),
      });
      const d = await res.json();
      if (!res.ok) { setGalat(d.error || 'AI gagal'); break; }
      const baru: Record<string, Usulan> = {};
      batch.forEach((b, j) => { if (d.data[j]) baru[b.id] = d.data[j]; });
      setUsulan(p => ({ ...p, ...baru }));
      setPilihan(p => ({ ...Object.fromEntries(Object.entries(baru).map(([id, u]) => [id, u.kelasDdc])), ...p }));
      setCentang(p => new Set([...p, ...Object.entries(baru).filter(([, u]) => u.yakin >= 0.8).map(([id]) => id)]));
    }
    setProgres(null);
  };

  const terapkan = async () => {
    const items = [...centang].filter(id => pilihan[id]).map(id => ({ id, kelasDdc: pilihan[id] }));
    if (!items.length) return;
    setProgres(`Menerapkan ${items.length} nomor…`); setGalat(null);
    const res = await fetch('/api/perpus/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
    const d = await res.json();
    setProgres(null);
    if (!res.ok) { setGalat(d.error || 'Gagal menerapkan'); return; }
    setCentang(new Set());
    await muat();
  };

  const ubahCentang = (id: string, v: boolean) => setCentang(p => { const s = new Set(p); if (v) s.add(id); else s.delete(id); return s; });

  return (
    <div className="space-y-4">
      <KepalaHalaman judul="Audit kode" sub={`${buku.length} buku perlu dipindah ke DDC baku`} subTampilDiHp
        aksi={/* <a> biasa: next/link akan mem-prefetch rute API CSV */
          <a href="/api/perpus/label" download className={kelasTombolUtama}><DownloadSimple size={18} weight="bold" aria-hidden /> Label CSV</a>} />
      <div className="flex flex-wrap gap-2">
        <TombolUtama ikon={Sparkle} onClick={usulkanSemua} disabled={!!progres || !buku.length}>Usulkan semua (AI)</TombolUtama>
        <TombolUtama ikon={CheckCircle} onClick={terapkan} disabled={!!progres || !centang.size}>Terapkan {centang.size} terpilih</TombolUtama>
        {progres && <span className="self-center text-sm text-bq-redup">{progres}</span>}
      </div>
      <p className="text-xs text-bq-redup">Usulan dengan keyakinan ≥ 80% otomatis dicentang. Periksa sisanya satu per satu.</p>
      {galat && <PesanGalat pesan={galat} />}
      <div className="space-y-2">
        {buku.map(b => (
          <Kartu key={b.id} className="p-3 space-y-2">
            <div className="flex items-start gap-3">
              <input type="checkbox" className="mt-1" checked={centang.has(b.id)} onChange={e => ubahCentang(b.id, e.target.checked)} aria-label={`Pilih ${b.judul}`} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-bq-tinta">{b.judul}</p>
                <p className="text-xs text-bq-redup">{b.penulis || '—'} · lama: <span className="font-mono">{b.nomorPanggilLama || '—'}</span>{b.catatanAudit ? ` · ${b.catatanAudit}` : ''}</p>
                {usulan[b.id] && <p className="text-xs text-bq-redup">AI: {usulan[b.id].alasan} ({Math.round(usulan[b.id].yakin * 100)}%)</p>}
              </div>
            </div>
            <select className={kelasInput} value={pilihan[b.id] ?? ''} aria-label={`Kelas ${b.judul}`}
              onChange={e => { setPilihan(p => ({ ...p, [b.id]: e.target.value })); ubahCentang(b.id, !!e.target.value); }}>
              <option value="">Pilih kelas…</option>
              {KELAS_DDC.map(k => <option key={k.kode} value={k.kode}>{k.kode} — {k.id}</option>)}
            </select>
          </Kartu>
        ))}
      </div>
    </div>
  );
}
```

`app/(perpus)/perpus/audit/page.tsx`:
```tsx
import { AuditKode } from '@/components/perpus/AuditKode';

export const metadata = { title: 'Audit kode — Ruang Perpus' };

export default function AuditPerpusPage() {
  return <AuditKode />;
}
```

- [ ] **Step 6: Cek tipe & lint** — Run: `npx tsc --noEmit && npm run lint` → bersih.

- [ ] **Step 7: Commit**

```bash
git add components/perpus "app/(perpus)"
git commit -m "feat(perpus): UI Ruang Perpus — beranda & impor, buku (usulan AI), donasi, audit kode

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Verifikasi menyeluruh, impor nyata, deploy

**Files:** tidak ada file baru (perbaikan bila ditemukan masalah).

- [ ] **Step 1: Seluruh tes & build**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: semua PASS; build sukses.

- [ ] **Step 2: Siapkan akun**

Di Ruang Santri → Pengguna (SUPERADMIN): tambahkan peran `Pustakawan` ke akun pustakawan (atau pakai akun SUPERADMIN untuk uji).

- [ ] **Step 3: Uji di browser (dev server)**

Jalankan dev server lewat `.claude/launch.json` (buat entri `npm run dev` port 3000 bila belum ada) dan login dengan akun SUPERADMIN/PUSTAKAWAN. Periksa:
1. Akun → "Pindah ke Ruang Perpus" muncul; rail/bottom nav menampilkan Beranda, Buku, Donasi, Audit.
2. Beranda → **Lihat pratinjau**: 232 judul · 29 donasi · 4 pengadaan · 7 kode bermasalah; daftar tidak tertaut berisi ±10 judul (Negeri Lima Menara, Buid Successful Habbits 2/3, Munajat/Tasawuf/Bumi Cinta, Baitul Maqdis 1–3, Islam Rahmatan Lil Alamin (juga tercatat wakaf)).
3. **Impor sekarang** → ringkasan: 232 judul / 234 eksemplar, infaq Rp1.384.000, saldo Rp88.709, perlu audit 232.
4. Buku → cari "liye" → ±54 baris; tambah buku uji "Laskar Pelangi Uji" / "Andrea Hirata" → **Usulkan** memilih `899.221`; simpan → nomor `899.221 HIR l…` tanpa bentrok; sembunyikan buku uji.
5. Audit → **Usulkan semua (AI)** berjalan per 10 buku tanpa galat; terapkan 5 baris → hilang dari daftar; **Label CSV** terunduh berisi 5+ baris lama → baru.
6. Halaman AI (Ruang Santri → AI) mencatat baris "Klasifikasi buku".
7. Akun tanpa peran perpus (mis. ADMIN_DONATUR) membuka `/perpus` → diarahkan keluar; `GET /api/perpus/buku` → 403.

Ambil screenshot beranda & audit sebagai bukti.

- [ ] **Step 4: Deploy**

```bash
git push
npx vercel --prod
npx vercel ls
```
Expected: deployment produksi terbaru berstatus Ready. Ulangi langkah 3.1–3.3 singkat di produksi (impor nyata dilakukan sekali di produksi).

- [ ] **Step 5: Commit perbaikan (bila ada)**

```bash
git add -A
git commit -m "fix(perpus): perbaikan hasil verifikasi tahap 1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
