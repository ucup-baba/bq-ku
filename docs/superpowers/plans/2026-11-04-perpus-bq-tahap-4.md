# Perpus BQ — Tahap 4 (Tampilan, Catatan, Penulis) Implementation Plan

**Goal:** Sidebar desktop, Akun bergaya kartu anggota dengan badge, catatan buku publik/privat dengan moderasi super admin, beranda carousel per genre/penulis, dan profil penulis.

**Architecture:** Mengikuti Tahap 3: tulisan anggota lewat RPC `security definer`, halaman publik tetap statis dan data pribadi diambil klien, logika dalam modul murni yang diuji vitest. Warna dari `lib/perpus/warna.ts`.

**Spec:** `docs/superpowers/specs/2026-11-03-perpus-bq-design.md`, ditambah keputusan di bawah.

## Keputusan

1. Satu catatan per anggota per buku, hanya untuk yang pernah di-ACC (`dipinjam`, `menunggu_verifikasi`, `dikembalikan`). Bawaan publik.
2. Nama publik = nama depan + inisial; `anggotaId`, email, dan WA tidak keluar dari view `perpus_catatan_publik`.
3. Moderasi hanya SUPERADMIN, hanya catatan publik, hapus lunak dengan alasan opsional. Catatan privat tidak terbaca oleh siapa pun selain penulisnya.
4. Pemberitahuan moderasi tampil di Akun sampai ditutup; tanpa email/WA.
5. Badge dihitung dari riwayat di klien, tidak disimpan.
6. `perpus_penulis` memakai teks `perpus_buku.penulis` sebagai kunci; `jenis = 'penerbit'` melewati carousel penulis.
7. Instagram hanya dari sumber tepercaya; kolom `sumber` mencatat asalnya. Isi awal di migrasi terpisah `0017` setelah ditinjau pengguna.

**Penyimpangan dari desain yang disetujui:** satu PR, bukan tiga, karena ketiganya berbagi migrasi `0016`, nav, dan kamus; dipisah per commit agar tetap mudah ditinjau.

## Global Constraints

Sama dengan Tahap 3 (`2026-11-04-perpus-bq-tahap-3.md`): kolom camelCase berkutip, migrasi manual di SQL Editor dan aman diulang, cabut `EXECUTE` dari `anon, authenticated`, peminjam memakai `requireMasuk`, tanggal WIB, halaman publik tidak membaca cookie di server, tanpa `usePathname`, kunci `id.ts`/`en.ts` identik, `next-env.d.ts` tidak di-commit, deploy manual. Hanya pola & warna Ailene; tanpa logo, maskot, atau teksnya.

## Tasks

1. **Migrasi `0016`** (`supabase/migrations/0016_perpus_catatan_penulis.sql`, `supabase/tests/perpus_catatan.sql`). Diuji di Postgres 16 dengan stub skema Supabase.
2. **Logika murni:** `lib/perpus/badge.ts`, `lib/perpus/beranda.ts`, `gabungPenulis`; tes dulu.
3. **Repo & API:** `lib/db/perpus-catatan-repo.ts`, `lib/db/perpus-penulis-repo.ts`, `/api/perpus-publik/catatan`, `/api/perpus/catatan`, `/api/perpus/penulis`.
4. **Sidebar:** `NavPerpus`, `MenuPengguna`, CSS ≥1024px; HP tetap pil bawah.
5. **Akun:** kartu anggota, ringkasan, badge, pemberitahuan, daftar catatan.
6. **Beranda:** `BerandaKategori`, `BarisBuku`, `KartuPenulis`.
7. **Detail buku:** `CatatanBuku`, kartu penulis.
8. **Ruang Perpus:** `/perpus/catatan` (super admin), `/perpus/penulis`, menu.
9. **Riset ±30 penulis** → `0017_perpus_penulis_isi.sql`, ditinjau pengguna sebelum dijalankan.
10. **Rilis:** vitest, tsc, build, browser, PR. Pengguna menjalankan `0016`, `supabase/tests/perpus_catatan.sql`, lalu `0017`; baru merge & deploy.
