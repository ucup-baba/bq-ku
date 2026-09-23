# Spesifikasi Desain — Modul Donatur & Surat Ucapan Terima Kasih

**Tanggal:** 22 September 2026
**Status:** Disetujui (brainstorming selesai)
**Prasyarat:** Fase A (auth Google, RLS, storage private) sudah live.
**Konteks:** Yayasan menerima zakat/infaq/shadaqah dari donatur — sebagian besar **rutin** dan **sepuh**. Surat ucapan terima kasih saat ini dibuat manual di CorelDRAW (`ucapan terimakasih_panti asuhan.cdr`), diisi tangan, difoto, lalu dikirim via WhatsApp.

---

## 1. Tujuan & Ruang Lingkup

Modul baru "Ruang Donatur" yang: mencatat donatur & donasi, membuat **surat ucapan terima kasih sebagai PNG** dari template digital, mengirimkannya **sebagai gambar** lewat WhatsApp, dan menyediakan **rekap donasi**.

**Termasuk:** model peran multi-role, dua ruangan terpisah dengan navigasi masing-masing, CRUD donatur, pencatatan donasi (uang & barang), penomoran surat otomatis-bisa-diubah, render PNG, kirim WA, rekap + export.

**Tidak termasuk:** alokasi donasi ke program tertentu, status janji vs realisasi, kwitansi resmi, WhatsApp Business API, pengingat donasi otomatis.

## 2. Keputusan yang Diambil (hasil brainstorming)

| Topik | Keputusan |
|---|---|
| Cakupan | Surat + WA + rekap donasi |
| Render surat | Template digital (JSX → PNG lewat `next/og`), bukan tumpuk di atas scan |
| Kirim WA | Gambar langsung terlampir (Web Share API di HP); **tanpa tautan** — donatur banyak yang sepuh |
| Nomor surat | Otomatis melanjutkan nomor terakhir, masih bisa dikoreksi, tersimpan unik |
| Peran | Satu akun boleh punya **beberapa** peran |
| Tombol pindah ruangan | Di HP **menggantikan** tombol dark/light; toggle tema pindah ke menu Akun |
| Bentuk donasi | Uang **dan** barang; rekap uang bertotal, barang hanya daftar |
| Aset surat | File asli dari pengurus: `assets/surat/logo.webp`, `stempel.webp`, `ttd.png` |
| Arsitektur ruangan | Route group Next.js (`app/(santri)`, `app/(donatur)`) |

## 3. Peran & Ruangan

### 3.1 Model peran
- `profiles.role` (text) → **`profiles.roles` (text[])**; nilai: `SUPERADMIN`, `ADMIN_SANTRI`, `ADMIN_DONATUR`, `VIEWER`. Idem `allowed_emails.role` → `roles`.
- Migrasi data: `PANITIA` → `ADMIN_SANTRI`; `SUPERADMIN`/`VIEWER` tetap (jadi array satu elemen).
- `lib/auth/roles.ts` memakai array: `canEditSantri(roles)`, `canDeleteSantri(roles)`, `canManageUsers(roles)`, ditambah `canManageDonatur(roles)`, `roomsFor(roles): Room[]`.
- Fungsi Postgres `auth_roles()` → `text[]`; `has_role(r text)` → boolean, dipakai policy RLS.

### 3.2 Ruangan
| Ruangan | Basis rute | Akses |
|---|---|---|
| `santri` | `/`, `/santri`, `/tambah`, `/pengguna` | `SUPERADMIN`, `ADMIN_SANTRI`, `VIEWER` (baca) |
| `donatur` | `/donatur/*` | `SUPERADMIN`, `ADMIN_DONATUR` |

- `proxy.ts` menolak akses lintas ruangan: tidak berhak → redirect ke ruangan pertama yang dimiliki; tidak punya ruangan sama sekali → halaman "Akun belum diaktifkan" (sudah ada).
- Ruangan terakhir disimpan di cookie `bq_room`; setelah login diarahkan ke sana.
- Tombol **Pindah Ruang** tampil bila `roomsFor(roles).length > 1`: di HP menggantikan tombol tema di bottom nav; di desktop di atas menu akun. Toggle tema pindah ke menu Akun (bottom sheet di HP, tetap di sidebar desktop).
- `/pengguna` memakai checkbox multi-peran dan menampilkan lencana ruangan.

## 4. Model Data

```sql
donatur(
  id text pk, nama text not null, sapaan text check in ('BAPAK','IBU','SDR','SDRI','BAPAK_IBU'),
  "noWa" text, alamat text, catatan text,
  "createdAt" timestamptz, "updatedAt" timestamptz
)
donasi(
  id text pk, "donaturId" text references donatur on delete cascade,
  tanggal date not null,
  jenis text check in ('ZAKAT','INFAQ','SHADAQAH','LAINNYA'),
  bentuk text check in ('UANG','BARANG'),
  nominal bigint,            -- wajib jika bentuk = UANG
  "deskripsiBarang" text,    -- wajib jika bentuk = BARANG
  keterangan text, "createdAt" timestamptz, "createdBy" uuid references profiles
)
surat(
  id text pk, "donasiId" text references donasi on delete cascade,
  "nomorSurat" text unique not null, "tanggalSurat" date not null,
  "storagePath" text,        -- PNG di bucket privat
  "terkirimWa" boolean default false, "dikirimAt" timestamptz,
  "createdAt" timestamptz, "createdBy" uuid references profiles
)
nomor_surat_counter( tahun int, bulan int, "urutanTerakhir" int, primary key(tahun,bulan) )
```

RLS: `donatur`, `donasi`, `surat`, `nomor_surat_counter` → SELECT/INSERT/UPDATE bila `has_role('SUPERADMIN') or has_role('ADMIN_DONATUR')`; DELETE hanya `SUPERADMIN`. Tidak ada akses untuk `ADMIN_SANTRI`/`VIEWER` — data nominal & no. HP donatur tidak bocor ke panitia santri.

## 5. Surat: Isi, Penomoran, Render

### 5.1 Isi (persis dari file CDR)
Kop: logo + "PANTI ASUHAN BAITUL QOWWAM" (Arab: منظمة الحضانة بيت القوام) + "Izin operasional No. 466/0574/P2/2020 · akte notaris m. gunardi widyastuti no.02/2010" + alamat "Plumbon Mororejo Tempel Sleman Yogyakarta 55552".

Badan: `No : <nomor>` · `Hal : Ucapan Terima Kasih` · `Tempel, <tanggal>` · `Kepada Yth. Bapak/Ibu/Sdr : <nama>` · `Di Tempat` · salam · paragraf ucapan terima kasih · **Rp. <nominal>** + **Terbilang <terbilang>** (bentuk UANG) **atau** satu baris "Berupa: <deskripsi barang>" (bentuk BARANG) · "Teriring Do'a — JAZAKUMULLAHU KHAIRAN JAZAA" + baris doa Arab + terjemahannya · paragraf alokasi dana · penutup · blok tanda tangan (stempel + TTD + "Dr. H. Agus Triyanta") · NB (telepon & rekening).

### 5.2 Penomoran
Format `<urut>/PBQ/<bulan romawi>/<tahun>`. Usulan = `urutanTerakhir + 1` untuk bulan-tahun tanggal surat; field bisa diedit; `nomorSurat` unik (bentrok → 409 dengan usulan nomor berikutnya). Counter diperbarui bila nomor yang dipakai > `urutanTerakhir`.

### 5.3 Render
- `components/donatur/SuratTemplate.tsx` — satu sumber tata letak, dipakai untuk **pratinjau HTML** dan **render PNG**.
- PNG: `GET /api/donatur/surat/[id]/png` memakai `ImageResponse` dari `next/og`, ukuran A4 **1240×1754** (150 dpi), font embed Plus Jakarta Sans (400/700) + Noto Naskh Arabic (baris doa). Aset gambar dibaca dari `assets/surat/*` sebagai data URI.
- Hasil disimpan ke bucket privat: `surat/<tahun>/<nomor-slug>.png`; `storagePath` disimpan di baris `surat`. Render ulang menimpa berkas yang sama.

## 6. Alur Kirim WhatsApp
1. Panitia menekan **Kirim WhatsApp** pada surat.
2. Client mengunduh PNG (signed URL) sebagai `File`.
3. **HP** (`navigator.canShare({files})` true): `navigator.share({ files:[png], text:<ucapan> })` → pilih WhatsApp → gambar terlampir.
4. **Desktop**: PNG terunduh otomatis, teks ucapan disalin ke clipboard, `https://web.whatsapp.com/send?phone=<62…>` dibuka di tab baru; panitia menempel gambar.
5. Setelah itu muncul tombol **"Tandai sudah terkirim"** → `PATCH /api/donatur/surat/[id]` set `terkirimWa`, `dikirimAt`. (WhatsApp tidak memberi konfirmasi balik, jadi status ditandai manual.)
6. Nomor WA dinormalisasi `62…` memakai `normalizeWa()` yang sudah ada.

## 7. Halaman Ruang Donatur

| Rute | Isi |
|---|---|
| `/donatur` | Ringkasan bulan berjalan: total uang, jumlah donasi, donatur baru, surat terkirim; 5 donasi terakhir; tombol besar "Buat Surat" |
| `/donatur/surat/baru` | Form + pratinjau langsung + simpan & kirim |
| `/donatur/surat` | Daftar surat (nomor, donatur, nilai/barang, status WA) + unduh / kirim ulang |
| `/donatur/daftar` | Daftar & pencarian donatur; detail = riwayat donasi + tombol "Donasi lagi" |
| `/donatur/rekap` | Rekap uang per bulan/tahun (grafik batang + tabel) & daftar barang; export CSV/Excel |

Navigasi bawah (HP) ruang donatur: Beranda · Donatur · **+ Surat** (tombol bulat) · Rekap · Pindah Ruang.
Sidebar desktop: menu yang sama + menu akun + toggle tema + tombol pindah ruang.

Gaya visual mengikuti tema yang ada (claymorphism, Plus Jakarta Sans, Phosphor duotone), dengan aksen **biru-hijau logo yayasan** untuk membedakan ruang donatur dari ruang santri yang bertema teal.

## 8. API

| Endpoint | Peran | Fungsi |
|---|---|---|
| `GET/POST /api/donatur` | donatur-admin | daftar & buat donatur |
| `GET/PATCH/DELETE /api/donatur/[id]` | donatur-admin (DELETE: superadmin) | detail, ubah, hapus |
| `GET/POST /api/donatur/donasi` | donatur-admin | daftar & catat donasi |
| `POST /api/donatur/surat` | donatur-admin | buat surat (donasi + nomor + render PNG) |
| `GET /api/donatur/surat` | donatur-admin | daftar surat (filter bulan, status WA) |
| `GET /api/donatur/surat/[id]/png` | donatur-admin | render/ambil PNG |
| `PATCH /api/donatur/surat/[id]` | donatur-admin | tandai terkirim, koreksi nomor |
| `GET /api/donatur/nomor-berikutnya?tanggal=` | donatur-admin | usulan nomor surat |
| `GET /api/donatur/rekap?dari=&sampai=` | donatur-admin | agregat uang + daftar barang |

Semua memakai `requireUser([...])` + klien ber-RLS, mengikuti pola Fase A. Validasi Zod di `lib/validation/donatur.ts` (nominal > 0 bila UANG; deskripsi wajib bila BARANG; no. WA `62\d{8,13}`; tanggal tidak di masa depan).

## 9. Penanganan Error
- Nomor surat bentrok → 409 + usulan nomor baru, form menawarkan "Pakai nomor <n>".
- Render PNG gagal → surat tetap tersimpan, status "PNG belum dibuat", tombol "Coba render ulang".
- `navigator.share` tidak tersedia/ditolak → jatuh ke jalur desktop (unduh + WhatsApp Web) dengan pesan jelas.
- Donatur tanpa no. WA → tombol kirim nonaktif, ajakan melengkapi nomor.

## 10. Kriteria Selesai
- `ADMIN_DONATUR` hanya bisa masuk `/donatur/*`; `ADMIN_SANTRI` hanya ruang santri; `SUPERADMIN` bisa keduanya dan tombol pindah ruang muncul (di HP menggantikan toggle tema).
- Query REST Supabase ke tabel `donatur/donasi/surat` dengan akun `ADMIN_SANTRI` mengembalikan 0 baris.
- Surat baru menghasilkan PNG A4 yang isinya sama persis dengan pratinjau, tersimpan di bucket privat, dan bisa dibagikan sebagai gambar ke WhatsApp dari HP.
- Nomor surat berurutan tanpa duplikat; rekap menampilkan total uang benar dan daftar barang terpisah.
- `npm test`, `tsc`, dan `next build` hijau.
