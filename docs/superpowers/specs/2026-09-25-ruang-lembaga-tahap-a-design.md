# Spesifikasi Desain — Ruang Lembaga Tahap A (Peran Pengurus & Beranda Ringkasan)

**Tanggal:** 25 September 2026
**Status:** Disetujui (brainstorming selesai)
**Melanjutkan:** peran & ruangan di `lib/auth/rooms.ts`, izin RLS di migrasi `0004`, `0005`, `0007`, `0009`.

---

## 1. Latar

Pengurus yayasan (ketua, bendahara, dll.) butuh gambaran besar untuk rapat dan proposal: berapa santri, kelengkapan berkas, arus donasi, dan donatur — tanpa bisa mengubah data dan tanpa melihat scan berkas pribadi santri. Nantinya ruang yang sama juga menampung berkas lembaga (SK Kemenkumham, akta, NPWP, izin) dan keuangan.

Permintaan dipecah jadi tiga tahap, masing-masing dengan spesifikasi & rencana sendiri:

| Tahap | Isi |
|---|---|
| **A (dokumen ini)** | Peran `PENGURUS`, ruangan ketiga `lembaga` (baca saja), beranda ringkasan |
| B | Berkas lembaga: unggah, masa berlaku + pengingat, log akses, tautan bagikan sementara |
| C | Keuangan (termasuk peran keuangannya, mis. `BENDAHARA`) |

## 2. Ruang Lingkup

**Masuk:** peran `PENGURUS`; ruangan `lembaga` di navigasi, penjaga ruangan, halaman Akun, pindah ruangan untuk 3 ruangan; izin database baca-saja; halaman baca-saja santri, donatur, surat; beranda ringkasan + ekspor CSV; halaman "Segera hadir" untuk Berkas lembaga dan Keuangan.

**Tidak masuk:** isi Berkas lembaga (Tahap B), Keuangan & perannya (Tahap C), ekspor PDF, notifikasi khusus Lembaga (datang bersama Tahap B), tabel ringkasan/materialized view.

## 3. Keputusan

| Topik | Keputusan |
|---|---|
| Apa yang dilihat Pengurus | Ringkasan + daftar & detail santri, donatur, surat — **baca saja** |
| Berkas pribadi santri | **Tidak** bisa dibuka (file scan maupun teks OCR). Hanya **status** per jenis berkas. Isian santri (termasuk NIK) terlihat. |
| Pengurus yang juga Admin Santri/Donatur | Ruangan = mode kerja. Di Ruang Lembaga tetap baca saja; untuk mengubah, pindah ke Ruang Santri/Donatur (halaman Akun, atau tautan "Ubah di Ruang …" di halaman Lembaga). Tidak ada konsep "peran aktif" baru. |
| Peran keuangan | Dibuat di Tahap C; Tahap A hanya menyediakan menu Keuangan "Segera hadir". |
| Pendekatan teknis | **Izin baca RLS per tabel + fungsi `status_berkas_santri()`**; halaman memakai ulang komponen lewat context `ModeRuang`. Tanpa kunci admin untuk data harian. |
| Beranda | Semua ringkasan: santri, kelengkapan berkas, donasi, donatur, surat, berkas lembaga (kartu kosong di Tahap A). |

## 4. Peran & Ruangan

### 4.1 Peran
- `UserRole` bertambah `'PENGURUS'`; label **"Pengurus Yayasan"**. Ditambahkan ke `ALL_ROLES`, `roleEnum` (`lib/validation/pengguna.ts`), dan centang peran di Kelola Pengguna.
- Satu akun boleh memadukan peran, mis. `PENGURUS + ADMIN_SANTRI`.

### 4.2 Ruangan `lembaga`
- `Room = 'santri' | 'donatur' | 'lembaga'`.
- `roomsFor`: `SUPERADMIN` atau `PENGURUS` → `lembaga` (urutan ruangan: santri, donatur, lembaga).
- `ROOM_HOME.lembaga = '/lembaga'`, `ROOM_LABEL.lembaga = 'Ruang Lembaga'`, `ROOM_AKUN.lembaga = '/lembaga/akun'`.
- `roomOfPath`: `/lembaga`, `/lembaga/*`, `/api/lembaga*` → `lembaga`.
- `proxy.ts` tidak perlu logika baru selain `roomOfPath`; pengguna yang hanya `PENGURUS` membuka `/santri` → dialihkan ke `/lembaga`; memanggil `/api/donatur` → 403.
- Setelah login: `resolveLandingPath` apa adanya (ruangan terakhir bila masih berhak, lalu ruangan pertama). Pengguna yang hanya Pengurus → `/lembaga`.

### 4.3 Pindah ruangan (3 ruangan)
- Halaman Akun: satu baris "Pindah ke …" untuk **setiap** ruangan lain (bukan hanya satu).
- Rail desktop: `RoomSwitchButton` menampilkan satu tombol per ruangan lain.
- Ikon & warna ruangan: Santri (buku, hijau), Donatur (tangan-koin, biru), Lembaga (gedung, ungu).

### 4.4 Navigasi Ruang Lembaga
- **Bottom nav (5 slot):** Beranda · Santri · (tombol tengah: Berkas lembaga) · Donatur · Akun.
- **Rail desktop:** Beranda, Santri, Donatur, Surat, Berkas lembaga, Keuangan.
- Surat & Keuangan di HP dapat dicapai dari kartu di beranda.
- `sembunyikanNavHp` tidak berubah (Lembaga tidak punya layar satu-tugas).

## 5. Izin Database — migrasi `0010_peran_pengurus.sql`

Idempoten (aman dijalankan ulang), tidak mengubah izin peran lain.

| Objek | Perubahan |
|---|---|
| `profiles_roles_valid`, `allowed_emails_roles_valid` | Terima `PENGURUS` |
| `santri` | Policy **select** ditambah `has_role('PENGURUS')` |
| `donatur`, `donasi`, `surat` | Policy **select** ditambah `has_role('PENGURUS')` |
| `documents` | **Tidak berubah** — Pengurus tidak punya akses (tabel memuat `rawOcrText` & `extractedFields`) |
| `storage.objects` — scan berkas santri | **Tidak berubah** |
| `storage.objects` — foto santri | Policy baru *select* untuk `PENGURUS`: `bucket_id = 'berkas'` dan `name` sama dengan `santri."fotoFormalPath"` atau `santri."fotoProfilPath"` dari baris mana pun |
| `storage.objects` — PNG surat (`surat/`) | Policy *select* "berkas surat: baca" ditambah `has_role('PENGURUS')` |
| insert/update/delete | Tidak ada policy untuk `PENGURUS` di tabel mana pun |

**Fungsi `public.status_berkas_santri()`**
- `returns table ("santriId" text, kategori text, "statusVerifikasi" text)`, `security definer`, `set search_path = public`, `stable`.
- Mengembalikan baris hanya bila pemanggil punya salah satu `SUPERADMIN`, `ADMIN_SANTRI`, `VIEWER`, `PENGURUS`; selain itu kosong.
- `grant execute ... to authenticated`.
- Tidak pernah mengembalikan `storagePath`, `rawOcrText`, `extractedFields`, `nomorDokumen`, `catatanVerifikasi`.

**Sisi server:** semua halaman `/lembaga/*` dan route `/api/lembaga/*` memakai `requireRoom('lembaga')` dan klien Supabase ber-RLS milik pengguna (bukan `createAdminSupabase`).

## 6. Halaman & Komponen

### 6.1 Context `ModeRuang`
Konstanta di `lib/ruang/mode.ts` (bisa dipakai komponen server), context di `components/ruang/ModeRuang.tsx`:

```ts
type ModeRuang = {
  nama: 'kerja' | 'lembaga';
  bacaSaja: boolean;
  rute: {
    santriDaftar: string; santri: (id: string) => string;
    donaturDaftar: string; donatur: (id: string) => string;
    suratDaftar: string; surat: (id: string) => string;
  };
  api: { donatur: string; surat: string; pngSurat: (id: string) => string }; // basis URL fetch dari klien
};
```

- Provider menerima string `mode="kerja" | "lembaga"` (fungsi tidak bisa dikirim dari layout server ke komponen klien) lalu memilih konstanta.
- Tautan "Ubah di Ruang …" ditentukan dari `useAuth().rooms` + `padananKerja(pathname)`, bukan disimpan di context.
- Nilai bawaan = mode kerja dengan alamat sekarang (`/santri`, `/donatur/daftar`, `/donatur/surat`, `/api/donatur`, `/api/donatur/surat`). **Ruang Santri & Donatur tidak diubah.**
- `app/(lembaga)/layout.tsx` membungkus `AppShell room="lembaga"` dengan `ModeRuangProvider` mode baca.
- Komponen **server** (`DetailDonatur`) menerima prop `mode: 'kerja' | 'lembaga'` karena context hanya bisa dibaca komponen klien; konstanta mode ada di `lib/ruang/mode.ts`.
- `BarisSantri` menerima prop `href` (dipakai juga oleh beranda santri).
- Komponen yang dipakai ulang mengganti alamat tetap (`'/donatur/surat/' + id`, `fetch('/api/donatur…')`) dengan nilai dari context, dan menyembunyikan kontrol ubah bila `bacaSaja`.

### 6.2 Halaman

| Rute | Komponen | Disembunyikan saat `bacaSaja` |
|---|---|---|
| `/lembaga` | `BerandaLembaga` (§7) | — |
| `/lembaga/santri` | `SantriDirectory` | — (direktori tidak punya tombol ubah; hanya tautan diarahkan ke `/lembaga/santri/[id]`) |
| `/lembaga/santri/[id]` | `DetailSantri` | Tombol Edit; tab Berkas tanpa "Lengkapi berkas" dan tanpa pratinjau/unduh (status per kategori saja). `MenuSantri` tetap (isinya hanya Bagikan & Cetak CV). |
| `/lembaga/donatur` | `DaftarDonatur` | Tambah donatur, ikon "lengkapi WA", Donasi lagi |
| `/lembaga/donatur/[id]` | `DetailDonatur` | `MenuDonatur`, Donasi lagi, chip "Tambah nomor WhatsApp" |
| `/lembaga/surat` | `DaftarSurat` | Buat Surat, tandai terkirim, saklar otomatis, kirim WA, hapus |
| `/lembaga/surat/[id]` | detail surat | `MenuSurat` diganti tombol **Unduh PNG** saja; kirim WA disembunyikan |
| `/lembaga/berkas` | `SegeraHadir` | — |
| `/lembaga/keuangan` | `SegeraHadir` | — |
| `/lembaga/akun` | `HalamanAkun room="lembaga"` | — |

- Data santri di halaman server: `listSantri` / `getSantriById` **tanpa** `documents(*)` untuk ruang Lembaga (varian repo `listSantriRingkas` / `getSantriLembaga` yang memilih kolom santri saja + status dari `status_berkas_santri()`), sehingga tidak mencoba membuat signed URL berkas.
- ~~Bilah "Mode baca"~~ — dihapus 25-09-2026 atas permintaan pengguna; mode baca cukup tersirat dari tidak adanya tombol ubah. Untuk mengubah data, pindah ruangan lewat halaman Akun.

### 6.3 API baca-saja `/api/lembaga/*` (GET saja)
- `GET /api/lembaga/donatur?q=` (detail donatur diambil langsung oleh halaman server, tanpa API)
- `GET /api/lembaga/surat?dari&sampai&limit` · `GET /api/lembaga/surat/[id]/png`
- `GET /api/lembaga/ringkasan?periode=&hariIni=YYYY-MM-DD` (`hariIni` dari perangkat pengguna agar batas bulan mengikuti WIB, bukan jam server UTC)
- PNG surat: bila `storagePath` cocok dengan path versi sekarang → unduh dari storage; jika tidak → render `ImageResponse` dan kirim **tanpa menyimpan** (Pengurus tidak punya izin tulis storage).

## 7. Beranda Ringkasan (`/lembaga`)

Satu kolom di HP, dua kolom di desktop. Urutan:

1. **Hero:** santri aktif (jenjang ≠ `ALUMNI`) · total donasi uang periode ini · jumlah donatur; perbandingan dengan periode sebelumnya ("▲ 12% dari Agustus").
2. **Santri:** per jenjang (SMP/SMA/SMK/Alumni), per jenis kelamin (Ikhwan/Akhwat), per status sosial (Reguler/Yatim/Piatu/Yatim Piatu/Dhuafa) — batang horizontal.
3. **Kelengkapan berkas:** "X dari Y santri aktif lengkap (Z%)" — alumni tidak dihitung memakai `statusBerkas()` dari `lib/santri/ringkasan.ts` (aturan 4 berkas wajib yang sama dengan lencana "2/4"); daftar pendek (maks. 5) santri belum lengkap → `/lembaga/santri/[id]`.
4. **Donasi:** `GrafikTren` 12 bulan; uang (Rp) vs barang (jumlah catatan); rincian per jenis akad (ZIS/Wakaf/Lainnya; jenis lama ZAKAT/INFAQ/SHADAQAH ikut dihitung di bawah labelnya sendiri).
5. **Donatur:** total, baru periode ini (donasi pertamanya di periode), **rutin** (berdonasi di ≥ 3 bulan kalender berbeda dalam 12 bulan terakhir).
6. **Surat:** terbit periode ini; belum terkirim (semua waktu) → `/lembaga/surat?status=BELUM`.
7. **Berkas lembaga:** kartu "Segera hadir" (diisi Tahap B).

- **Periode:** Bulan ini / 3 bulan / 12 bulan / Tahun ini — memengaruhi donasi, donatur baru, surat terbit. Angka santri & kelengkapan = kondisi saat ini.
- **Ekspor:** "Unduh ringkasan (CSV)" memakai `components/donatur/beranda/unduh-csv.ts`.
- **Data:** satu endpoint `GET /api/lembaga/ringkasan`; perhitungan di fungsi murni `lib/lembaga/ringkasan.ts` (input baris mentah, output angka). Server hanya memilih kolom yang dibutuhkan (santri: `id, namaLengkap, jenjang, jenisKelamin, statusSosial`; donasi: `donaturId, tanggal, bentuk, nominal, jenis`; surat: `tanggalSurat, terkirimWa`).

## 8. Penanganan Galat

- Endpoint ringkasan gagal → kartu galat dengan tombol "Coba lagi"; bagian lain halaman tetap tampil.
- `status_berkas_santri()` gagal → bagian Kelengkapan menampilkan "Status berkas tidak dapat dimuat", ringkasan lain tetap tampil.
- Data kosong (0 santri/donasi) → angka 0 dan pesan kosong yang ramah, tanpa pembagian nol (persentase = 0%).
- Pengurus mencoba menulis lewat API lain → ditolak `proxy.ts` (403) atau RLS.

## 9. Pengujian

- **Unit:** `lib/lembaga/ringkasan.ts` — pengelompokan santri, persentase kelengkapan, donatur baru & rutin, perbandingan periode, data kosong.
- **Auth:** `roomsFor`/`roomOfPath` untuk `lembaga`; `proxy` — Pengurus ke `/santri` → `/lembaga`, ke `/api/donatur` → 403, ke `/lembaga` → lolos.
- **Komponen (mode baca):** `SantriDirectory`, `DetailSantri`, `DaftarDonatur`, `DetailDonatur`, `DaftarSurat`, detail surat — tidak ada tombol tambah/ubah/hapus/kirim/tandai; tautan mengarah ke `/lembaga/*`.
- **Komponen (mode kerja):** tes yang sudah ada tetap lulus tanpa perubahan perilaku.
- **Navigasi:** `slotHp('lembaga')`, `menuRail('lembaga')`, halaman Akun menampilkan pindah ke setiap ruangan lain.
- **Migrasi:** diverifikasi manual di SQL Editor — Pengurus tidak bisa `select` dari `documents`, bisa memanggil `status_berkas_santri()`, tidak bisa `insert` ke tabel mana pun.

## 10. Urutan Pengerjaan (garis besar)

1. Peran + ruangan + migrasi `0010`.
2. Context `ModeRuang` + mode baca di komponen santri, donatur, surat.
3. Halaman & API `/lembaga/*`, navigasi, Akun 3 ruangan.
4. Beranda ringkasan + ekspor CSV.
