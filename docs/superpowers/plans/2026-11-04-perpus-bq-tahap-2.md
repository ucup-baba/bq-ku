# Perpus BQ — Tahap 2 (Situs Publik) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Situs publik Perpus BQ tanpa login di domain sendiri, dwibahasa `/id` dan `/en`: beranda, katalog, detail buku, dan donatur, ditambah sisa Tahap 1 (upload sampul, label PDF, label aksesibel form).

**Architecture:** `proxy.ts` mengenali host dari `PERPUS_HOST` dan me-rewrite `/<lang>/…` ke folder fisik `app/perpusbq/[lang]`, yang punya **root layout sendiri**; halaman bq-ku pindah ke route group `app/(bqku)` tanpa perubahan URL. Halaman publik adalah Server Component yang membaca tiga view Postgres lewat klien Supabase `anon` tanpa cookie (ISR 5 menit), sehingga kolom `jumlah` tidak pernah keluar dari database. Saringan katalog, resolver host, dan i18n adalah modul murni di `lib/perpus/*` yang diuji vitest.

**Tech Stack:** Next.js 16 (App Router, `proxy.ts`), React 19, Supabase (Postgres view, Storage), Tailwind 3, pdf-lib, sharp, `@phosphor-icons/react`, vitest.

**Spec:** `docs/superpowers/specs/2026-11-03-perpus-bq-design.md` §6 (Publik), §7, §8. Token tema: `docs/research/perpus-tema/TOKENS.md`. Anggota, login, dan peminjaman = rencana Tahap 3.

## Keputusan yang Perlu Ditinjau Pengguna

Rencana ini ditulis tanpa jawaban pengguna atas poin 1–3; masing-masing memakai opsi yang direkomendasikan. Ubah sebelum eksekusi bila tidak setuju.

1. **Dua root layout (dampak terbesar, Task 1).** `app/layout.tsx` memasang `PendingGate`, `<html lang="id">` tetap, CSS/PWA bq-ku, dan query `profiles` di setiap halaman. Bila perpus menumpang layout itu, setiap akun Google yang belum terdaftar di bq-ku (calon peminjam Tahap 3) terhalang layar "Akun belum diaktifkan", dan `/en` tetap ber-`lang="id"`. Rencana: pindahkan halaman bq-ku ke `app/(bqku)/` (`git mv`, URL tidak berubah). Alternatif yang ditolak: satu root layout yang sadar host (diff kecil, tetapi root layout bercabang dan tetap meng-query profil setiap pengunjung perpus).
2. **Bucket sampul publik baru `perpus-sampul`** (menyimpang dari §3 yang memakai bucket `berkas` prefix `perpus/sampul/`). Kode bq-ku mengakses `berkas` lewat signed URL yang kedaluwarsa, sehingga tidak cocok dengan halaman ber-cache. Sampul buku tidak sensitif.
3. **Tema terang saja di Tahap 2.** Token gelap sudah tercatat di `TOKENS.md` bila nanti diinginkan.
4. **Nilai domain `PERPUS_HOST`** ditentukan pengguna di Task 10 (§7).

## Global Constraints

- Baca panduan Next di `node_modules/next/dist/docs/` sebelum menulis kode Next (lihat `AGENTS.md`).
- Nama kolom memakai **camelCase berkutip** (`"kelasDdc"`, `"createdAt"`). Nama tabel/view tetap `perpus_*`.
- Migrasi dijalankan **manual oleh pengguna** di SQL Editor Supabase; file harus aman dijalankan ulang. MCP Supabase tidak punya akses ke proyek ini.
- Nominal infaq per orang **tidak boleh** keluar dari database ke publik: halaman publik hanya membaca view, tidak pernah tabel dasar, dan tidak memakai service role.
- Judul buku & nama donatur tidak diterjemahkan; label genre DDC diterjemahkan lewat `LABEL_GENRE` dan `labelKelas` dari `lib/perpus/ddc.ts`.
- Tema: token & pola saja. **Dilarang** menyalin logo, maskot, ilustrasi, font berlisensi, atau teks Ailene. Nama "Perpus BQ" berupa wordmark teks.
- Token CSS hanya di `app/perpusbq/perpus.css` di bawah `.tema-perpus`. `tailwind.config.ts` hanya mendapat warna yang merujuk variabel.
- Komponen klien di perpus **jangan memakai `usePathname`**: halaman di-rewrite dan diprerender, sehingga hasilnya bisa membuat hydration mismatch (lihat `use-pathname.md`). Pakai `useSelectedLayoutSegment(s)`.
- Tautan di halaman publik memakai URL publik (`/id/katalog`), **bukan** `/perpusbq/id/katalog`.
- Login, anggota, pinjaman, tombol Pinjam, `/pinjamanku`, `/masuk`, `/daftar`: **bukan** tahap ini.
- Node lokal v20 (package meminta 22): jangan memakai API Node 22-only.
- `next-env.d.ts` berubah sendiri oleh `next dev`; jangan di-commit.
- Commit per task; pesan Indonesia gaya `feat(perpus): …`, diakhiri `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Push tidak auto-deploy: `npx vercel --prod` lalu `npx vercel ls`.

**Penyimpangan sadar dari spec:**
- Keputusan 1–3 di atas.
- Statistik beranda: judul, eksemplar, donatur. "Sedang dipinjam" menyusul di Tahap 3 karena tabel pinjaman belum ada; `tersedia` di view sementara = `eksemplar`, dan Tahap 3 mengganti definisi view dengan kolom yang sama.
- Genre tidak dihitung di view: pemetaan kelas → genre tinggal di `lib/perpus/ddc.ts`, jadi dihitung di aplikasi dengan `genreDari(kelasDdc)`.
- View menyembunyikan nomor sementara `TMP-…`/`AUDIT-…` (tampil "—") agar kode yang belum diaudit tidak terlihat publik.
- Host perpus menolak `/api/*` dan `/auth/*` (404) di tahap ini: logika ruangan tidak berjalan di host perpus, jadi API bq-ku tidak boleh terbuka lewat cabang itu. Tahap 3 membuka `/api/perpus-publik` dan `/auth/callback`; Redirect URL Supabase juga ditambahkan di Tahap 3.
- Katalog tanpa paginasi: 232 judul, kartu ringan, gambar `loading="lazy"`.

## File Structure

| File | Tanggung jawab |
|---|---|
| `app/(bqku)/**` | layout & halaman bq-ku (dipindah, URL sama) |
| `app/global-not-found.tsx`, `next.config.mjs` | 404 untuk rute tak dikenal (wajib bila multi root layout) |
| `lib/perpus/domain.ts` | resolver host, bahasa, keputusan rute, path pengalih bahasa |
| `proxy.ts` | cabang host perpus & blokir `/perpusbq` |
| `supabase/migrations/0014_perpus_publik.sql` | tiga view + bucket sampul |
| `supabase/tests/perpus_rls.sql` | uji manual akses `anon` |
| `lib/supabase/anon.ts` | klien anon tanpa cookie |
| `lib/db/perpus-publik-repo.ts` | query view publik |
| `lib/perpus/katalog.ts` | saringan, daftar genre/pengarang, URL katalog |
| `lib/perpus/format-publik.ts` | format rupiah & tanggal per bahasa |
| `lib/perpus/i18n/{id,en,index}.ts` | kamus & `t()` |
| `lib/perpus/meta.ts` | metadata + `hreflang` |
| `lib/perpus/sampul.ts` | nama bucket, path, URL publik sampul |
| `lib/perpus/label-pdf.ts` | PDF label A4 |
| `app/perpusbq/perpus.css` | token & kelas tema |
| `app/perpusbq/[lang]/**` | layout, not-found, ikon, halaman publik |
| `components/perpus-publik/*.tsx` | nav, pengalih bahasa, kartu & sampul buku, panel donatur |
| `app/api/perpus/buku/[id]/sampul/route.ts`, `components/perpus/UnggahSampul.tsx` | upload sampul |

---

### Task 1: Pisahkan root layout bq-ku ke `app/(bqku)`

Murni pemindahan; tidak ada perilaku yang berubah. Tes yang ada menjadi jaring pengamannya.

**Files:**
- Move: `app/layout.tsx`, `app/loading.tsx`, `app/icon.png`, `app/apple-icon.png`, `app/(santri)`, `app/(donatur)`, `app/(lembaga)`, `app/(perpus)`, `app/login`, `app/bagikan`, `app/upload-mandiri` → `app/(bqku)/`
- Tetap di `app/`: `api/`, `auth/`, `manifest.ts`, `favicon.ico` (wajib di akar), `globals.css`, `intro.css` (`tests/ui/token.test.ts` membaca `app/globals.css`)
- Modify: `app/(bqku)/layout.tsx:3-4`, `next.config.mjs`
- Create: `app/global-not-found.tsx`

**Interfaces:**
- Produces: tidak ada `app/layout.tsx`; folder di `app/` boleh punya root layout sendiri.

- [ ] **Step 1: Catat dasar tes**

Run: `npm test 2>&1 | tail -5`
Expected: semua lolos. Catat jumlahnya.

- [ ] **Step 2: Pindahkan file**

```bash
mkdir -p 'app/(bqku)'
git mv app/layout.tsx app/loading.tsx app/icon.png app/apple-icon.png 'app/(bqku)/'
git mv 'app/(santri)' 'app/(donatur)' 'app/(lembaga)' 'app/(perpus)' app/login app/bagikan app/upload-mandiri 'app/(bqku)/'
```

`icon.png` ikut pindah karena metadata berbasis file mengalahkan objek `metadata`; bila tetap di akar, ikon bq-ku tampil di situs perpus.

- [ ] **Step 3: Perbaiki impor CSS**

Di `app/(bqku)/layout.tsx`:

```tsx
import "../globals.css";
import "../intro.css";
```

- [ ] **Step 4: Aktifkan global-not-found**

Tambahkan di `nextConfig`:

```js
  experimental: { globalNotFound: true },
```

Buat `app/global-not-found.tsx`:

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '404' };

/** Dipakai kedua situs untuk rute tak dikenal, jadi teksnya netral & tanpa CSS aplikasi. */
export default function GlobalNotFound() {
  return (
    <html lang="id">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0, textAlign: 'center' }}>
        <main>
          <h1>404</h1>
          <p>Halaman tidak ditemukan · Page not found</p>
          <a href="/">Beranda · Home</a>
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verifikasi**

Run: `npm test 2>&1 | tail -5` lalu `npm run build 2>&1 | tail -30`
Expected: jumlah tes sama; build lolos dan daftar rute memuat `/`, `/login`, `/donatur`, `/lembaga`, `/perpus`, `/bagikan/[token]`, `/upload-mandiri/[token]`.

Lalu jalankan dev (preview_start) dan pastikan `/login` tampil bergaya, `/icon.png` dan `/manifest.webmanifest` 200, dan `/tidak-ada-halaman` saat login menampilkan 404.

- [ ] **Step 6: Commit**

```bash
git add app next.config.mjs
git commit -m "refactor(app): pindahkan halaman bq-ku ke route group (bqku) agar perpus bisa punya root layout sendiri"
```

---

### Task 2: Routing domain di `proxy.ts`

**Files:**
- Create: `lib/perpus/domain.ts`
- Modify: `proxy.ts:8-9`, `.env.example`, `next.config.mjs`
- Test: `tests/perpus/domain.test.ts`, `tests/auth/proxy.test.ts`

**Interfaces:**
- Produces: `BAHASA: readonly Bahasa[]`, `adaBahasa(s: string): s is Bahasa`, `hostPerpus(host: string | null, daftar?: string): boolean`, `bahasaDari(accept: string | null): Bahasa`, `ruteHostPerpus(pathname: string, accept: string | null): RutePerpus`, `pathBahasa(lang: Bahasa, segmen: string[]): string`.

- [ ] **Step 1: Tulis tes yang gagal**

`tests/perpus/domain.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { adaBahasa, bahasaDari, hostPerpus, pathBahasa, ruteHostPerpus } from '@/lib/perpus/domain';

describe('hostPerpus', () => {
  it('cocok dengan daftar dipisah koma, abaikan port & huruf besar', () => {
    expect(hostPerpus('perpus.localhost:3000', 'perpusbq.vercel.app, perpus.localhost')).toBe(true);
    expect(hostPerpus('PerpusBQ.vercel.app', 'perpusbq.vercel.app')).toBe(true);
  });
  it('host lain, host kosong, atau env kosong → false', () => {
    expect(hostPerpus('bq-ku.vercel.app', 'perpusbq.vercel.app')).toBe(false);
    expect(hostPerpus(null, 'perpusbq.vercel.app')).toBe(false);
    expect(hostPerpus('perpusbq.vercel.app', '')).toBe(false);
  });
});

describe('bahasaDari', () => {
  it('memilih bahasa didukung dengan q tertinggi', () => {
    expect(bahasaDari('en-US,en;q=0.9,id;q=0.8')).toBe('en');
    expect(bahasaDari('en;q=0.5,id;q=0.9')).toBe('id');
    expect(bahasaDari('fr,en;q=0.7')).toBe('en');
  });
  it('bawaan id', () => {
    expect(bahasaDari(null)).toBe('id');
    expect(bahasaDari('fr,de')).toBe('id');
    expect(bahasaDari('en;q=0')).toBe('id');
  });
});

describe('ruteHostPerpus', () => {
  it('/ dialihkan sesuai Accept-Language', () => {
    expect(ruteHostPerpus('/', 'en')).toEqual({ jenis: 'alihkan', ke: '/en' });
    expect(ruteHostPerpus('/', null)).toEqual({ jenis: 'alihkan', ke: '/id' });
  });
  it('path berbahasa ditulis ulang ke folder fisik', () => {
    expect(ruteHostPerpus('/id', null)).toEqual({ jenis: 'tulis-ulang', ke: '/perpusbq/id' });
    expect(ruteHostPerpus('/en/buku/abc', null)).toEqual({ jenis: 'tulis-ulang', ke: '/perpusbq/en/buku/abc' });
  });
  it('path tanpa bahasa mendapat id', () => {
    expect(ruteHostPerpus('/katalog', 'en')).toEqual({ jenis: 'alihkan', ke: '/id/katalog' });
  });
  it('API, auth, dan folder internal ditolak', () => {
    for (const p of ['/api/santri', '/api', '/auth/callback', '/perpusbq', '/perpusbq/id']) {
      expect(ruteHostPerpus(p, null)).toEqual({ jenis: 'tolak' });
    }
  });
  it('aset internal Next dilewatkan', () => {
    expect(ruteHostPerpus('/_next/webpack-hmr', null)).toEqual({ jenis: 'lewat' });
  });
  it('awalan mirip bahasa bukan bahasa', () => {
    expect(ruteHostPerpus('/idola', null)).toEqual({ jenis: 'alihkan', ke: '/id/idola' });
  });
});

describe('pathBahasa & adaBahasa', () => {
  it('menyusun path bahasa lain', () => {
    expect(pathBahasa('en', [])).toBe('/en');
    expect(pathBahasa('id', ['buku', 'abcd1234'])).toBe('/id/buku/abcd1234');
  });
  it('hanya id & en', () => {
    expect(adaBahasa('id')).toBe(true);
    expect(adaBahasa('fr')).toBe(false);
  });
});
```

Tambahkan di `tests/auth/proxy.test.ts` (impor `afterEach` dari vitest):

```ts
describe('proxy: host perpus', () => {
  beforeEach(() => { vi.stubEnv('PERPUS_HOST', 'perpus.localhost'); });
  afterEach(() => { vi.unstubAllEnvs(); });

  const reqHost = (path: string, host: string, accept?: string) => new NextRequest(new URL(path, `http://${host}`), {
    headers: { host, ...(accept ? { 'accept-language': accept } : {}) },
  });

  it('/ → redirect sesuai Accept-Language, tanpa memeriksa sesi', async () => {
    const res = await proxy(reqHost('/', 'perpus.localhost', 'en-US,en'));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/en');
    expect(getClaims).not.toHaveBeenCalled();
  });
  it('/id/katalog?q=a di-rewrite dengan query utuh', async () => {
    const res = await proxy(reqHost('/id/katalog?q=a', 'perpus.localhost'));
    const tujuan = new URL(res.headers.get('x-middleware-rewrite')!);
    expect(tujuan.pathname).toBe('/perpusbq/id/katalog');
    expect(tujuan.search).toBe('?q=a');
  });
  it('API bq-ku → 404 di host perpus', async () => {
    const res = await proxy(reqHost('/api/santri', 'perpus.localhost'));
    expect(res.status).toBe(404);
  });
  it('/perpusbq di host bq-ku → 404', async () => {
    const res = await proxy(reqHost('/perpusbq/id', 'bq-ku.vercel.app'));
    expect(res.status).toBe(404);
  });
  it('host bq-ku tetap memakai penjaga ruangan', async () => {
    getClaims.mockResolvedValue({ data: { claims: null }, error: null });
    const res = await proxy(reqHost('/donatur', 'bq-ku.vercel.app'));
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login');
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/perpus/domain.test.ts tests/auth/proxy.test.ts`
Expected: FAIL, modul `@/lib/perpus/domain` tidak ada.

- [ ] **Step 3: Implementasi**

`lib/perpus/domain.ts`:

```ts
import type { Bahasa } from '@/lib/perpus/ddc';

export const BAHASA: readonly Bahasa[] = ['id', 'en'];
export const adaBahasa = (s: string): s is Bahasa => (BAHASA as readonly string[]).includes(s);

export type RutePerpus =
  | { jenis: 'alihkan'; ke: string }
  | { jenis: 'tulis-ulang'; ke: string }
  | { jenis: 'tolak' }
  | { jenis: 'lewat' };

/** `PERPUS_HOST` berisi daftar hostname dipisah koma (produksi, preview, `perpus.localhost`). */
export function hostPerpus(host: string | null, daftar = process.env.PERPUS_HOST): boolean {
  if (!host || !daftar) return false;
  const nama = host.split(':')[0].toLowerCase();
  return daftar.split(',').map(h => h.trim().toLowerCase()).includes(nama);
}

export function bahasaDari(accept: string | null): Bahasa {
  const pilihan = (accept ?? '').split(',').map(bagian => {
    const [tag, ...param] = bagian.trim().split(';');
    const q = param.map(p => p.trim()).find(p => p.startsWith('q='));
    return { tag: tag.trim().toLowerCase().split('-')[0], q: q ? Number(q.slice(2)) : 1 };
  }).filter(b => b.q > 0).sort((a, b) => b.q - a.q);
  return pilihan.map(p => p.tag).find(adaBahasa) ?? 'id';
}

/** API & auth ditolak karena penjaga ruangan bq-ku tidak berjalan di host perpus. */
export function ruteHostPerpus(pathname: string, accept: string | null): RutePerpus {
  if (pathname.startsWith('/_next/')) return { jenis: 'lewat' };
  if (/^\/(api|auth|perpusbq)(\/|$)/.test(pathname)) return { jenis: 'tolak' };
  if (pathname === '/') return { jenis: 'alihkan', ke: `/${bahasaDari(accept)}` };
  if (adaBahasa(pathname.split('/')[1])) return { jenis: 'tulis-ulang', ke: `/perpusbq${pathname}` };
  return { jenis: 'alihkan', ke: `/id${pathname}` };
}

export const pathBahasa = (lang: Bahasa, segmen: string[]) => `/${[lang, ...segmen].join('/')}`;
```

`proxy.ts`: tambah impor dan fungsi, lalu panggil di baris pertama `proxy`, sebelum `createServerClient`:

```ts
import { hostPerpus, ruteHostPerpus } from '@/lib/perpus/domain';

function proxyPerpus(request: NextRequest) {
  const rute = ruteHostPerpus(request.nextUrl.pathname, request.headers.get('accept-language'));
  if (rute.jenis === 'lewat') return NextResponse.next();
  if (rute.jenis === 'tolak') return new NextResponse('Not Found', { status: 404 });
  const url = request.nextUrl.clone();
  url.pathname = rute.ke;
  return rute.jenis === 'alihkan' ? NextResponse.redirect(url) : NextResponse.rewrite(url);
}

export async function proxy(request: NextRequest) {
  if (hostPerpus(request.headers.get('host'))) return proxyPerpus(request);
  if (/^\/perpusbq(\/|$)/.test(request.nextUrl.pathname)) return new NextResponse('Not Found', { status: 404 });

  let response = NextResponse.next({ request });
  // …sisa fungsi tidak berubah
```

`.env.example`, setelah `NEXT_PUBLIC_APP_URL`:

```bash
# Hostname situs publik Perpus BQ, dipisah koma. Kosong = situs perpus tidak aktif.
# Lokal: perpus.localhost (buka http://perpus.localhost:3000)
PERPUS_HOST=perpus.localhost
```

`next.config.mjs`: tambahkan `'perpus.localhost'` ke `allowedDevOrigins`. Tambahkan juga `PERPUS_HOST=perpus.localhost` ke `.env.local` (tidak di-commit).

- [ ] **Step 4: Jalankan tes**

Run: `npx vitest run tests/perpus/domain.test.ts tests/auth/proxy.test.ts`
Expected: PASS, termasuk semua tes penjaga ruangan yang lama.

- [ ] **Step 5: Commit**

```bash
git add lib/perpus/domain.ts proxy.ts .env.example next.config.mjs tests/perpus/domain.test.ts tests/auth/proxy.test.ts
git commit -m "feat(perpus): routing host perpus di proxy — rewrite ke app/perpusbq, bahasa dari Accept-Language, /perpusbq 404 di bq-ku"
```

---

### Task 3: Migrasi `0014`, klien anon, repo publik

**Files:**
- Create: `supabase/migrations/0014_perpus_publik.sql`, `supabase/tests/perpus_rls.sql`, `lib/supabase/anon.ts`, `lib/db/perpus-publik-repo.ts`
- Modify: `lib/perpus/tipe.ts`
- Test: `tests/db/perpus-publik-repo.test.ts`

**Interfaces:**
- Produces: tipe `BukuPublik`, `DonasiPublik`, `RingkasanPublik`; `klienAnon(): SupabaseClient`; `listKatalogPublik(c)`, `ambilBukuPublik(c, idPendek)`, `listDonasiPublik(c)`, `ambilRingkasanPublik(c)`.

- [ ] **Step 1: Tulis migrasi**

`supabase/migrations/0014_perpus_publik.sql`:

```sql
-- 0014: Perpus BQ tahap 2 — view publik (dibaca role anon) & bucket sampul.
-- View berjalan dengan hak pemilik (security_invoker = false) sehingga melewati RLS tabel dasar;
-- karena itu daftar kolom di sini adalah batas privasinya: JANGAN menambah perpus_donasi.jumlah.
-- Aman dijalankan ulang.

-- A. Katalog. `tersedia` sementara = eksemplar; tahap 3 mengurangi pinjaman aktif (kolom tetap sama).
create or replace view public.perpus_katalog_publik with (security_invoker = false) as
select
  b.id,
  left(b.id::text, 8) as "idPendek",
  b.judul,
  b.penulis,
  case when b."nomorPanggil" ~ '^(TMP|AUDIT)-' then null else b."nomorPanggil" end as "nomorPanggil",
  b."kelasDdc",
  b.eksemplar,
  b.eksemplar as tersedia,
  b."sampulPath",
  b.asal,
  case when b.asal = 'wakaf' then d.nama end as "namaDonatur",
  b."createdAt"
from public.perpus_buku b
left join public.perpus_donasi d on d.id = b."donasiId"
where b.aktif;

-- B. Donatur, tanpa jumlah & catatan.
create or replace view public.perpus_donasi_publik with (security_invoker = false) as
select
  d.id,
  d.tanggal,
  d."tanggalTeks",
  d.nama,
  d.jenis,
  d."jumlahBuku",
  coalesce((
    select jsonb_agg(jsonb_build_object('idPendek', left(b.id::text, 8), 'judul', b.judul) order by b.judul)
    from public.perpus_buku b
    where b."donasiId" = d.id and b.aktif
  ), '[]'::jsonb) as buku
from public.perpus_donasi d;

-- C. Ringkasan: satu baris.
create or replace view public.perpus_ringkasan_publik with (security_invoker = false) as
with infaq as (
  select coalesce(sum(jumlah), 0)::bigint as total from public.perpus_donasi where jenis = 'uang'
), belanja as (
  select coalesce(sum(total), 0)::bigint as total from public.perpus_pengadaan
)
select
  (select count(*) from public.perpus_buku where aktif)::int as judul,
  (select coalesce(sum(eksemplar), 0) from public.perpus_buku where aktif)::int as eksemplar,
  (select count(distinct lower(trim(nama))) from public.perpus_donasi)::int as donatur,
  infaq.total as "totalInfaq",
  belanja.total as "totalPengadaan",
  infaq.total - belanja.total as saldo
from infaq, belanja;

-- D. Hak akses: hanya baca.
do $$
declare v text;
begin
  foreach v in array array['perpus_katalog_publik', 'perpus_donasi_publik', 'perpus_ringkasan_publik'] loop
    execute format('revoke all on public.%I from anon, authenticated', v);
    execute format('grant select on public.%I to anon, authenticated', v);
  end loop;
end $$;

-- E. Bucket sampul: baca publik lewat URL, tulis hanya pustakawan.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('perpus-sampul', 'perpus-sampul', true, 2097152, array['image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/webp'];

drop policy if exists "perpus-sampul: kelola" on storage.objects;
create policy "perpus-sampul: kelola" on storage.objects for all to authenticated
  using (bucket_id = 'perpus-sampul' and (public.has_role('SUPERADMIN') or public.has_role('PUSTAKAWAN')))
  with check (bucket_id = 'perpus-sampul' and (public.has_role('SUPERADMIN') or public.has_role('PUSTAKAWAN')));
```

`supabase/tests/perpus_rls.sql`:

```sql
-- Uji manual di SQL Editor setelah 0014. Setiap kueri punya hasil yang diharapkan di komentarnya.
begin;
set local role anon;
select count(*) from public.perpus_katalog_publik;    -- > 0
select count(*) from public.perpus_donasi_publik;     -- > 0
select * from public.perpus_ringkasan_publik;         -- 1 baris
select count(*) from public.perpus_buku;              -- 0 (RLS)
select count(*) from public.perpus_donasi;            -- 0 (RLS)
select count(*) from public.perpus_pengadaan;         -- 0 (RLS)
rollback;

-- Harus galat: column "jumlah" does not exist
begin;
set local role anon;
select jumlah from public.perpus_donasi_publik;
rollback;

-- Harus galat: permission denied
begin;
set local role anon;
delete from public.perpus_katalog_publik;
rollback;
```

- [ ] **Step 2: Tulis tes repo yang gagal**

`tests/db/perpus-publik-repo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ambilBukuPublik, ambilRingkasanPublik, listDonasiPublik, listKatalogPublik } from '@/lib/db/perpus-publik-repo';

/** Rantai kueri palsu: setiap metode mengembalikan dirinya; await menghasilkan `hasil`. */
function rantai(hasil: unknown, catat: unknown[][] = []) {
  const r: any = new Proxy({}, {
    get: (_t, k) => (k === 'then' ? (ok: (v: unknown) => void) => ok(hasil) : (...a: unknown[]) => { catat.push([k, ...a]); return r; }),
  });
  return r;
}
const klien = (hasil: unknown, catat: unknown[][] = []) => ({ from: (t: string) => { catat.push(['from', t]); return rantai(hasil, catat); } }) as never;

describe('repo publik', () => {
  it('katalog membaca view, nomor kosong di akhir', async () => {
    const catat: unknown[][] = [];
    expect(await listKatalogPublik(klien({ data: [{ id: 'a' }], error: null }, catat))).toEqual([{ id: 'a' }]);
    expect(catat).toContainEqual(['from', 'perpus_katalog_publik']);
    expect(catat).toContainEqual(['order', 'nomorPanggil', { nullsFirst: false }]);
  });
  it('buku dicari lewat idPendek; tidak ada → null', async () => {
    const catat: unknown[][] = [];
    expect(await ambilBukuPublik(klien({ data: null, error: null }, catat), 'abcd1234')).toBeNull();
    expect(catat).toContainEqual(['eq', 'idPendek', 'abcd1234']);
  });
  it('donasi terbaru dulu', async () => {
    const catat: unknown[][] = [];
    await listDonasiPublik(klien({ data: [], error: null }, catat));
    expect(catat).toContainEqual(['from', 'perpus_donasi_publik']);
    expect(catat).toContainEqual(['order', 'tanggal', { ascending: false, nullsFirst: false }]);
  });
  it('ringkasan satu baris; galat dilempar', async () => {
    await expect(ambilRingkasanPublik(klien({ data: null, error: { message: 'x' } }))).rejects.toThrow('Gagal memuat ringkasan');
  });
});
```

Run: `npx vitest run tests/db/perpus-publik-repo.test.ts`
Expected: FAIL, modul tidak ada.

- [ ] **Step 3: Implementasi**

Tambahkan ke `lib/perpus/tipe.ts`:

```ts
export type BukuPublik = {
  id: string; idPendek: string; judul: string; penulis: string;
  nomorPanggil: string | null; kelasDdc: string; eksemplar: number; tersedia: number;
  sampulPath: string | null; asal: AsalBuku; namaDonatur: string | null; createdAt: string;
};

export type DonasiPublik = {
  id: string; tanggal: string | null; tanggalTeks: string | null; nama: string;
  jenis: JenisDonasiPerpus; jumlahBuku: number | null;
  buku: { idPendek: string; judul: string }[];
};

export type RingkasanPublik = {
  judul: number; eksemplar: number; donatur: number;
  totalInfaq: number; totalPengadaan: number; saldo: number;
};
```

`lib/supabase/anon.ts`:

```ts
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/** Klien tanpa cookie untuk halaman publik: selalu role anon, jadi halaman bisa di-cache. */
export function klienAnon(): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

`lib/db/perpus-publik-repo.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BukuPublik, DonasiPublik, RingkasanPublik } from '@/lib/perpus/tipe';

export async function listKatalogPublik(c: SupabaseClient): Promise<BukuPublik[]> {
  const { data, error } = await c.from('perpus_katalog_publik').select('*').order('nomorPanggil', { nullsFirst: false });
  if (error) throw new Error(`Gagal memuat katalog: ${error.message}`);
  return (data || []) as BukuPublik[];
}

export async function ambilBukuPublik(c: SupabaseClient, idPendek: string): Promise<BukuPublik | null> {
  const { data, error } = await c.from('perpus_katalog_publik').select('*').eq('idPendek', idPendek).limit(1).maybeSingle();
  if (error) throw new Error(`Gagal memuat buku: ${error.message}`);
  return data as BukuPublik | null;
}

export async function listDonasiPublik(c: SupabaseClient): Promise<DonasiPublik[]> {
  const { data, error } = await c.from('perpus_donasi_publik').select('*').order('tanggal', { ascending: false, nullsFirst: false });
  if (error) throw new Error(`Gagal memuat donatur: ${error.message}`);
  return (data || []) as DonasiPublik[];
}

export async function ambilRingkasanPublik(c: SupabaseClient): Promise<RingkasanPublik> {
  const { data, error } = await c.from('perpus_ringkasan_publik').select('*').single();
  if (error) throw new Error(`Gagal memuat ringkasan: ${error.message}`);
  return data as RingkasanPublik;
}
```

- [ ] **Step 4: Jalankan tes**

Run: `npx vitest run tests/db/perpus-publik-repo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase lib/perpus/tipe.ts lib/supabase/anon.ts lib/db/perpus-publik-repo.ts tests/db/perpus-publik-repo.test.ts
git commit -m "feat(perpus): migrasi 0014 — view publik tanpa nominal & bucket sampul, klien anon, repo publik"
```

- [ ] **Step 6: CHECKPOINT PENGGUNA (memblokir Task 6 dst.)**

Minta pengguna menjalankan `0014_perpus_publik.sql` lalu `supabase/tests/perpus_rls.sql` di SQL Editor, dan melaporkan hasilnya. Tanpa view, `next build` gagal karena beranda diprerender. Task 4–5 boleh berjalan sambil menunggu.

---

### Task 4: Logika katalog, format, i18n

**Files:**
- Create: `lib/perpus/katalog.ts`, `lib/perpus/format-publik.ts`, `lib/perpus/i18n/id.ts`, `lib/perpus/i18n/en.ts`, `lib/perpus/i18n/index.ts`, `lib/perpus/meta.ts`
- Test: `tests/perpus/katalog.test.ts`, `tests/perpus/i18n.test.ts`

**Interfaces:**
- Consumes: `genreDari`, `LABEL_GENRE`, `Bahasa`, `Genre` dari `lib/perpus/ddc.ts`; `BukuPublik`.
- Produces: `SaringanKatalog`, `saringKatalog(buku, s)`, `daftarGenre(buku)`, `daftarPengarang(buku, genre?)`, `bacaSaringan(sp)`, `urlKatalog(lang, s)`, `bukuTerbaru(buku, n)`; `rupiahPublik(lang, n)`, `tanggalPublik(lang, iso, cadangan?)`; `t(lang, kunci, nilai?)`, `KunciTeks`; `metaHalaman(lang, path, judul, deskripsi?)`.

- [ ] **Step 1: Tulis tes yang gagal**

`tests/perpus/katalog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { bacaSaringan, bukuTerbaru, daftarGenre, daftarPengarang, saringKatalog, urlKatalog } from '@/lib/perpus/katalog';
import { rupiahPublik, tanggalPublik } from '@/lib/perpus/format-publik';
import type { BukuPublik } from '@/lib/perpus/tipe';

const b = (o: Partial<BukuPublik>): BukuPublik => ({
  id: 'x', idPendek: 'x', judul: '', penulis: '', nomorPanggil: null, kelasDdc: '', eksemplar: 1, tersedia: 1,
  sampulPath: null, asal: 'koleksi_awal', namaDonatur: null, createdAt: '2026-01-01T00:00:00Z', ...o,
});
const data = [
  b({ id: '1', judul: 'Bumi', penulis: 'Tere Liye', kelasDdc: '899.221' }),
  b({ id: '2', judul: 'Rasa', penulis: 'Tere Liye', kelasDdc: '899.221', tersedia: 0 }),
  b({ id: '3', judul: 'Fiqih Muyassar', penulis: 'Sa‘id', kelasDdc: '297.4' }),
  b({ id: '4', judul: 'Café Lama', penulis: '', kelasDdc: '' }),
];
const id = (x: BukuPublik[]) => x.map(y => y.id);

describe('saringKatalog', () => {
  it('cari judul/penulis tanpa peka huruf & diakritik', () => {
    expect(id(saringKatalog(data, { q: 'tere' }))).toEqual(['1', '2']);
    expect(id(saringKatalog(data, { q: 'CAFE' }))).toEqual(['4']);
  });
  it('filter genre lalu pengarang', () => {
    expect(id(saringKatalog(data, { genre: 'islam' }))).toEqual(['3']);
    expect(id(saringKatalog(data, { genre: 'sastra', pengarang: 'Tere Liye' }))).toEqual(['1', '2']);
  });
  it('hanya tersedia', () => {
    expect(id(saringKatalog(data, { tersedia: true }))).toEqual(['1', '3', '4']);
  });
});

describe('daftar & saringan', () => {
  it('genre urut terbanyak', () => {
    expect(daftarGenre(data)[0]).toEqual({ genre: 'sastra', jumlah: 2 });
  });
  it('pengarang unik, tanpa kosong, mengikuti genre', () => {
    expect(daftarPengarang(data, 'sastra')).toEqual(['Tere Liye']);
    expect(daftarPengarang(data)).toHaveLength(2);
  });
  it('bacaSaringan membuang genre tak dikenal', () => {
    expect(bacaSaringan({ q: ' bumi ', genre: 'ngawur', tersedia: '1' })).toEqual({ q: 'bumi', tersedia: true });
    expect(bacaSaringan({ genre: 'islam', pengarang: ['a', 'b'] })).toEqual({ genre: 'islam', pengarang: 'a' });
  });
  it('urlKatalog hanya memuat isian terisi', () => {
    expect(urlKatalog('en', {})).toBe('/en/katalog');
    expect(urlKatalog('id', { q: 'a b', genre: 'islam', tersedia: true })).toBe('/id/katalog?q=a+b&genre=islam&tersedia=1');
  });
  it('bukuTerbaru urut createdAt menurun', () => {
    const baru = b({ id: '9', createdAt: '2026-06-01T00:00:00Z' });
    expect(id(bukuTerbaru([...data, baru], 1))).toEqual(['9']);
  });
});

describe('format', () => {
  it('rupiah per bahasa', () => {
    expect(rupiahPublik('id', 1500000)).toBe('Rp1.500.000');
    expect(rupiahPublik('en', 1500000)).toBe('Rp1,500,000');
  });
  it('tanggal per bahasa dengan cadangan teks', () => {
    expect(tanggalPublik('id', '2026-03-05')).toBe('5 Mar 2026');
    expect(tanggalPublik('en', '2026-03-05')).toBe('Mar 5, 2026');
    expect(tanggalPublik('id', null, 'Ramadhan 2024')).toBe('Ramadhan 2024');
    expect(tanggalPublik('id', null)).toBe('—');
  });
});
```

`tests/perpus/i18n.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { t } from '@/lib/perpus/i18n';
import { id } from '@/lib/perpus/i18n/id';
import { en } from '@/lib/perpus/i18n/en';
import { metaHalaman } from '@/lib/perpus/meta';

describe('i18n', () => {
  it('kunci kedua bahasa identik & tidak kosong', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(id).sort());
    for (const v of [...Object.values(id), ...Object.values(en)]) expect(v.trim()).not.toBe('');
  });
  it('mengisi nilai', () => {
    expect(t('id', 'katalog.jumlah', { n: 3 })).toBe('3 judul');
    expect(t('en', 'katalog.jumlah', { n: 3 })).toBe('3 titles');
  });
  it('metaHalaman menyertakan hreflang kedua bahasa', () => {
    const m = metaHalaman('en', '/katalog', 'Catalog');
    expect(m.title).toBe('Catalog');
    expect(m.alternates?.canonical).toBe('/en/katalog');
    expect(m.alternates?.languages).toEqual({ id: '/id/katalog', en: '/en/katalog' });
  });
});
```

Run: `npx vitest run tests/perpus/katalog.test.ts tests/perpus/i18n.test.ts`
Expected: FAIL, modul tidak ada.

- [ ] **Step 2: Implementasi**

`lib/perpus/katalog.ts`:

```ts
import { genreDari, LABEL_GENRE, type Bahasa, type Genre } from '@/lib/perpus/ddc';
import type { BukuPublik } from '@/lib/perpus/tipe';

export type SaringanKatalog = { q?: string; genre?: Genre; pengarang?: string; tersedia?: boolean };

const normal = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export function saringKatalog(buku: BukuPublik[], s: SaringanKatalog): BukuPublik[] {
  const q = s.q ? normal(s.q) : '';
  return buku.filter(b =>
    (!q || normal(`${b.judul} ${b.penulis}`).includes(q))
    && (!s.genre || genreDari(b.kelasDdc) === s.genre)
    && (!s.pengarang || b.penulis === s.pengarang)
    && (!s.tersedia || b.tersedia > 0));
}

export function daftarGenre(buku: BukuPublik[]): { genre: Genre; jumlah: number }[] {
  const hitung = new Map<Genre, number>();
  for (const b of buku) {
    const g = genreDari(b.kelasDdc);
    hitung.set(g, (hitung.get(g) ?? 0) + 1);
  }
  return [...hitung].map(([genre, jumlah]) => ({ genre, jumlah })).sort((a, b) => b.jumlah - a.jumlah);
}

export function daftarPengarang(buku: BukuPublik[], genre?: Genre): string[] {
  const nama = buku.filter(b => b.penulis && (!genre || genreDari(b.kelasDdc) === genre)).map(b => b.penulis);
  return [...new Set(nama)].sort((a, b) => a.localeCompare(b, 'id'));
}

export function bacaSaringan(sp: Record<string, string | string[] | undefined>): SaringanKatalog {
  const genre = satu(sp.genre);
  const hasil: SaringanKatalog = {};
  const q = satu(sp.q);
  const pengarang = satu(sp.pengarang);
  if (q) hasil.q = q;
  if (genre && genre in LABEL_GENRE) hasil.genre = genre as Genre;
  if (pengarang) hasil.pengarang = pengarang;
  if (satu(sp.tersedia)) hasil.tersedia = true;
  return hasil;
}

export function urlKatalog(lang: Bahasa, s: SaringanKatalog): string {
  const p = new URLSearchParams();
  if (s.q) p.set('q', s.q);
  if (s.genre) p.set('genre', s.genre);
  if (s.pengarang) p.set('pengarang', s.pengarang);
  if (s.tersedia) p.set('tersedia', '1');
  const query = p.toString();
  return `/${lang}/katalog${query ? `?${query}` : ''}`;
}

export const bukuTerbaru = (buku: BukuPublik[], n: number) =>
  [...buku].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, n);
```

`lib/perpus/format-publik.ts`:

```ts
import type { Bahasa } from '@/lib/perpus/ddc';

const LOKAL: Record<Bahasa, string> = { id: 'id-ID', en: 'en-US' };

export const rupiahPublik = (lang: Bahasa, n: number) => `Rp${n.toLocaleString(LOKAL[lang])}`;

export function tanggalPublik(lang: Bahasa, iso: string | null, cadangan?: string | null): string {
  if (!iso) return cadangan || '—';
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(LOKAL[lang], { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
```

`lib/perpus/i18n/id.ts`:

```ts
export const id = {
  'situs.nama': 'Perpus BQ',
  'situs.deskripsi': 'Perpustakaan Baitul Qowwam: katalog buku dan daftar donatur.',
  'nav.beranda': 'Beranda',
  'nav.katalog': 'Katalog',
  'nav.donatur': 'Donatur',
  'nav.utama': 'Navigasi utama',
  'nav.bahasa': 'Pilih bahasa',
  'beranda.chip': 'Perpustakaan Baitul Qowwam',
  'beranda.sapa': 'Mau baca',
  'beranda.sorot': 'apa',
  'beranda.sub': 'Cari buku di koleksi kami, lalu datang ke perpustakaan.',
  'beranda.terbaru': 'Buku terbaru',
  'beranda.semua': 'Lihat semua buku',
  'statistik.judul': 'Judul',
  'statistik.eksemplar': 'Eksemplar',
  'statistik.donatur': 'Donatur',
  'cari.label': 'Cari judul atau penulis',
  'cari.tombol': 'Cari',
  'katalog.judul': 'Katalog',
  'katalog.jumlah': '{n} judul',
  'katalog.semuaGenre': 'Semua',
  'katalog.genre': 'Genre',
  'katalog.pengarang': 'Pengarang',
  'katalog.semuaPengarang': 'Semua pengarang',
  'katalog.hanyaTersedia': 'Hanya yang tersedia',
  'katalog.terapkan': 'Terapkan',
  'katalog.kosong': 'Tidak ada buku yang cocok.',
  'katalog.reset': 'Hapus saringan',
  'buku.kembali': 'Kembali ke katalog',
  'buku.nomorPanggil': 'Nomor panggil',
  'buku.genre': 'Genre',
  'buku.kelas': 'Kelas',
  'buku.asal': 'Asal',
  'buku.ketersediaan': 'Ketersediaan',
  'buku.tersedia': '{n} dari {total} tersedia',
  'buku.habis': 'Sedang dipinjam semua',
  'buku.penulisKosong': 'Penulis tidak tercatat',
  'buku.lainPenulis': 'Buku lain dari pengarang ini',
  'asal.wakaf': 'Wakaf dari {nama}',
  'asal.wakafAnonim': 'Wakaf',
  'asal.pengadaan': 'Pengadaan',
  'asal.koleksi_awal': 'Koleksi awal',
  'donatur.judul': 'Donatur',
  'donatur.sub': 'Terima kasih kepada semua yang menghidupkan perpustakaan ini.',
  'donatur.tabInfaq': 'Infaq',
  'donatur.tabWakaf': 'Wakaf buku',
  'donatur.totalInfaq': 'Total infaq',
  'donatur.pengadaan': 'Pengadaan buku',
  'donatur.saldo': 'Saldo',
  'donatur.kosong': 'Belum ada data.',
  'donatur.jumlahBuku': '{n} buku',
};
```

`lib/perpus/i18n/en.ts`:

```ts
import type { id } from './id';

export const en: Record<keyof typeof id, string> = {
  'situs.nama': 'Perpus BQ',
  'situs.deskripsi': 'The Baitul Qowwam library: book catalog and donor list.',
  'nav.beranda': 'Home',
  'nav.katalog': 'Catalog',
  'nav.donatur': 'Donors',
  'nav.utama': 'Main navigation',
  'nav.bahasa': 'Choose language',
  'beranda.chip': 'Baitul Qowwam Library',
  'beranda.sapa': 'What will you',
  'beranda.sorot': 'read',
  'beranda.sub': 'Search our collection, then come visit the library.',
  'beranda.terbaru': 'New books',
  'beranda.semua': 'See all books',
  'statistik.judul': 'Titles',
  'statistik.eksemplar': 'Copies',
  'statistik.donatur': 'Donors',
  'cari.label': 'Search by title or author',
  'cari.tombol': 'Search',
  'katalog.judul': 'Catalog',
  'katalog.jumlah': '{n} titles',
  'katalog.semuaGenre': 'All',
  'katalog.genre': 'Genre',
  'katalog.pengarang': 'Author',
  'katalog.semuaPengarang': 'All authors',
  'katalog.hanyaTersedia': 'Available only',
  'katalog.terapkan': 'Apply',
  'katalog.kosong': 'No matching books.',
  'katalog.reset': 'Clear filters',
  'buku.kembali': 'Back to catalog',
  'buku.nomorPanggil': 'Call number',
  'buku.genre': 'Genre',
  'buku.kelas': 'Class',
  'buku.asal': 'Source',
  'buku.ketersediaan': 'Availability',
  'buku.tersedia': '{n} of {total} available',
  'buku.habis': 'All copies on loan',
  'buku.penulisKosong': 'Author not recorded',
  'buku.lainPenulis': 'More by this author',
  'asal.wakaf': 'Donated by {nama}',
  'asal.wakafAnonim': 'Donated',
  'asal.pengadaan': 'Purchased',
  'asal.koleksi_awal': 'Original collection',
  'donatur.judul': 'Donors',
  'donatur.sub': 'Thank you to everyone who keeps this library alive.',
  'donatur.tabInfaq': 'Infaq',
  'donatur.tabWakaf': 'Book donations',
  'donatur.totalInfaq': 'Total infaq',
  'donatur.pengadaan': 'Book purchases',
  'donatur.saldo': 'Balance',
  'donatur.kosong': 'No data yet.',
  'donatur.jumlahBuku': '{n} books',
};
```

`lib/perpus/i18n/index.ts`:

```ts
import type { Bahasa } from '@/lib/perpus/ddc';
import { id } from './id';
import { en } from './en';

export type KunciTeks = keyof typeof id;
const KAMUS: Record<Bahasa, Record<KunciTeks, string>> = { id, en };

export function t(lang: Bahasa, kunci: KunciTeks, nilai: Record<string, string | number> = {}): string {
  return KAMUS[lang][kunci].replace(/\{(\w+)\}/g, (_, k: string) => String(nilai[k] ?? ''));
}
```

`lib/perpus/meta.ts`:

```ts
import type { Metadata } from 'next';
import type { Bahasa } from '@/lib/perpus/ddc';

/** `path` tanpa awalan bahasa: '' untuk beranda, '/katalog', dst. */
export function metaHalaman(lang: Bahasa, path: string, judul: string, deskripsi?: string): Metadata {
  return {
    title: judul,
    ...(deskripsi ? { description: deskripsi } : {}),
    alternates: {
      canonical: `/${lang}${path}`,
      languages: { id: `/id${path}`, en: `/en${path}` },
    },
  };
}
```

- [ ] **Step 3: Jalankan tes & tipe**

Run: `npx vitest run tests/perpus/katalog.test.ts tests/perpus/i18n.test.ts && npx tsc --noEmit`
Expected: PASS. Bila teks tanggal berbeda karena spasi khusus ICU, sesuaikan harapan tes, bukan implementasinya.

- [ ] **Step 4: Commit**

```bash
git add lib/perpus tests/perpus/katalog.test.ts tests/perpus/i18n.test.ts
git commit -m "feat(perpus): saringan katalog, format per bahasa, kamus id/en, metadata hreflang"
```

---

### Task 5: Tema, root layout perpus, navigasi

**Files:**
- Create: `app/perpusbq/perpus.css`, `app/perpusbq/[lang]/layout.tsx`, `app/perpusbq/[lang]/not-found.tsx`, `app/perpusbq/[lang]/icon.svg`, `app/perpusbq/[lang]/page.tsx` (sementara), `components/perpus-publik/NavPerpus.tsx`, `components/perpus-publik/PengalihBahasa.tsx`
- Modify: `tailwind.config.ts`

**Interfaces:**
- Consumes: `BAHASA`, `adaBahasa`, `pathBahasa` (Task 2); `t` (Task 4).
- Produces: kelas CSS `.tema-perpus`, `.p-wadah`, `.p-kartu`, `.p-chip`, `.p-label`, `.p-tombol`, `.p-sorot`, `.p-h1`, `.p-h2`, `.p-input`, `.p-baris`, `.p-pil`, `.p-pil-aktif`; warna Tailwind `perpus-*`.

- [ ] **Step 1: Tulis CSS tema**

`app/perpusbq/perpus.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Token dari docs/research/perpus-tema/TOKENS.md. Hanya tema terang di tahap 2. */
.tema-perpus {
  --p-kertas: #f7f7f2;
  --p-kertas-dalam: #ecece4;
  --p-kartu: #ffffff;
  --p-tinta: #0a0f0d;
  --p-tinta-lembut: #3d4a44;
  --p-evergreen: #122922;
  --p-teal: #1f5c49;
  --p-lime: #c9ff5c;
  --p-lime-dalam: #b3ee3f;
  --p-lime-tint: #f2f9bd;
  --p-halo: #d6ee30;
  --p-garis-halus: #0f2e1f24;
  --p-galat: #9c3828;
  --p-ease-out: cubic-bezier(.16, 1, .3, 1);
  --p-ease-pop: cubic-bezier(.34, 1.56, .64, 1);

  background: var(--p-kertas);
  color: var(--p-tinta);
  font-family: var(--font-teks), system-ui, sans-serif;
  min-height: 100dvh;
}

.tema-perpus :focus-visible {
  outline: 2px solid var(--p-evergreen);
  outline-offset: 2px;
  box-shadow: 0 0 0 6px var(--p-halo);
}

.p-wadah { max-width: 1200px; margin: 0 auto; padding: 24px 16px calc(112px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 24px; }

.p-h1 { font-family: var(--font-judul), sans-serif; font-weight: 800; font-size: clamp(2.25rem, 7vw, 3.2rem); line-height: 1.05; letter-spacing: -.035em; color: var(--p-evergreen); }
.p-h2 { font-family: var(--font-judul), sans-serif; font-weight: 800; font-size: 1.375rem; letter-spacing: -.02em; color: var(--p-evergreen); }
.p-sorot { display: inline-block; background: var(--p-lime); color: var(--p-tinta); padding: 0 .18em; border-radius: 10px; box-shadow: 3px 3px 0 var(--p-tinta); }

.p-kartu { background: var(--p-kartu); border: 2px solid var(--p-tinta); border-radius: 24px; box-shadow: 6px 7px 0 var(--p-tinta); }
.p-kartu-tautan { transition: transform .14s var(--p-ease-pop), box-shadow .14s var(--p-ease-pop); }
.p-kartu-tautan:hover { transform: translate(-1px, -1px); box-shadow: 7px 8px 0 var(--p-tinta); }
.p-kartu-tautan:active { transform: translate(3px, 3px); box-shadow: 3px 4px 0 var(--p-tinta); }

.p-chip { display: inline-flex; align-items: center; gap: 6px; background: var(--p-tinta); color: var(--p-lime); border-radius: 999px; padding: 5px 14px; font-size: 13px; font-weight: 800; letter-spacing: .02em; }
.p-label { display: inline-block; background: var(--p-kartu); border: 2px solid var(--p-tinta); border-radius: 10px; box-shadow: 2px 2px 0 var(--p-tinta); padding: 4px 10px 5px; font-size: 13px; font-weight: 800; }

.p-tombol { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; padding: 0 18px; background: var(--p-lime); color: var(--p-tinta); border: 2px solid var(--p-tinta); border-radius: 999px; box-shadow: 2px 2px 0 var(--p-tinta); font-size: 14px; font-weight: 800; cursor: pointer; transition: transform .14s var(--p-ease-pop), background-color .16s, box-shadow .14s; }
.p-tombol:hover { background: var(--p-lime-dalam); }
.p-tombol:active { transform: translate(2px, 2px); box-shadow: 0 0 0 var(--p-tinta); }

.p-input { width: 100%; min-height: 44px; padding: 0 16px; background: var(--p-kartu); color: var(--p-tinta); border: 2px solid var(--p-tinta); border-radius: 14px; font-size: 16px; }

.p-baris { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--p-kartu); border: 2px solid var(--p-tinta); border-radius: 13px; }

.p-pil { display: inline-flex; align-items: center; min-height: 40px; padding: 0 14px; background: var(--p-kartu); border: 2px solid var(--p-tinta); border-radius: 999px; font-size: 13px; font-weight: 700; white-space: nowrap; }
.p-pil-aktif { background: var(--p-lime); box-shadow: 2px 2px 0 var(--p-tinta); }

/* Mobile: pil mengambang di bawah. Desktop: bilah atas (§6). */
.p-nav { position: fixed; z-index: 40; left: 12px; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 2px; padding: 4px; background: var(--p-kertas); border: 2px solid var(--p-tinta); border-radius: 20px; box-shadow: 3px 3px 0 var(--p-tinta); }
.p-nav-merek { display: none; }
.p-nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; height: 50px; border-radius: 14px; font-size: 12px; font-weight: 600; color: var(--p-evergreen); transition: transform .14s var(--p-ease-pop), background-color .16s; }
.p-nav-item[aria-current='page'] { background: var(--p-lime); color: var(--p-tinta); }
.p-bahasa { display: flex; align-items: center; gap: 2px; padding: 0 4px; font-size: 12px; font-weight: 800; }
.p-bahasa a { display: grid; place-items: center; min-width: 32px; min-height: 44px; border-radius: 10px; }
.p-bahasa a[aria-current='true'] { text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 3px; }

@media (min-width: 768px) {
  .p-wadah { padding-bottom: 48px; }
  .p-nav { position: sticky; top: 12px; bottom: auto; left: auto; right: auto; max-width: 1168px; margin: 12px auto 0; padding: 4px 12px; }
  .p-nav-merek { display: block; margin-right: auto; font-family: var(--font-judul), sans-serif; font-weight: 800; font-size: 20px; letter-spacing: -.02em; }
  .p-nav-item { flex: none; flex-direction: row; gap: 6px; height: 44px; padding: 0 14px; font-size: 14px; }
}

@media (prefers-reduced-motion: reduce) {
  .tema-perpus * { transition: none !important; }
}
```

Tambahkan di `theme.extend.colors` pada `tailwind.config.ts`:

```ts
        perpus: { kertas: 'var(--p-kertas)', 'kertas-dalam': 'var(--p-kertas-dalam)', tinta: 'var(--p-tinta)', 'tinta-lembut': 'var(--p-tinta-lembut)', teal: 'var(--p-teal)', lime: 'var(--p-lime)', 'lime-tint': 'var(--p-lime-tint)', galat: 'var(--p-galat)' },
```

- [ ] **Step 2: Tulis komponen navigasi**

`components/perpus-publik/PengalihBahasa.tsx`:

```tsx
'use client';
import { useSelectedLayoutSegments } from 'next/navigation';
import type { MouseEvent } from 'react';
import type { Bahasa } from '@/lib/perpus/ddc';
import { BAHASA, pathBahasa } from '@/lib/perpus/domain';

/** Memakai segmen layout, bukan usePathname: halaman ini di-rewrite (lihat Global Constraints). */
export function PengalihBahasa({ lang, label }: { lang: Bahasa; label: string }) {
  const segmen = useSelectedLayoutSegments();
  const pindah = (e: MouseEvent<HTMLAnchorElement>, tujuan: string) => {
    e.preventDefault();
    window.location.assign(tujuan + window.location.search);
  };
  return (
    <div className="p-bahasa" role="group" aria-label={label}>
      {BAHASA.map(b => {
        const tujuan = pathBahasa(b, segmen);
        return <a key={b} href={tujuan} hrefLang={b} aria-current={b === lang} onClick={e => pindah(e, tujuan)}>{b.toUpperCase()}</a>;
      })}
    </div>
  );
}
```

`components/perpus-publik/NavPerpus.tsx`:

```tsx
'use client';
import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import { Books, HandHeart, House } from '@phosphor-icons/react';
import type { Bahasa } from '@/lib/perpus/ddc';
import { t } from '@/lib/perpus/i18n';
import { PengalihBahasa } from './PengalihBahasa';

const ITEM = [
  { segmen: null, path: '', kunci: 'nav.beranda', Ikon: House },
  { segmen: 'katalog', path: '/katalog', kunci: 'nav.katalog', Ikon: Books },
  { segmen: 'donatur', path: '/donatur', kunci: 'nav.donatur', Ikon: HandHeart },
] as const;

export function NavPerpus({ lang }: { lang: Bahasa }) {
  const aktif = useSelectedLayoutSegment();
  // Detail buku bagian dari Katalog.
  const segmen = aktif === 'buku' ? 'katalog' : aktif;
  return (
    <nav className="p-nav" aria-label={t(lang, 'nav.utama')}>
      <Link href={`/${lang}`} className="p-nav-merek">{t(lang, 'situs.nama')}</Link>
      {ITEM.map(({ segmen: s, path, kunci, Ikon }) => (
        <Link key={kunci} href={`/${lang}${path}`} className="p-nav-item" aria-current={segmen === s ? 'page' : undefined}>
          <Ikon size={22} weight={segmen === s ? 'fill' : 'regular'} aria-hidden />
          {t(lang, kunci)}
        </Link>
      ))}
      <PengalihBahasa lang={lang} label={t(lang, 'nav.bahasa')} />
    </nav>
  );
}
```

- [ ] **Step 3: Tulis layout & halaman pendukung**

`app/perpusbq/[lang]/layout.tsx`:

```tsx
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google';
import '../perpus.css';
import { NavPerpus } from '@/components/perpus-publik/NavPerpus';
import { adaBahasa, BAHASA } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';

const judul = Bricolage_Grotesque({ variable: '--font-judul', subsets: ['latin'] });
const teks = Plus_Jakarta_Sans({ variable: '--font-teks', subsets: ['latin'] });

export const generateStaticParams = () => BAHASA.map(lang => ({ lang }));
export const viewport: Viewport = { themeColor: '#f7f7f2' };

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!adaBahasa(lang)) return {};
  const host = process.env.PERPUS_HOST?.split(',')[0].trim();
  return {
    ...(host ? { metadataBase: new URL(`https://${host}`) } : {}),
    title: { default: t(lang, 'situs.nama'), template: `%s · ${t(lang, 'situs.nama')}` },
    description: t(lang, 'situs.deskripsi'),
  };
}

export default async function LayoutPerpus({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!adaBahasa(lang)) notFound();
  return (
    <html lang={lang}>
      <body className={`${judul.variable} ${teks.variable} tema-perpus antialiased`}>
        <NavPerpus lang={lang} />
        <main className="p-wadah">{children}</main>
      </body>
    </html>
  );
}
```

`app/perpusbq/[lang]/not-found.tsx` (tidak menerima `params`, jadi dua bahasa):

```tsx
import Link from 'next/link';

export default function TidakDitemukan() {
  return (
    <section className="p-kartu p-8 text-center space-y-4">
      <h1 className="p-h2">Halaman tidak ditemukan · Page not found</h1>
      <Link href="/" className="p-tombol">Beranda · Home</Link>
    </section>
  );
}
```

`app/perpusbq/[lang]/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="1" y="1" width="30" height="30" rx="8" fill="#c9ff5c" stroke="#0a0f0d" stroke-width="2"/><path d="M9 8h6a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H9zM23 8h-2a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h2z" fill="#0a0f0d"/></svg>
```

`app/perpusbq/[lang]/page.tsx` sementara (diganti di Task 6):

```tsx
export default function Beranda() {
  return <h1 className="p-h1">Perpus <span className="p-sorot">BQ</span></h1>;
}
```

- [ ] **Step 4: Verifikasi di browser**

Run: `npx tsc --noEmit`. Lalu jalankan preview dev dan buka `http://perpus.localhost:3000/`.

Periksa: diarahkan ke `/id` atau `/en` dan host tetap `perpus.localhost` (bukan `localhost`; bila berubah, susun URL redirect dari header `host`); `document.documentElement.lang` mengikuti path; latar `#f7f7f2`; pengalih bahasa mempertahankan path; console tanpa hydration error; `read_network_requests` tanpa request ke `/perpusbq` yang gagal. Pada 390px nav berupa pil bawah tanpa scroll horizontal; pada ≥768px jadi bilah atas. `http://localhost:3000/perpusbq/id` → 404, dan `/login` di localhost tetap bertema bq-ku.

- [ ] **Step 5: Commit**

```bash
git add app/perpusbq components/perpus-publik tailwind.config.ts
git commit -m "feat(perpus): tema & root layout situs publik — token sage/lime, nav pil, pengalih bahasa"
```

---

### Task 6: Beranda & Katalog

Membutuhkan checkpoint Task 3 (view sudah ada).

**Files:**
- Create: `lib/perpus/sampul.ts`, `components/perpus-publik/SampulBuku.tsx`, `components/perpus-publik/KartuBuku.tsx`, `components/perpus-publik/KotakCari.tsx`, `app/perpusbq/[lang]/katalog/page.tsx`
- Modify: `app/perpusbq/[lang]/page.tsx`
- Test: `tests/perpus/sampul.test.ts`, `tests/components/kartu-buku-publik.test.tsx`

**Interfaces:**
- Consumes: `klienAnon`, `listKatalogPublik`, `ambilRingkasanPublik` (Task 3); fungsi `lib/perpus/katalog.ts`, `t`, `metaHalaman` (Task 4).
- Produces: `BUCKET_SAMPUL`, `urlSampul(path)`, `pathSampul(id, waktu)`; komponen `<KartuBuku lang buku />`, `<SampulBuku buku besar? />`, `<KotakCari lang nilai? />`.

- [ ] **Step 1: Tulis tes yang gagal**

`tests/perpus/sampul.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { pathSampul, urlSampul } from '@/lib/perpus/sampul';

describe('sampul', () => {
  it('URL publik bucket sampul', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
    expect(urlSampul('a/1.webp')).toBe('https://x.supabase.co/storage/v1/object/public/perpus-sampul/a/1.webp');
    vi.unstubAllEnvs();
  });
  it('path memuat id & waktu agar cache tidak basi', () => {
    expect(pathSampul('b1', 123)).toBe('b1/123.webp');
  });
});
```

`tests/components/kartu-buku-publik.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { KartuBuku } from '@/components/perpus-publik/KartuBuku';
import type { BukuPublik } from '@/lib/perpus/tipe';

const buku: BukuPublik = {
  id: 'x', idPendek: 'abcd1234', judul: 'Bumi', penulis: 'Tere Liye', nomorPanggil: null, kelasDdc: '899.221',
  eksemplar: 2, tersedia: 1, sampulPath: null, asal: 'koleksi_awal', namaDonatur: null, createdAt: '2026-01-01T00:00:00Z',
};

describe('KartuBuku', () => {
  it('menaut ke URL publik, bukan folder internal', () => {
    const html = renderToStaticMarkup(<KartuBuku lang="en" buku={buku} />);
    expect(html).toContain('href="/en/buku/abcd1234"');
    expect(html).not.toContain('perpusbq');
  });
  it('label genre diterjemahkan; nomor kosong jadi tanda pisah', () => {
    const html = renderToStaticMarkup(<KartuBuku lang="en" buku={buku} />);
    expect(html).toContain('Literature &amp; fiction');
    expect(html).toContain('—');
  });
});
```

Run: `npx vitest run tests/perpus/sampul.test.ts tests/components/kartu-buku-publik.test.tsx`
Expected: FAIL, modul tidak ada.

- [ ] **Step 2: Implementasi komponen**

`lib/perpus/sampul.ts`:

```ts
export const BUCKET_SAMPUL = 'perpus-sampul';
export const pathSampul = (bukuId: string, waktu: number) => `${bukuId}/${waktu}.webp`;
export const urlSampul = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_SAMPUL}/${path}`;
```

`components/perpus-publik/SampulBuku.tsx`:

```tsx
import type { BukuPublik } from '@/lib/perpus/tipe';
import { urlSampul } from '@/lib/perpus/sampul';

/** Sebagian besar buku belum bersampul: tampilkan judul di atas blok berwarna. */
export function SampulBuku({ buku, besar = false }: { buku: Pick<BukuPublik, 'judul' | 'sampulPath'>; besar?: boolean }) {
  const ukuran = besar ? 'w-40' : 'w-20';
  if (buku.sampulPath) {
    return <img src={urlSampul(buku.sampulPath)} alt="" loading="lazy" className={`${ukuran} aspect-[2/3] shrink-0 object-cover rounded-xl border-2 border-perpus-tinta`} />;
  }
  return (
    <div aria-hidden className={`${ukuran} aspect-[2/3] shrink-0 overflow-hidden rounded-xl border-2 border-perpus-tinta bg-perpus-lime-tint p-2 ${besar ? 'text-base' : 'text-[10px]'} font-extrabold leading-tight`}>
      {buku.judul}
    </div>
  );
}
```

`components/perpus-publik/KartuBuku.tsx`:

```tsx
import Link from 'next/link';
import { genreDari, LABEL_GENRE, type Bahasa } from '@/lib/perpus/ddc';
import type { BukuPublik } from '@/lib/perpus/tipe';
import { SampulBuku } from './SampulBuku';

export function KartuBuku({ lang, buku }: { lang: Bahasa; buku: BukuPublik }) {
  return (
    <Link href={`/${lang}/buku/${buku.idPendek}`} className="p-kartu p-kartu-tautan flex gap-3 p-3">
      <SampulBuku buku={buku} />
      <div className="min-w-0 space-y-1">
        <p className="font-extrabold leading-snug line-clamp-2">{buku.judul}</p>
        <p className="text-sm text-perpus-tinta-lembut truncate">{buku.penulis}</p>
        <p className="text-xs font-bold text-perpus-teal">{LABEL_GENRE[genreDari(buku.kelasDdc)][lang]}</p>
        <p className="font-mono text-xs">{buku.nomorPanggil ?? '—'}</p>
      </div>
    </Link>
  );
}
```

`components/perpus-publik/KotakCari.tsx`:

```tsx
import type { Bahasa } from '@/lib/perpus/ddc';
import { t } from '@/lib/perpus/i18n';

/** Form GET biasa: tetap berfungsi tanpa JavaScript. */
export function KotakCari({ lang, nilai, children }: { lang: Bahasa; nilai?: string; children?: React.ReactNode }) {
  return (
    <form action={`/${lang}/katalog`} role="search" className="flex gap-2">
      <input type="search" name="q" defaultValue={nilai} className="p-input" aria-label={t(lang, 'cari.label')} placeholder={t(lang, 'cari.label')} />
      {children}
      <button type="submit" className="p-tombol shrink-0">{t(lang, 'cari.tombol')}</button>
    </form>
  );
}
```

- [ ] **Step 3: Tulis halaman**

`app/perpusbq/[lang]/page.tsx`:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { KartuBuku } from '@/components/perpus-publik/KartuBuku';
import { KotakCari } from '@/components/perpus-publik/KotakCari';
import { ambilRingkasanPublik, listKatalogPublik } from '@/lib/db/perpus-publik-repo';
import { adaBahasa } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';
import { bukuTerbaru } from '@/lib/perpus/katalog';
import { metaHalaman } from '@/lib/perpus/meta';
import { klienAnon } from '@/lib/supabase/anon';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return adaBahasa(lang) ? metaHalaman(lang, '', t(lang, 'situs.nama')) : {};
}

export default async function Beranda({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!adaBahasa(lang)) notFound();
  const c = klienAnon();
  const [ringkasan, buku] = await Promise.all([ambilRingkasanPublik(c), listKatalogPublik(c)]);
  const statistik = [
    ['statistik.judul', ringkasan.judul],
    ['statistik.eksemplar', ringkasan.eksemplar],
    ['statistik.donatur', ringkasan.donatur],
  ] as const;
  return (
    <>
      <header className="space-y-3">
        <span className="p-chip">{t(lang, 'beranda.chip')}</span>
        <h1 className="p-h1">{t(lang, 'beranda.sapa')} <span className="p-sorot">{t(lang, 'beranda.sorot')}</span>?</h1>
        <p className="text-perpus-tinta-lembut">{t(lang, 'beranda.sub')}</p>
      </header>
      <KotakCari lang={lang} />
      <dl className="grid grid-cols-3 gap-3">
        {statistik.map(([kunci, n]) => (
          <div key={kunci} className="p-kartu p-3 text-center">
            <dd className="p-h2">{n}</dd>
            <dt className="text-xs font-bold text-perpus-tinta-lembut">{t(lang, kunci)}</dt>
          </div>
        ))}
      </dl>
      <section className="space-y-3">
        <h2 className="p-h2">{t(lang, 'beranda.terbaru')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bukuTerbaru(buku, 6).map(b => <KartuBuku key={b.id} lang={lang} buku={b} />)}
        </div>
        <Link href={`/${lang}/katalog`} className="p-tombol">{t(lang, 'beranda.semua')}</Link>
      </section>
    </>
  );
}
```

`app/perpusbq/[lang]/katalog/page.tsx`:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { KartuBuku } from '@/components/perpus-publik/KartuBuku';
import { KotakCari } from '@/components/perpus-publik/KotakCari';
import { listKatalogPublik } from '@/lib/db/perpus-publik-repo';
import { LABEL_GENRE } from '@/lib/perpus/ddc';
import { adaBahasa } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';
import { bacaSaringan, daftarGenre, daftarPengarang, saringKatalog, urlKatalog } from '@/lib/perpus/katalog';
import { metaHalaman } from '@/lib/perpus/meta';
import { klienAnon } from '@/lib/supabase/anon';

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, 'params'>) {
  const { lang } = await params;
  return adaBahasa(lang) ? metaHalaman(lang, '/katalog', t(lang, 'katalog.judul')) : {};
}

export default async function Katalog({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!adaBahasa(lang)) notFound();
  const saringan = bacaSaringan(await searchParams);
  const buku = await listKatalogPublik(klienAnon());
  const hasil = saringKatalog(buku, saringan);
  // Ganti genre menghapus pengarang: pengarang lama belum tentu ada di genre baru.
  const keGenre = (genre?: (typeof saringan)['genre']) => urlKatalog(lang, { ...saringan, genre, pengarang: undefined });
  return (
    <>
      <header className="space-y-1">
        <h1 className="p-h1">{t(lang, 'katalog.judul')}</h1>
        <p role="status" className="text-perpus-tinta-lembut">{t(lang, 'katalog.jumlah', { n: hasil.length })}</p>
      </header>
      <KotakCari lang={lang} nilai={saringan.q}>
        {saringan.genre && <input type="hidden" name="genre" value={saringan.genre} />}
        {saringan.pengarang && <input type="hidden" name="pengarang" value={saringan.pengarang} />}
        {saringan.tersedia && <input type="hidden" name="tersedia" value="1" />}
      </KotakCari>
      <nav aria-label={t(lang, 'katalog.genre')} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        <Link href={keGenre()} className={`p-pil ${saringan.genre ? '' : 'p-pil-aktif'}`} aria-current={saringan.genre ? undefined : 'true'}>{t(lang, 'katalog.semuaGenre')}</Link>
        {daftarGenre(buku).map(({ genre, jumlah }) => (
          <Link key={genre} href={keGenre(genre)} className={`p-pil ${saringan.genre === genre ? 'p-pil-aktif' : ''}`} aria-current={saringan.genre === genre ? 'true' : undefined}>
            {LABEL_GENRE[genre][lang]} ({jumlah})
          </Link>
        ))}
      </nav>
      <form action={`/${lang}/katalog`} className="flex flex-wrap items-end gap-3">
        {saringan.q && <input type="hidden" name="q" value={saringan.q} />}
        {saringan.genre && <input type="hidden" name="genre" value={saringan.genre} />}
        <label className="min-w-56 flex-1 space-y-1 text-sm font-bold">
          <span>{t(lang, 'katalog.pengarang')}</span>
          <select name="pengarang" defaultValue={saringan.pengarang ?? ''} className="p-input">
            <option value="">{t(lang, 'katalog.semuaPengarang')}</option>
            {daftarPengarang(buku, saringan.genre).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
          <input type="checkbox" name="tersedia" value="1" defaultChecked={saringan.tersedia} className="size-5" />
          {t(lang, 'katalog.hanyaTersedia')}
        </label>
        <button type="submit" className="p-tombol">{t(lang, 'katalog.terapkan')}</button>
      </form>
      {hasil.length === 0 ? (
        <div className="p-kartu space-y-3 p-6 text-center">
          <p>{t(lang, 'katalog.kosong')}</p>
          <Link href={`/${lang}/katalog`} className="p-tombol">{t(lang, 'katalog.reset')}</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hasil.map(b => <KartuBuku key={b.id} lang={lang} buku={b} />)}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Verifikasi**

Run: `npx vitest run tests/perpus/sampul.test.ts tests/components/kartu-buku-publik.test.tsx && npx tsc --noEmit && npm run build 2>&1 | tail -20`
Expected: PASS; build memuat `/perpusbq/[lang]` dan `/perpusbq/[lang]/katalog`.

Di `http://perpus.localhost:3000/id`: statistik sesuai data (232 judul), cari "tere" menyaring, klik genre lalu pengarang menyaring dan mempertahankan `q`, ganti bahasa mempertahankan query, label genre berubah tetapi judul tidak. Periksa 390px tanpa scroll horizontal halaman. Sertakan screenshot.

- [ ] **Step 5: Commit**

```bash
git add lib/perpus/sampul.ts components/perpus-publik app/perpusbq tests/perpus/sampul.test.ts tests/components/kartu-buku-publik.test.tsx
git commit -m "feat(perpus): beranda & katalog publik — cari, genre → pengarang, hanya tersedia"
```

---

### Task 7: Detail buku & Donatur

**Files:**
- Create: `app/perpusbq/[lang]/buku/[id]/page.tsx`, `app/perpusbq/[lang]/donatur/page.tsx`, `components/perpus-publik/PanelDonatur.tsx`
- Test: `tests/components/panel-donatur.test.tsx`

**Interfaces:**
- Consumes: `ambilBukuPublik`, `listDonasiPublik`, `ambilRingkasanPublik`, `listKatalogPublik` (Task 3); `rupiahPublik`, `tanggalPublik`, `t`, `metaHalaman`, `urlKatalog` (Task 4); `SampulBuku`, `KartuBuku` (Task 6).
- Produces: `<PanelDonatur lang tab donasi ringkasan />`, `tab: 'infaq' | 'wakaf'`.

- [ ] **Step 1: Tulis tes yang gagal**

`tests/components/panel-donatur.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PanelDonatur } from '@/components/perpus-publik/PanelDonatur';
import type { DonasiPublik, RingkasanPublik } from '@/lib/perpus/tipe';

const ringkasan: RingkasanPublik = { judul: 1, eksemplar: 1, donatur: 2, totalInfaq: 1500000, totalPengadaan: 500000, saldo: 1000000 };
const donasi: DonasiPublik[] = [
  { id: '1', tanggal: '2026-03-05', tanggalTeks: null, nama: 'Fulan', jenis: 'uang', jumlahBuku: null, buku: [] },
  { id: '2', tanggal: null, tanggalTeks: 'Ramadhan', nama: 'Fulanah', jenis: 'buku', jumlahBuku: 2, buku: [{ idPendek: 'abcd1234', judul: 'Bumi' }] },
  { id: '3', tanggal: null, tanggalTeks: null, nama: 'Hamba Allah', jenis: 'buku', jumlahBuku: 3, buku: [] },
];
const render = (tab: 'infaq' | 'wakaf') => renderToStaticMarkup(<PanelDonatur lang="id" tab={tab} donasi={donasi} ringkasan={ringkasan} />);

describe('PanelDonatur', () => {
  it('Infaq: nama & tanggal, nominal hanya di ringkasan', () => {
    const html = render('infaq');
    expect(html).toContain('Fulan');
    expect(html).toContain('5 Mar 2026');
    expect(html).not.toContain('Fulanah');
    expect(html).toContain('Rp1.500.000');
    expect(html.match(/Rp/g)).toHaveLength(3);
  });
  it('Wakaf: judul tertaut ke katalog; tanpa tautan → jumlah buku', () => {
    const html = render('wakaf');
    expect(html).toContain('href="/id/buku/abcd1234"');
    expect(html).toContain('3 buku');
  });
  it('tab aktif ditandai', () => {
    expect(render('wakaf')).toMatch(/aria-current="true"[^>]*>Wakaf buku/);
  });
});
```

Run: `npx vitest run tests/components/panel-donatur.test.tsx`
Expected: FAIL, modul tidak ada.

- [ ] **Step 2: Implementasi**

`components/perpus-publik/PanelDonatur.tsx`:

```tsx
import Link from 'next/link';
import type { Bahasa } from '@/lib/perpus/ddc';
import { rupiahPublik, tanggalPublik } from '@/lib/perpus/format-publik';
import { t } from '@/lib/perpus/i18n';
import type { DonasiPublik, RingkasanPublik } from '@/lib/perpus/tipe';

export type TabDonatur = 'infaq' | 'wakaf';

export function PanelDonatur({ lang, tab, donasi, ringkasan }: { lang: Bahasa; tab: TabDonatur; donasi: DonasiPublik[]; ringkasan: RingkasanPublik }) {
  const baris = donasi.filter(d => d.jenis === (tab === 'infaq' ? 'uang' : 'buku'));
  const total = [
    ['donatur.totalInfaq', ringkasan.totalInfaq],
    ['donatur.pengadaan', ringkasan.totalPengadaan],
    ['donatur.saldo', ringkasan.saldo],
  ] as const;
  const tautanTab = (nilai: TabDonatur, kunci: 'donatur.tabInfaq' | 'donatur.tabWakaf') => (
    <Link href={`/${lang}/donatur${nilai === 'wakaf' ? '?tab=wakaf' : ''}`} className={`p-pil ${tab === nilai ? 'p-pil-aktif' : ''}`} aria-current={tab === nilai ? 'true' : undefined}>
      {t(lang, kunci)}
    </Link>
  );
  return (
    <>
      <dl className="grid gap-3 sm:grid-cols-3">
        {total.map(([kunci, n]) => (
          <div key={kunci} className="p-kartu p-4">
            <dt className="text-xs font-bold text-perpus-tinta-lembut">{t(lang, kunci)}</dt>
            <dd className="p-h2">{rupiahPublik(lang, n)}</dd>
          </div>
        ))}
      </dl>
      <nav className="flex gap-2" aria-label={t(lang, 'donatur.judul')}>
        {tautanTab('infaq', 'donatur.tabInfaq')}
        {tautanTab('wakaf', 'donatur.tabWakaf')}
      </nav>
      {baris.length === 0 && <p className="p-kartu p-6 text-center">{t(lang, 'donatur.kosong')}</p>}
      <ul className="space-y-2">
        {baris.map(d => (
          <li key={d.id} className="p-baris flex-wrap justify-between">
            <span className="font-extrabold">{d.nama}</span>
            <span className="text-sm text-perpus-tinta-lembut">{tanggalPublik(lang, d.tanggal, d.tanggalTeks)}</span>
            {tab === 'wakaf' && (
              <div className="w-full text-sm">
                {d.buku.length > 0
                  ? <ul className="space-y-1">{d.buku.map(b => <li key={b.idPendek}><Link href={`/${lang}/buku/${b.idPendek}`} className="underline underline-offset-2">{b.judul}</Link></li>)}</ul>
                  : d.jumlahBuku ? t(lang, 'donatur.jumlahBuku', { n: d.jumlahBuku }) : null}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
```

`app/perpusbq/[lang]/donatur/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { PanelDonatur } from '@/components/perpus-publik/PanelDonatur';
import { ambilRingkasanPublik, listDonasiPublik } from '@/lib/db/perpus-publik-repo';
import { adaBahasa } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';
import { metaHalaman } from '@/lib/perpus/meta';
import { klienAnon } from '@/lib/supabase/anon';

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ tab?: string | string[] }> };

export async function generateMetadata({ params }: Pick<Props, 'params'>) {
  const { lang } = await params;
  return adaBahasa(lang) ? metaHalaman(lang, '/donatur', t(lang, 'donatur.judul')) : {};
}

export default async function Donatur({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!adaBahasa(lang)) notFound();
  const { tab } = await searchParams;
  const c = klienAnon();
  const [donasi, ringkasan] = await Promise.all([listDonasiPublik(c), ambilRingkasanPublik(c)]);
  return (
    <>
      <header className="space-y-1">
        <h1 className="p-h1">{t(lang, 'donatur.judul')}</h1>
        <p className="text-perpus-tinta-lembut">{t(lang, 'donatur.sub')}</p>
      </header>
      <PanelDonatur lang={lang} tab={tab === 'wakaf' ? 'wakaf' : 'infaq'} donasi={donasi} ringkasan={ringkasan} />
    </>
  );
}
```

`app/perpusbq/[lang]/buku/[id]/page.tsx`:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { SampulBuku } from '@/components/perpus-publik/SampulBuku';
import { ambilBukuPublik } from '@/lib/db/perpus-publik-repo';
import { genreDari, LABEL_GENRE, labelKelas, type Bahasa } from '@/lib/perpus/ddc';
import { adaBahasa } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';
import { urlKatalog } from '@/lib/perpus/katalog';
import { metaHalaman } from '@/lib/perpus/meta';
import type { BukuPublik } from '@/lib/perpus/tipe';
import { klienAnon } from '@/lib/supabase/anon';

export const revalidate = 300;

type Props = { params: Promise<{ lang: string; id: string }> };

const ambil = (id: string) => (/^[0-9a-f]{8}$/.test(id) ? ambilBukuPublik(klienAnon(), id) : Promise.resolve(null));

export async function generateMetadata({ params }: Props) {
  const { lang, id } = await params;
  const buku = adaBahasa(lang) ? await ambil(id) : null;
  return adaBahasa(lang) && buku ? metaHalaman(lang, `/buku/${id}`, buku.judul, buku.penulis || undefined) : {};
}

function teksAsal(lang: Bahasa, b: BukuPublik) {
  if (b.asal !== 'wakaf') return t(lang, b.asal === 'pengadaan' ? 'asal.pengadaan' : 'asal.koleksi_awal');
  return b.namaDonatur ? t(lang, 'asal.wakaf', { nama: b.namaDonatur }) : t(lang, 'asal.wakafAnonim');
}

export default async function DetailBuku({ params }: Props) {
  const { lang, id } = await params;
  if (!adaBahasa(lang)) notFound();
  const buku = await ambil(id);
  if (!buku) notFound();
  const genre = genreDari(buku.kelasDdc);
  const rincian = [
    ['buku.nomorPanggil', buku.nomorPanggil ?? '—'],
    ['buku.genre', LABEL_GENRE[genre][lang]],
    ['buku.kelas', buku.kelasDdc ? labelKelas(buku.kelasDdc, lang) : '—'],
    ['buku.asal', teksAsal(lang, buku)],
    ['buku.ketersediaan', buku.tersedia > 0 ? t(lang, 'buku.tersedia', { n: buku.tersedia, total: buku.eksemplar }) : t(lang, 'buku.habis')],
  ] as const;
  return (
    <>
      <Link href={`/${lang}/katalog`} className="p-pil w-fit gap-1"><ArrowLeft size={16} aria-hidden /> {t(lang, 'buku.kembali')}</Link>
      <article className="p-kartu flex flex-col gap-6 p-5 sm:flex-row">
        <SampulBuku buku={buku} besar />
        <div className="min-w-0 flex-1 space-y-4">
          <header className="space-y-1">
            <h1 className="p-h2 text-3xl">{buku.judul}</h1>
            <p className="text-perpus-tinta-lembut">{buku.penulis || t(lang, 'buku.penulisKosong')}</p>
          </header>
          <dl className="grid gap-3 sm:grid-cols-2">
            {rincian.map(([kunci, nilai]) => (
              <div key={kunci}>
                <dt className="text-xs font-bold text-perpus-tinta-lembut">{t(lang, kunci)}</dt>
                <dd className={kunci === 'buku.nomorPanggil' ? 'font-mono font-bold' : 'font-bold'}>{nilai}</dd>
              </div>
            ))}
          </dl>
          {buku.penulis && <Link href={urlKatalog(lang, { pengarang: buku.penulis })} className="p-tombol">{t(lang, 'buku.lainPenulis')}</Link>}
        </div>
      </article>
    </>
  );
}
```

- [ ] **Step 3: Verifikasi**

Run: `npx vitest run tests/components/panel-donatur.test.tsx tests/perpus/i18n.test.ts && npx tsc --noEmit && npm run build 2>&1 | tail -20`
Expected: PASS.

Di browser: `/en/buku/<id>` memuat detail; `/id/buku/zzzzzzzz` 404; `/id/donatur` menampilkan ringkasan tiga angka tanpa nominal per orang; tab Wakaf menaut ke katalog. Pastikan respons jaringan `perpus_donasi_publik` tidak memuat `jumlah` dengan `curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/perpus_donasi_publik?limit=1" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"`. Sertakan screenshot.

- [ ] **Step 4: Commit**

```bash
git add app/perpusbq components/perpus-publik tests/components/panel-donatur.test.tsx
git commit -m "feat(perpus): detail buku & halaman donatur publik — infaq tanpa nominal per orang, wakaf tertaut ke katalog"
```

---

### Task 8: Upload sampul di Ruang Perpus

**Files:**
- Create: `app/api/perpus/buku/[id]/sampul/route.ts`, `components/perpus/UnggahSampul.tsx`
- Modify: `lib/db/perpus-repo.ts`, `components/perpus/DaftarBuku.tsx`
- Test: `tests/api/perpus-sampul-route.test.ts`, `tests/db/perpus-repo.test.ts`

**Interfaces:**
- Consumes: `BUCKET_SAMPUL`, `pathSampul`, `urlSampul` (Task 6).
- Produces: `unggahSampulBuku(c, id, webp: Buffer): Promise<Buku>`; `POST /api/perpus/buku/[id]/sampul` (form `berkas`) → `{ success: true, data: Buku }`.

- [ ] **Step 1: Tulis tes yang gagal**

`tests/api/perpus-sampul-route.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = vi.hoisted(() => ({ unggahSampulBuku: vi.fn() }));
const requireRoom = vi.hoisted(() => vi.fn());
const toBuffer = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/perpus-repo', () => repo);
vi.mock('@/lib/auth/session', () => ({ requireRoom: (...a: unknown[]) => requireRoom(...a), authErrorResponse: () => null }));
vi.mock('sharp', () => ({ default: () => { const s: any = { rotate: () => s, resize: () => s, webp: () => s, toBuffer }; return s; } }));

import { POST } from '@/app/api/perpus/buku/[id]/sampul/route';

const permintaan = (berkas?: File) => {
  const fd = new FormData();
  if (berkas) fd.set('berkas', berkas);
  return { formData: async () => fd } as never;
};
const konteks = { params: Promise.resolve({ id: 'b1' }) };
const gambar = (ukuran = 10, tipe = 'image/jpeg') => new File([new Uint8Array(ukuran)], 'a.jpg', { type: tipe });

beforeEach(() => {
  repo.unggahSampulBuku.mockReset();
  toBuffer.mockReset().mockResolvedValue(Buffer.from('webp'));
  requireRoom.mockReset().mockResolvedValue({ user: { id: 'u1' }, supabase: {} });
});

describe('POST sampul', () => {
  it('memakai ruangan perpus & menyimpan hasil konversi', async () => {
    repo.unggahSampulBuku.mockResolvedValue({ id: 'b1', sampulPath: 'b1/1.webp' });
    const res = await POST(permintaan(gambar()), konteks);
    expect(requireRoom).toHaveBeenCalledWith('perpus');
    expect(repo.unggahSampulBuku).toHaveBeenCalledWith({}, 'b1', Buffer.from('webp'));
    expect((await res.json()).data.sampulPath).toBe('b1/1.webp');
  });
  it('tanpa berkas, bukan gambar, atau terlalu besar → 400', async () => {
    for (const r of [permintaan(), permintaan(gambar(10, 'application/pdf')), permintaan(gambar(4 * 1024 * 1024 + 1))]) {
      expect((await POST(r, konteks)).status).toBe(400);
    }
    expect(repo.unggahSampulBuku).not.toHaveBeenCalled();
  });
  it('gambar rusak → 400', async () => {
    toBuffer.mockRejectedValue(new Error('format'));
    expect((await POST(permintaan(gambar()), konteks)).status).toBe(400);
  });
});
```

Tambahkan di `tests/db/perpus-repo.test.ts` (impor `unggahSampulBuku`; `rantai` sudah ada):

```ts
describe('unggahSampulBuku', () => {
  it('mengunggah ke bucket sampul lalu menghapus file lama', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    let panggil = 0;
    const c = {
      storage: { from: (b: string) => { expect(b).toBe('perpus-sampul'); return { upload, remove }; } },
      from: () => rantai(panggil++ === 0
        ? { data: { sampulPath: 'b1/lama.webp' }, error: null }
        : { data: { id: 'b1', sampulPath: 'b1/baru.webp' }, error: null }),
    } as never;
    const hasil = await unggahSampulBuku(c, 'b1', Buffer.from('x'));
    expect(hasil.id).toBe('b1');
    expect(upload.mock.calls[0][0]).toMatch(/^b1\/\d+\.webp$/);
    expect(upload.mock.calls[0][2]).toMatchObject({ contentType: 'image/webp' });
    expect(remove).toHaveBeenCalledWith(['b1/lama.webp']);
  });
});
```

Run: `npx vitest run tests/api/perpus-sampul-route.test.ts tests/db/perpus-repo.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implementasi server**

Tambahkan ke `lib/db/perpus-repo.ts`:

```ts
import { BUCKET_SAMPUL, pathSampul } from '@/lib/perpus/sampul';

export async function unggahSampulBuku(c: SupabaseClient, id: string, webp: Buffer): Promise<Buku> {
  const { data: lama, error: galatBaca } = await c.from('perpus_buku').select('sampulPath').eq('id', id).single();
  if (galatBaca) throw new Error(`Gagal memuat buku: ${galatBaca.message}`);
  const path = pathSampul(id, Date.now());
  const { error: galatUnggah } = await c.storage.from(BUCKET_SAMPUL).upload(path, webp, { contentType: 'image/webp' });
  if (galatUnggah) throw new Error(`Gagal mengunggah sampul: ${galatUnggah.message}`);
  const { data, error } = await c.from('perpus_buku').update({ sampulPath: path, updatedAt: now() }).eq('id', id).select('*').single();
  if (error) throw new Error(`Gagal menyimpan sampul: ${error.message}`);
  // File lama yatim tidak merugikan siapa pun, jadi kegagalan hapus diabaikan.
  if (lama.sampulPath) await c.storage.from(BUCKET_SAMPUL).remove([lama.sampulPath]);
  return data as Buku;
}
```

`app/api/perpus/buku/[id]/sampul/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { unggahSampulBuku } from '@/lib/db/perpus-repo';

/** Di bawah batas body 4,5 MB Vercel; klien sudah mengecilkan gambar sebelum mengirim. */
const BATAS = 4 * 1024 * 1024;
const salah = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireRoom('perpus');
    const { id } = await params;
    const berkas = (await req.formData()).get('berkas');
    if (!(berkas instanceof File)) return salah('Pilih gambar sampul');
    if (!berkas.type.startsWith('image/')) return salah('Berkas harus berupa gambar');
    if (berkas.size > BATAS) return salah('Gambar terlalu besar (maks. 4 MB)');
    let webp: Buffer;
    try {
      webp = await sharp(Buffer.from(await berkas.arrayBuffer())).rotate()
        .resize({ width: 600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    } catch {
      return salah('Gambar tidak dapat dibaca');
    }
    return NextResponse.json({ success: true, data: await unggahSampulBuku(supabase, id, webp) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Unggah sampul error:', e);
    return NextResponse.json({ error: 'Gagal mengunggah sampul' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Implementasi UI**

`components/perpus/UnggahSampul.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { ImageSquare } from '@phosphor-icons/react';
import type { Buku } from '@/lib/perpus/tipe';
import { urlSampul } from '@/lib/perpus/sampul';

/** Foto ponsel sering melebihi batas body, jadi diperkecil dulu di browser. */
async function kecilkan(berkas: File): Promise<Blob> {
  const gambar = await createImageBitmap(berkas);
  const skala = Math.min(1, 1000 / gambar.width);
  const kanvas = document.createElement('canvas');
  kanvas.width = Math.round(gambar.width * skala);
  kanvas.height = Math.round(gambar.height * skala);
  kanvas.getContext('2d')!.drawImage(gambar, 0, 0, kanvas.width, kanvas.height);
  return new Promise((ok, gagal) => kanvas.toBlob(b => (b ? ok(b) : gagal(new Error('Gambar gagal diproses'))), 'image/jpeg', 0.85));
}

export function UnggahSampul({ buku, onSimpan, onGalat }: { buku: Buku; onSimpan: (b: Buku) => void; onGalat: (pesan: string) => void }) {
  const [sibuk, setSibuk] = useState(false);

  const pilih = async (berkas: File | undefined) => {
    if (!berkas) return;
    setSibuk(true);
    try {
      const form = new FormData();
      form.set('berkas', new File([await kecilkan(berkas)], 'sampul.jpg', { type: 'image/jpeg' }));
      const res = await fetch(`/api/perpus/buku/${buku.id}/sampul`, { method: 'POST', body: form });
      const d = await res.json();
      if (res.ok) onSimpan(d.data);
      else onGalat(d.error || 'Gagal mengunggah sampul');
    } catch (e) {
      onGalat(e instanceof Error ? e.message : 'Gagal mengunggah sampul');
    }
    setSibuk(false);
  };

  return (
    <label className={`relative block h-14 w-10 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-bq-garis ${sibuk ? 'opacity-50' : ''}`}>
      <span className="sr-only">Unggah sampul {buku.judul}</span>
      {buku.sampulPath
        ? <img src={urlSampul(buku.sampulPath)} alt="" className="h-full w-full object-cover" />
        : <span className="grid h-full w-full place-items-center text-bq-redup"><ImageSquare size={18} aria-hidden /></span>}
      <input type="file" accept="image/*" className="sr-only" disabled={sibuk} onChange={e => pilih(e.target.files?.[0])} />
    </label>
  );
}
```

Di `components/perpus/DaftarBuku.tsx`, impor komponen ini, lalu sebelum `<span className="font-mono …">` tambahkan (`PesanGalat` halaman sudah menampilkan `galat`):

```tsx
            <UnggahSampul buku={b} onGalat={setGalat} onSimpan={baru => setBuku(prev => prev?.map(x => (x.id === baru.id ? baru : x)) ?? null)} />
```

- [ ] **Step 4: Verifikasi**

Run: `npx vitest run tests/api/perpus-sampul-route.test.ts tests/db/perpus-repo.test.ts && npx tsc --noEmit`
Expected: PASS.

Upload satu sampul di `/perpus/buku` memerlukan sesi pustakawan pengguna. Bila tidak tersedia, catat bahwa alur nyata belum teruji dan minta pengguna mengujinya di Task 10, termasuk sampul tampil di katalog publik dalam ≤5 menit.

- [ ] **Step 5: Commit**

```bash
git add app/api/perpus lib/db/perpus-repo.ts components/perpus tests/api/perpus-sampul-route.test.ts tests/db/perpus-repo.test.ts
git commit -m "feat(perpus): upload sampul buku — diperkecil di browser, webp di bucket publik perpus-sampul"
```

---

### Task 9: Label PDF & aksesibilitas form

**Files:**
- Create: `lib/perpus/label-pdf.ts`
- Modify: `app/api/perpus/label/route.ts`, `components/perpus/AuditKode.tsx:90`, `components/perpus/FormBuku.tsx`, `components/perpus/DaftarBuku.tsx`, `tests/api/perpus-audit-route.test.ts:27`
- Test: `tests/perpus/label-pdf.test.ts`, `tests/api/perpus-audit-route.test.ts`, `tests/components/form-buku.test.tsx`

**Interfaces:**
- Consumes: `barisLabel` dari `lib/perpus/audit.ts` (`{ judul, lama, baru }[]`).
- Produces: `susunLabelPdf(baris: { judul: string; baru: string }[]): Promise<Uint8Array>`; `GET /api/perpus/label?format=pdf`.

- [ ] **Step 1: Tulis tes yang gagal**

`tests/perpus/label-pdf.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { susunLabelPdf, teksAman } from '@/lib/perpus/label-pdf';

const baris = (n: number) => Array.from({ length: n }, (_, i) => ({ judul: `Buku ${i}`, baru: `899.221 LIY b.${i}` }));

describe('label PDF', () => {
  it('24 label per halaman A4', async () => {
    const doc = await PDFDocument.load(await susunLabelPdf(baris(25)));
    expect(doc.getPageCount()).toBe(2);
    expect(Math.round(doc.getPage(0).getWidth())).toBe(595);
  });
  it('judul dengan huruf Arab atau tanda khusus tidak membuat galat', async () => {
    await expect(susunLabelPdf([{ judul: 'تفسير ‘Ibnu’ Café', baru: '297 KAT t' }])).resolves.toBeInstanceOf(Uint8Array);
  });
  it('teksAman hanya menyisakan karakter WinAnsi dasar', () => {
    expect(teksAman('Café ‘x’ تفسير')).toBe('Cafe x');
  });
  it('tanpa baris tetap menghasilkan satu halaman', async () => {
    expect((await PDFDocument.load(await susunLabelPdf([]))).getPageCount()).toBe(1);
  });
});
```

`tests/components/form-buku.test.tsx` (`renderToStaticMarkup` seperti tes komponen lain; `useEffect` tidak berjalan, jadi `fetch` tak perlu dimock):

```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FormBuku } from '@/components/perpus/FormBuku';

describe('FormBuku', () => {
  const doc = new DOMParser().parseFromString(renderToStaticMarkup(<FormBuku onSimpan={() => {}} />), 'text/html');
  it('setiap isian berada di dalam label', () => {
    for (const el of doc.querySelectorAll('input, select')) expect(el.closest('label')).toBeTruthy();
  });
  it('pratinjau nomor panggil diumumkan', () => {
    expect(doc.querySelectorAll('[role="status"]')).toHaveLength(1);
  });
});
```

Ubah `tests/api/perpus-audit-route.test.ts:27` menjadi `const res = await LABEL({ url: 'http://x/api/perpus/label' } as never);`, lalu tambahkan:

```ts
  it('format=pdf mengembalikan PDF', async () => {
    const res = await LABEL({ url: 'http://x/api/perpus/label?format=pdf' } as never);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
  });
```

Run: `npx vitest run tests/perpus/label-pdf.test.ts tests/api/perpus-audit-route.test.ts tests/components/form-buku.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Implementasi label**

`lib/perpus/label-pdf.ts`:

```ts
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const A4 = { lebar: 595.28, tinggi: 841.89 };
const TEPI = 18;
const KOLOM = 3;
const BARIS = 8;

/** Font bawaan PDF hanya WinAnsi; karakter lain membuat pdf-lib melempar galat. */
export const teksAman = (s: string) =>
  s.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim();

export async function susunLabelPdf(baris: { judul: string; baru: string }[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const tebal = await doc.embedFont(StandardFonts.HelveticaBold);
  const biasa = await doc.embedFont(StandardFonts.Helvetica);
  const lebar = (A4.lebar - TEPI * 2) / KOLOM;
  const tinggi = (A4.tinggi - TEPI * 2) / BARIS;
  const perHalaman = KOLOM * BARIS;
  let halaman = doc.addPage([A4.lebar, A4.tinggi]);

  baris.forEach((label, i) => {
    const posisi = i % perHalaman;
    if (i > 0 && posisi === 0) halaman = doc.addPage([A4.lebar, A4.tinggi]);
    const x = TEPI + (posisi % KOLOM) * lebar;
    const y = A4.tinggi - TEPI - (Math.floor(posisi / KOLOM) + 1) * tinggi;
    halaman.drawRectangle({ x, y, width: lebar, height: tinggi, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5 });
    // Satu bagian nomor per baris, seperti label punggung buku.
    teksAman(label.baru).split(' ').forEach((bagian, n) => {
      halaman.drawText(bagian, { x: x + 12, y: y + tinggi - 24 - n * 17, size: 14, font: tebal });
    });
    halaman.drawText(teksAman(label.judul).slice(0, 34), { x: x + 12, y: y + 8, size: 7, font: biasa });
  });
  return doc.save();
}
```

`app/api/perpus/label/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listBuku } from '@/lib/db/perpus-repo';
import { barisLabel, keCsv } from '@/lib/perpus/audit';
import { susunLabelPdf } from '@/lib/perpus/label-pdf';

/** Daftar label yang perlu dicetak (ulang), satu baris per eksemplar. */
export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireRoom('perpus');
    const baris = barisLabel(await listBuku(supabase, { statusKode: 'baku' }));
    if (new URL(req.url).searchParams.get('format') === 'pdf') {
      return new NextResponse(Buffer.from(await susunLabelPdf(baris)), {
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="label-perpus.pdf"' },
      });
    }
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

`components/perpus/AuditKode.tsx:89-90`: ganti isi prop `aksi` (komentar `<a>` biasa dipertahankan):

```tsx
        aksi={/* <a> biasa: next/link akan mem-prefetch rute API */
          <div className="flex gap-2">
            <a href="/api/perpus/label" download className={kelasTombolUtama}><DownloadSimple size={18} weight="bold" aria-hidden /> Label CSV</a>
            <a href="/api/perpus/label?format=pdf" download className={kelasTombolUtama}><DownloadSimple size={18} weight="bold" aria-hidden /> Label PDF</a>
          </div>} />
```

- [ ] **Step 3: Perbaiki aksesibilitas form**

Mayoritas isian `FormBuku` sudah dibungkus `<label>`. Celah nyata:

Di `components/perpus/FormBuku.tsx`, dua `<select>` wakaf & pengadaan hanya punya `aria-label`; beri label terlihat:

```tsx
      {asal === 'wakaf' && (
        <label className="block space-y-1"><span className={kelasLabel}>Donatur wakaf</span>
          <select className={kelasInput} value={donasiId} onChange={e => setDonasiId(e.target.value)}>
            <option value="">Pilih donatur wakaf…</option>
            {donasi.map(d => <option key={d.id} value={d.id}>{d.nama} · {d.jumlahBuku} buku · {d.tanggalTeks || d.tanggal || ''}</option>)}
          </select></label>
      )}
      {asal === 'pengadaan' && (
        <label className="block space-y-1"><span className={kelasLabel}>Pembelian</span>
          <select className={kelasInput} value={pengadaanId} onChange={e => setPengadaanId(e.target.value)}>
            <option value="">Pilih pembelian…</option>
            {pengadaan.map(p => <option key={p.id} value={p.id}>{p.tanggalTeks || p.tanggal} · Rp{p.total.toLocaleString('id-ID')}</option>)}
          </select></label>
      )}
```

Hasil AI & pratinjau nomor berubah tanpa fokus berpindah; umumkan:

```tsx
      {usulan && <p role="status" className="text-xs text-bq-redup">AI: {usulan}</p>}
```

```tsx
      <p role="status" className="text-sm">Nomor panggil: <span className="font-mono font-bold">{pratinjau}</span> <span className="text-xs text-bq-redup">(bila bentrok, server menambah huruf)</span></p>
```

Select wakaf & pengadaan hanya muncul setelah `asal` berubah, jadi tes statis tidak mencakupnya; periksa keduanya saat tinjauan kode.

Di `components/perpus/DaftarBuku.tsx`, kotak cari hanya punya placeholder; tambahkan `aria-label="Cari judul, penulis, atau nomor panggil"` pada `<input>`.

- [ ] **Step 4: Verifikasi**

Run: `npx vitest run tests/perpus/label-pdf.test.ts tests/api/perpus-audit-route.test.ts tests/components/form-buku.test.tsx && npx tsc --noEmit`
Expected: PASS.

Tulis satu PDF contoh ke scratchpad dan lihat hasilnya: panjang nomor panggil tidak melewati kotak dan baris nomor tidak menimpa judul (4 bagian: `899.221 LIY b.01 c.2`).

- [ ] **Step 5: Commit**

```bash
git add lib/perpus/label-pdf.ts app/api/perpus/label/route.ts components/perpus tests/perpus/label-pdf.test.ts tests/api/perpus-audit-route.test.ts tests/components/form-buku.test.tsx
git commit -m "feat(perpus): label PDF A4 & label aksesibel form buku"
```

---

### Task 10: Rilis

Langkah pengguna ditandai **[Pengguna]**. Deploy produksi adalah tindakan keluar: minta persetujuan pengguna sebelum menjalankannya.

**Files:**
- Modify: `docs/superpowers/specs/2026-11-03-perpus-bq-design.md` (catat penyimpangan ke §3/§6/§7)

- [ ] **Step 1: Verifikasi penuh**

Run: `npm test 2>&1 | tail -5 && npx tsc --noEmit && npm run build 2>&1 | tail -30`
Expected: semua lolos.

- [ ] **Step 2: Perbarui spec**

Di §3 ubah penyimpanan sampul menjadi bucket publik `perpus-sampul`. Di §7 catat bahwa host perpus menolak `/api/*` dan `/auth/*` sampai Tahap 3 dan bahwa bq-ku berada di `app/(bqku)`.

```bash
git add docs/superpowers/specs/2026-11-03-perpus-bq-design.md
git commit -m "docs(perpus): selaraskan spec dengan keputusan tahap 2"
```

- [ ] **Step 3: [Pengguna] Tentukan domain & pasang**

1. Pilih hostname (mis. `perpusbq.vercel.app` atau domain sendiri) dan tambahkan ke proyek Vercel `bq-ku`.
2. Set env `PERPUS_HOST` di Vercel (Production) dengan hostname itu.
3. Pastikan migrasi 0014 sudah berjalan di produksi (checkpoint Task 3).

- [ ] **Step 4: Deploy**

Setelah pengguna menyetujui, jalankan `npx vercel --prod` lalu `npx vercel ls`.
Expected: deployment terbaru `Ready`.

- [ ] **Step 5: Uji asap produksi**

Di host perpus: `/` mengarah ke bahasa, keempat halaman publik tampil, `/api/santri` 404. Di host bq-ku: login, ruangan santri/donatur/perpus berfungsi, `/perpusbq/id` 404. Upload satu sampul di Ruang Perpus dan pastikan tampil di katalog publik dalam ≤5 menit.
