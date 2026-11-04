# Spesifikasi Desain — Perpus BQ (Perpustakaan Digital Baitul Qowwam)

**Tanggal:** 3 November 2026
**Status:** Disetujui per bagian (brainstorming selesai)

---

## 1. Latar & Keputusan

Baitul Qowwam punya ±226 judul buku, daftar donatur (infaq uang & wakaf buku), dan catatan pengadaan di Google Sheets "Daftar Buku" (`1q4vDyNGHBKq8ZwU4s4-SxZrWToMPL7sB26Jwk9HQe5U`). Pengguna ingin katalog publik, daftar donatur, dan pencatatan peminjaman untuk umum (wajib login Google), di hosting yang sama dengan bq-ku, dengan alamat & tema sendiri serta dua bahasa.

| Topik | Keputusan |
|---|---|
| Arsitektur | **Satu aplikasi bq-ku, dipisah per domain.** Domain `perpusbq…` di-rewrite oleh `proxy.ts` ke folder `app/perpusbq/[lang]`. Satu proyek Vercel, satu Supabase. |
| Ruang pustakawan | **Ruang Perpus** di bq-ku (`/perpus`), peran baru `PUSTAKAWAN` (+ SUPERADMIN). Tema bq-ku yang ada. |
| Bahasa | `/id` dan `/en` di domain perpus; `/` diarahkan sesuai `Accept-Language` (bawaan `id`). |
| Tema publik | Gaya visual ailene.id/dashboard (diekstrak dengan skill `clone-website`): hanya token & pola desain, **bukan** logo, maskot, atau teks Ailene. |
| Sumber data | **Impor sekali** dari Sheets ke Supabase; selanjutnya dikelola di Ruang Perpus. |
| Peminjam | Semua akun Google boleh mendaftar otomatis (isi nama + no. WA sekali). Pustakawan bisa memblokir. |
| Alur pinjam | Ajukan → pustakawan ACC (atur jatuh tempo) → dipinjam → (peminjam klik "sudah mengembalikan" → pustakawan verifikasi) **atau** pustakawan langsung tandai dikembalikan. |
| Aturan pinjam | Jatuh tempo bawaan **14 hari**, dapat diubah saat ACC/serah & diperpanjang. **Tanpa batas** jumlah buku. |
| Donatur publik | Tab **Infaq**: nama + tanggal, plus total infaq / pengadaan / saldo (nominal per orang hanya untuk pustakawan). Tab **Wakaf Buku**: nama + judul yang disumbangkan (tertaut ke katalog). |
| Penomoran | **DDC baku** (mis. novel Indonesia 899.221, fiksi Inggris 823, keuangan 332). Format nomor panggil: `[kelas] [3 huruf pengarang] [huruf judul][.seri]`, unik. |
| AI | Saat input buku & audit kode: AI **mengusulkan kelas DDC + genre**; aplikasi menyusun nomor panggil secara deterministik. Penyedia: Gemini (sesuai permintaan), lewat modul pusat `lib/ai` agar batas & pemakaian tercatat. |

**Di luar cakupan:** baca e-book/PDF daring, denda keterlambatan, reservasi antre untuk buku yang sedang dipinjam, notifikasi email/WA otomatis berbayar, sinkronisasi dua arah dengan Sheets, aplikasi mobile terpisah.

## 2. Temuan Audit Kode (sheet "Copy of Daftar Buku", 3 Nov 2026)

Konsep nomor panggil DDC sudah benar; yang perlu dibetulkan:

- **Kembar:** `813 LIY R` (Rembulan Tenggelam di Wajahmu & Rasa), `297 SAU B` (Baitul Maqdis For Dummies & Beyond the Inspiration). `500 AND Sa` ×2 dan `The Best Bedah` ×2 = buku sama → jadi eksemplar (`c.2`).
- **Seri salah:** Pustaka Sains Populer Islami kelasnya naik `500…509` (harus satu kelas); seri 9 & 10 tertukar.
- **Belum berkode:** #130 Keremanja di Yogyakarta; #211–213 Salim A Fillah; #214 Pendidikan Kaum Tertindas.
- **Format:** spasi ganda/akhir (`158 NUR  T`, `004 AND Si `), huruf judul tak seragam (`Su`, `Cr`, `Int`, `Pow`), kode pengarang dari nama depan (`ART` → `DOY`, `IFK` → `KIS`).
- **Kelas (menurut DDC baku):** semua novel Indonesia `813` → `899.221`; Orwell & Conan Doyle → `823`; Coelho → `869`; seri Kiyosaki & Psychology of Money → `332`; Komik Fiqih → `297`; Kamus Arab → `492`; Basa Jawa → `499`; Atlas → `912`; Matematika SMP → `510`; Kitab Al-Filaha → `630`; Internet Sehat → `004`; Why? Food and Cooking → `641`; Madilog → `100`-an; Dunia Sophie → fiksi/filsafat; dsb. Daftar final ditetapkan di halaman Audit Kode (lihat §5), bukan di spec ini.

Sheet **Copy of Daftar Buku** dipakai sebagai sumber impor (judul sudah dirapikan & berkode); sheet **Daftar Buku** hanya pembanding.

## 3. Data — migrasi `0013_perpus.sql`

Dijalankan manual di SQL Editor Supabase (seperti migrasi sebelumnya). Semua tabel berawalan `perpus_`.

### Peran
- `PUSTAKAWAN` ditambahkan ke constraint `profiles_roles_valid` & `allowed_emails_roles_valid`, `UserRole`, `ALL_ROLES`, `getRoleLabel`.
- `roomsFor`: `SUPERADMIN | PUSTAKAWAN` → ruangan `perpus` (`ROOM_HOME.perpus = '/perpus'`, label "Ruang Perpus"); `roomOfPath`: `/perpus` & `/api/perpus` → `perpus`.

### Tabel

**`perpus_buku`**
| kolom | catatan |
|---|---|
| `id` uuid pk | URL publik memakai `id` pendek (8 karakter pertama) |
| `judul`, `penulis` text | penulis wajib (hasil pewarisan saat impor) |
| `kelas_ddc` text | mis. `899.221`, `297`, `332` |
| `kode_pengarang` text | 3 huruf kapital |
| `kode_judul` text | huruf kecil (1 huruf, ditambah bila bentrok) |
| `no_seri` int null | untuk seri (`.01`) |
| `nomor_panggil` text **unique** | gabungan; tersusun oleh fungsi aplikasi, bukan diketik bebas |
| `nomor_panggil_lama` text null | kode dari sheet, untuk penggantian label bertahap |
| `eksemplar` int default 1 | |
| `sampul_path` text null | bucket publik `perpus-sampul` (bucket `berkas` diakses lewat signed URL yang kedaluwarsa, tidak cocok dengan halaman ber-cache) |
| `asal` text | `koleksi_awal` / `wakaf` / `pengadaan` |
| `donasi_id`, `pengadaan_id` fk null | |
| `aktif` bool default true | nonaktif = hilang dari katalog publik |
| `createdAt`, `updatedAt` | |

**`perpus_donasi`** — `tanggal`, `nama`, `jenis` (`uang` / `buku`), `jumlah` bigint null (Rp, hanya `uang`), `catatan`. Donasi buku → banyak `perpus_buku.donasi_id`.

**`perpus_pengadaan`** — `tanggal`, `toko`, `total` bigint. Buku → `perpus_buku.pengadaan_id`.

**`perpus_anggota`** — `user_id` pk fk auth.users, `nama`, `no_wa`, `status` (`aktif` / `diblokir`), `createdAt`.

**`perpus_pinjaman`** — `id`, `anggota_id`, `buku_id`, `status`, `jatuh_tempo` date, `diajukan_at`, `disetujui_at`, `diserahkan_at`, `diklaim_kembali_at`, `dikembalikan_at`, `diproses_oleh` (profil pustakawan), `catatan`.

Status & transisi sah:
```
diajukan ──ACC──▶ dipinjam ──klaim peminjam──▶ menunggu_verifikasi ──verifikasi──▶ dikembalikan
   │                  └──────────── tandai dikembalikan (pustakawan) ──────────────▶ dikembalikan
   ├──tolak──▶ ditolak
   └──batal (peminjam)──▶ dibatalkan
```
ACC sekaligus menandai buku diserahkan (satu langkah); `jatuh_tempo` bawaan = tanggal ACC + 14 hari, dapat diubah saat ACC dan diperpanjang selama `dipinjam`.

### Ketersediaan & keamanan
- Tersedia = `eksemplar` − jumlah pinjaman `dipinjam | menunggu_verifikasi`. ACC lewat fungsi `perpus_acc_pinjaman(id, jatuh_tempo)` (`security definer`, `select … for update` pada baris buku) supaya eksemplar terakhir tidak di-ACC dua kali.
- View `perpus_katalog_publik` (judul, penulis, nomor panggil, genre, sampul, asal, nama donatur, tersedia) & `perpus_donasi_publik` (nama, tanggal, jenis, judul buku wakaf; **tanpa** `jumlah`) + `perpus_ringkasan_publik` (total infaq, total pengadaan, saldo). Dibaca role `anon`.
- RLS: tabel dasar hanya `PUSTAKAWAN`/`SUPERADMIN`; `perpus_anggota` & `perpus_pinjaman` — anggota baca baris miliknya; semua tulisan anggota lewat fungsi `security definer` (`perpus_daftar_anggota`, `perpus_ajukan_pinjaman`, `perpus_batal_pinjaman`, `perpus_klaim_kembali`); anggota tidak punya policy insert/update. Judul pinjaman sendiri dibaca lewat view `perpus_pinjamanku`.
- Peminjam umum tetap mendapat profil `VIEWER` nonaktif dari `handle_new_user` → tidak punya ruangan bq-ku. Tidak ada perubahan pada trigger itu.
- Akun nonaktif yang terdaftar di `perpus_anggota` tidak dihitung di notifikasi akun menunggu dan tidak tampil di `/pengguna`. Akun dengan riwayat pinjaman tidak bisa dihapus.

## 4. Impor (`scripts/impor-perpus.mjs`)

Jalan sekali (`npm run impor:perpus`), memakai service role, idempoten (hapus-isi ulang tabel `perpus_*` hanya bila kosong atau dengan flag `--ulang`).

1. Baca 3 sheet (ekspor CSV publik / Sheets API): *Copy of Daftar Buku*, *Infaq*, *Pengadaan Buku*.
2. Buku: rapikan spasi/`\r\n`, **wariskan penulis** dari baris di atas bila kosong, simpan kode sheet ke `nomor_panggil_lama`, pecah ke `kelas_ddc` / `kode_pengarang` / `kode_judul` / `no_seri` sebisanya. Kode kembar atau kosong → `nomor_panggil` sementara `TMP-<n>` dan ditandai untuk audit.
3. Infaq (kolom A–D) → `perpus_donasi` jenis `uang`. Wakaf buku (kolom G = donatur, I = judul; donatur berlaku sampai nama berikutnya) → `perpus_donasi` jenis `buku` + tautkan buku berdasarkan judul ternormalisasi.
4. Pengadaan (Tanggal, Nama Buku, Karangan, Harga, Olshop; tanggal/harga berlaku untuk baris kosong di bawahnya) → `perpus_pengadaan` + tautkan buku.
5. Laporan: judul wakaf/pengadaan yang tidak cocok, kode bermasalah, jumlah baris per tabel.

## 5. Penomoran & AI

**`lib/perpus/nomor-panggil.ts`** (murni, teruji):
- `kodePengarang(penulis)` — 3 huruf pertama nama belakang (aturan nama Indonesia/Arab: nama terakhir yang bukan gelar; `Dr.`, `Lc`, `M.Pd.I.`, tanda `;()@` dibuang; penulis lembaga → kata pertama yang bermakna). Dapat ditimpa manual.
- `kodeJudul(judul)` — huruf pertama kata pertama yang bukan artikel (hanya artikel bahasa Inggris `the`/`a`/`an` yang dilewati; `sang`/`si` tetap dihitung), huruf kecil.
- `susunNomorPanggil({kelas, pengarang, judul, seri, eksemplar})` → `899.221 LIY b.01`.
- `selesaikanBentrok(kandidat, yangSudahAda)` — tambah huruf judul berikutnya (`r` → `re`), lalu angka.

**Klasifikasi AI** — `lib/perpus/klasifikasi.ts` memanggil modul pusat `lib/ai` dengan fitur baru `klasifikasi_buku` (penyedia Gemini; pemakaian tercatat di `pemakaian_ai`, tunduk batas harian/plafon yang ada). Masukan: judul, penulis, opsional foto sampul. Keluaran JSON tervalidasi zod: `{ kelas_ddc, genre, alasan, yakin: 0..1 }`, `kelas_ddc` dibatasi ke daftar kelas yang dikenal di `lib/perpus/ddc.ts` (kode → label id/en, mis. `899.221` → "Novel Indonesia" / "Indonesian Fiction"). AI gagal/batas habis → pustakawan memilih kelas manual dari daftar.

**Halaman Audit Kode** (`/perpus/audit`): tabel buku bertanda (kembar, kosong, `TMP-`, format tak baku, atau kelas diragukan) → tombol "Usulkan semua" (AI, bertahap 10 per batch) → kolom *lama → usulan* + alasan → setujui per baris / semua yang `yakin ≥ 0.8` → ekspor daftar label yang perlu dicetak ulang (CSV / PDF A4 label).

## 6. Halaman

### Publik — domain perpus (`app/perpusbq/[lang]/…`)
| path | isi |
|---|---|
| `/[lang]` | sapaan, kotak cari, statistik (judul, sedang dipinjam, donatur), wakaf & buku terbaru |
| `/[lang]/katalog` | cari judul/penulis; filter genre (dari DDC) → pengarang, "hanya tersedia"; urut per nomor panggil |
| `/[lang]/buku/[id]` | detail, nomor panggil, genre, asal (*Wakaf dari …* / *Pengadaan* / *Koleksi awal*), ketersediaan, tombol **Pinjam** (belum login → "Masuk dengan Google") |
| `/[lang]/donatur` | tab Infaq & Wakaf Buku + ringkasan total/pengadaan/saldo |
| `/[lang]/pinjamanku` | wajib login; daftar pinjaman, status, jatuh tempo; **Batalkan** (diajukan), **Sudah saya kembalikan** (dipinjam) |
| `/[lang]/masuk`, `/[lang]/daftar` | login Google; form nama + no. WA saat pertama kali |

Navigasi: pil bawah di mobile (Beranda · Katalog · Donatur · Masuk atau Pinjamanku), bilah atas di desktop; Keluar ada di halaman Pinjamanku; pengalih bahasa ID | EN mempertahankan path.

### Ruang Perpus — domain bq-ku (`app/(perpus-admin)/perpus/…`)
| path | isi |
|---|---|
| `/perpus` | antrian: pengajuan baru (ACC + jatuh tempo / Tolak), klaim kembali (Verifikasi), terlambat |
| `/perpus/pinjaman` | semua pinjaman; tandai dikembalikan, perpanjang |
| `/perpus/buku` | daftar, tambah (dengan usulan AI), edit, nonaktifkan, sampul, cetak label |
| `/perpus/audit` | audit nomor panggil (§5) |
| `/perpus/donasi` | infaq, wakaf buku (sekaligus tambah buku), pengadaan |
| `/perpus/anggota` | daftar, blokir/aktifkan, tautan WA |
| `/perpus/akun` | halaman akun ruangan (pola `ROOM_AKUN`) |

API di `app/api/perpus/…` (admin) dan `app/api/perpus-publik/…` (anggota), divalidasi zod seperti rute lain.

**Notifikasi:** pengajuan baru & klaim kembali → `/api/notifikasi` yang ada untuk pustakawan. Pengingat jatuh tempo → tombol "Kirim WA" (tautan `wa.me` berisi pesan siap kirim) di Ruang Perpus.

## 7. Domain, Proxy, Auth

- Env baru: `PERPUS_HOST` (mis. `perpusbq.vercel.app`; boleh daftar dipisah koma untuk preview/lokal `perpus.localhost`). **Nilai domain ditentukan pengguna saat deploy.**
- `proxy.ts`: bila `host ∈ PERPUS_HOST` → cabang perpus: `/` → redirect `/id` atau `/en`; path tanpa `[lang]` → tambah `id`; rewrite internal `/<lang>/…` → `/perpusbq/<lang>/…` (folder fisik `app/perpusbq/[lang]`; bukan route group di root karena `[lang]` akan bentrok dengan route bq-ku, dan bukan folder `_…` karena itu folder privat Next yang tidak di-route). Halaman publik perpus tidak perlu login; `/[lang]/pinjamanku` & API anggota wajib sesi; sesi tanpa baris `perpus_anggota` diarahkan ke `/[lang]/daftar`. Logika ruangan bq-ku **tidak** dijalankan di host perpus. Di host bq-ku, path `/perpusbq` ditolak (404).
- Halaman bq-ku berada di route group `app/(bqku)` dengan root layout sendiri, sehingga `app/perpusbq/[lang]` juga punya root layout sendiri (tanpa `PendingGate`, `lang` dinamis). `app/manifest.ts` & `app/favicon.ico` wajib tetap di akar `app/`; di host perpus `/manifest.webmanifest` di-rewrite ke `app/perpusbq/manifest`.
- Host perpus hanya membuka `/auth/callback` dan `/api/perpus-publik`; `/api/*` dan `/auth/*` lain ditolak (404) karena penjaga ruangan bq-ku tidak berjalan di sana, dan `/api/perpus-publik` ditolak di host bq-ku.
- Supabase Auth (Tahap 3): tambahkan `https://<PERPUS_HOST>/auth/callback` ke Redirect URLs; tujuan setelah login dititipkan lewat cookie `bq_next` yang menyertakan `lang`, karena URL callback harus sama persis dengan entri Redirect URLs.
- Vercel: tambahkan domain ke proyek `bq-ku` (deploy tetap manual: `vercel --prod`, lalu cek `vercel ls`).

## 8. Tema & Bahasa

- Jalankan skill `clone-website` terhadap `https://www.ailene.id/dashboard` dalam mode **ekstraksi sistem desain**: screenshot 1440/768/390, token warna, font, radius, border, bayangan, pola nav pil, kartu, state hover & animasi → `docs/research/perpus-tema/`. Tidak mengunduh logo/maskot/ilustrasi Ailene; tidak menyalin teks.
- Token ditaruh di `app/perpusbq/perpus.css` (CSS variables di bawah kelas `.tema-perpus` pada root layout perpus) agar tidak bocor ke bq-ku; Tailwind config bq-ku tidak diubah selain menambah warna yang merujuk variabel.
- i18n: `lib/perpus/i18n/{id,en}.ts` (objek bertipe, kunci identik dicek oleh TypeScript), helper `t(lang, kunci)`; `generateStaticParams` → `id`, `en`; metadata `alternates.languages` untuk `hreflang`. Judul buku & nama donatur tidak diterjemahkan; label genre DDC diterjemahkan.
- Logo & nama "Perpus BQ" dibuat sendiri (wordmark sederhana).

## 9. Penanganan Galat

- ACC saat stok habis → 409 "Semua eksemplar sedang dipinjam".
- Transisi status tidak sah → 409 dengan status saat ini.
- Anggota diblokir → tombol Pinjam nonaktif + pesan.
- AI gagal/batas habis → form tetap bisa diisi manual; pesan dari `lib/ai` diteruskan.
- Nomor panggil bentrok saat simpan (constraint unik) → susun ulang otomatis sekali, lalu minta pustakawan memilih.

## 10. Pengujian (vitest)

- `nomor-panggil`: kode pengarang (gelar, nama Arab, lembaga, tanda baca), kode judul, seri, eksemplar, bentrok — termasuk kasus nyata dari §2.
- Parser impor: pewarisan penulis, pembersihan spasi/`\r\n`, pengelompokan donatur wakaf & baris pengadaan.
- Mesin status pinjaman: semua transisi sah/tidak sah, jatuh tempo bawaan 14 hari.
- Resolver host & bahasa di proxy (host perpus vs bq-ku, `Accept-Language`, path tanpa lang, `/perpusbq` di host bq-ku).
- `roomsFor`/`roomOfPath` dengan `PUSTAKAWAN`.
- Skema klasifikasi AI (zod) menolak kelas di luar daftar.
- SQL (manual, skrip di `supabase/tests/perpus_rls.sql`): anon tidak bisa baca `perpus_donasi.jumlah`; anggota tidak bisa baca pinjaman orang lain; ACC paralel pada eksemplar terakhir hanya satu yang berhasil.

## 11. Tahapan

1. **Fondasi & data:** migrasi, peran/ruangan `PUSTAKAWAN`, impor, Ruang Perpus (buku, donasi, anggota), nomor panggil + Audit Kode + klasifikasi AI.
2. **Situs publik:** ekstraksi tema, layout `app/perpusbq`, i18n, katalog/detail/donatur, routing domain di proxy.
3. **Peminjaman:** login & daftar anggota, alur pinjam lengkap, antrian pustakawan, notifikasi.

Setiap tahap: build lolos, vitest lolos, deploy manual + cek `vercel ls`.
