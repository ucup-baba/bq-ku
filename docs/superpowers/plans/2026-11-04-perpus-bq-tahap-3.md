# Perpus BQ — Tahap 3 (Anggota & Peminjaman) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Peminjam umum masuk dengan Google di domain perpus, mendaftar sekali, mengajukan pinjaman, dan memantaunya di `/pinjamanku`; pustakawan memproses antrian ACC/Tolak/Verifikasi di Ruang Perpus; ketersediaan katalog publik mengikuti pinjaman aktif.

**Architecture:** Semua tulisan peminjam lewat fungsi Postgres `security definer` (tanpa policy insert/update untuk anggota), dan ACC mengunci baris buku agar eksemplar terakhir tidak ganda. Halaman publik tetap statis: `/masuk`, `/daftar`, dan `/pinjamanku` adalah cangkang statis berisi komponen klien, sedangkan `proxy.ts` memeriksa sesi hanya untuk tiga halaman itu. Aturan status, tanggal WIB, dan keputusan sesi adalah modul murni yang diuji vitest.

**Tech Stack:** Next.js 16 (App Router, `proxy.ts`), React 19, Supabase (Postgres, RLS, Auth Google), `@supabase/ssr`, zod, Tailwind 3, `@phosphor-icons/react`, vitest.

**Spec:** `docs/superpowers/specs/2026-11-03-perpus-bq-design.md` §3 (`perpus_anggota`, `perpus_pinjaman`, ketersediaan, RLS), §6, §7, §9, §10.

## Keputusan yang Perlu Ditinjau Pengguna

1. **Akun peminjam disembunyikan dari bq-ku (sudah dipilih pengguna).** Setiap akun Google mendapat profil `VIEWER` nonaktif dari `handle_new_user`, sehingga tanpa penanganan akan menaikkan notifikasi "akun menunggu" dan memenuhi `/pengguna`. Akun nonaktif yang ada di `perpus_anggota` tidak dihitung dan tidak ditampilkan. Yang sudah login tetapi belum mengisi form daftar masih terlihat. Pemberian akses bq-ku tetap lewat tambah email, karena trigger mengaktifkan profilnya.
2. **Nav publik 4 slot, bukan 5 (Task 5).** Spec menulis Beranda · Katalog · Donatur · Pinjamanku · Masuk/Akun. Slot keempat rencana ini berganti: **Masuk** saat belum login, **Pinjamanku** saat sudah. Pinjamanku tanpa sesi hanya berakhir di Masuk, dan label kelima tidak muat di lebar 375px bersama pengalih bahasa. Tombol **Keluar** ada di halaman Pinjamanku.
3. **Statistik beranda: Eksemplar diganti Sedang dipinjam (Task 5)**, sesuai §6 (judul, sedang dipinjam, donatur). Kisi tetap 3 kolom.
4. **Pengajuan ditolak bila stok 0** (`stok_habis`), karena reservasi antre di luar cakupan §1. ACC tetap memeriksa ulang stok.
5. **Akun dengan riwayat pinjaman tidak bisa dihapus di `/pengguna` (Task 7):** 409 dengan pesan jelas, agar riwayat tidak hilang.

## Global Constraints

- Baca panduan Next di `node_modules/next/dist/docs/` sebelum menulis kode Next (lihat `AGENTS.md`). Worktree baru tidak punya `node_modules`: jalankan `npm ci` lebih dulu.
- Nama kolom memakai **camelCase berkutip** (`"anggotaId"`, `"jatuhTempo"`). Nama tabel/view/fungsi tetap `perpus_*`.
- Migrasi dijalankan **manual oleh pengguna** di SQL Editor Supabase; file harus aman dijalankan ulang. MCP Supabase tidak punya akses ke proyek ini.
- Supabase memberi `EXECUTE` ke `anon`/`authenticated` lewat default privileges, jadi `revoke ... from public` saja tidak cukup: cabut juga dari `anon, authenticated`.
- `requireUser`/`requireRoom` **tidak bisa** dipakai untuk peminjam: profil mereka nonaktif sehingga keduanya melempar 401. API `perpus-publik` memakai `requireMasuk` (Task 4).
- Tanggal "hari ini" selalu menurut WIB: `perpus_hari_ini()` di SQL, `hariIniWib()` di TypeScript. `current_date` Postgres berjalan di UTC.
- Halaman publik tidak boleh membaca cookie di server: layout dan halaman ber-`revalidate` tetap statis. Status sesi dibaca di komponen klien.
- Komponen klien di perpus **jangan memakai `usePathname`** (halaman di-rewrite). Pakai `useSelectedLayoutSegment(s)`.
- Tautan publik memakai URL publik (`/id/katalog`), bukan `/perpusbq/id/katalog`.
- URL callback OAuth harus persis sama dengan entri Redirect URLs (query string ikut dicocokkan), jadi tujuan setelah login dititipkan lewat cookie `bq_next`, bukan `?next=`.
- Teks publik lewat `t(lang, kunci)`; kunci `id.ts` dan `en.ts` wajib identik. UI Ruang Perpus hanya bahasa Indonesia.
- Node lokal v20 (package meminta 22): jangan memakai API Node 22-only.
- `next-env.d.ts` berubah sendiri oleh `next dev`; jangan di-commit.
- Commit per task; pesan Indonesia gaya `feat(perpus): …`, diakhiri `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Push tidak auto-deploy: `npx vercel --prod` lalu `npx vercel ls`. Mode otomatis bisa menolak deploy sampai pengguna mengizinkan.

**Penyimpangan sadar dari spec:**
- Keputusan 1–5 di atas.
- Nama kolom spec (`jatuh_tempo`, `user_id`) ditulis camelCase berkutip sesuai tabel `perpus_*` yang sudah ada.
- Anggota tidak punya policy insert sama sekali: pengajuan lewat `perpus_ajukan_pinjaman`, satu pintu dengan pemeriksaan status anggota dan stok.
- Tambahan: `perpus_daftar_anggota` (mencegah anggota mengubah `status` sendiri), view `perpus_pinjamanku` (anggota tidak bisa membaca `perpus_buku`), indeks unik pinjaman aktif per anggota dan buku, kolom `"sedangDipinjam"` di akhir `perpus_ringkasan_publik`.
- Cek sesi di proxy berupa redirect saja; data `/pinjamanku` diambil klien lewat API. Browser menerima cookie hasil refresh sebelum memanggil API, jadi kita tidak bergantung pada penerusan cookie lewat rewrite (refresh token Supabase sekali pakai).
- Tidak ada edit profil anggota dan tidak ada ubah data anggota oleh pustakawan selain blokir/aktifkan.

## File Structure

| File | Tanggung jawab |
|---|---|
| `supabase/migrations/0015_perpus_pinjaman.sql` | tabel, RLS, fungsi, view |
| `supabase/tests/perpus_pinjaman.sql` | uji manual RLS & transisi (uji ACC paralel ada di uji asap Task 9, karena butuh dua koneksi) |
| `lib/perpus/pinjaman.ts` | aturan status, tanggal WIB, galat, antrian, pesan WA (murni) |
| `lib/perpus/pinjaman-respon.ts` | `PinjamanError` → respons HTTP |
| `lib/perpus/tipe.ts`, `lib/validation/perpus.ts` | tipe & skema zod |
| `lib/perpus/domain.ts`, `proxy.ts` | rute host perpus, `putusanSesi`, `nextAman` |
| `app/auth/callback/route.ts` | cabang host perpus |
| `lib/perpus/sesi-anggota.ts` | `requireMasuk` |
| `lib/db/perpus-pinjaman-repo.ts` | query & RPC anggota dan pinjaman |
| `app/api/perpus-publik/**` | API anggota |
| `app/api/perpus/pinjaman/**`, `app/api/perpus/anggota/**` | API pustakawan |
| `app/perpusbq/[lang]/{masuk,daftar,pinjamanku}/page.tsx` | cangkang statis |
| `components/perpus-publik/{FormMasuk,FormDaftar,TombolPinjam,PinjamankuKlien}.tsx` | klien publik |
| `components/perpus/{usePinjaman.ts,KartuPinjaman,AntrianPinjaman,DaftarPinjaman,DaftarAnggota}.tsx` | Ruang Perpus |
| `app/api/notifikasi/route.ts`, `lib/notifikasi/jenis.ts`, `app/api/pengguna/**` | notifikasi & penyaringan akun peminjam |

---

### Task 1: Aturan pinjaman, tipe, dan skema

**Files:**
- Create: `lib/perpus/pinjaman.ts`, `lib/perpus/pinjaman-respon.ts`
- Modify: `lib/perpus/tipe.ts`, `lib/validation/perpus.ts`
- Test: `tests/perpus/pinjaman.test.ts`, `tests/validation/perpus.test.ts`

**Interfaces:**
- Produces: tipe `StatusPinjaman`, `AksiPinjaman`, `Anggota`, `Pinjaman`, `PinjamanAdmin`, `Pinjamanku`, `StatusPinjamBuku`, `AnggotaAdmin`; `ATURAN`, `transisi`, `hariIniWib`, `tambahHari`, `jatuhTempoBawaan`, `terlambat`, `susunAntrian`, `pesanPengingatWa`, `bukanPeminjam`, `galatDariRpc`, `PinjamanError`, `KodeGalat`, `LABEL_STATUS`; `pinjamanErrorResponse`; skema `daftarAnggotaSchema`, `ajukanSchema`, `aksiAnggotaSchema`, `aksiPustakawanSchema`, `statusAnggotaSchema`.

- [ ] **Step 1: Tulis tes yang gagal**

`tests/perpus/pinjaman.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  ATURAN, PinjamanError, bukanPeminjam, galatDariRpc, hariIniWib, jatuhTempoBawaan,
  pesanPengingatWa, susunAntrian, tambahHari, terlambat, transisi,
} from '@/lib/perpus/pinjaman';
import type { AksiPinjaman, StatusPinjaman } from '@/lib/perpus/tipe';

const SEMUA: StatusPinjaman[] = ['diajukan', 'dipinjam', 'menunggu_verifikasi', 'dikembalikan', 'ditolak', 'dibatalkan'];

describe('transisi', () => {
  const sah: [StatusPinjaman, AksiPinjaman, StatusPinjaman][] = [
    ['diajukan', 'acc', 'dipinjam'],
    ['diajukan', 'tolak', 'ditolak'],
    ['diajukan', 'batal', 'dibatalkan'],
    ['dipinjam', 'klaim', 'menunggu_verifikasi'],
    ['dipinjam', 'tandai_kembali', 'dikembalikan'],
    ['dipinjam', 'perpanjang', 'dipinjam'],
    ['menunggu_verifikasi', 'verifikasi', 'dikembalikan'],
  ];
  it.each(sah)('%s + %s → %s', (dari, aksi, ke) => {
    expect(transisi(dari, aksi)).toBe(ke);
  });
  it('kombinasi lain tidak sah', () => {
    for (const status of SEMUA) for (const aksi of Object.keys(ATURAN) as AksiPinjaman[]) {
      if (!sah.some(([d, a]) => d === status && a === aksi)) expect(transisi(status, aksi)).toBeNull();
    }
  });
});

describe('tanggal WIB', () => {
  it('pukul 18.00 UTC sudah besok menurut WIB', () => {
    expect(hariIniWib(new Date('2026-11-04T18:00:00Z'))).toBe('2026-11-05');
    expect(hariIniWib(new Date('2026-11-04T16:59:00Z'))).toBe('2026-11-04');
  });
  it('tambahHari melewati batas bulan', () => {
    expect(tambahHari('2026-11-25', 14)).toBe('2026-12-09');
  });
  it('jatuh tempo bawaan 14 hari', () => {
    expect(jatuhTempoBawaan(new Date('2026-11-04T01:00:00Z'))).toBe('2026-11-18');
  });
});

describe('terlambat', () => {
  it('hanya bila dipinjam dan melewati jatuh tempo', () => {
    expect(terlambat({ status: 'dipinjam', jatuhTempo: '2026-11-03' }, '2026-11-04')).toBe(true);
    expect(terlambat({ status: 'dipinjam', jatuhTempo: '2026-11-04' }, '2026-11-04')).toBe(false);
    expect(terlambat({ status: 'menunggu_verifikasi', jatuhTempo: '2026-11-03' }, '2026-11-04')).toBe(false);
    expect(terlambat({ status: 'dipinjam', jatuhTempo: null }, '2026-11-04')).toBe(false);
  });
});

describe('susunAntrian', () => {
  it('memisah pengajuan, klaim, terlambat', () => {
    const r = [
      { id: '1', status: 'diajukan', jatuhTempo: null },
      { id: '2', status: 'menunggu_verifikasi', jatuhTempo: '2026-11-01' },
      { id: '3', status: 'dipinjam', jatuhTempo: '2026-11-01' },
      { id: '4', status: 'dipinjam', jatuhTempo: '2026-12-01' },
    ] as never[];
    const a = susunAntrian(r, '2026-11-04');
    expect(a.pengajuan.map((p: { id: string }) => p.id)).toEqual(['1']);
    expect(a.klaim.map((p: { id: string }) => p.id)).toEqual(['2']);
    expect(a.terlambat.map((p: { id: string }) => p.id)).toEqual(['3']);
  });
});

describe('galatDariRpc', () => {
  it('mengurai kode dan status saat ini', () => {
    const g = galatDariRpc('perpus:status_tidak_sah:dipinjam');
    expect(g).toBeInstanceOf(PinjamanError);
    expect(g).toMatchObject({ kode: 'status_tidak_sah', statusSaatIni: 'dipinjam' });
    expect(galatDariRpc('perpus:stok_habis').message).toBe('Semua eksemplar sedang dipinjam');
  });
  it('pesan lain tetap Error biasa', () => {
    const g = galatDariRpc('koneksi putus');
    expect(g).not.toBeInstanceOf(PinjamanError);
    expect(g.message).toContain('koneksi putus');
  });
});

describe('pesanPengingatWa', () => {
  const dasar = { nama: 'Aisyah', judul: 'Rembulan', jatuhTempo: '2026-11-18' };
  it('sebelum jatuh tempo menyebut tanggal', () => {
    const p = pesanPengingatWa(dasar, '2026-11-10');
    expect(p).toContain('Aisyah');
    expect(p).toContain('Rembulan');
    expect(p).toContain('18 Nov 2026');
    expect(p).not.toContain('terlewat');
  });
  it('terlambat disebutkan', () => {
    expect(pesanPengingatWa(dasar, '2026-11-20')).toContain('terlewat');
  });
});

describe('bukanPeminjam', () => {
  it('membuang akun nonaktif yang terdaftar anggota', () => {
    const rows = [{ id: 'a', aktif: false }, { id: 'b', aktif: false }, { id: 'c', aktif: true }];
    expect(bukanPeminjam(rows, new Set(['a', 'c'])).map(r => r.id)).toEqual(['b', 'c']);
  });
});
```

Tambahkan ke `tests/validation/perpus.test.ts` (sesuaikan baris impor yang ada):

```ts
import { aksiAnggotaSchema, aksiPustakawanSchema, daftarAnggotaSchema, statusAnggotaSchema } from '@/lib/validation/perpus';

describe('skema pinjaman', () => {
  it('nomor WA dinormalkan ke 62', () => {
    expect(daftarAnggotaSchema.parse({ nama: 'Aisyah', noWa: '0812-3456-7890' }).noWa).toBe('6281234567890');
  });
  it('nomor WA terlalu pendek ditolak', () => {
    expect(daftarAnggotaSchema.safeParse({ nama: 'Aisyah', noWa: '0812' }).success).toBe(false);
  });
  it('anggota hanya boleh batal & klaim', () => {
    expect(aksiAnggotaSchema.safeParse({ aksi: 'batal' }).success).toBe(true);
    expect(aksiAnggotaSchema.safeParse({ aksi: 'acc' }).success).toBe(false);
  });
  it('ACC tanpa tanggal memakai bawaan; tanggal lampau ditolak', () => {
    expect(aksiPustakawanSchema.parse({ aksi: 'acc' })).toEqual({ aksi: 'acc', jatuhTempo: null });
    expect(aksiPustakawanSchema.safeParse({ aksi: 'acc', jatuhTempo: '2020-01-01' }).success).toBe(false);
  });
  it('perpanjang wajib tanggal', () => {
    expect(aksiPustakawanSchema.safeParse({ aksi: 'perpanjang' }).success).toBe(false);
  });
  it('status anggota hanya aktif/diblokir', () => {
    expect(statusAnggotaSchema.safeParse({ status: 'hapus' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/perpus/pinjaman.test.ts tests/validation/perpus.test.ts`
Expected: FAIL, modul `@/lib/perpus/pinjaman` tidak ditemukan.

- [ ] **Step 3: Tambahkan tipe di akhir `lib/perpus/tipe.ts`**

Tambahkan juga `sedangDipinjam: number;` ke `RingkasanPublik`.

```ts
export type StatusPinjaman = 'diajukan' | 'dipinjam' | 'menunggu_verifikasi' | 'dikembalikan' | 'ditolak' | 'dibatalkan';
export type AksiPinjaman = 'acc' | 'tolak' | 'batal' | 'klaim' | 'verifikasi' | 'tandai_kembali' | 'perpanjang';
export type StatusAnggota = 'aktif' | 'diblokir';

export type Anggota = { userId: string; nama: string; noWa: string; status: StatusAnggota; createdAt: string };

export type Pinjaman = {
  id: string; anggotaId: string; bukuId: string; status: StatusPinjaman; jatuhTempo: string | null;
  diajukanAt: string; disetujuiAt: string | null; diserahkanAt: string | null;
  diklaimKembaliAt: string | null; dikembalikanAt: string | null;
  diprosesOleh: string | null; catatan: string | null;
};

export type PinjamanAdmin = Pinjaman & {
  anggota: Pick<Anggota, 'nama' | 'noWa' | 'status'>;
  buku: { judul: string; penulis: string; nomorPanggil: string };
};

/** Baris view `perpus_pinjamanku`. */
export type Pinjamanku = {
  id: string; status: StatusPinjaman; jatuhTempo: string | null; diajukanAt: string;
  dikembalikanAt: string | null; catatan: string | null;
  idPendek: string; judul: string; penulis: string; nomorPanggil: string | null;
};

/** Jawaban `GET /api/perpus-publik/status`. */
export type StatusPinjamBuku = {
  masuk: boolean; anggota: StatusAnggota | null; pinjamanAktif: StatusPinjaman | null; tersedia: number | null;
};

export type AnggotaAdmin = Anggota & { pinjaman: { status: StatusPinjaman }[] };
```

- [ ] **Step 4: Tulis `lib/perpus/pinjaman.ts`**

```ts
import type { AksiPinjaman, Pinjaman, StatusPinjaman } from '@/lib/perpus/tipe';

export const JATUH_TEMPO_BAWAAN_HARI = 14;
const GESER_WIB_MS = 7 * 3600_000;
const HARI_MS = 24 * 3600_000;

/** Sama dengan transisi di spec §3. `acc`, `batal`, `klaim` dijalankan fungsi SQL 0015; sisanya oleh repo. */
export const ATURAN: Record<AksiPinjaman, { dari: StatusPinjaman; ke: StatusPinjaman }> = {
  acc: { dari: 'diajukan', ke: 'dipinjam' },
  tolak: { dari: 'diajukan', ke: 'ditolak' },
  batal: { dari: 'diajukan', ke: 'dibatalkan' },
  klaim: { dari: 'dipinjam', ke: 'menunggu_verifikasi' },
  verifikasi: { dari: 'menunggu_verifikasi', ke: 'dikembalikan' },
  tandai_kembali: { dari: 'dipinjam', ke: 'dikembalikan' },
  perpanjang: { dari: 'dipinjam', ke: 'dipinjam' },
};

export const transisi = (status: StatusPinjaman, aksi: AksiPinjaman): StatusPinjaman | null =>
  (ATURAN[aksi].dari === status ? ATURAN[aksi].ke : null);

export const LABEL_STATUS: Record<StatusPinjaman, string> = {
  diajukan: 'Diajukan', dipinjam: 'Dipinjam', menunggu_verifikasi: 'Menunggu verifikasi',
  dikembalikan: 'Dikembalikan', ditolak: 'Ditolak', dibatalkan: 'Dibatalkan',
};

export const hariIniWib = (sekarang = new Date()) => new Date(sekarang.getTime() + GESER_WIB_MS).toISOString().slice(0, 10);
export const tambahHari = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * HARI_MS).toISOString().slice(0, 10);
export const jatuhTempoBawaan = (sekarang = new Date()) => tambahHari(hariIniWib(sekarang), JATUH_TEMPO_BAWAAN_HARI);

export const terlambat = (p: Pick<Pinjaman, 'status' | 'jatuhTempo'>, hari: string) =>
  p.status === 'dipinjam' && p.jatuhTempo !== null && p.jatuhTempo < hari;

export function susunAntrian<T extends Pick<Pinjaman, 'status' | 'jatuhTempo'>>(rows: T[], hari: string) {
  return {
    pengajuan: rows.filter(p => p.status === 'diajukan'),
    klaim: rows.filter(p => p.status === 'menunggu_verifikasi'),
    terlambat: rows.filter(p => terlambat(p, hari)),
  };
}

export type KodeGalat = 'bukan_anggota' | 'diblokir' | 'buku_tidak_ada' | 'stok_habis' | 'sudah_diajukan'
  | 'pinjaman_tidak_ada' | 'status_tidak_sah' | 'terlarang' | 'tanggal_tidak_sah';

const PESAN_GALAT: Record<KodeGalat, string> = {
  bukan_anggota: 'Lengkapi pendaftaran anggota dahulu',
  diblokir: 'Akun anggota ini diblokir',
  buku_tidak_ada: 'Buku tidak ditemukan',
  stok_habis: 'Semua eksemplar sedang dipinjam',
  sudah_diajukan: 'Buku ini sudah ada di pinjaman aktif Anda',
  pinjaman_tidak_ada: 'Pinjaman tidak ditemukan',
  status_tidak_sah: 'Status pinjaman sudah berubah',
  terlarang: 'Anda tidak memiliki hak untuk tindakan ini',
  tanggal_tidak_sah: 'Jatuh tempo tidak boleh lewat',
};

export class PinjamanError extends Error {
  constructor(public kode: KodeGalat, public statusSaatIni?: StatusPinjaman) {
    super(PESAN_GALAT[kode]); this.name = 'PinjamanError';
  }
}

/** Fungsi SQL 0015 melempar `perpus:<kode>` atau `perpus:status_tidak_sah:<status>`. */
export function galatDariRpc(pesan: string): Error {
  const m = /^perpus:([a-z_]+)(?::([a-z_]+))?$/.exec(pesan);
  if (m && m[1] in PESAN_GALAT) return new PinjamanError(m[1] as KodeGalat, m[2] as StatusPinjaman | undefined);
  return new Error(`Gagal memproses pinjaman: ${pesan}`);
}

const tanggalPanjang = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function pesanPengingatWa(p: { nama: string; judul: string; jatuhTempo: string }, hari: string): string {
  const inti = p.jatuhTempo < hari
    ? `jatuh tempo pengembalian buku *${p.judul}* sudah terlewat sejak ${tanggalPanjang(p.jatuhTempo)}`
    : `buku *${p.judul}* dijadwalkan kembali pada ${tanggalPanjang(p.jatuhTempo)}`;
  return [
    `Assalamu'alaikum ${p.nama},`,
    ``,
    `Kami mengingatkan bahwa ${inti}. Mohon dikembalikan ke Perpustakaan Baitul Qowwam, atau kabari kami bila perlu perpanjangan.`,
    ``,
    `Jazakumullahu khairan.`,
    `Pustakawan Perpus BQ`,
  ].join('\n');
}

/** Akun nonaktif milik peminjam perpus bukan calon pengguna bq-ku. */
export const bukanPeminjam = <T extends { id: string; aktif: boolean }>(rows: T[], anggota: Set<string>) =>
  rows.filter(r => r.aktif || !anggota.has(r.id));
```

- [ ] **Step 5: Tulis `lib/perpus/pinjaman-respon.ts`**

```ts
import { NextResponse } from 'next/server';
import { PinjamanError, type KodeGalat } from '@/lib/perpus/pinjaman';

const STATUS_HTTP: Record<KodeGalat, number> = {
  bukan_anggota: 403, diblokir: 403, terlarang: 403,
  buku_tidak_ada: 404, pinjaman_tidak_ada: 404,
  stok_habis: 409, sudah_diajukan: 409, status_tidak_sah: 409,
  tanggal_tidak_sah: 400,
};

export function pinjamanErrorResponse(e: unknown): NextResponse | null {
  if (!(e instanceof PinjamanError)) return null;
  return NextResponse.json({ error: e.message, kode: e.kode, status: e.statusSaatIni }, { status: STATUS_HTTP[e.kode] });
}
```

- [ ] **Step 6: Tambahkan skema di akhir `lib/validation/perpus.ts`**

Tambahkan impor `import { hariIniWib } from '@/lib/perpus/pinjaman';` dan `import { nomorWali } from '@/lib/santri/pengingat';` di atas.

```ts
const tanggalMendatang = z.string().trim().refine(isTanggalIso, 'Tanggal tidak valid')
  .refine(v => v >= hariIniWib(), 'Jatuh tempo tidak boleh lewat');

export const daftarAnggotaSchema = z.object({
  nama: z.string().trim().min(2, 'Nama minimal 2 huruf').max(120),
  noWa: z.string().transform(v => nomorWali(v) ?? '').refine(v => /^62\d{8,13}$/.test(v), 'Nomor WhatsApp tidak valid'),
});
export type DaftarAnggotaInput = z.infer<typeof daftarAnggotaSchema>;

export const ajukanSchema = z.object({ bukuId: z.string().uuid() });
export const aksiAnggotaSchema = z.object({ aksi: z.enum(['batal', 'klaim']) });

export const aksiPustakawanSchema = z.discriminatedUnion('aksi', [
  z.object({ aksi: z.literal('acc'), jatuhTempo: tanggalMendatang.nullable().default(null) }),
  z.object({ aksi: z.literal('tolak'), catatan: teksOpsional }),
  z.object({ aksi: z.literal('verifikasi') }),
  z.object({ aksi: z.literal('tandai_kembali') }),
  z.object({ aksi: z.literal('perpanjang'), jatuhTempo: tanggalMendatang }),
]);
export type AksiPustakawanInput = z.infer<typeof aksiPustakawanSchema>;

export const statusAnggotaSchema = z.object({ status: z.enum(['aktif', 'diblokir']) });
```

- [ ] **Step 7: Jalankan, pastikan lolos**

Run: `npx vitest run tests/perpus/pinjaman.test.ts tests/validation/perpus.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/perpus/pinjaman.ts lib/perpus/pinjaman-respon.ts lib/perpus/tipe.ts lib/validation/perpus.ts tests/perpus/pinjaman.test.ts tests/validation/perpus.test.ts
git commit -m "feat(perpus): aturan status pinjaman, tanggal WIB, pesan WA, skema zod"
```

---

### Task 2: Migrasi `0015` dan uji SQL

**Files:**
- Create: `supabase/migrations/0015_perpus_pinjaman.sql`, `supabase/tests/perpus_pinjaman.sql`

**Interfaces:**
- Produces: tabel `perpus_anggota`, `perpus_pinjaman`; RPC `perpus_daftar_anggota(p_nama, p_no_wa)`, `perpus_ajukan_pinjaman(p_buku)`, `perpus_batal_pinjaman(p_id)`, `perpus_klaim_kembali(p_id)`, `perpus_acc_pinjaman(p_id, p_jatuh_tempo)`; view `perpus_pinjamanku`; kolom baru `perpus_ringkasan_publik."sedangDipinjam"`; `perpus_katalog_publik.tersedia` berkurang oleh pinjaman aktif. Galat berformat `perpus:<kode>` sesuai `KodeGalat` Task 1.

- [ ] **Step 1: Tulis `supabase/migrations/0015_perpus_pinjaman.sql`**

```sql
-- 0015: Perpus BQ tahap 3 — anggota, pinjaman, ketersediaan.
-- Anggota tidak punya policy insert/update: semua tulisannya lewat fungsi security definer di bagian C,
-- agar status anggota tidak bisa diubah sendiri dan transisi pinjaman tidak bisa dilompati.
-- Galat berformat perpus:<kode>; lihat galatDariRpc di lib/perpus/pinjaman.ts.
-- Aman dijalankan ulang.

-- A. Tabel
create table if not exists public.perpus_anggota (
  "userId" uuid primary key references auth.users(id) on delete cascade,
  nama text not null check (char_length(trim(nama)) between 2 and 120),
  "noWa" text not null check ("noWa" ~ '^62[0-9]{8,13}$'),
  status text not null default 'aktif' check (status in ('aktif', 'diblokir')),
  "createdAt" timestamptz not null default now()
);

create table if not exists public.perpus_pinjaman (
  id uuid primary key default gen_random_uuid(),
  "anggotaId" uuid not null references public.perpus_anggota("userId") on delete restrict,
  "bukuId" uuid not null references public.perpus_buku(id) on delete restrict,
  status text not null default 'diajukan'
    check (status in ('diajukan', 'dipinjam', 'menunggu_verifikasi', 'dikembalikan', 'ditolak', 'dibatalkan')),
  "jatuhTempo" date,
  "diajukanAt" timestamptz not null default now(),
  "disetujuiAt" timestamptz,
  "diserahkanAt" timestamptz,
  "diklaimKembaliAt" timestamptz,
  "dikembalikanAt" timestamptz,
  "diprosesOleh" uuid references public.profiles(id) on delete set null,
  catatan text
);
create index if not exists perpus_pinjaman_anggota_idx on public.perpus_pinjaman ("anggotaId");
create index if not exists perpus_pinjaman_buku_idx on public.perpus_pinjaman ("bukuId");
create index if not exists perpus_pinjaman_status_idx on public.perpus_pinjaman (status);
-- Satu anggota tidak bisa punya dua pinjaman aktif untuk buku yang sama.
create unique index if not exists perpus_pinjaman_aktif_unik on public.perpus_pinjaman ("anggotaId", "bukuId")
  where status in ('diajukan', 'dipinjam', 'menunggu_verifikasi');

-- B. RLS
do $$
declare t text;
begin
  foreach t in array array['perpus_anggota', 'perpus_pinjaman'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%1$s: kelola" on public.%1$I', t);
    execute format('create policy "%1$s: kelola" on public.%1$I for all to authenticated '
      'using (public.has_role(''SUPERADMIN'') or public.has_role(''PUSTAKAWAN'')) '
      'with check (public.has_role(''SUPERADMIN'') or public.has_role(''PUSTAKAWAN''))', t);
  end loop;
end $$;

drop policy if exists "perpus_anggota: baca sendiri" on public.perpus_anggota;
create policy "perpus_anggota: baca sendiri" on public.perpus_anggota for select to authenticated
  using ("userId" = auth.uid());
drop policy if exists "perpus_pinjaman: baca sendiri" on public.perpus_pinjaman;
create policy "perpus_pinjaman: baca sendiri" on public.perpus_pinjaman for select to authenticated
  using ("anggotaId" = auth.uid());

-- C. Fungsi
create or replace function public.perpus_hari_ini()
returns date language sql stable set search_path = public as $$
  select (now() at time zone 'Asia/Jakarta')::date;
$$;

create or replace function public.perpus_jumlah_dipinjam(p_buku uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.perpus_pinjaman
   where "bukuId" = p_buku and status in ('dipinjam', 'menunggu_verifikasi');
$$;

-- Daftar atau perbarui data sendiri; status tidak ikut berubah, jadi blokir tidak bisa dilepas sendiri.
create or replace function public.perpus_daftar_anggota(p_nama text, p_no_wa text)
returns public.perpus_anggota language plpgsql security definer set search_path = public as $$
declare v public.perpus_anggota%rowtype;
begin
  if auth.uid() is null then raise exception 'perpus:bukan_anggota'; end if;
  insert into public.perpus_anggota ("userId", nama, "noWa") values (auth.uid(), p_nama, p_no_wa)
  on conflict ("userId") do update set nama = excluded.nama, "noWa" = excluded."noWa"
  returning * into v;
  return v;
end $$;

create or replace function public.perpus_ajukan_pinjaman(p_buku uuid)
returns public.perpus_pinjaman language plpgsql security definer set search_path = public as $$
declare
  v_anggota text;
  v_eksemplar int;
  v public.perpus_pinjaman%rowtype;
begin
  select status into v_anggota from public.perpus_anggota where "userId" = auth.uid();
  if not found then raise exception 'perpus:bukan_anggota'; end if;
  if v_anggota = 'diblokir' then raise exception 'perpus:diblokir'; end if;
  select eksemplar into v_eksemplar from public.perpus_buku where id = p_buku and aktif;
  if not found then raise exception 'perpus:buku_tidak_ada'; end if;
  if public.perpus_jumlah_dipinjam(p_buku) >= v_eksemplar then raise exception 'perpus:stok_habis'; end if;
  begin
    insert into public.perpus_pinjaman ("anggotaId", "bukuId") values (auth.uid(), p_buku) returning * into v;
  exception when unique_violation then
    raise exception 'perpus:sudah_diajukan';
  end;
  return v;
end $$;

create or replace function public.perpus_batal_pinjaman(p_id uuid)
returns public.perpus_pinjaman language plpgsql security definer set search_path = public as $$
declare
  v public.perpus_pinjaman%rowtype;
  v_status text;
begin
  update public.perpus_pinjaman set status = 'dibatalkan'
   where id = p_id and "anggotaId" = auth.uid() and status = 'diajukan'
  returning * into v;
  if found then return v; end if;
  select status into v_status from public.perpus_pinjaman where id = p_id and "anggotaId" = auth.uid();
  if not found then raise exception 'perpus:pinjaman_tidak_ada'; end if;
  raise exception 'perpus:status_tidak_sah:%', v_status;
end $$;

create or replace function public.perpus_klaim_kembali(p_id uuid)
returns public.perpus_pinjaman language plpgsql security definer set search_path = public as $$
declare
  v public.perpus_pinjaman%rowtype;
  v_status text;
begin
  update public.perpus_pinjaman set status = 'menunggu_verifikasi', "diklaimKembaliAt" = now()
   where id = p_id and "anggotaId" = auth.uid() and status = 'dipinjam'
  returning * into v;
  if found then return v; end if;
  select status into v_status from public.perpus_pinjaman where id = p_id and "anggotaId" = auth.uid();
  if not found then raise exception 'perpus:pinjaman_tidak_ada'; end if;
  raise exception 'perpus:status_tidak_sah:%', v_status;
end $$;

-- Mengunci baris buku supaya dua ACC paralel tidak sama-sama mengambil eksemplar terakhir.
create or replace function public.perpus_acc_pinjaman(p_id uuid, p_jatuh_tempo date default null)
returns public.perpus_pinjaman language plpgsql security definer set search_path = public as $$
declare
  v public.perpus_pinjaman%rowtype;
  v_eksemplar int;
begin
  if not (public.has_role('SUPERADMIN') or public.has_role('PUSTAKAWAN')) then
    raise exception 'perpus:terlarang';
  end if;
  if p_jatuh_tempo < public.perpus_hari_ini() then raise exception 'perpus:tanggal_tidak_sah'; end if;
  select * into v from public.perpus_pinjaman where id = p_id for update;
  if not found then raise exception 'perpus:pinjaman_tidak_ada'; end if;
  if v.status <> 'diajukan' then raise exception 'perpus:status_tidak_sah:%', v.status; end if;
  select eksemplar into v_eksemplar from public.perpus_buku where id = v."bukuId" for update;
  if public.perpus_jumlah_dipinjam(v."bukuId") >= v_eksemplar then raise exception 'perpus:stok_habis'; end if;
  update public.perpus_pinjaman set
    status = 'dipinjam',
    "jatuhTempo" = coalesce(p_jatuh_tempo, public.perpus_hari_ini() + 14),
    "disetujuiAt" = now(),
    "diserahkanAt" = now(),
    "diprosesOleh" = auth.uid()
  where id = p_id
  returning * into v;
  return v;
end $$;

-- Supabase memberi EXECUTE ke anon/authenticated lewat default privileges, jadi keduanya dicabut eksplisit.
revoke all on function public.perpus_hari_ini() from public, anon, authenticated;
revoke all on function public.perpus_jumlah_dipinjam(uuid) from public, anon, authenticated;
revoke all on function public.perpus_daftar_anggota(text, text) from public, anon, authenticated;
revoke all on function public.perpus_ajukan_pinjaman(uuid) from public, anon, authenticated;
revoke all on function public.perpus_batal_pinjaman(uuid) from public, anon, authenticated;
revoke all on function public.perpus_klaim_kembali(uuid) from public, anon, authenticated;
revoke all on function public.perpus_acc_pinjaman(uuid, date) from public, anon, authenticated;
grant execute on function public.perpus_daftar_anggota(text, text) to authenticated;
grant execute on function public.perpus_ajukan_pinjaman(uuid) to authenticated;
grant execute on function public.perpus_batal_pinjaman(uuid) to authenticated;
grant execute on function public.perpus_klaim_kembali(uuid) to authenticated;
grant execute on function public.perpus_acc_pinjaman(uuid, date) to authenticated;

-- D. View publik. Hak akses dari 0014 tetap berlaku pada create or replace.
create or replace view public.perpus_katalog_publik with (security_invoker = false) as
select
  b.id,
  left(b.id::text, 8) as "idPendek",
  b.judul,
  b.penulis,
  case when b."nomorPanggil" ~ '^(TMP|AUDIT)-' then null else b."nomorPanggil" end as "nomorPanggil",
  b."kelasDdc",
  b.eksemplar,
  greatest(b.eksemplar - coalesce(p.jumlah, 0), 0)::int as tersedia,
  b."sampulPath",
  b.asal,
  case when b.asal = 'wakaf' then d.nama end as "namaDonatur",
  b."createdAt"
from public.perpus_buku b
left join public.perpus_donasi d on d.id = b."donasiId"
left join (
  select "bukuId", count(*)::int as jumlah from public.perpus_pinjaman
   where status in ('dipinjam', 'menunggu_verifikasi') group by "bukuId"
) p on p."bukuId" = b.id
where b.aktif;

-- Kolom baru harus di akhir agar create or replace diterima.
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
  infaq.total - belanja.total as saldo,
  (select count(*) from public.perpus_pinjaman where status in ('dipinjam', 'menunggu_verifikasi'))::int as "sedangDipinjam"
from infaq, belanja;

-- E. Pinjaman milik sendiri beserta judul; anggota tidak bisa membaca perpus_buku langsung.
create or replace view public.perpus_pinjamanku with (security_invoker = false) as
select
  p.id,
  p.status,
  p."jatuhTempo",
  p."diajukanAt",
  p."dikembalikanAt",
  p.catatan,
  left(b.id::text, 8) as "idPendek",
  b.judul,
  b.penulis,
  case when b."nomorPanggil" ~ '^(TMP|AUDIT)-' then null else b."nomorPanggil" end as "nomorPanggil"
from public.perpus_pinjaman p
join public.perpus_buku b on b.id = p."bukuId"
where p."anggotaId" = auth.uid();

revoke all on public.perpus_pinjamanku from anon, authenticated;
grant select on public.perpus_pinjamanku to authenticated;
```

- [ ] **Step 2: Tulis `supabase/tests/perpus_pinjaman.sql`**

```sql
-- Uji manual di SQL Editor setelah 0015. Berhasil = skrip selesai tanpa galat; semua data di-rollback.
-- Butuh dua profil bukan staf, satu SUPERADMIN aktif, dan satu buku aktif tanpa pinjaman.
begin;

select
  set_config('uji.a', (select id::text from public.profiles where not (roles && array['SUPERADMIN','PUSTAKAWAN']) order by id limit 1), true),
  set_config('uji.b', (select id::text from public.profiles where not (roles && array['SUPERADMIN','PUSTAKAWAN']) order by id offset 1 limit 1), true),
  set_config('uji.admin', (select id::text from public.profiles where aktif and 'SUPERADMIN' = any(roles) limit 1), true),
  set_config('uji.buku', (select id::text from public.perpus_buku where aktif order by id limit 1), true);

update public.perpus_buku set eksemplar = 1 where id = current_setting('uji.buku')::uuid;
insert into public.perpus_anggota ("userId", nama, "noWa") values
  (current_setting('uji.a')::uuid, 'Uji A', '6281200000001'),
  (current_setting('uji.b')::uuid, 'Uji B', '6281200000002')
on conflict ("userId") do nothing;

set local role authenticated;

do $$
declare
  v_a uuid; v_b uuid; v_n int; v_tersedia int;
  sebagai text := 'request.jwt.claims';
begin
  -- A mengajukan; B juga (stok masih 1 karena belum ada yang di-ACC).
  perform set_config(sebagai, json_build_object('sub', current_setting('uji.a'), 'role', 'authenticated')::text, true);
  v_a := (public.perpus_ajukan_pinjaman(current_setting('uji.buku')::uuid)).id;

  -- Pengajuan ganda ditolak.
  begin
    perform public.perpus_ajukan_pinjaman(current_setting('uji.buku')::uuid);
    raise exception 'HARUS GAGAL: ajukan ganda';
  exception when others then
    if sqlerrm <> 'perpus:sudah_diajukan' then raise; end if;
  end;

  -- Anggota tidak bisa mengubah pinjaman langsung (RLS: 0 baris) dan tidak bisa ACC.
  update public.perpus_pinjaman set status = 'dipinjam' where id = v_a;
  get diagnostics v_n = row_count;
  if v_n <> 0 then raise exception 'HARUS 0 BARIS: update langsung'; end if;
  begin
    perform public.perpus_acc_pinjaman(v_a);
    raise exception 'HARUS GAGAL: ACC oleh anggota';
  exception when others then
    if sqlerrm <> 'perpus:terlarang' then raise; end if;
  end;

  perform set_config(sebagai, json_build_object('sub', current_setting('uji.b'), 'role', 'authenticated')::text, true);
  v_b := (public.perpus_ajukan_pinjaman(current_setting('uji.buku')::uuid)).id;

  -- B tidak melihat pinjaman A.
  select count(*) into v_n from public.perpus_pinjaman where id = v_a;
  if v_n <> 0 then raise exception 'HARUS 0: baca pinjaman orang lain'; end if;
  select count(*) into v_n from public.perpus_pinjamanku;
  if v_n <> 1 then raise exception 'HARUS 1: view pinjamanku'; end if;

  -- B tidak bisa membatalkan milik A.
  begin
    perform public.perpus_batal_pinjaman(v_a);
    raise exception 'HARUS GAGAL: batal milik orang lain';
  exception when others then
    if sqlerrm <> 'perpus:pinjaman_tidak_ada' then raise; end if;
  end;

  -- Admin: ACC pertama berhasil dengan bawaan 14 hari, yang kedua kehabisan stok.
  perform set_config(sebagai, json_build_object('sub', current_setting('uji.admin'), 'role', 'authenticated')::text, true);
  if (public.perpus_acc_pinjaman(v_a))."jatuhTempo" <> (now() at time zone 'Asia/Jakarta')::date + 14 then
    raise exception 'HARUS 14 HARI';
  end if;
  begin
    perform public.perpus_acc_pinjaman(v_b);
    raise exception 'HARUS GAGAL: ACC eksemplar habis';
  exception when others then
    if sqlerrm <> 'perpus:stok_habis' then raise; end if;
  end;

  select tersedia into v_tersedia from public.perpus_katalog_publik where id = current_setting('uji.buku')::uuid;
  if v_tersedia <> 0 then raise exception 'HARUS 0: tersedia di katalog'; end if;

  -- A mengklaim kembali, lalu batal tidak sah lagi; eksemplar tetap terhitung sampai diverifikasi.
  perform set_config(sebagai, json_build_object('sub', current_setting('uji.a'), 'role', 'authenticated')::text, true);
  perform public.perpus_klaim_kembali(v_a);
  begin
    perform public.perpus_batal_pinjaman(v_a);
    raise exception 'HARUS GAGAL: batal setelah klaim';
  exception when others then
    if sqlerrm <> 'perpus:status_tidak_sah:menunggu_verifikasi' then raise; end if;
  end;
  select tersedia into v_tersedia from public.perpus_katalog_publik where id = current_setting('uji.buku')::uuid;
  if v_tersedia <> 0 then raise exception 'HARUS 0: tersedia saat menunggu verifikasi'; end if;
end $$;

rollback;

-- Harus galat: permission denied for view perpus_pinjamanku
begin;
set local role anon;
select * from public.perpus_pinjamanku;
rollback;

-- Harus galat: permission denied for function perpus_ajukan_pinjaman
begin;
set local role anon;
select public.perpus_ajukan_pinjaman(gen_random_uuid());
rollback;

-- Harus 0 baris (RLS)
begin;
set local role anon;
select count(*) from public.perpus_anggota;
rollback;
```

Catatan: `anon` tidak punya policy di kedua tabel, sehingga kueri terakhir mengembalikan 0 atau `permission denied`. Keduanya berarti aman.

- [ ] **Step 3: Pastikan semua fungsi dicabut haknya**

Run: `grep -c "create or replace function" supabase/migrations/0015_perpus_pinjaman.sql; grep -c "^revoke all on function" supabase/migrations/0015_perpus_pinjaman.sql`
Expected: `7` dan `7`. Tidak ada Postgres lokal; validasi sebenarnya ada di Task 9 saat pengguna menjalankan migrasi dan skrip uji.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0015_perpus_pinjaman.sql supabase/tests/perpus_pinjaman.sql
git commit -m "feat(perpus): migrasi 0015 — anggota, pinjaman, RPC, ketersediaan katalog"
```

---

### Task 3: Rute host perpus, cek sesi di proxy, callback

**Files:**
- Modify: `lib/perpus/domain.ts`, `proxy.ts`, `app/auth/callback/route.ts`
- Test: `tests/perpus/domain.test.ts`, `tests/auth/proxy.test.ts`, `tests/api/perpus-callback-route.test.ts`

**Interfaces:**
- Consumes: `identitasDari` dari `lib/auth/identitas.ts`.
- Produces: `HalamanSesi = 'masuk' | 'daftar' | 'pinjamanku'`; `nextAman(raw: string | null): string | null`; `putusanSesi(halaman, lang, { masuk, anggota }, next): string | null`; `tujuanCallback(raw, adaAnggota, accept): string`; `gagalCallback(raw, accept): string`.

- [ ] **Step 1: Tulis tes yang gagal**

Di `tests/perpus/domain.test.ts`, ganti impor dan tes "API, auth, dan folder internal ditolak", lalu tambahkan blok baru:

```ts
import { adaBahasa, bahasaDari, gagalCallback, hostPerpus, nextAman, pathBahasa, putusanSesi, ruteHostPerpus, tujuanCallback } from '@/lib/perpus/domain';

// di dalam describe('ruteHostPerpus')
  it('API, auth, dan folder internal ditolak', () => {
    for (const p of ['/api/santri', '/api', '/api/auth/logout', '/auth/lain', '/auth', '/perpusbq', '/perpusbq/id']) {
      expect(ruteHostPerpus(p, null)).toEqual({ jenis: 'tolak' });
    }
  });
  it('callback & API anggota dilewatkan', () => {
    for (const p of ['/auth/callback', '/api/perpus-publik', '/api/perpus-publik/status']) {
      expect(ruteHostPerpus(p, null)).toEqual({ jenis: 'lewat' });
    }
  });
  it('awalan mirip API anggota tetap ditolak', () => {
    expect(ruteHostPerpus('/api/perpus-publikasi', null)).toEqual({ jenis: 'tolak' });
  });
  it('hanya tiga halaman yang meminta cek sesi', () => {
    expect(ruteHostPerpus('/en/pinjamanku', null)).toEqual({ jenis: 'tulis-ulang', ke: '/perpusbq/en/pinjamanku', sesi: 'pinjamanku', lang: 'en' });
    expect(ruteHostPerpus('/id/masuk', null)).toMatchObject({ sesi: 'masuk' });
    expect(ruteHostPerpus('/id/daftar', null)).toMatchObject({ sesi: 'daftar' });
    expect(ruteHostPerpus('/id/katalog', null)).toEqual({ jenis: 'tulis-ulang', ke: '/perpusbq/id/katalog' });
  });

// blok baru di akhir file
describe('nextAman', () => {
  it('hanya path berbahasa di situs sendiri', () => {
    expect(nextAman('/id/buku/abcd1234')).toBe('/id/buku/abcd1234');
    expect(nextAman('/en')).toBe('/en');
  });
  it('menolak tautan luar dan path lain', () => {
    for (const p of [null, '', '//evil.com', '/id//evil.com', '/\\evil.com', 'https://evil.com', '/perpus', '/idola']) {
      expect(nextAman(p)).toBeNull();
    }
  });
});

describe('putusanSesi', () => {
  const tamu = { masuk: false, anggota: false };
  const baru = { masuk: true, anggota: false };
  const anggota = { masuk: true, anggota: true };
  it('tamu: pinjamanku & daftar ke masuk, masuk dibiarkan', () => {
    expect(putusanSesi('pinjamanku', 'id', tamu, null)).toBe('/id/masuk?next=%2Fid%2Fpinjamanku');
    expect(putusanSesi('daftar', 'en', tamu, '/en/buku/abcd1234')).toBe('/en/masuk?next=%2Fen%2Fbuku%2Fabcd1234');
    expect(putusanSesi('masuk', 'id', tamu, null)).toBeNull();
  });
  it('sesi tanpa anggota: ke daftar, daftar dibiarkan', () => {
    expect(putusanSesi('pinjamanku', 'id', baru, null)).toBe('/id/daftar?next=%2Fid%2Fpinjamanku');
    expect(putusanSesi('masuk', 'id', baru, '/id/buku/abcd1234')).toBe('/id/daftar?next=%2Fid%2Fbuku%2Fabcd1234');
    expect(putusanSesi('daftar', 'id', baru, null)).toBeNull();
  });
  it('anggota: pinjamanku dibiarkan, masuk & daftar ke tujuan', () => {
    expect(putusanSesi('pinjamanku', 'id', anggota, null)).toBeNull();
    expect(putusanSesi('masuk', 'en', anggota, null)).toBe('/en/pinjamanku');
    expect(putusanSesi('daftar', 'id', anggota, '/id/buku/abcd1234')).toBe('/id/buku/abcd1234');
  });
  it('next berbahaya diabaikan', () => {
    expect(putusanSesi('masuk', 'id', anggota, '//evil.com')).toBe('/id/pinjamanku');
  });
});

describe('tujuan callback', () => {
  it('anggota menuju next; bahasa mengikuti next', () => {
    expect(tujuanCallback('/en/buku/abcd1234', true, null)).toBe('/en/buku/abcd1234');
  });
  it('tanpa next memakai Accept-Language', () => {
    expect(tujuanCallback(null, true, 'en')).toBe('/en/pinjamanku');
  });
  it('belum anggota dialihkan ke daftar sambil membawa tujuan', () => {
    expect(tujuanCallback('/id/buku/abcd1234', false, null)).toBe('/id/daftar?next=%2Fid%2Fbuku%2Fabcd1234');
  });
  it('gagal kembali ke halaman masuk', () => {
    expect(gagalCallback('/en/buku/abcd1234', null)).toBe('/en/masuk?error=tautan-tidak-valid');
    expect(gagalCallback(null, null)).toBe('/id/masuk?error=tautan-tidak-valid');
  });
});
```

Di `tests/auth/proxy.test.ts`, tambahkan ke `describe('proxy: host perpus')`. Tes yang ada membaca `getClaims` dan `maybeSingle` dari mock:

```ts
  const sesi = (anggota: boolean) => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u1', email: 'a@b.c' } }, error: null });
    maybeSingle.mockResolvedValue({ data: anggota ? { status: 'aktif' } : null });
  };

  it('halaman publik tidak memeriksa sesi', async () => {
    await proxy(reqHost('/id/katalog', 'perpus.localhost'));
    expect(getClaims).not.toHaveBeenCalled();
  });
  it('/pinjamanku tanpa sesi → /id/masuk di host perpus', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const tujuan = new URL((await proxy(reqHost('/id/pinjamanku', 'perpus.localhost'))).headers.get('location')!);
    expect(tujuan.host).toBe('perpus.localhost');
    expect(tujuan.pathname).toBe('/id/masuk');
    expect(tujuan.searchParams.get('next')).toBe('/id/pinjamanku');
  });
  it('/pinjamanku sesi tanpa anggota → /id/daftar', async () => {
    sesi(false);
    const tujuan = new URL((await proxy(reqHost('/id/pinjamanku', 'perpus.localhost'))).headers.get('location')!);
    expect(tujuan.pathname).toBe('/id/daftar');
  });
  it('/pinjamanku anggota → rewrite ke folder fisik', async () => {
    sesi(true);
    const res = await proxy(reqHost('/id/pinjamanku', 'perpus.localhost'));
    expect(new URL(res.headers.get('x-middleware-rewrite')!).pathname).toBe('/perpusbq/id/pinjamanku');
  });
  it('/masuk milik anggota mengikuti next', async () => {
    sesi(true);
    const tujuan = new URL((await proxy(reqHost('/id/masuk?next=%2Fid%2Fbuku%2Fabcd1234', 'perpus.localhost'))).headers.get('location')!);
    expect(tujuan.pathname).toBe('/id/buku/abcd1234');
    expect(tujuan.search).toBe('');
  });
  it('API anggota dilewatkan di host perpus, 404 di host bq-ku', async () => {
    expect((await proxy(reqHost('/api/perpus-publik/status', 'perpus.localhost'))).status).toBe(200);
    expect((await proxy(reqHost('/api/perpus-publik/status', 'bq-ku.vercel.app'))).status).toBe(404);
  });
```

Buat `tests/api/perpus-callback-route.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const exchangeCodeForSession = vi.fn();
const getUser = vi.fn();
const maybeSingle = vi.fn();
const tabel: string[] = [];

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: async () => ({
    auth: { exchangeCodeForSession, getUser },
    from: (t: string) => { tabel.push(t); return { select: () => ({ eq: () => ({ maybeSingle }) }) }; },
  }),
}));

import { GET } from '@/app/auth/callback/route';

const req = (path: string, host: string, next?: string) => new NextRequest(new URL(path, `http://${host}`), {
  headers: { host, ...(next ? { cookie: `bq_next=${encodeURIComponent(next)}` } : {}) },
});

beforeEach(() => {
  vi.stubEnv('PERPUS_HOST', 'perpus.localhost');
  tabel.length = 0;
  exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } } });
  maybeSingle.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('callback di host perpus', () => {
  it('anggota menuju next dari cookie, tanpa membaca profiles', async () => {
    maybeSingle.mockResolvedValue({ data: { status: 'aktif' } });
    const res = await GET(req('/auth/callback?code=x', 'perpus.localhost', '/en/buku/abcd1234'));
    expect(res.headers.get('location')).toBe('http://perpus.localhost/en/buku/abcd1234');
    expect(tabel).toEqual(['perpus_anggota']);
  });
  it('belum anggota menuju daftar', async () => {
    maybeSingle.mockResolvedValue({ data: null });
    const res = await GET(req('/auth/callback?code=x', 'perpus.localhost', '/id/pinjamanku'));
    expect(res.headers.get('location')).toBe('http://perpus.localhost/id/daftar?next=%2Fid%2Fpinjamanku');
  });
  it('kode gagal kembali ke halaman masuk perpus', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: new Error('x') });
    const res = await GET(req('/auth/callback?code=x', 'perpus.localhost', '/en/pinjamanku'));
    expect(res.headers.get('location')).toBe('http://perpus.localhost/en/masuk?error=tautan-tidak-valid');
  });
});

describe('callback di host bq-ku', () => {
  it('tetap memakai /login saat gagal', async () => {
    const res = await GET(req('/auth/callback', 'bq-ku.localhost'));
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login');
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/perpus/domain.test.ts tests/auth/proxy.test.ts tests/api/perpus-callback-route.test.ts`
Expected: FAIL, ekspor baru belum ada dan `/auth/callback` masih ditolak.

- [ ] **Step 3: Ubah `lib/perpus/domain.ts`**

Ganti tipe `RutePerpus` dan fungsi `ruteHostPerpus`, lalu tambahkan fungsi di bawahnya:

```ts
export type HalamanSesi = 'masuk' | 'daftar' | 'pinjamanku';

export type RutePerpus =
  | { jenis: 'alihkan'; ke: string }
  | { jenis: 'tulis-ulang'; ke: string; sesi?: HalamanSesi; lang?: Bahasa }
  | { jenis: 'tolak' }
  | { jenis: 'lewat' };
```

```ts
/** API bq-ku ditolak karena penjaga ruangan tidak berjalan di host perpus; API anggota menjaga dirinya lewat `requireMasuk`. */
export function ruteHostPerpus(pathname: string, accept: string | null): RutePerpus {
  if (pathname.startsWith('/_next/')) return { jenis: 'lewat' };
  if (pathname === '/auth/callback' || /^\/api\/perpus-publik(\/|$)/.test(pathname)) return { jenis: 'lewat' };
  if (/^\/(api|auth|perpusbq)(\/|$)/.test(pathname)) return { jenis: 'tolak' };
  if (pathname === '/manifest.webmanifest') return { jenis: 'tulis-ulang', ke: '/perpusbq/manifest' };
  if (pathname === '/') return { jenis: 'alihkan', ke: `/${bahasaDari(accept)}` };
  const lang = pathname.split('/')[1];
  if (adaBahasa(lang)) {
    const sesi = /^\/(?:id|en)\/(masuk|daftar|pinjamanku)\/?$/.exec(pathname)?.[1] as HalamanSesi | undefined;
    return { jenis: 'tulis-ulang', ke: `/perpusbq${pathname}`, ...(sesi ? { sesi, lang } : {}) };
  }
  return { jenis: 'alihkan', ke: `/id${pathname}` };
}

/** Tujuan setelah login hanya boleh path berbahasa di situs ini. */
export function nextAman(raw: string | null): string | null {
  if (!raw || raw.includes('\\') || raw.includes('//')) return null;
  return /^\/(id|en)(\/|$|\?)/.test(raw) ? raw : null;
}

const denganNext = (awal: string, next: string) => `${awal}?next=${encodeURIComponent(next)}`;

/** Ke mana halaman sesi dialihkan; null = tampilkan halaman. */
export function putusanSesi(
  halaman: HalamanSesi, lang: Bahasa, status: { masuk: boolean; anggota: boolean }, nextRaw: string | null,
): string | null {
  const tujuan = nextAman(nextRaw) ?? `/${lang}/pinjamanku`;
  if (!status.masuk) return halaman === 'masuk' ? null : denganNext(`/${lang}/masuk`, tujuan);
  if (!status.anggota) return halaman === 'daftar' ? null : denganNext(`/${lang}/daftar`, tujuan);
  return halaman === 'pinjamanku' ? null : tujuan;
}

const bahasaNext = (next: string | null, accept: string | null): Bahasa =>
  (next ? next.split(/[/?]/)[1] as Bahasa : bahasaDari(accept));

export function tujuanCallback(raw: string | null, adaAnggota: boolean, accept: string | null): string {
  const next = nextAman(raw);
  const lang = bahasaNext(next, accept);
  const tujuan = next ?? `/${lang}/pinjamanku`;
  return adaAnggota ? tujuan : denganNext(`/${lang}/daftar`, tujuan);
}

export const gagalCallback = (raw: string | null, accept: string | null) =>
  `/${bahasaNext(nextAman(raw), accept)}/masuk?error=tautan-tidak-valid`;
```

- [ ] **Step 4: Ubah `proxy.ts`**

Ganti `proxyPerpus` dan tambahkan `sesiPerpus`. Ubah impor domain menjadi `import { hostPerpus, putusanSesi, ruteHostPerpus, type HalamanSesi } from '@/lib/perpus/domain';`, impor Supabase menjadi `import { createServerClient, type SetAllCookies } from '@supabase/ssr';`, dan tambah `import type { Bahasa } from '@/lib/perpus/ddc';`.

```ts
/**
 * Hanya memutuskan redirect. Halaman di baliknya tidak membaca cookie di server, jadi cukup
 * meneruskan cookie hasil refresh ke browser (refresh token Supabase sekali pakai).
 */
async function sesiPerpus(request: NextRequest, ke: string, halaman: HalamanSesi, lang: Bahasa) {
  let cookieBaru: Parameters<SetAllCookies>[0] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll(); }, setAll(list) { cookieBaru = list; } } },
  );
  const user = await identitasDari(supabase);
  const { data: anggota } = user
    ? await supabase.from('perpus_anggota').select('status').eq('userId', user.id).maybeSingle()
    : { data: null };
  const tujuan = putusanSesi(halaman, lang, { masuk: !!user, anggota: !!anggota }, request.nextUrl.searchParams.get('next'));

  const url = request.nextUrl.clone();
  let res: NextResponse;
  if (tujuan) {
    const [path, query] = tujuan.split('?');
    url.pathname = path;
    url.search = query ? `?${query}` : '';
    url.host = request.headers.get('host')!;
    res = NextResponse.redirect(url);
  } else {
    url.pathname = ke;
    res = NextResponse.rewrite(url);
  }
  cookieBaru.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
  return res;
}

async function proxyPerpus(request: NextRequest) {
  const rute = ruteHostPerpus(request.nextUrl.pathname, request.headers.get('accept-language'));
  if (rute.jenis === 'lewat') return NextResponse.next();
  if (rute.jenis === 'tolak') return new NextResponse('Not Found', { status: 404 });
  if (rute.jenis === 'tulis-ulang' && rute.sesi) return sesiPerpus(request, rute.ke, rute.sesi, rute.lang!);
  const url = request.nextUrl.clone();
  url.pathname = rute.ke;
  if (rute.jenis === 'tulis-ulang') return NextResponse.rewrite(url);
  // nextUrl bisa memuat host internal server; pengunjung harus tetap di domain perpus.
  url.host = request.headers.get('host')!;
  return NextResponse.redirect(url);
}
```

Ganti baris penolakan `/perpusbq` di host bq-ku:

```ts
  if (/^\/(perpusbq|api\/perpus-publik)(\/|$)/.test(request.nextUrl.pathname)) return new NextResponse('Not Found', { status: 404 });
```

- [ ] **Step 5: Ubah `app/auth/callback/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { resolveLandingPath, ROOM_COOKIE } from '@/lib/auth/rooms';
import type { UserRole } from '@/lib/auth/roles';
import { gagalCallback, hostPerpus, tujuanCallback } from '@/lib/perpus/domain';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const { searchParams } = url;
  const host = req.headers.get('host');
  const perpus = hostPerpus(host);
  // req.url bisa memuat host internal server; peminjam harus tetap di domain perpus.
  const origin = perpus ? `${url.protocol}//${host}` : url.origin;
  const accept = req.headers.get('accept-language');
  const code = searchParams.get('code');
  const raw = searchParams.get('next') || req.cookies.get('bq_next')?.value || '/';
  const next = decodeURIComponent(raw);
  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      let dest = next.startsWith('/') ? next : '/';
      if (perpus) {
        const { data: anggota } = await supabase.from('perpus_anggota').select('status').eq('userId', authUser?.id ?? '').maybeSingle();
        dest = tujuanCallback(next, !!anggota, accept);
      } else if (dest === '/' && authUser) {
        const { data: profile } = await supabase.from('profiles').select('roles, aktif').eq('id', authUser.id).maybeSingle();
        const roles = (profile?.aktif ? profile.roles : []) as UserRole[] ?? [];
        dest = resolveLandingPath(roles, req.cookies.get(ROOM_COOKIE)?.value ?? null) ?? '/';
      }
      const res = NextResponse.redirect(`${origin}${dest}`);
      res.cookies.delete('bq_next');
      return res;
    }
  }
  return NextResponse.redirect(`${origin}${perpus ? gagalCallback(next, accept) : '/login?error=tautan-tidak-valid'}`);
}
```

- [ ] **Step 6: Jalankan, pastikan lolos**

Run: `npx vitest run tests/perpus/domain.test.ts tests/auth/proxy.test.ts tests/api/perpus-callback-route.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/perpus/domain.ts proxy.ts app/auth/callback/route.ts tests/perpus/domain.test.ts tests/auth/proxy.test.ts tests/api/perpus-callback-route.test.ts
git commit -m "feat(perpus): buka callback & API anggota di host perpus, cek sesi hanya untuk masuk/daftar/pinjamanku"
```

---

### Task 4: Repo dan API anggota

**Files:**
- Create: `lib/perpus/sesi-anggota.ts`, `lib/db/perpus-pinjaman-repo.ts`, `app/api/perpus-publik/status/route.ts`, `app/api/perpus-publik/daftar/route.ts`, `app/api/perpus-publik/pinjaman/route.ts`, `app/api/perpus-publik/pinjaman/[id]/route.ts`
- Test: `tests/db/perpus-pinjaman-repo.test.ts`, `tests/api/perpus-publik-route.test.ts`

**Interfaces:**
- Consumes: Task 1 (`galatDariRpc`, `PinjamanError`, `pinjamanErrorResponse`, skema), Task 2 (RPC & view).
- Produces: `requireMasuk(): Promise<{ userId: string; supabase: SupabaseClient }>`; repo `ambilStatusPinjam(c, userId | null, bukuId)`, `daftarAnggota(c, input)`, `ajukanPinjaman(c, bukuId)`, `aksiAnggota(c, id, 'batal' | 'klaim')`, `listPinjamanku(c)`. API: `GET /api/perpus-publik/status?buku=<uuid>` → `{ data: StatusPinjamBuku }`; `POST /daftar`; `GET|POST /pinjaman`; `PATCH /pinjaman/[id]`. Galat berbentuk `{ error, kode, status? }`.

- [ ] **Step 1: Tulis tes yang gagal**

`tests/db/perpus-pinjaman-repo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { aksiAnggota, ajukanPinjaman, ambilStatusPinjam, daftarAnggota, listPinjamanku } from '@/lib/db/perpus-pinjaman-repo';
import { PinjamanError } from '@/lib/perpus/pinjaman';

/** Rantai kueri palsu: setiap metode mengembalikan dirinya; await menghasilkan hasil tabel itu. */
function rantai(hasil: unknown, catat: unknown[][]) {
  const r: any = new Proxy({}, {
    get: (_t, k) => (k === 'then' ? (ok: (v: unknown) => void) => ok(hasil) : (...a: unknown[]) => { catat.push([k, ...a]); return r; }),
  });
  return r;
}
const klien = (tabel: Record<string, unknown>, rpc: unknown = { data: null, error: null }, catat: unknown[][] = []) => ({
  from: (t: string) => { catat.push(['from', t]); return rantai(tabel[t], catat); },
  rpc: async (...a: unknown[]) => { catat.push(['rpc', ...a]); return rpc; },
}) as never;

describe('repo pinjaman anggota', () => {
  it('ajukan memanggil RPC', async () => {
    const catat: unknown[][] = [];
    expect(await ajukanPinjaman(klien({}, { data: { id: 'p1' }, error: null }, catat), 'b1')).toEqual({ id: 'p1' });
    expect(catat).toContainEqual(['rpc', 'perpus_ajukan_pinjaman', { p_buku: 'b1' }]);
  });
  it('galat RPC menjadi PinjamanError', async () => {
    const c = klien({}, { data: null, error: { message: 'perpus:stok_habis' } });
    await expect(ajukanPinjaman(c, 'b1')).rejects.toBeInstanceOf(PinjamanError);
  });
  it('aksi anggota memilih RPC yang tepat', async () => {
    const catat: unknown[][] = [];
    await aksiAnggota(klien({}, { data: {}, error: null }, catat), 'p1', 'klaim');
    await aksiAnggota(klien({}, { data: {}, error: null }, catat), 'p1', 'batal');
    expect(catat).toContainEqual(['rpc', 'perpus_klaim_kembali', { p_id: 'p1' }]);
    expect(catat).toContainEqual(['rpc', 'perpus_batal_pinjaman', { p_id: 'p1' }]);
  });
  it('daftar meneruskan nama & nomor', async () => {
    const catat: unknown[][] = [];
    await daftarAnggota(klien({}, { data: {}, error: null }, catat), { nama: 'A', noWa: '628123' });
    expect(catat).toContainEqual(['rpc', 'perpus_daftar_anggota', { p_nama: 'A', p_no_wa: '628123' }]);
  });
  it('pinjamanku membaca view, terbaru dulu', async () => {
    const catat: unknown[][] = [];
    await listPinjamanku(klien({ perpus_pinjamanku: { data: [], error: null } }, undefined, catat));
    expect(catat).toContainEqual(['from', 'perpus_pinjamanku']);
    expect(catat).toContainEqual(['order', 'diajukanAt', { ascending: false }]);
  });
  it('status tamu hanya membaca stok', async () => {
    const catat: unknown[][] = [];
    const c = klien({ perpus_katalog_publik: { data: { tersedia: 2 }, error: null } }, undefined, catat);
    expect(await ambilStatusPinjam(c, null, 'b1')).toEqual({ masuk: false, anggota: null, pinjamanAktif: null, tersedia: 2 });
    expect(catat).not.toContainEqual(['from', 'perpus_anggota']);
  });
  it('status anggota menyertakan pinjaman aktif', async () => {
    const c = klien({
      perpus_katalog_publik: { data: { tersedia: 0 }, error: null },
      perpus_anggota: { data: { status: 'aktif' }, error: null },
      perpus_pinjaman: { data: { status: 'dipinjam' }, error: null },
    });
    expect(await ambilStatusPinjam(c, 'u1', 'b1')).toEqual({ masuk: true, anggota: 'aktif', pinjamanAktif: 'dipinjam', tersedia: 0 });
  });
});
```

`tests/api/perpus-publik-route.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PinjamanError } from '@/lib/perpus/pinjaman';

const repo = vi.hoisted(() => ({
  ambilStatusPinjam: vi.fn(), daftarAnggota: vi.fn(), ajukanPinjaman: vi.fn(), aksiAnggota: vi.fn(), listPinjamanku: vi.fn(),
}));
const requireMasuk = vi.hoisted(() => vi.fn());
const identitasDari = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/perpus-pinjaman-repo', () => repo);
vi.mock('@/lib/perpus/sesi-anggota', () => ({ requireMasuk: (...a: unknown[]) => requireMasuk(...a) }));
vi.mock('@/lib/auth/identitas', () => ({ identitasDari: (...a: unknown[]) => identitasDari(...a) }));
vi.mock('@/lib/supabase/server', () => ({ createServerSupabase: async () => ({}) }));

import { AuthError } from '@/lib/auth/session';
import { GET as STATUS } from '@/app/api/perpus-publik/status/route';
import { POST as DAFTAR } from '@/app/api/perpus-publik/daftar/route';
import { GET as LIST, POST as AJUKAN } from '@/app/api/perpus-publik/pinjaman/route';
import { PATCH as AKSI } from '@/app/api/perpus-publik/pinjaman/[id]/route';

const UUID = '11111111-1111-4111-8111-111111111111';
const json = (body: unknown) => ({ url: 'http://x/api', json: async () => body }) as never;
const ctx = { params: Promise.resolve({ id: UUID }) };

beforeEach(() => {
  Object.values(repo).forEach(f => f.mockReset());
  requireMasuk.mockReset().mockResolvedValue({ userId: 'u1', supabase: {} });
  identitasDari.mockReset().mockResolvedValue(null);
});

describe('API perpus-publik', () => {
  it('status tanpa sesi tetap 200', async () => {
    repo.ambilStatusPinjam.mockResolvedValue({ masuk: false });
    const res = await STATUS({ url: `http://x/api?buku=${UUID}` } as never);
    expect(res.status).toBe(200);
    expect(repo.ambilStatusPinjam).toHaveBeenCalledWith({}, null, UUID);
  });
  it('status tanpa buku valid → 400', async () => {
    expect((await STATUS({ url: 'http://x/api?buku=abc' } as never)).status).toBe(400);
  });
  it('daftar menormalkan nomor', async () => {
    repo.daftarAnggota.mockResolvedValue({ userId: 'u1' });
    const res = await DAFTAR(json({ nama: 'Aisyah', noWa: '081234567890' }));
    expect(res.status).toBe(201);
    expect(repo.daftarAnggota).toHaveBeenCalledWith({}, { nama: 'Aisyah', noWa: '6281234567890' });
  });
  it('daftar tanpa sesi → 401', async () => {
    requireMasuk.mockRejectedValue(new AuthError(401, 'UNAUTHENTICATED', 'Silakan masuk terlebih dahulu'));
    expect((await DAFTAR(json({ nama: 'Aisyah', noWa: '081234567890' }))).status).toBe(401);
  });
  it('ajukan stok habis → 409 dengan kode', async () => {
    repo.ajukanPinjaman.mockRejectedValue(new PinjamanError('stok_habis'));
    const res = await AJUKAN(json({ bukuId: UUID }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ kode: 'stok_habis', error: 'Semua eksemplar sedang dipinjam' });
  });
  it('ajukan diblokir → 403', async () => {
    repo.ajukanPinjaman.mockRejectedValue(new PinjamanError('diblokir'));
    expect((await AJUKAN(json({ bukuId: UUID }))).status).toBe(403);
  });
  it('list memakai klien sesi', async () => {
    repo.listPinjamanku.mockResolvedValue([{ id: 'p1' }]);
    expect((await (await LIST()).json()).data).toEqual([{ id: 'p1' }]);
  });
  it('aksi tidak dikenal → 400', async () => {
    expect((await AKSI(json({ aksi: 'acc' }), ctx)).status).toBe(400);
    expect(repo.aksiAnggota).not.toHaveBeenCalled();
  });
  it('transisi tidak sah → 409 dengan status saat ini', async () => {
    repo.aksiAnggota.mockRejectedValue(new PinjamanError('status_tidak_sah', 'dipinjam'));
    const res = await AKSI(json({ aksi: 'batal' }), ctx);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ status: 'dipinjam' });
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/db/perpus-pinjaman-repo.test.ts tests/api/perpus-publik-route.test.ts`
Expected: FAIL, modul belum ada.

- [ ] **Step 3: Tulis `lib/perpus/sesi-anggota.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { identitasDari } from '@/lib/auth/identitas';
import { AuthError } from '@/lib/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';

/** Peminjam umum punya profil nonaktif, jadi `requireUser` selalu 401 untuk mereka. Hak anggota dijaga RPC 0015. */
export async function requireMasuk(): Promise<{ userId: string; supabase: SupabaseClient }> {
  const supabase = await createServerSupabase();
  const user = await identitasDari(supabase);
  if (!user) throw new AuthError(401, 'UNAUTHENTICATED', 'Silakan masuk terlebih dahulu');
  return { userId: user.id, supabase };
}
```

- [ ] **Step 4: Tulis `lib/db/perpus-pinjaman-repo.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { galatDariRpc } from '@/lib/perpus/pinjaman';
import type { Anggota, Pinjaman, Pinjamanku, StatusPinjamBuku } from '@/lib/perpus/tipe';
import type { DaftarAnggotaInput } from '@/lib/validation/perpus';

const STATUS_BERJALAN = ['diajukan', 'dipinjam', 'menunggu_verifikasi'];

async function panggil<T>(c: SupabaseClient, fungsi: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await c.rpc(fungsi, args);
  if (error) throw galatDariRpc(error.message);
  return data as T;
}

export const daftarAnggota = (c: SupabaseClient, input: DaftarAnggotaInput) =>
  panggil<Anggota>(c, 'perpus_daftar_anggota', { p_nama: input.nama, p_no_wa: input.noWa });

export const ajukanPinjaman = (c: SupabaseClient, bukuId: string) =>
  panggil<Pinjaman>(c, 'perpus_ajukan_pinjaman', { p_buku: bukuId });

export const aksiAnggota = (c: SupabaseClient, id: string, aksi: 'batal' | 'klaim') =>
  panggil<Pinjaman>(c, aksi === 'batal' ? 'perpus_batal_pinjaman' : 'perpus_klaim_kembali', { p_id: id });

export async function listPinjamanku(c: SupabaseClient): Promise<Pinjamanku[]> {
  const { data, error } = await c.from('perpus_pinjamanku').select('*').order('diajukanAt', { ascending: false });
  if (error) throw new Error(`Gagal memuat pinjaman: ${error.message}`);
  return (data || []) as Pinjamanku[];
}

export async function ambilStatusPinjam(c: SupabaseClient, userId: string | null, bukuId: string): Promise<StatusPinjamBuku> {
  const { data: buku, error } = await c.from('perpus_katalog_publik').select('tersedia').eq('id', bukuId).maybeSingle();
  if (error) throw new Error(`Gagal memuat ketersediaan: ${error.message}`);
  const tersedia = (buku as { tersedia: number } | null)?.tersedia ?? null;
  if (!userId) return { masuk: false, anggota: null, pinjamanAktif: null, tersedia };
  const [anggota, pinjaman] = await Promise.all([
    c.from('perpus_anggota').select('status').eq('userId', userId).maybeSingle(),
    c.from('perpus_pinjaman').select('status').eq('anggotaId', userId).eq('bukuId', bukuId).in('status', STATUS_BERJALAN).maybeSingle(),
  ]);
  const galat = anggota.error ?? pinjaman.error;
  if (galat) throw new Error(`Gagal memuat status anggota: ${galat.message}`);
  return {
    masuk: true,
    anggota: (anggota.data as Pick<Anggota, 'status'> | null)?.status ?? null,
    pinjamanAktif: (pinjaman.data as Pick<Pinjaman, 'status'> | null)?.status ?? null,
    tersedia,
  };
}
```

- [ ] **Step 5: Tulis rute API**

`app/api/perpus-publik/status/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { identitasDari } from '@/lib/auth/identitas';
import { ambilStatusPinjam } from '@/lib/db/perpus-pinjaman-repo';
import { createServerSupabase } from '@/lib/supabase/server';

/** Tamu juga boleh: tombol Pinjam memakai jawaban ini untuk memilih tampilan, dan stok di halaman bisa tertinggal 5 menit. */
export async function GET(req: NextRequest) {
  try {
    const buku = z.string().uuid().safeParse(new URL(req.url).searchParams.get('buku'));
    if (!buku.success) return NextResponse.json({ error: 'Buku tidak valid' }, { status: 400 });
    const supabase = await createServerSupabase();
    const user = await identitasDari(supabase);
    return NextResponse.json({ success: true, data: await ambilStatusPinjam(supabase, user?.id ?? null, buku.data) });
  } catch (e: unknown) {
    console.error('Status pinjam error:', e);
    return NextResponse.json({ error: 'Gagal memuat status' }, { status: 500 });
  }
}
```

`app/api/perpus-publik/daftar/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth/session';
import { daftarAnggota } from '@/lib/db/perpus-pinjaman-repo';
import { pinjamanErrorResponse } from '@/lib/perpus/pinjaman-respon';
import { requireMasuk } from '@/lib/perpus/sesi-anggota';
import { daftarAnggotaSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await requireMasuk();
    const parsed = daftarAnggotaSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await daftarAnggota(supabase, parsed.data) }, { status: 201 });
  } catch (e: unknown) {
    const res = authErrorResponse(e) ?? pinjamanErrorResponse(e);
    if (res) return res;
    console.error('Daftar anggota error:', e);
    return NextResponse.json({ error: 'Gagal mendaftar' }, { status: 500 });
  }
}
```

`app/api/perpus-publik/pinjaman/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth/session';
import { ajukanPinjaman, listPinjamanku } from '@/lib/db/perpus-pinjaman-repo';
import { pinjamanErrorResponse } from '@/lib/perpus/pinjaman-respon';
import { requireMasuk } from '@/lib/perpus/sesi-anggota';
import { ajukanSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';

export async function GET() {
  try {
    const { supabase } = await requireMasuk();
    return NextResponse.json({ success: true, data: await listPinjamanku(supabase) });
  } catch (e: unknown) {
    const res = authErrorResponse(e);
    if (res) return res;
    console.error('List pinjamanku error:', e);
    return NextResponse.json({ error: 'Gagal memuat pinjaman' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await requireMasuk();
    const parsed = ajukanSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await ajukanPinjaman(supabase, parsed.data.bukuId) }, { status: 201 });
  } catch (e: unknown) {
    const res = authErrorResponse(e) ?? pinjamanErrorResponse(e);
    if (res) return res;
    console.error('Ajukan pinjaman error:', e);
    return NextResponse.json({ error: 'Gagal mengajukan pinjaman' }, { status: 500 });
  }
}
```

`app/api/perpus-publik/pinjaman/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth/session';
import { aksiAnggota } from '@/lib/db/perpus-pinjaman-repo';
import { pinjamanErrorResponse } from '@/lib/perpus/pinjaman-respon';
import { requireMasuk } from '@/lib/perpus/sesi-anggota';
import { aksiAnggotaSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireMasuk();
    const { id } = await params;
    const parsed = aksiAnggotaSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await aksiAnggota(supabase, id, parsed.data.aksi) });
  } catch (e: unknown) {
    const res = authErrorResponse(e) ?? pinjamanErrorResponse(e);
    if (res) return res;
    console.error('Aksi pinjaman anggota error:', e);
    return NextResponse.json({ error: 'Gagal memproses pinjaman' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Jalankan, pastikan lolos**

Run: `npx vitest run tests/db/perpus-pinjaman-repo.test.ts tests/api/perpus-publik-route.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/perpus/sesi-anggota.ts lib/db/perpus-pinjaman-repo.ts app/api/perpus-publik tests/db/perpus-pinjaman-repo.test.ts tests/api/perpus-publik-route.test.ts
git commit -m "feat(perpus): API anggota — status, daftar, ajukan, batal, klaim"
```

---

### Task 5: Masuk, daftar, nav, kamus, statistik beranda

**Files:**
- Create: `app/perpusbq/[lang]/masuk/page.tsx`, `app/perpusbq/[lang]/daftar/page.tsx`, `components/perpus-publik/FormMasuk.tsx`, `components/perpus-publik/FormDaftar.tsx`
- Modify: `components/perpus-publik/NavPerpus.tsx`, `lib/perpus/i18n/id.ts`, `lib/perpus/i18n/en.ts`, `app/perpusbq/[lang]/page.tsx`
- Test: `tests/perpus/i18n.test.ts` (sudah memeriksa kunci identik)

**Interfaces:**
- Consumes: `nextAman` (Task 3), `POST /api/perpus-publik/daftar` (Task 4), `createBrowserSupabase`, `metaHalaman`.
- Produces: kunci i18n `status.<StatusPinjaman>`, `galat.<KodeGalat>`, serta `masuk.*`, `daftar.*`, `pinjam.*`, `pinjamanku.*` yang dipakai Task 6.

- [ ] **Step 1: Tambahkan kunci kamus**

Kunci berikut ditambahkan ke `lib/perpus/i18n/id.ts` (dan `'statistik.eksemplar'` diganti):

```ts
  'nav.pinjamanku': 'Pinjamanku',
  'nav.masuk': 'Masuk',
  'statistik.dipinjam': 'Sedang dipinjam',
  'masuk.judul': 'Masuk',
  'masuk.sub': 'Masuk untuk meminjam buku dan memantau pinjamanmu.',
  'masuk.tombol': 'Masuk dengan Google',
  'masuk.mengalihkan': 'Mengalihkan ke Google…',
  'masuk.gagal': 'Proses masuk gagal. Silakan coba lagi.',
  'daftar.judul': 'Lengkapi data',
  'daftar.sub': 'Sekali saja. Pustakawan memakai nomor ini untuk menghubungimu soal pinjaman.',
  'daftar.nama': 'Nama lengkap',
  'daftar.noWa': 'Nomor WhatsApp',
  'daftar.tombol': 'Simpan',
  'daftar.menyimpan': 'Menyimpan…',
  'daftar.namaSalah': 'Nama minimal 2 huruf.',
  'daftar.waSalah': 'Nomor WhatsApp tidak valid.',
  'daftar.gagal': 'Gagal menyimpan. Coba lagi.',
  'pinjam.tombol': 'Pinjam',
  'pinjam.memuat': 'Memeriksa…',
  'pinjam.mengajukan': 'Mengajukan…',
  'pinjam.masuk': 'Masuk dengan Google untuk meminjam',
  'pinjam.daftar': 'Lengkapi data untuk meminjam',
  'pinjam.terkirim': 'Pengajuan terkirim. Ambil bukunya di perpustakaan setelah disetujui.',
  'pinjam.sudahAda': 'Lihat di Pinjamanku',
  'pinjam.habis': 'Semua eksemplar sedang dipinjam',
  'pinjam.diblokir': 'Akunmu diblokir. Hubungi pustakawan.',
  'pinjamanku.judul': 'Pinjamanku',
  'pinjamanku.kosong': 'Belum ada pinjaman.',
  'pinjamanku.keKatalog': 'Cari buku',
  'pinjamanku.jatuhTempo': 'Jatuh tempo {tanggal}',
  'pinjamanku.terlambat': 'Lewat jatuh tempo',
  'pinjamanku.dikembalikan': 'Dikembalikan {tanggal}',
  'pinjamanku.catatan': 'Catatan: {isi}',
  'pinjamanku.batal': 'Batalkan',
  'pinjamanku.klaim': 'Sudah saya kembalikan',
  'pinjamanku.keluar': 'Keluar',
  'pinjamanku.gagal': 'Gagal memuat pinjaman.',
  'status.diajukan': 'Diajukan',
  'status.dipinjam': 'Dipinjam',
  'status.menunggu_verifikasi': 'Menunggu verifikasi',
  'status.dikembalikan': 'Dikembalikan',
  'status.ditolak': 'Ditolak',
  'status.dibatalkan': 'Dibatalkan',
  'galat.bukan_anggota': 'Lengkapi datamu dahulu.',
  'galat.diblokir': 'Akunmu diblokir. Hubungi pustakawan.',
  'galat.buku_tidak_ada': 'Buku tidak ditemukan.',
  'galat.stok_habis': 'Semua eksemplar sedang dipinjam.',
  'galat.sudah_diajukan': 'Buku ini sudah ada di pinjamanmu.',
  'galat.pinjaman_tidak_ada': 'Pinjaman tidak ditemukan.',
  'galat.status_tidak_sah': 'Status pinjaman sudah berubah. Muat ulang halaman.',
  'galat.terlarang': 'Kamu tidak punya hak untuk tindakan ini.',
  'galat.tanggal_tidak_sah': 'Tanggal tidak valid.',
```

Padanan di `lib/perpus/i18n/en.ts` (dan `'statistik.eksemplar'` diganti):

```ts
  'nav.pinjamanku': 'My loans',
  'nav.masuk': 'Sign in',
  'statistik.dipinjam': 'On loan',
  'masuk.judul': 'Sign in',
  'masuk.sub': 'Sign in to borrow books and track your loans.',
  'masuk.tombol': 'Sign in with Google',
  'masuk.mengalihkan': 'Redirecting to Google…',
  'masuk.gagal': 'Sign-in failed. Please try again.',
  'daftar.judul': 'Complete your details',
  'daftar.sub': 'Just once. The librarian uses this number to reach you about your loans.',
  'daftar.nama': 'Full name',
  'daftar.noWa': 'WhatsApp number',
  'daftar.tombol': 'Save',
  'daftar.menyimpan': 'Saving…',
  'daftar.namaSalah': 'Name must be at least 2 letters.',
  'daftar.waSalah': 'Invalid WhatsApp number.',
  'daftar.gagal': 'Could not save. Please try again.',
  'pinjam.tombol': 'Borrow',
  'pinjam.memuat': 'Checking…',
  'pinjam.mengajukan': 'Submitting…',
  'pinjam.masuk': 'Sign in with Google to borrow',
  'pinjam.daftar': 'Complete your details to borrow',
  'pinjam.terkirim': 'Request sent. Collect the book at the library once approved.',
  'pinjam.sudahAda': 'See it in My loans',
  'pinjam.habis': 'All copies are on loan',
  'pinjam.diblokir': 'Your account is blocked. Please contact the librarian.',
  'pinjamanku.judul': 'My loans',
  'pinjamanku.kosong': 'No loans yet.',
  'pinjamanku.keKatalog': 'Find a book',
  'pinjamanku.jatuhTempo': 'Due {tanggal}',
  'pinjamanku.terlambat': 'Overdue',
  'pinjamanku.dikembalikan': 'Returned {tanggal}',
  'pinjamanku.catatan': 'Note: {isi}',
  'pinjamanku.batal': 'Cancel',
  'pinjamanku.klaim': 'I have returned it',
  'pinjamanku.keluar': 'Sign out',
  'pinjamanku.gagal': 'Could not load your loans.',
  'status.diajukan': 'Requested',
  'status.dipinjam': 'On loan',
  'status.menunggu_verifikasi': 'Awaiting verification',
  'status.dikembalikan': 'Returned',
  'status.ditolak': 'Declined',
  'status.dibatalkan': 'Cancelled',
  'galat.bukan_anggota': 'Please complete your details first.',
  'galat.diblokir': 'Your account is blocked. Please contact the librarian.',
  'galat.buku_tidak_ada': 'Book not found.',
  'galat.stok_habis': 'All copies are on loan.',
  'galat.sudah_diajukan': 'This book is already in your loans.',
  'galat.pinjaman_tidak_ada': 'Loan not found.',
  'galat.status_tidak_sah': 'The loan status has changed. Please reload.',
  'galat.terlarang': 'You are not allowed to do this.',
  'galat.tanggal_tidak_sah': 'Invalid date.',
```

Di `app/perpusbq/[lang]/page.tsx`, ganti baris `['statistik.eksemplar', ringkasan.eksemplar],` menjadi `['statistik.dipinjam', ringkasan.sedangDipinjam],`.

- [ ] **Step 2: Tulis `components/perpus-publik/FormMasuk.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { GoogleLogo } from '@phosphor-icons/react';
import type { Bahasa } from '@/lib/perpus/ddc';
import { nextAman } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';
import { createBrowserSupabase } from '@/lib/supabase/client';

export function FormMasuk({ lang }: { lang: Bahasa }) {
  const params = useSearchParams();
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState(params.get('error') === 'tautan-tidak-valid');

  const masuk = async () => {
    setSibuk(true); setGalat(false);
    // Lewat cookie: URL callback harus persis sama dengan entri Redirect URLs di Supabase.
    const next = nextAman(params.get('next')) ?? `/${lang}/pinjamanku`;
    document.cookie = `bq_next=${encodeURIComponent(next)}; path=/; max-age=600; samesite=lax`;
    const { error } = await createBrowserSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setSibuk(false); setGalat(true); }
  };

  return (
    <section className="p-kartu mx-auto w-full max-w-md space-y-4 p-6">
      <h1 className="p-h2 text-3xl">{t(lang, 'masuk.judul')}</h1>
      <p className="text-perpus-tinta-lembut">{t(lang, 'masuk.sub')}</p>
      {galat && <p role="alert" className="font-bold">{t(lang, 'masuk.gagal')}</p>}
      <button type="button" onClick={masuk} disabled={sibuk} className="p-tombol w-full">
        <GoogleLogo size={20} weight="bold" aria-hidden />
        {t(lang, sibuk ? 'masuk.mengalihkan' : 'masuk.tombol')}
      </button>
    </section>
  );
}
```

- [ ] **Step 3: Tulis `components/perpus-publik/FormDaftar.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Bahasa } from '@/lib/perpus/ddc';
import { nextAman } from '@/lib/perpus/domain';
import { t, type KunciTeks } from '@/lib/perpus/i18n';

export function FormDaftar({ lang }: { lang: Bahasa }) {
  const params = useSearchParams();
  const [isi, setIsi] = useState({ nama: '', noWa: '' });
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<KunciTeks | null>(null);

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault(); setSibuk(true); setGalat(null);
    const res = await fetch('/api/perpus-publik/daftar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(isi),
    });
    if (res.ok) {
      // Muat penuh, bukan navigasi klien: proxy perlu melihat baris anggota yang baru.
      window.location.assign(nextAman(params.get('next')) ?? `/${lang}/pinjamanku`);
      return;
    }
    const d = await res.json().catch(() => ({}));
    setSibuk(false);
    setGalat(d.fields?.nama ? 'daftar.namaSalah' : d.fields?.noWa ? 'daftar.waSalah' : 'daftar.gagal');
  };

  return (
    <form onSubmit={simpan} className="p-kartu mx-auto w-full max-w-md space-y-4 p-6">
      <h1 className="p-h2 text-3xl">{t(lang, 'daftar.judul')}</h1>
      <p className="text-perpus-tinta-lembut">{t(lang, 'daftar.sub')}</p>
      <label className="block space-y-1">
        <span className="text-xs font-bold">{t(lang, 'daftar.nama')}</span>
        <input className="p-input" autoComplete="name" required value={isi.nama} onChange={e => setIsi({ ...isi, nama: e.target.value })} />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-bold">{t(lang, 'daftar.noWa')}</span>
        <input className="p-input" type="tel" autoComplete="tel" inputMode="tel" placeholder="08…" required value={isi.noWa} onChange={e => setIsi({ ...isi, noWa: e.target.value })} />
      </label>
      {galat && <p role="alert" className="font-bold">{t(lang, galat)}</p>}
      <button type="submit" disabled={sibuk} className="p-tombol w-full">{t(lang, sibuk ? 'daftar.menyimpan' : 'daftar.tombol')}</button>
    </form>
  );
}
```

- [ ] **Step 4: Tulis halaman**

`app/perpusbq/[lang]/masuk/page.tsx`:

```tsx
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { FormMasuk } from '@/components/perpus-publik/FormMasuk';
import { adaBahasa } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';
import { metaHalaman } from '@/lib/perpus/meta';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  return adaBahasa(lang) ? { ...metaHalaman(lang, '/masuk', t(lang, 'masuk.judul')), robots: { index: false } } : {};
}

export default async function Masuk({ params }: Props) {
  const { lang } = await params;
  if (!adaBahasa(lang)) notFound();
  return <Suspense><FormMasuk lang={lang} /></Suspense>;
}
```

`app/perpusbq/[lang]/daftar/page.tsx`:

```tsx
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { FormDaftar } from '@/components/perpus-publik/FormDaftar';
import { adaBahasa } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';
import { metaHalaman } from '@/lib/perpus/meta';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  return adaBahasa(lang) ? { ...metaHalaman(lang, '/daftar', t(lang, 'daftar.judul')), robots: { index: false } } : {};
}

export default async function Daftar({ params }: Props) {
  const { lang } = await params;
  if (!adaBahasa(lang)) notFound();
  return <Suspense><FormDaftar lang={lang} /></Suspense>;
}
```

- [ ] **Step 5: Ubah `components/perpus-publik/NavPerpus.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import { BookBookmark, Books, HandHeart, House, SignIn } from '@phosphor-icons/react';
import type { Bahasa } from '@/lib/perpus/ddc';
import { t } from '@/lib/perpus/i18n';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { PengalihBahasa } from './PengalihBahasa';

const ITEM = [
  { segmen: null, path: '', kunci: 'nav.beranda', Ikon: House },
  { segmen: 'katalog', path: '/katalog', kunci: 'nav.katalog', Ikon: Books },
  { segmen: 'donatur', path: '/donatur', kunci: 'nav.donatur', Ikon: HandHeart },
] as const;
const PINJAMANKU = { segmen: 'pinjamanku', path: '/pinjamanku', kunci: 'nav.pinjamanku', Ikon: BookBookmark } as const;
const MASUK = { segmen: 'masuk', path: '/masuk', kunci: 'nav.masuk', Ikon: SignIn } as const;

export function NavPerpus({ lang }: { lang: Bahasa }) {
  const aktif = useSelectedLayoutSegment();
  // Detail buku bagian dari Katalog; daftar bagian dari Masuk.
  const segmen = aktif === 'buku' ? 'katalog' : aktif === 'daftar' ? 'masuk' : aktif;
  // Dibaca di klien agar layout tetap statis; getSession hanya membaca cookie browser.
  const [masuk, setMasuk] = useState(false);
  useEffect(() => {
    createBrowserSupabase().auth.getSession().then(({ data }) => setMasuk(!!data.session));
  }, []);
  return (
    <nav className="p-nav" aria-label={t(lang, 'nav.utama')}>
      <Link href={`/${lang}`} className="p-nav-merek">{t(lang, 'situs.nama')}</Link>
      {[...ITEM, masuk ? PINJAMANKU : MASUK].map(({ segmen: s, path, kunci, Ikon }) => (
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

- [ ] **Step 6: Jalankan tes & tsc**

Run: `npx vitest run tests/perpus/i18n.test.ts && npx tsc --noEmit`
Expected: PASS, tanpa galat tipe.

- [ ] **Step 7: Verifikasi di browser**

Pastikan `.env.local` berisi `PERPUS_HOST=perpus.localhost`, mulai dev server lewat `preview_start`, buka `http://perpus.localhost:3000`, lalu periksa:
- `/id/masuk` tampil dengan tombol Google; `?error=tautan-tidak-valid` menampilkan pesan.
- `/id/pinjamanku` dialihkan ke `/id/masuk?next=%2Fid%2Fpinjamanku`.
- Nav 375px: empat item plus ID | EN muat tanpa terpotong (`resize_window` preset `mobile`).
- Tidak ada galat hydration di konsol.

- [ ] **Step 8: Commit**

```bash
git add app/perpusbq components/perpus-publik lib/perpus/i18n
git commit -m "feat(perpus): halaman masuk & daftar, nav sadar sesi, kamus peminjaman, statistik sedang dipinjam"
```

---

### Task 6: Tombol Pinjam dan Pinjamanku

**Files:**
- Create: `components/perpus-publik/TombolPinjam.tsx`, `components/perpus-publik/PinjamankuKlien.tsx`, `app/perpusbq/[lang]/pinjamanku/page.tsx`
- Modify: `lib/perpus/pinjaman.ts`, `app/perpusbq/[lang]/buku/[id]/page.tsx`
- Test: `tests/perpus/pinjaman.test.ts`

**Interfaces:**
- Consumes: API Task 4; kunci i18n Task 5; `tanggalPublik(lang, iso)`; `terlambat`, `hariIniWib` (Task 1); `KodeGalat`.
- Produces: `tampilanPinjam(s: StatusPinjamBuku | null): TampilanPinjam`; `<TombolPinjam lang bukuId idPendek />`, `<PinjamankuKlien lang />`.

Repo tidak memakai `@testing-library`; tes komponennya memakai `renderToStaticMarkup`, yang tidak menjalankan `useEffect`. Karena itu keputusan tampilan tombol dibuat fungsi murni dan diuji di sana. Jangan menambah dependensi. Perilaku klik diverifikasi di browser pada Task 9.

- [ ] **Step 1: Tulis tes yang gagal**

Tambahkan ke `tests/perpus/pinjaman.test.ts` (perbarui impor dengan `tampilanPinjam`):

```ts
describe('tampilanPinjam', () => {
  const dasar = { masuk: true, anggota: 'aktif', pinjamanAktif: null, tersedia: 1 } as const;
  it('belum dimuat', () => {
    expect(tampilanPinjam(null)).toBe('memuat');
  });
  it('tamu ke masuk, walau stok habis', () => {
    expect(tampilanPinjam({ ...dasar, masuk: false, anggota: null, tersedia: 0 })).toBe('masuk');
  });
  it('sesi tanpa anggota ke daftar', () => {
    expect(tampilanPinjam({ ...dasar, anggota: null })).toBe('daftar');
  });
  it('pinjaman aktif didahulukan dari stok habis & blokir', () => {
    expect(tampilanPinjam({ ...dasar, pinjamanAktif: 'dipinjam', tersedia: 0 })).toBe('sudah_ada');
    expect(tampilanPinjam({ ...dasar, anggota: 'diblokir', pinjamanAktif: 'diajukan' })).toBe('sudah_ada');
  });
  it('diblokir didahulukan dari stok habis', () => {
    expect(tampilanPinjam({ ...dasar, anggota: 'diblokir', tersedia: 0 })).toBe('diblokir');
  });
  it('stok habis atau buku tidak ada', () => {
    expect(tampilanPinjam({ ...dasar, tersedia: 0 })).toBe('habis');
    expect(tampilanPinjam({ ...dasar, tersedia: null })).toBe('habis');
  });
  it('anggota aktif dan stok ada', () => {
    expect(tampilanPinjam(dasar)).toBe('bisa');
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/perpus/pinjaman.test.ts`
Expected: FAIL, `tampilanPinjam` belum ada.

- [ ] **Step 3: Tulis fungsi dan komponen**

Tambahkan ke `lib/perpus/pinjaman.ts` (perbarui impor tipe dengan `StatusPinjamBuku`):

```ts
export type TampilanPinjam = 'memuat' | 'masuk' | 'daftar' | 'sudah_ada' | 'diblokir' | 'habis' | 'bisa';

export function tampilanPinjam(s: StatusPinjamBuku | null): TampilanPinjam {
  if (!s) return 'memuat';
  if (!s.masuk) return 'masuk';
  if (!s.anggota) return 'daftar';
  if (s.pinjamanAktif) return 'sudah_ada';
  if (s.anggota === 'diblokir') return 'diblokir';
  return (s.tersedia ?? 0) < 1 ? 'habis' : 'bisa';
}
```

`components/perpus-publik/TombolPinjam.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Bahasa } from '@/lib/perpus/ddc';
import { t } from '@/lib/perpus/i18n';
import { tampilanPinjam, type KodeGalat } from '@/lib/perpus/pinjaman';
import type { StatusPinjamBuku } from '@/lib/perpus/tipe';

export function TombolPinjam({ lang, bukuId, idPendek }: { lang: Bahasa; bukuId: string; idPendek: string }) {
  const [s, setS] = useState<StatusPinjamBuku | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [terkirim, setTerkirim] = useState(false);
  const [galat, setGalat] = useState<KodeGalat | null>(null);

  useEffect(() => {
    fetch(`/api/perpus-publik/status?buku=${bukuId}`).then(r => r.json()).then(d => setS(d.data ?? null));
  }, [bukuId]);

  const ajukan = async () => {
    setSibuk(true); setGalat(null);
    const res = await fetch('/api/perpus-publik/pinjaman', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bukuId }),
    });
    const d = await res.json().catch(() => ({}));
    setSibuk(false);
    if (res.ok) setTerkirim(true); else setGalat((d.kode as KodeGalat) ?? 'buku_tidak_ada');
  };

  const tampilan = terkirim ? 'sudah_ada' : tampilanPinjam(s);
  const tujuan = encodeURIComponent(`/${lang}/buku/${idPendek}`);
  if (tampilan === 'memuat') return <button type="button" disabled className="p-tombol">{t(lang, 'pinjam.memuat')}</button>;
  if (tampilan === 'masuk') return <Link href={`/${lang}/masuk?next=${tujuan}`} className="p-tombol">{t(lang, 'pinjam.masuk')}</Link>;
  if (tampilan === 'daftar') return <Link href={`/${lang}/daftar?next=${tujuan}`} className="p-tombol">{t(lang, 'pinjam.daftar')}</Link>;
  if (tampilan === 'sudah_ada') {
    return (
      <div className="space-y-2">
        {terkirim && <p role="status" className="font-bold">{t(lang, 'pinjam.terkirim')}</p>}
        <Link href={`/${lang}/pinjamanku`} className="p-tombol">{t(lang, 'pinjam.sudahAda')}</Link>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <button type="button" onClick={ajukan} disabled={sibuk || tampilan !== 'bisa'} className="p-tombol disabled:opacity-50">
        {t(lang, sibuk ? 'pinjam.mengajukan' : 'pinjam.tombol')}
      </button>
      {tampilan === 'diblokir' && <p className="font-bold">{t(lang, 'pinjam.diblokir')}</p>}
      {tampilan === 'habis' && <p className="font-bold">{t(lang, 'pinjam.habis')}</p>}
      {galat && <p role="alert" className="font-bold">{t(lang, `galat.${galat}`)}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Pasang di `app/perpusbq/[lang]/buku/[id]/page.tsx`**

Tambahkan impor `import { TombolPinjam } from '@/components/perpus-publik/TombolPinjam';`, lalu ganti baris tautan pengarang:

```tsx
          <div className="flex flex-wrap items-start gap-3">
            <TombolPinjam lang={lang} bukuId={buku.id} idPendek={buku.idPendek} />
            {buku.penulis && <Link href={urlKatalog(lang, { pengarang: buku.penulis })} className="p-pil">{t(lang, 'buku.lainPenulis')}</Link>}
          </div>
```

- [ ] **Step 5: Tulis `components/perpus-publik/PinjamankuKlien.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Bahasa } from '@/lib/perpus/ddc';
import { tanggalPublik } from '@/lib/perpus/format-publik';
import { t, type KunciTeks } from '@/lib/perpus/i18n';
import { hariIniWib, terlambat, type KodeGalat } from '@/lib/perpus/pinjaman';
import type { Pinjamanku } from '@/lib/perpus/tipe';
import { createBrowserSupabase } from '@/lib/supabase/client';

export function PinjamankuKlien({ lang }: { lang: Bahasa }) {
  const [daftar, setDaftar] = useState<Pinjamanku[] | null>(null);
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [galat, setGalat] = useState<KunciTeks | null>(null);

  const muat = async () => {
    const res = await fetch('/api/perpus-publik/pinjaman');
    if (res.status === 401) { window.location.assign(`/${lang}/masuk?next=${encodeURIComponent(`/${lang}/pinjamanku`)}`); return; }
    const d = await res.json().catch(() => ({}));
    if (res.ok) setDaftar(d.data); else setGalat('pinjamanku.gagal');
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { muat(); }, []);

  const aksi = async (id: string, jenis: 'batal' | 'klaim') => {
    setSibuk(id); setGalat(null);
    const res = await fetch(`/api/perpus-publik/pinjaman/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aksi: jenis }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setGalat(d.kode ? `galat.${d.kode as KodeGalat}` : 'pinjamanku.gagal');
    await muat();
    setSibuk(null);
  };

  const keluar = async () => {
    await createBrowserSupabase().auth.signOut();
    window.location.assign(`/${lang}`);
  };

  const hari = hariIniWib();
  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <h1 className="p-h1">{t(lang, 'pinjamanku.judul')}</h1>
        <button type="button" onClick={keluar} className="p-pil">{t(lang, 'pinjamanku.keluar')}</button>
      </header>
      {galat && <p role="alert" className="font-bold">{t(lang, galat)}</p>}
      {daftar?.length === 0 && (
        <section className="p-kartu space-y-3 p-6 text-center">
          <p>{t(lang, 'pinjamanku.kosong')}</p>
          <Link href={`/${lang}/katalog`} className="p-tombol">{t(lang, 'pinjamanku.keKatalog')}</Link>
        </section>
      )}
      <ul className="space-y-3">
        {daftar?.map(p => (
          <li key={p.id} className="p-kartu space-y-2 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <Link href={`/${lang}/buku/${p.idPendek}`} className="min-w-0 font-bold underline-offset-2 hover:underline">{p.judul}</Link>
              <span className="p-label">{t(lang, `status.${p.status}`)}</span>
            </div>
            {p.jatuhTempo && p.status === 'dipinjam' && (
              <p className="text-sm">
                {t(lang, 'pinjamanku.jatuhTempo', { tanggal: tanggalPublik(lang, p.jatuhTempo) })}
                {terlambat(p, hari) && <b> · {t(lang, 'pinjamanku.terlambat')}</b>}
              </p>
            )}
            {p.dikembalikanAt && <p className="text-sm">{t(lang, 'pinjamanku.dikembalikan', { tanggal: tanggalPublik(lang, p.dikembalikanAt.slice(0, 10)) })}</p>}
            {p.catatan && <p className="text-sm">{t(lang, 'pinjamanku.catatan', { isi: p.catatan })}</p>}
            {p.status === 'diajukan' && <button type="button" disabled={sibuk === p.id} onClick={() => aksi(p.id, 'batal')} className="p-pil">{t(lang, 'pinjamanku.batal')}</button>}
            {p.status === 'dipinjam' && <button type="button" disabled={sibuk === p.id} onClick={() => aksi(p.id, 'klaim')} className="p-tombol">{t(lang, 'pinjamanku.klaim')}</button>}
          </li>
        ))}
      </ul>
    </>
  );
}
```

- [ ] **Step 6: Tulis `app/perpusbq/[lang]/pinjamanku/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { PinjamankuKlien } from '@/components/perpus-publik/PinjamankuKlien';
import { adaBahasa } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';
import { metaHalaman } from '@/lib/perpus/meta';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  return adaBahasa(lang) ? { ...metaHalaman(lang, '/pinjamanku', t(lang, 'pinjamanku.judul')), robots: { index: false } } : {};
}

/** Cangkang statis: sesi dijaga proxy, data diambil klien (lihat sesiPerpus di proxy.ts). */
export default async function Pinjamanku({ params }: Props) {
  const { lang } = await params;
  if (!adaBahasa(lang)) notFound();
  return <PinjamankuKlien lang={lang} />;
}
```

- [ ] **Step 7: Jalankan tes & tsc**

Run: `npx vitest run tests/perpus/pinjaman.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/perpus/pinjaman.ts components/perpus-publik app/perpusbq tests/perpus/pinjaman.test.ts
git commit -m "feat(perpus): tombol Pinjam & halaman Pinjamanku"
```

---

### Task 7: API pustakawan, notifikasi, akun peminjam

**Files:**
- Modify: `lib/db/perpus-pinjaman-repo.ts`, `lib/db/perpus-repo.ts:123-128`, `lib/notifikasi/jenis.ts`, `app/api/notifikasi/route.ts`, `app/api/pengguna/route.ts`, `app/api/pengguna/[id]/route.ts`
- Create: `app/api/perpus/pinjaman/route.ts`, `app/api/perpus/pinjaman/[id]/route.ts`, `app/api/perpus/anggota/route.ts`, `app/api/perpus/anggota/[id]/route.ts`
- Test: `tests/db/perpus-pinjaman-repo.test.ts`, `tests/api/perpus-pinjaman-route.test.ts`, `tests/api/pengguna-peminjam-route.test.ts`, `tests/utils/notifikasi.test.ts`

**Interfaces:**
- Consumes: Task 1 (`ATURAN`, `bukanPeminjam`, `aksiPustakawanSchema`, `statusAnggotaSchema`), Task 2.
- Produces: repo `listPinjaman(c): Promise<PinjamanAdmin[]>`, `terapkanAksi(c, id, input, oleh): Promise<Pinjaman>`, `listAnggota(c): Promise<AnggotaAdmin[]>`, `ubahStatusAnggota(c, id, status): Promise<Anggota>`. API `GET /api/perpus/pinjaman`, `PATCH /api/perpus/pinjaman/[id]`, `GET /api/perpus/anggota`, `PATCH /api/perpus/anggota/[id]`. `susunNotifikasi` menerima `perpusPengajuan`, `perpusKlaim`.

- [ ] **Step 1: Tulis tes yang gagal**

Tambahkan ke `tests/db/perpus-pinjaman-repo.test.ts` (perbarui impor: `listPinjaman, terapkanAksi`):

```ts
describe('repo pinjaman pustakawan', () => {
  it('ACC lewat RPC dengan tanggal', async () => {
    const catat: unknown[][] = [];
    await terapkanAksi(klien({}, { data: { id: 'p1' }, error: null }, catat), 'p1', { aksi: 'acc', jatuhTempo: '2026-12-01' }, 'u9');
    expect(catat).toContainEqual(['rpc', 'perpus_acc_pinjaman', { p_id: 'p1', p_jatuh_tempo: '2026-12-01' }]);
  });
  it('tolak hanya mengenai status diajukan dan menyimpan catatan', async () => {
    const catat: unknown[][] = [];
    await terapkanAksi(klien({ perpus_pinjaman: { data: { id: 'p1' }, error: null } }, undefined, catat), 'p1', { aksi: 'tolak', catatan: 'Rusak' }, 'u9');
    expect(catat).toContainEqual(['update', { status: 'ditolak', diprosesOleh: 'u9', catatan: 'Rusak' }]);
    expect(catat).toContainEqual(['eq', 'status', 'diajukan']);
  });
  it('verifikasi mengisi dikembalikanAt', async () => {
    const catat: unknown[][] = [];
    await terapkanAksi(klien({ perpus_pinjaman: { data: { id: 'p1' }, error: null } }, undefined, catat), 'p1', { aksi: 'verifikasi' }, 'u9');
    const patch = catat.find(c => c[0] === 'update')![1] as Record<string, unknown>;
    expect(patch).toMatchObject({ status: 'dikembalikan', diprosesOleh: 'u9' });
    expect(typeof patch.dikembalikanAt).toBe('string');
  });
  it('perpanjang hanya mengubah jatuh tempo', async () => {
    const catat: unknown[][] = [];
    await terapkanAksi(klien({ perpus_pinjaman: { data: { id: 'p1' }, error: null } }, undefined, catat), 'p1', { aksi: 'perpanjang', jatuhTempo: '2026-12-20' }, 'u9');
    expect(catat).toContainEqual(['update', { status: 'dipinjam', diprosesOleh: 'u9', jatuhTempo: '2026-12-20' }]);
  });
  it('tidak ada baris cocok tetapi pinjaman ada → status_tidak_sah', async () => {
    const hasil = [{ data: null, error: null }, { data: { status: 'dikembalikan' }, error: null }];
    const c = { from: () => rantai(hasil.shift(), []) } as never;
    await expect(terapkanAksi(c, 'p1', { aksi: 'verifikasi' }, 'u9')).rejects.toMatchObject({ kode: 'status_tidak_sah', statusSaatIni: 'dikembalikan' });
  });
  it('tidak ada baris sama sekali → pinjaman_tidak_ada', async () => {
    const c = { from: () => rantai({ data: null, error: null }, []) } as never;
    await expect(terapkanAksi(c, 'p1', { aksi: 'verifikasi' }, 'u9')).rejects.toMatchObject({ kode: 'pinjaman_tidak_ada' });
  });
  it('list menyertakan anggota & buku, terbaru dulu', async () => {
    const catat: unknown[][] = [];
    await listPinjaman(klien({ perpus_pinjaman: { data: [], error: null } }, undefined, catat));
    expect(catat).toContainEqual(['select', '*, anggota:perpus_anggota(nama,noWa,status), buku:perpus_buku(judul,penulis,nomorPanggil)']);
    expect(catat).toContainEqual(['order', 'diajukanAt', { ascending: false }]);
  });
});
```

`tests/api/perpus-pinjaman-route.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PinjamanError } from '@/lib/perpus/pinjaman';

const repo = vi.hoisted(() => ({ listPinjaman: vi.fn(), terapkanAksi: vi.fn(), listAnggota: vi.fn(), ubahStatusAnggota: vi.fn() }));
const requireRoom = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/perpus-pinjaman-repo', () => repo);
vi.mock('@/lib/auth/session', () => ({ requireRoom: (...a: unknown[]) => requireRoom(...a), authErrorResponse: () => null }));

import { GET as LIST } from '@/app/api/perpus/pinjaman/route';
import { PATCH as AKSI } from '@/app/api/perpus/pinjaman/[id]/route';
import { GET as ANGGOTA } from '@/app/api/perpus/anggota/route';
import { PATCH as BLOKIR } from '@/app/api/perpus/anggota/[id]/route';

const json = (body: unknown) => ({ json: async () => body }) as never;
const ctx = { params: Promise.resolve({ id: 'p1' }) };

beforeEach(() => {
  Object.values(repo).forEach(f => f.mockReset());
  requireRoom.mockReset().mockResolvedValue({ user: { id: 'u9' }, supabase: {} });
});

describe('API pinjaman pustakawan', () => {
  it('list memakai ruangan perpus', async () => {
    repo.listPinjaman.mockResolvedValue([{ id: 'p1' }]);
    expect((await (await LIST()).json()).data).toEqual([{ id: 'p1' }]);
    expect(requireRoom).toHaveBeenCalledWith('perpus');
  });
  it('ACC meneruskan id pustakawan', async () => {
    repo.terapkanAksi.mockResolvedValue({ id: 'p1' });
    expect((await AKSI(json({ aksi: 'acc' }), ctx)).status).toBe(200);
    expect(repo.terapkanAksi).toHaveBeenCalledWith({}, 'p1', { aksi: 'acc', jatuhTempo: null }, 'u9');
  });
  it('stok habis → 409 dengan pesan spec', async () => {
    repo.terapkanAksi.mockRejectedValue(new PinjamanError('stok_habis'));
    const res = await AKSI(json({ aksi: 'acc' }), ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('Semua eksemplar sedang dipinjam');
  });
  it('transisi tidak sah → 409 dengan status saat ini', async () => {
    repo.terapkanAksi.mockRejectedValue(new PinjamanError('status_tidak_sah', 'dikembalikan'));
    const res = await AKSI(json({ aksi: 'verifikasi' }), ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).status).toBe('dikembalikan');
  });
  it('aksi anggota tidak diterima di sini', async () => {
    expect((await AKSI(json({ aksi: 'klaim' }), ctx)).status).toBe(400);
  });
  it('daftar anggota', async () => {
    repo.listAnggota.mockResolvedValue([]);
    expect((await ANGGOTA()).status).toBe(200);
  });
  it('blokir anggota', async () => {
    repo.ubahStatusAnggota.mockResolvedValue({ userId: 'p1', status: 'diblokir' });
    expect((await BLOKIR(json({ status: 'diblokir' }), ctx)).status).toBe(200);
    expect(repo.ubahStatusAnggota).toHaveBeenCalledWith({}, 'p1', 'diblokir');
  });
  it('status anggota tak dikenal → 400', async () => {
    expect((await BLOKIR(json({ status: 'hapus' }), ctx)).status).toBe(400);
  });
});
```

Tambahkan ke `tests/utils/notifikasi.test.ts`:

```ts
describe('notifikasi perpus', () => {
  it('pengajuan & klaim menuju antrian Ruang Perpus', () => {
    const n = susunNotifikasi({ perpusPengajuan: 2, perpusKlaim: 1 });
    expect(n.map(x => x.id)).toEqual(['perpus-pengajuan', 'perpus-klaim']);
    expect(n[0]).toMatchObject({ ruang: 'perpus', href: '/perpus', judul: '2 pengajuan pinjaman baru' });
    expect(n[1]).toMatchObject({ ruang: 'perpus', href: '/perpus', judul: '1 klaim pengembalian menunggu verifikasi' });
  });
});
```

`tests/api/pengguna-peminjam-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const hasil = vi.hoisted(() => ({ tabel: {} as Record<string, unknown>, dihapus: [] as string[] }));
const deleteUser = vi.hoisted(() => vi.fn(async () => ({ error: null })));

function rantai(t: string) {
  const r: any = new Proxy({}, {
    get: (_x, k) => {
      if (k === 'then') return (ok: (v: unknown) => void) => ok(hasil.tabel[t] ?? { data: [], error: null, count: 0 });
      if (k === 'delete') return () => { hasil.dihapus.push(t); return r; };
      return () => r;
    },
  });
  return r;
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabase: () => ({
    from: (t: string) => rantai(t),
    auth: { admin: { deleteUser, listUsers: async () => ({ data: { users: [] } }) } },
  }),
}));
vi.mock('@/lib/auth/session', () => ({
  requireUser: vi.fn(async () => ({ user: { id: 'admin', roles: ['SUPERADMIN'] } })),
  authErrorResponse: () => null,
}));

import { GET } from '@/app/api/pengguna/route';
import { DELETE } from '@/app/api/pengguna/[id]/route';

const ctx = { params: Promise.resolve({ id: 'u1' }) };

beforeEach(() => { hasil.tabel = {}; hasil.dihapus = []; deleteUser.mockClear(); });

describe('akun peminjam di /pengguna', () => {
  it('akun nonaktif milik anggota perpus disembunyikan', async () => {
    hasil.tabel = {
      profiles: { data: [
        { id: 'a', email: 'a@x', aktif: false }, { id: 'b', email: 'b@x', aktif: false }, { id: 'c', email: 'c@x', aktif: true },
      ], error: null },
      perpus_anggota: { data: [{ userId: 'a' }, { userId: 'c' }], error: null },
    };
    const { data } = await (await GET()).json();
    expect(data.map((r: { id: string }) => r.id)).toEqual(['b', 'c']);
  });
  it('tabel anggota belum ada → semua tampil', async () => {
    hasil.tabel = {
      profiles: { data: [{ id: 'a', email: 'a@x', aktif: false }], error: null },
      perpus_anggota: { data: null, error: { message: 'relation does not exist' } },
    };
    expect((await (await GET()).json()).data).toHaveLength(1);
  });
  it('akun dengan riwayat pinjaman tidak dihapus', async () => {
    hasil.tabel = { perpus_pinjaman: { count: 2, error: null } };
    const res = await DELETE({} as never, ctx);
    expect(res.status).toBe(409);
    expect(hasil.dihapus).toEqual([]);
    expect(deleteUser).not.toHaveBeenCalled();
  });
  it('tanpa riwayat tetap terhapus', async () => {
    hasil.tabel = { perpus_pinjaman: { count: 0, error: null }, profiles: { data: { email: 'a@x' }, error: null } };
    expect((await DELETE({} as never, ctx)).status).toBe(200);
    expect(deleteUser).toHaveBeenCalledWith('u1');
  });
});
```

Tambahkan ke `tests/db/perpus-repo.test.ts` (sesuaikan dengan klien palsu yang dipakai file itu):

```ts
it('kosongkanPerpus memberi pesan jelas bila buku masih punya riwayat pinjaman', async () => {
  const c = { from: () => ({ delete: () => ({ neq: async () => ({ error: { code: '23503', message: 'fk' } }) }) }) } as never;
  await expect(kosongkanPerpus(c)).rejects.toThrow('Masih ada riwayat pinjaman');
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/db tests/api/perpus-pinjaman-route.test.ts tests/api/pengguna-peminjam-route.test.ts tests/utils/notifikasi.test.ts`
Expected: FAIL, fungsi dan rute baru belum ada.

- [ ] **Step 3: Tambahkan ke `lib/db/perpus-pinjaman-repo.ts`**

Perbarui impor: `import { ATURAN, PinjamanError, galatDariRpc } from '@/lib/perpus/pinjaman';`, tipe tambahan `AnggotaAdmin, PinjamanAdmin, StatusAnggota, StatusPinjaman`, dan `AksiPustakawanInput`.

```ts
export async function listPinjaman(c: SupabaseClient): Promise<PinjamanAdmin[]> {
  const { data, error } = await c.from('perpus_pinjaman')
    .select('*, anggota:perpus_anggota(nama,noWa,status), buku:perpus_buku(judul,penulis,nomorPanggil)')
    .order('diajukanAt', { ascending: false });
  if (error) throw new Error(`Gagal memuat pinjaman: ${error.message}`);
  return (data || []) as unknown as PinjamanAdmin[];
}

/** ACC lewat fungsi SQL karena perlu mengunci buku; lainnya cukup update bersyarat status asal. */
export async function terapkanAksi(c: SupabaseClient, id: string, input: AksiPustakawanInput, oleh: string): Promise<Pinjaman> {
  if (input.aksi === 'acc') return panggil<Pinjaman>(c, 'perpus_acc_pinjaman', { p_id: id, p_jatuh_tempo: input.jatuhTempo });
  const { dari, ke } = ATURAN[input.aksi];
  const patch = {
    status: ke,
    diprosesOleh: oleh,
    ...(input.aksi === 'tolak' ? { catatan: input.catatan } : {}),
    ...(input.aksi === 'perpanjang' ? { jatuhTempo: input.jatuhTempo } : {}),
    ...(ke === 'dikembalikan' ? { dikembalikanAt: new Date().toISOString() } : {}),
  };
  const { data, error } = await c.from('perpus_pinjaman').update(patch).eq('id', id).eq('status', dari).select('*').maybeSingle();
  if (error) throw new Error(`Gagal memproses pinjaman: ${error.message}`);
  if (data) return data as Pinjaman;
  const { data: kini } = await c.from('perpus_pinjaman').select('status').eq('id', id).maybeSingle();
  const status = (kini as { status: StatusPinjaman } | null)?.status;
  throw status ? new PinjamanError('status_tidak_sah', status) : new PinjamanError('pinjaman_tidak_ada');
}

export async function listAnggota(c: SupabaseClient): Promise<AnggotaAdmin[]> {
  const { data, error } = await c.from('perpus_anggota').select('*, pinjaman:perpus_pinjaman(status)').order('nama');
  if (error) throw new Error(`Gagal memuat anggota: ${error.message}`);
  return (data || []) as AnggotaAdmin[];
}

export async function ubahStatusAnggota(c: SupabaseClient, id: string, status: StatusAnggota): Promise<Anggota> {
  const { data, error } = await c.from('perpus_anggota').update({ status }).eq('userId', id).select('*').single();
  if (error) throw new Error(`Gagal mengubah anggota: ${error.message}`);
  return data as Anggota;
}
```

- [ ] **Step 4: Tulis rute**

`app/api/perpus/pinjaman/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listPinjaman } from '@/lib/db/perpus-pinjaman-repo';

export async function GET() {
  try {
    const { supabase } = await requireRoom('perpus');
    return NextResponse.json({ success: true, data: await listPinjaman(supabase) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('List pinjaman error:', e);
    return NextResponse.json({ error: 'Gagal memuat pinjaman' }, { status: 500 });
  }
}
```

`app/api/perpus/pinjaman/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { terapkanAksi } from '@/lib/db/perpus-pinjaman-repo';
import { pinjamanErrorResponse } from '@/lib/perpus/pinjaman-respon';
import { aksiPustakawanSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, supabase } = await requireRoom('perpus');
    const { id } = await params;
    const parsed = aksiPustakawanSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await terapkanAksi(supabase, id, parsed.data, user.id) });
  } catch (e: unknown) {
    const res = authErrorResponse(e) ?? pinjamanErrorResponse(e);
    if (res) return res;
    console.error('Aksi pinjaman error:', e);
    return NextResponse.json({ error: 'Gagal memproses pinjaman' }, { status: 500 });
  }
}
```

`app/api/perpus/anggota/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { listAnggota } from '@/lib/db/perpus-pinjaman-repo';

export async function GET() {
  try {
    const { supabase } = await requireRoom('perpus');
    return NextResponse.json({ success: true, data: await listAnggota(supabase) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('List anggota error:', e);
    return NextResponse.json({ error: 'Gagal memuat anggota' }, { status: 500 });
  }
}
```

`app/api/perpus/anggota/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRoom, authErrorResponse } from '@/lib/auth/session';
import { ubahStatusAnggota } from '@/lib/db/perpus-pinjaman-repo';
import { statusAnggotaSchema } from '@/lib/validation/perpus';
import { validationResponse } from '@/lib/validation/errors';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireRoom('perpus');
    const { id } = await params;
    const parsed = statusAnggotaSchema.safeParse(await req.json());
    if (!parsed.success) return validationResponse(parsed.error);
    return NextResponse.json({ success: true, data: await ubahStatusAnggota(supabase, id, parsed.data.status) });
  } catch (e: unknown) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Ubah anggota error:', e);
    return NextResponse.json({ error: 'Gagal mengubah anggota' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Ubah `lib/notifikasi/jenis.ts`**

Tambahkan `'perpus-pengajuan' | 'perpus-klaim'` ke union `id`, `perpusPengajuan?: number; perpusKlaim?: number` ke parameter `susunNotifikasi`, lalu sebelum `return out;` di atas blok `akunMenunggu`:

```ts
  if (h.perpusPengajuan) out.push({
    id: 'perpus-pengajuan', ruang: 'perpus', jumlah: h.perpusPengajuan,
    judul: `${h.perpusPengajuan} pengajuan pinjaman baru`, sub: 'ACC atau tolak di antrian',
    href: '/perpus',
  });
  if (h.perpusKlaim) out.push({
    id: 'perpus-klaim', ruang: 'perpus', jumlah: h.perpusKlaim,
    judul: `${h.perpusKlaim} klaim pengembalian menunggu verifikasi`, sub: 'Periksa bukunya lalu verifikasi',
    href: '/perpus',
  });
```

- [ ] **Step 6: Ubah `app/api/notifikasi/route.ts`**

Tambahkan `import { bukanPeminjam } from '@/lib/perpus/pinjaman';`. Sisipkan setelah blok `lembaga`:

```ts
    if (roomsFor(user.roles).includes('perpus')) {
      tugas.push((async () => {
        const hitungStatus = (status: string) =>
          supabase.from('perpus_pinjaman').select('id', { head: true, count: 'exact' }).eq('status', status);
        const [baru, klaim] = await Promise.all([hitungStatus('diajukan'), hitungStatus('menunggu_verifikasi')]);
        // Tabel belum ada (migrasi 0015) → abaikan.
        if (!baru.error) hitung.perpusPengajuan = baru.count ?? 0;
        if (!klaim.error) hitung.perpusKlaim = klaim.count ?? 0;
      })());
    }
```

Ganti blok `canManageUsers`:

```ts
    if (canManageUsers(user.roles)) {
      tugas.push((async () => {
        const admin = createAdminSupabase();
        const [menunggu, anggota] = await Promise.all([
          admin.from('profiles').select('id, aktif').eq('aktif', false),
          admin.from('perpus_anggota').select('userId'),
        ]);
        if (menunggu.error) throw menunggu.error;
        // Peminjam perpus memang tidak perlu diaktifkan di bq-ku.
        const peminjam = new Set((anggota.data ?? []).map(a => a.userId as string));
        hitung.akunMenunggu = bukanPeminjam(menunggu.data ?? [], peminjam).length;
      })());
    }
```

- [ ] **Step 7: Ubah `app/api/pengguna/route.ts`**

Tambahkan `import { bukanPeminjam } from '@/lib/perpus/pinjaman';`, lalu di `GET`:

```ts
    const [{ data: profiles, error: e1 }, { data: allowed, error: e2 }, { data: users }, { data: anggota }] = await Promise.all([
      admin.from('profiles').select('*').order('createdAt', { ascending: true }),
      admin.from('allowed_emails').select('*').order('createdAt', { ascending: true }),
      admin.auth.admin.listUsers({ perPage: 1000 }),
      admin.from('perpus_anggota').select('userId'),
    ]);
    if (e1) throw e1; if (e2) throw e2;
    const last = new Map((users?.users || []).map(u => [u.id, u.last_sign_in_at || null]));
    const seen = new Set((profiles || []).map(p => p.email.toLowerCase()));
    const peminjam = new Set((anggota || []).map(a => a.userId as string));
    const rows = [
      ...bukanPeminjam(profiles || [], peminjam).map(p => ({ ...p, status: 'PROFIL' as const, lastSignInAt: last.get(p.id) ?? null })),
```

Sisa baris `allowed` tidak berubah.

- [ ] **Step 8: Ubah `app/api/pengguna/[id]/route.ts`**

Sisipkan di `DELETE`, tepat setelah pemeriksaan `id === user.id`:

```ts
    // Riwayat pinjaman menahan penghapusan (FK restrict); cek dulu agar profil tidak terhapus setengah jalan.
    const { count: pinjaman } = await admin.from('perpus_pinjaman').select('id', { head: true, count: 'exact' }).eq('anggotaId', id);
    if (pinjaman) {
      return NextResponse.json({ error: 'Akun ini punya riwayat pinjaman perpus. Blokir di Ruang Perpus, jangan dihapus.' }, { status: 409 });
    }
```

- [ ] **Step 9: Ubah `kosongkanPerpus` di `lib/db/perpus-repo.ts`**

```ts
const FK_DILANGGAR = '23503';
```

(diletakkan di sebelah `UNIK_DILANGGAR`), dan di dalam loop:

```ts
    const { error } = await c.from(t).delete().neq('id', ID_MUSTAHIL);
    if (error?.code === FK_DILANGGAR) throw new Error('Masih ada riwayat pinjaman, katalog tidak bisa diimpor ulang');
    if (error) throw new Error(`Gagal mengosongkan ${t}: ${error.message}`);
```

- [ ] **Step 10: Jalankan, pastikan lolos**

Run: `npx vitest run tests/db tests/api tests/utils/notifikasi.test.ts`
Expected: PASS, termasuk `tests/api/pengguna-route.test.ts` yang sudah ada.

- [ ] **Step 11: Commit**

```bash
git add lib/db lib/notifikasi app/api tests
git commit -m "feat(perpus): API pinjaman & anggota pustakawan, notifikasi, sembunyikan akun peminjam dari bq-ku"
```

---

### Task 8: UI Ruang Perpus

**Files:**
- Create: `components/perpus/usePinjaman.ts`, `components/perpus/KartuPinjaman.tsx`, `components/perpus/AntrianPinjaman.tsx`, `components/perpus/DaftarPinjaman.tsx`, `components/perpus/DaftarAnggota.tsx`, `app/(bqku)/(perpus)/perpus/pinjaman/page.tsx`, `app/(bqku)/(perpus)/perpus/anggota/page.tsx`
- Modify: `components/perpus/BerandaPerpus.tsx`, `lib/nav/menu.ts`, `components/layout/ikon-menu.ts`
- Test: `tests/layout/menu-perpus.test.ts`

**Interfaces:**
- Consumes: API Task 7, `susunAntrian`, `terlambat`, `hariIniWib`, `jatuhTempoBawaan`, `pesanPengingatWa`, `LABEL_STATUS` (Task 1), `waLink` dari `lib/surat/pesan.ts`.
- Produces: rute `/perpus/pinjaman`, `/perpus/anggota`.

- [ ] **Step 1: Ubah tes menu**

Di `tests/layout/menu-perpus.test.ts`:

```ts
  it('rail berisi beranda, pinjaman, buku, anggota, donasi, audit', () => {
    expect(menuRail('perpus', o).map(i => i.href)).toEqual(['/perpus', '/perpus/pinjaman', '/perpus/buku', '/perpus/anggota', '/perpus/donasi', '/perpus/audit']);
  });
  it('HP: 5 slot, Buku di tengah, pinjaman & anggota mengapit', () => {
    const s = slotHp('perpus', o);
    expect(s).toHaveLength(5);
    expect(s[1]).toMatchObject({ jenis: 'tautan', item: { href: '/perpus/pinjaman' } });
    expect(s[2]).toMatchObject({ jenis: 'tautan', utama: true, item: { href: '/perpus/buku' } });
    expect(s[3]).toMatchObject({ jenis: 'tautan', item: { href: '/perpus/anggota' } });
    expect(s[4]).toEqual({ jenis: 'akun' });
  });
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/layout/menu-perpus.test.ts`
Expected: FAIL.

- [ ] **Step 3: Ubah `lib/nav/menu.ts` dan `components/layout/ikon-menu.ts`**

Di `menu.ts`: tambahkan `'pinjaman' | 'anggota'` ke `KunciIkon`, lalu:

```ts
const PINJAMAN_PERPUS: ItemMenu = { href: '/perpus/pinjaman', label: 'Pinjaman', labelPendek: 'Pinjaman', ikon: 'pinjaman', warna: 'biru' };
const ANGGOTA_PERPUS: ItemMenu = { href: '/perpus/anggota', label: 'Anggota', labelPendek: 'Anggota', ikon: 'anggota', warna: 'ungu' };
```

```ts
  if (room === 'perpus') return [BERANDA_PERPUS, PINJAMAN_PERPUS, BUKU_PERPUS, ANGGOTA_PERPUS, DONASI_PERPUS, AUDIT_PERPUS];
```

```ts
  if (room === 'perpus') {
    // Donasi & Audit tetap terjangkau dari ubin Beranda.
    return [tautan(BERANDA_PERPUS), tautan(PINJAMAN_PERPUS), tautan(BUKU_PERPUS, true), tautan(ANGGOTA_PERPUS), { jenis: 'akun' }];
  }
```

Di `ikon-menu.ts`: tambahkan `BookBookmark, UserList` ke impor dan `pinjaman: BookBookmark, anggota: UserList,` ke `IKON_MENU`.

- [ ] **Step 4: Tulis `components/perpus/usePinjaman.ts`**

```ts
'use client';
import { useEffect, useState } from 'react';
import type { PinjamanAdmin } from '@/lib/perpus/tipe';
import type { AksiPustakawanInput } from '@/lib/validation/perpus';

export type KirimAksi = (id: string, aksi: AksiPustakawanInput) => Promise<void>;

/** Muat semua pinjaman dan jalankan aksi; setelah aksi daftar dimuat ulang, termasuk saat galat (status mungkin sudah berubah). */
export function usePinjaman() {
  const [daftar, setDaftar] = useState<PinjamanAdmin[] | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState<string | null>(null);

  const muat = async () => {
    const res = await fetch('/api/perpus/pinjaman');
    const d = await res.json();
    if (res.ok) setDaftar(d.data); else setGalat(d.error || 'Gagal memuat pinjaman');
  };
  useEffect(() => { muat(); }, []);

  const kirim: KirimAksi = async (id, aksi) => {
    setSibuk(id); setGalat(null);
    const res = await fetch(`/api/perpus/pinjaman/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(aksi),
    });
    const d = await res.json();
    if (!res.ok) setGalat(d.fields ? Object.values(d.fields).join(' · ') : d.error || 'Gagal memproses pinjaman');
    await muat();
    setSibuk(null);
  };

  return { daftar, galat, sibuk, kirim };
}
```

- [ ] **Step 5: Tulis `components/perpus/KartuPinjaman.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { WhatsappLogo } from '@phosphor-icons/react';
import { Kartu } from '@/components/ui/Kartu';
import { TombolUtama } from '@/components/ui/Tombol';
import { kelasInput } from '@/components/ui/kelas';
import { LABEL_STATUS, hariIniWib, jatuhTempoBawaan, pesanPengingatWa, terlambat } from '@/lib/perpus/pinjaman';
import type { PinjamanAdmin } from '@/lib/perpus/tipe';
import { waLink } from '@/lib/surat/pesan';
import { tanggalPendek } from './format';
import type { KirimAksi } from './usePinjaman';

const kelasSekunder = 'tekan inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-bq-garis bg-bq-surface px-4 text-sm font-bold text-bq-tinta disabled:opacity-50';

export function KartuPinjaman({ p, sibuk, kirim }: { p: PinjamanAdmin; sibuk: boolean; kirim: KirimAksi }) {
  const hari = hariIniWib();
  const [tanggal, setTanggal] = useState(p.jatuhTempo && p.jatuhTempo > hari ? p.jatuhTempo : jatuhTempoBawaan());
  const [catatan, setCatatan] = useState('');
  const lewat = terlambat(p, hari);
  const wa = p.status === 'dipinjam' && p.jatuhTempo
    ? waLink(p.anggota.noWa, pesanPengingatWa({ nama: p.anggota.nama, judul: p.buku.judul, jatuhTempo: p.jatuhTempo }, hari))
    : null;

  return (
    <Kartu className="p-4 space-y-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-extrabold text-bq-tinta">{p.buku.judul}</p>
          <p className="text-bq-redup">{p.buku.nomorPanggil} · {p.anggota.nama}{p.anggota.status === 'diblokir' ? ' (diblokir)' : ''}</p>
        </div>
        <span className={`shrink-0 font-bold ${lewat ? 'text-rose-600' : 'text-bq-redup'}`}>{lewat ? 'Terlambat' : LABEL_STATUS[p.status]}</span>
      </div>
      {p.jatuhTempo && p.status === 'dipinjam' && <p>Jatuh tempo {tanggalPendek(p.jatuhTempo)}</p>}
      {p.catatan && <p className="text-bq-redup">Catatan: {p.catatan}</p>}

      {p.status === 'diajukan' && (
        <div className="space-y-2">
          <label className="block space-y-1"><span className="text-xs font-semibold text-bq-redup">Jatuh tempo</span>
            <input type="date" className={kelasInput} min={hari} value={tanggal} onChange={e => setTanggal(e.target.value)} /></label>
          <TombolUtama disabled={sibuk} onClick={() => kirim(p.id, { aksi: 'acc', jatuhTempo: tanggal })}>ACC & serahkan</TombolUtama>
          <label className="block space-y-1"><span className="text-xs font-semibold text-bq-redup">Alasan penolakan (opsional)</span>
            <input className={kelasInput} value={catatan} onChange={e => setCatatan(e.target.value)} /></label>
          <button type="button" className={kelasSekunder} disabled={sibuk} onClick={() => kirim(p.id, { aksi: 'tolak', catatan: catatan || null })}>Tolak</button>
        </div>
      )}
      {p.status === 'menunggu_verifikasi' && (
        <TombolUtama disabled={sibuk} onClick={() => kirim(p.id, { aksi: 'verifikasi' })}>Verifikasi kembali</TombolUtama>
      )}
      {p.status === 'dipinjam' && (
        <div className="flex flex-wrap items-end gap-2">
          <TombolUtama disabled={sibuk} onClick={() => kirim(p.id, { aksi: 'tandai_kembali' })}>Tandai dikembalikan</TombolUtama>
          <label className="block space-y-1"><span className="text-xs font-semibold text-bq-redup">Perpanjang sampai</span>
            <input type="date" className={kelasInput} min={hari} value={tanggal} onChange={e => setTanggal(e.target.value)} /></label>
          <button type="button" className={kelasSekunder} disabled={sibuk} onClick={() => kirim(p.id, { aksi: 'perpanjang', jatuhTempo: tanggal })}>Perpanjang</button>
          {wa && <a href={wa} target="_blank" rel="noopener" className={kelasSekunder}><WhatsappLogo size={18} weight="bold" aria-hidden /> Kirim WA</a>}
        </div>
      )}
    </Kartu>
  );
}
```

- [ ] **Step 6: Tulis `components/perpus/AntrianPinjaman.tsx`**

```tsx
'use client';
import Link from 'next/link';
import { Kartu } from '@/components/ui/Kartu';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { hariIniWib, susunAntrian } from '@/lib/perpus/pinjaman';
import { KartuPinjaman } from './KartuPinjaman';
import { usePinjaman } from './usePinjaman';

export function AntrianPinjaman() {
  const { daftar, galat, sibuk, kirim } = usePinjaman();
  if (!daftar) return galat ? <PesanGalat pesan={galat} /> : null;
  const a = susunAntrian(daftar, hariIniWib());
  const bagian = [
    ['Pengajuan baru', a.pengajuan],
    ['Klaim kembali', a.klaim],
    ['Terlambat', a.terlambat],
  ] as const;
  const kosong = bagian.every(([, rows]) => rows.length === 0);
  return (
    <section className="space-y-3">
      {galat && <PesanGalat pesan={galat} />}
      {kosong && <Kartu className="p-4 text-sm text-bq-redup">Antrian kosong. <Link href="/perpus/pinjaman" className="font-bold underline">Lihat semua pinjaman</Link></Kartu>}
      {bagian.map(([judul, rows]) => rows.length > 0 && (
        <div key={judul} className="space-y-2">
          <h2 className="font-extrabold text-bq-tinta">{judul} ({rows.length})</h2>
          {rows.map(p => <KartuPinjaman key={p.id} p={p} sibuk={sibuk === p.id} kirim={kirim} />)}
        </div>
      ))}
    </section>
  );
}
```

Di `components/perpus/BerandaPerpus.tsx`: tambahkan `import { AntrianPinjaman } from './AntrianPinjaman';` dan pasang `<AntrianPinjaman />` tepat setelah `{galat && <PesanGalat pesan={galat} />}`.

- [ ] **Step 7: Tulis `components/perpus/DaftarPinjaman.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { LABEL_STATUS } from '@/lib/perpus/pinjaman';
import type { StatusPinjaman } from '@/lib/perpus/tipe';
import { KartuPinjaman } from './KartuPinjaman';
import { usePinjaman } from './usePinjaman';

const SARINGAN = Object.keys(LABEL_STATUS) as StatusPinjaman[];

export function DaftarPinjaman() {
  const { daftar, galat, sibuk, kirim } = usePinjaman();
  const [status, setStatus] = useState<StatusPinjaman | 'semua'>('dipinjam');
  const baris = (daftar ?? []).filter(p => status === 'semua' || p.status === status);
  return (
    <div className="space-y-4">
      <KepalaHalaman judul="Pinjaman" sub="Semua pinjaman perpustakaan" subTampilDiHp />
      {galat && <PesanGalat pesan={galat} />}
      <label className="block">
        <span className="sr-only">Saring status</span>
        <select className="h-11 rounded-2xl border border-bq-garis bg-bq-surface px-3 text-sm font-bold text-bq-tinta" value={status} onChange={e => setStatus(e.target.value as StatusPinjaman | 'semua')}>
          <option value="semua">Semua status</option>
          {SARINGAN.map(s => <option key={s} value={s}>{LABEL_STATUS[s]}</option>)}
        </select>
      </label>
      {daftar && baris.length === 0 && <Kartu className="p-4 text-sm text-bq-redup">Tidak ada pinjaman.</Kartu>}
      <div className="space-y-2">
        {baris.map(p => <KartuPinjaman key={p.id} p={p} sibuk={sibuk === p.id} kirim={kirim} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Tulis `components/perpus/DaftarAnggota.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { WhatsappLogo } from '@phosphor-icons/react';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { PesanGalat } from '@/components/ui/PesanGalat';
import type { AnggotaAdmin, StatusAnggota } from '@/lib/perpus/tipe';

const AKTIF = new Set(['diajukan', 'dipinjam', 'menunggu_verifikasi']);

export function DaftarAnggota() {
  const [daftar, setDaftar] = useState<AnggotaAdmin[] | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  const muat = async () => {
    const res = await fetch('/api/perpus/anggota');
    const d = await res.json();
    if (res.ok) setDaftar(d.data); else setGalat(d.error || 'Gagal memuat anggota');
  };
  useEffect(() => { muat(); }, []);

  const ubah = async (id: string, status: StatusAnggota) => {
    setGalat(null);
    const res = await fetch(`/api/perpus/anggota/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    const d = await res.json();
    if (!res.ok) setGalat(d.error || 'Gagal mengubah anggota');
    await muat();
  };

  return (
    <div className="space-y-4">
      <KepalaHalaman judul="Anggota" sub={daftar ? `${daftar.length} peminjam terdaftar` : undefined} subTampilDiHp />
      {galat && <PesanGalat pesan={galat} />}
      {daftar?.length === 0 && <Kartu className="p-4 text-sm text-bq-redup">Belum ada anggota.</Kartu>}
      {daftar?.map(a => (
        <Kartu key={a.userId} className="p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="min-w-0">
            <p className="font-extrabold text-bq-tinta">{a.nama}{a.status === 'diblokir' ? ' (diblokir)' : ''}</p>
            <p className="text-bq-redup">{a.pinjaman.filter(p => AKTIF.has(p.status)).length} pinjaman aktif · {a.pinjaman.length} total</p>
          </div>
          <div className="flex items-center gap-2">
            <a href={`https://wa.me/${a.noWa}`} target="_blank" rel="noopener" aria-label={`WhatsApp ${a.nama}`}
              className="tekan inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-bq-garis bg-bq-surface text-emerald-600">
              <WhatsappLogo size={20} weight="bold" aria-hidden />
            </a>
            <button type="button" onClick={() => ubah(a.userId, a.status === 'aktif' ? 'diblokir' : 'aktif')}
              className="tekan h-11 rounded-2xl border border-bq-garis bg-bq-surface px-4 font-bold text-bq-tinta">
              {a.status === 'aktif' ? 'Blokir' : 'Aktifkan'}
            </button>
          </div>
        </Kartu>
      ))}
    </div>
  );
}
```

- [ ] **Step 9: Tulis halaman**

`app/(bqku)/(perpus)/perpus/pinjaman/page.tsx`:

```tsx
import { DaftarPinjaman } from '@/components/perpus/DaftarPinjaman';

export const metadata = { title: 'Pinjaman — BQ-ku' };

export default function PinjamanPage() {
  return <DaftarPinjaman />;
}
```

`app/(bqku)/(perpus)/perpus/anggota/page.tsx`:

```tsx
import { DaftarAnggota } from '@/components/perpus/DaftarAnggota';

export const metadata = { title: 'Anggota — BQ-ku' };

export default function AnggotaPage() {
  return <DaftarAnggota />;
}
```

- [ ] **Step 10: Jalankan tes & tsc**

Run: `npx vitest run tests/layout/menu-perpus.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add components/perpus components/layout/ikon-menu.ts lib/nav/menu.ts 'app/(bqku)/(perpus)' tests/layout/menu-perpus.test.ts
git commit -m "feat(perpus): antrian ACC/Tolak/Verifikasi, halaman pinjaman & anggota, tombol Kirim WA"
```

---

### Task 9: Rilis

**Files:**
- Modify: `docs/superpowers/specs/2026-11-03-perpus-bq-design.md`

**Interfaces:**
- Consumes: semua task.

- [ ] **Step 1: Selaraskan spec**

- §3 RLS: ganti kalimat `insert pinjaman hanya status diajukan …` dengan: "semua tulisan anggota lewat fungsi `security definer` (`perpus_daftar_anggota`, `perpus_ajukan_pinjaman`, `perpus_batal_pinjaman`, `perpus_klaim_kembali`); anggota tidak punya policy insert/update. Judul pinjaman sendiri dibaca lewat view `perpus_pinjamanku`."
- §3 akhir, tambahkan: "Akun nonaktif yang terdaftar di `perpus_anggota` tidak dihitung di notifikasi akun menunggu dan tidak tampil di `/pengguna`. Akun dengan riwayat pinjaman tidak bisa dihapus."
- §6 Navigasi: ganti menjadi "pil bawah di mobile (Beranda · Katalog · Donatur · Masuk atau Pinjamanku), bilah atas di desktop; Keluar ada di halaman Pinjamanku".
- §7: ganti "callback memakai `next` yang menyertakan `lang`" dengan "tujuan setelah login dititipkan lewat cookie `bq_next` yang menyertakan `lang`, karena URL callback harus sama persis dengan entri Redirect URLs". Ganti "Sampai Tahap 3, host perpus menolak …" dengan "Host perpus hanya membuka `/auth/callback` dan `/api/perpus-publik`; `/api/*` dan `/auth/*` lain ditolak (404), dan `/api/perpus-publik` ditolak di host bq-ku."

- [ ] **Step 2: Verifikasi penuh**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: semua lolos. Bila ada tes lama yang gagal, baca penyebabnya sebelum mengubahnya.

- [ ] **Step 3: Commit dan buka PR**

```bash
git add docs/superpowers/specs/2026-11-03-perpus-bq-design.md
git commit -m "docs(perpus): selaraskan spec dengan keputusan tahap 3"
git push -u origin HEAD
```

Buka PR ke `main` berjudul `feat(perpus): tahap 3 — anggota & peminjaman`; badannya merangkum perubahan, tugas pengguna di Step 4, dan diakhiri `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 4: Tugas pengguna (sebelum deploy)**

Minta pengguna melakukan ketiga hal ini dan menunggu konfirmasi:
1. Jalankan `supabase/migrations/0015_perpus_pinjaman.sql` di SQL Editor, lalu `supabase/tests/perpus_pinjaman.sql`. Blok pertama harus selesai tanpa galat; blok berkomentar "Harus galat" harus gagal sesuai komentarnya.
2. Supabase → Authentication → URL Configuration → Redirect URLs: tambahkan `https://perpusbq.vercel.app/auth/callback`.
3. Google Cloud → OAuth consent screen: pastikan status **In production**. Pada status *Testing*, hanya akun uji yang bisa masuk, sehingga peminjam umum akan ditolak Google.

Migrasi harus dijalankan sebelum deploy, karena kode baru membaca `sedangDipinjam` dan tabel pinjaman.

- [ ] **Step 5: Deploy**

Setelah PR di-merge oleh pengguna:

```bash
npx vercel --prod
npx vercel ls
```

Expected: deployment teratas `Ready`. Bila mode otomatis menolak, minta pengguna mengizinkan.

- [ ] **Step 6: Uji asap produksi bersama pengguna**

Alur ini memerlukan sesi Google pengguna; pengguna yang masuk sendiri.
1. `https://perpusbq.vercel.app/id/pinjamanku` tanpa sesi → `/id/masuk`.
2. Masuk dengan akun Google di luar daftar bq-ku → form daftar → kembali ke tujuan. Superadmin bq-ku tidak melihat akun itu di `/pengguna` maupun notifikasi.
3. Ajukan buku berstok 1 dari dua akun anggota. Notifikasi "2 pengajuan" muncul di Ruang Perpus.
4. Di `/perpus`, jalankan dari konsol browser pustakawan, dengan `A` dan `B` id kedua pinjaman:

```js
const acc = id => fetch(`/api/perpus/pinjaman/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{"aksi":"acc"}' }).then(r => r.status);
await Promise.all([acc(A), acc(B)]);
```

Expected: satu `200`, satu `409`.
5. Peminjam klik **Sudah saya kembalikan** → pustakawan **Verifikasi kembali** → `/id/buku/<id>` kembali tersedia (paling lama 5 menit di bagian rincian; tombol Pinjam langsung).
6. Blokir anggota di `/perpus/anggota` → tombol Pinjam nonaktif dengan pesan.
7. Tombol **Kirim WA** membuka `wa.me` berisi pesan dengan judul dan tanggal yang benar.
8. Di HP (375px): nav publik muat, kartu antrian tidak melebar, bottom nav Ruang Perpus menampilkan Pinjaman dan Anggota.
