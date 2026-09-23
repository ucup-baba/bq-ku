# Spesifikasi Desain — Perombakan UI/UX Tahap 1 (Fondasi + Ruang Donatur)

**Tanggal:** 23 September 2026
**Status:** Disetujui (brainstorming selesai)
**Mockup yang disetujui:** `docs/superpowers/specs/mockups/2026-09-23-ui/` — `gaya-visual.html` (pilihan A), `sidebar.html` (pilihan 2), `buat-surat.html` (pilihan C), `beranda.html`.

---

## 1. Latar & Masalah

Audit DOM pada lebar HP 390 px (23-09-2026):

| Halaman | Panjang | Masalah utama |
|---|---|---|
| `/donatur` (Beranda) | 3,5 layar | 3 aksi ke Buat Surat, 5 tautan ke Daftar Surat, daftar "belum terkirim" tumpang-tindih dengan badge "Belum WA", panah ↗ tanpa fungsi di kartu angka |
| `/donatur/surat/baru` | 2,6 layar | form + pratinjau bertumpuk |
| `/donatur/surat` | 1,6 layar | 2 tautan ke Buat Surat |
| `/donatur/daftar` | 1,5 layar | ikon ⊕ ditambah teks "+" |
| `/` (Beranda Santri) | — | 3 tautan ke `/tambah`, 3 ke `/santri` (Tahap 2; navigasinya ikut Tahap 1) |
| `/tambah` | 2,9 layar | (Tahap 2) |

Ikon ganda: tombol "+ Buat Surat", "+ Donasi", "+ Donatur Baru", "+ Surat", "+ Berkas" memakai ikon ⊕ **dan** teks "+"; input tanggal menampilkan ikon kalender kustom **dan** ikon bawaan browser. Belum ada pustaka animasi; hanya satu keyframe `bentoFadeUp` di `app/globals.css`. Sidebar desktop tidak dapat diciutkan.

## 2. Ruang Lingkup

**Tahap 1 (spec ini):** sistem desain bersama, kerangka navigasi untuk KEDUA ruangan (sidebar desktop & bottom nav dipakai bersama), semua halaman Ruang Donatur, halaman Akun & Pengguna.

**Tahap 2 (spec terpisah):** isi halaman Ruang Santri — Beranda, Direktori, Detail/CV santri, dan form Input Berkas (`/tambah`).

Tidak termasuk: perubahan API, skema database, atau isi PNG surat. `/donatur/rekap` tetap redirect ke `/donatur`.

## 3. Keputusan

| Topik | Keputusan |
|---|---|
| Gaya visual | **A — Clay Doodle**: terang & hangat, kartu putih empuk, ikon di ubin warna dengan bayangan offset sewarna, doodle garis tangan; mode gelap setara |
| Sidebar desktop | **Rail 76 px yang melebar ke 240 px saat hover**, melayang di atas konten, dengan tombol **pin** (tersimpan di perangkat) |
| Buat Surat di HP | **C — pratinjau surat besar + panel isian yang ditarik dari bawah** |
| Beranda Donatur | Sesuai `beranda.html` (±1,3 layar di HP) |
| Animasi | **Halus & bermakna**, 150–350 ms, mati otomatis dengan `prefers-reduced-motion` |
| Pustaka | `vaul` (panel bawah), `embla-carousel-react` (carousel ber-dots), `animejs` v4 (hitung naik, doodle & sparkline tergambar), CSS untuk hover/tekan |

## 4. Sistem Desain Bersama

### 4.1 Token
Didefinisikan di `app/globals.css` sebagai CSS variable + dipetakan di `tailwind.config.ts`:
- Terang: `--bg #FBFAF5`, `--surface #FFFFFF`, `--border #E4EBE0`, `--ink #152A26`, `--muted #5B6B66`, `--brand-green #0E9F54`, `--brand-blue #0B5FA5`, `--warn #EA580C`.
- Gelap: `--bg #0C1917`, `--surface #142522`, `--border #1F3A35`, `--ink #EFF5F1`, `--muted #9FB3AD`, aksen sama dengan kecerahan disesuaikan untuk kontras AA.
- Bayangan: `--shadow-card: 0 10px 24px -12px rgb(0 0 0 / .18)`; `--shadow-offset(color)` = `3px 4px 0 color/20%` untuk ubin ikon.
- Radius: kartu 20–24 px, kontrol 12 px, chip penuh.

### 4.2 Komponen bersama (`components/ui/`)
| Komponen | Fungsi |
|---|---|
| `IkonUbin` | Ikon Phosphor di ubin warna lembut + bayangan offset sewarna + doodle opsional (`coretan`, `bintang`, `lingkaran`); ukuran sm/md/lg |
| `Doodle` | Memperluas `components/ui/DoodleStickers.tsx` yang sudah ada (tidak membuat duplikat): tambah `DoodleCoretan` dan `DoodleLingkaran`, sedangkan `bintang` memakai `DoodleSparkle` yang sudah ada; dapat "tergambar" (stroke-dashoffset via anime.js) saat masuk layar dan bergoyang pelan saat hover |
| `Kartu` | Permukaan kartu standar (surface, radius, shadow-card), varian `hero` bergradien hijau→biru |
| `AngkaNaik` | Angka yang menghitung naik saat pertama terlihat (anime.js), format rupiah/angka |
| `Carousel` | Embla + dots (dot aktif memanjang), geser, keyboard, `aria-roledescription="carousel"` |
| `LembarBawah` / `PanelTetap` | Pembungkus `vaul` Drawer: `LembarBawah` = lembar modal (desktop tampil di tengah, lebar maks. 28rem); `PanelTetap` = panel non-modal dengan snap points untuk Buat Surat |
| `ChipPilihan` | Segmented chip (periode, filter status) dengan `aria-pressed` |
| kelas CSS `bergilir` | Stagger fade-up pada anak-anak elemen saat masuk, murni CSS (tanpa kedip saat hidrasi), otomatis mati dengan reduced-motion |
| `TombolUtama` / `TombolIkon` | Tombol dengan umpan balik tekan (scale .96, 120 ms); `TombolIkon` wajib `aria-label` |

### 4.3 Aturan konten
- Satu aksi = satu pintu masuk per layar. Aksi global (Buat Surat) hanya di tombol mengambang HP / tombol utama header desktop.
- Tombol: ikon saja, teks saja, atau ikon + teks — tidak pernah ikon ⊕ + teks berawalan "+".
- Input tanggal: satu ikon saja (sembunyikan indikator bawaan dengan `::-webkit-calendar-picker-indicator` transparan menutupi seluruh input, atau hapus ikon kustom).
- Teks HP minimal 12 px; label panjang dipotong `truncate` dengan `title`, atau label sekunder disembunyikan di bawah breakpoint `sm`.
- Kartu yang bisa diketuk tidak memakai ikon panah dekoratif.

### 4.4 Animasi
| Momen | Perilaku |
|---|---|
| Masuk halaman | konten fade + naik 8 px, 250 ms; kartu stagger 60 ms |
| Angka total | hitung naik 600 ms sekali saat pertama terlihat |
| Doodle | tergambar 500 ms saat masuk; goyang ±3° saat hover |
| Tekan tombol | scale .96, 120 ms |
| Rail sidebar | lebar 76→240 px, 220 ms ease-out; label memudar 150 ms |
| Panel bawah & carousel | bawaan vaul/embla |
Semua animasi JS memeriksa `matchMedia('(prefers-reduced-motion: reduce)')`; CSS memakai `@media (prefers-reduced-motion: reduce)` untuk mematikan transisi.

## 5. Kerangka Navigasi

### 5.1 Desktop (≥1024 px; 768–1023 px mulai dalam keadaan rail)
- `components/layout/RailSidebar.tsx` menggantikan `DesktopSidebar` dan `DonaturSidebar`: satu komponen, isi menu dari konfigurasi per ruangan (`lib/nav/menu.ts`).
- Lebar tetap 76 px di tata letak; saat hover (atau fokus keyboard) melebar 240 px **melayang** di atas konten (tidak menggeser konten). Tombol pin menahan lebar 240 px dan menggeser konten; status pin di `localStorage('bq_rail_pin')`.
- Saat rail ciut hanya ikon `IkonUbin` yang tampak; label muncul saat rail melebar (hover/fokus), sehingga tidak perlu tooltip terpisah. Bagian bawah: tombol Pindah Ruang, tombol Akun (avatar; membuka panel Akun yang sama dengan HP — berisi tema, kelola pengguna, keluar), tombol pin. Toggle tema hanya ada di panel Akun (tidak dobel di rail).
- Aksi utama ruangan (Buat Surat / Input Berkas) **tidak** menjadi item rail Ruang Donatur; di desktop ia tampil sebagai tombol utama di header halaman yang relevan (Beranda, Daftar Surat). Ruang Santri tetap memakai item rail "Input Berkas" sampai Tahap 2.

### 5.2 HP (<768 px)
- `components/layout/BottomNav.tsx` menggantikan `MobileBottomNav` dan `DonaturBottomNav`, isi dari `lib/nav/menu.ts`.
- Ruang Donatur: Beranda · Donatur · **+ Surat** (tombol mengambang tengah) · Pindah · Akun. Ruang Santri: Beranda · Direktori · **+ Berkas** · Pindah · Akun. Bila akun hanya punya satu ruangan, "Pindah" digantikan item menu ruangan (Donatur: Surat; Santri: Pengguna untuk superadmin / tidak ada).
- Tombol tema di drawer Akun (sudah ada).
- Di halaman Buat Surat (HP), bottom nav disembunyikan: layar itu fokus pada satu tugas, tombol Simpan menempel di dasar layar, dan kembali lewat tombol ← di header.
- Tidak ada lagi tautan ke tujuan yang sama di header halaman bila sudah ada di bottom nav.

### 5.3 Transisi halaman
`AppShell` membungkus konten dengan elemen ber-`key={pathname}` dan kelas `animate-halaman`, sehingga setiap navigasi memicu animasi masuk. (`template.tsx` di route group tidak di-mount ulang antar-halaman dalam grup yang sama, jadi tidak dipakai.)

## 6. Halaman Ruang Donatur

### 6.1 Beranda (`/donatur`) — lihat `beranda.html`
- **Header:** judul + salam; avatar kecil (desktop: tombol utama "Buat Surat" di kanan).
- **Kartu hero:** total donasi uang periode ini (`AngkaNaik`), `ChipPilihan` periode (Bulan / 3 bln / Tahun / ⋯), keterangan perbandingan, sparkline tren.
- **"⋯" periode** membuka `LembarBawah` berisi rentang tanggal manual (satu ikon kalender) dan tombol Export CSV.
- **Carousel angka** (HP; desktop grid 3–4 kolom): Donasi uang, Donasi barang, Surat terkirim (x/y), Komposisi akad.
- **"Perlu dikirim ke WhatsApp"**: carousel kartu surat belum terkirim (maks. 5) di HP maupun desktop, masing-masing tombol Kirim WA (memakai `TombolKirimWa`). Gambar PNG hanya disiapkan untuk slide yang sedang aktif agar beranda tidak merender 5 PNG sekaligus. Tautan di judul: "n surat" → Daftar Surat filter Belum dikirim; bila kosong, "Arsip surat" → Daftar Surat, dan kartu diganti pesan sukses kecil.
- **Donasi terbaru**: 2 baris di HP (desktop 5), ikon "donasi lagi" (↻) ber-`aria-label`; "Lihat semua" ke Daftar Donatur.
- Desktop tambahan: grafik tren lengkap dan daftar donasi barang di grid bento.
- **Dihapus:** tombol "+ Buat Surat" di filter, "Input Donasi Baru", "Arsip Surat", kartu filter besar, badge "Belum WA" di daftar donatur, panah ↗.
- Target: ≤1,5 layar di 390×844.

### 6.2 Buat Surat (`/donatur/surat/baru`) — lihat `buat-surat.html` (C)
- **HP:** pratinjau surat (`PratinjauSurat`) mengisi layar; `PanelTetap` dengan snap `[0.28, 0.6, 1]`; di dalamnya tiga bagian yang dapat digeser (Carousel tanpa autoplay, dots berlabel): **Donatur** (pilih/baru), **Donasi** (jenis, bentuk, nominal/barang, tanggal, keterangan), **Surat** (tanggal surat, nomor, gaya tulisan). Fokus pada input → panel naik ke snap 1; blur → kembali ke 0.6. Tombol Simpan menempel di bawah panel pada semua snap. Error 400 memindahkan panel ke bagian yang salah.
- **Desktop:** dua kolom — form kiri dikelompokkan dalam 3 kartu, pratinjau kanan `sticky`.
- Logika form (FormSurat) tidak berubah; hanya tata letak & komponen.

### 6.3 Daftar Donatur (`/donatur/daftar`)
Cari menempel (sticky) di atas; kartu padat (avatar inisial, nama, WA, ↻); tambah donatur = `TombolIkon` di header yang membuka `LembarBawah`. Target ≤1,2 layar untuk 10 donatur pertama (daftar memuat lebih lanjut dengan scroll alami).

### 6.4 Detail Donatur
Kartu profil ringkas + timeline riwayat donasi; satu tombol "Donasi lagi".

### 6.5 Daftar Surat (`/donatur/surat`)
`ChipPilihan` status (Semua / Belum dikirim / Sudah dikirim), periode di "⋯"; baris surat dengan status + aksi Kirim WA; tidak ada tautan ke Buat Surat selain tombol global.

### 6.6 Detail Surat
Gambar surat dengan pinch-zoom (CSS `touch-action: pinch-zoom` pada wadah gulir); tombol Kirim WA mengambang di bawah (HP) / di panel kanan (desktop); Unduh & Tandai terkirim di menu "⋯". Setelah Kirim WA ditekan, muncul ajakan kontekstual "Sudah terkirim? Tandai" supaya langkah menandai tidak terlupa.

### 6.7 Akun & Pengguna (`/pengguna`)
Disamakan dengan gaya A: tabel di desktop, kartu di HP; tombol tambah email = `TombolIkon`.

## 7. Penanganan Error & Aksesibilitas
- Carousel: tombol dot punya `aria-label="Slide n dari m"`, dapat difokus; geser keyboard dengan panah.
- LembarBawah/PanelTetap: fokus terperangkap saat terbuka, Esc menutup (vaul), `aria-labelledby`.
- Semua `TombolIkon` wajib `aria-label` (dicek di test).
- Kontras teks ≥ 4.5:1 di kedua tema untuk teks < 18 px.

## 8. Pengujian & Kriteria Selesai
- Unit test untuk: `lib/nav/menu.ts` (menu per ruangan & peran, tidak ada tujuan ganda), `ChipPilihan`/`Carousel` bila logikanya diekstrak ke fungsi murni, util reduced-motion.
- Skrip audit (`scripts/audit-ui.mjs`, dijalankan manual oleh controller lewat browser) yang melaporkan panjang halaman dan tautan/aksi ganda — dipakai sebagai verifikasi.
- **Kriteria:**
  1. Di 390×844: Beranda Donatur ≤1,5 layar; Daftar Donatur, Daftar Surat, Detail Surat ≤1,5 layar; Buat Surat tanpa scroll halaman (panel bawah).
  2. Tidak ada tujuan tautan yang sama dua kali per layar (kecuali daftar item data), tidak ada ikon + teks "+".
  3. Tidak ada teks < 12 px di HP; tidak ada teks meluap tanpa "…".
  4. Rail sidebar melebar saat hover, pin tersimpan; bottom nav 5 item di kedua ruangan.
  5. Animasi berjalan dan mati saat reduced-motion.
  6. `npm test`, `tsc`, `next build` hijau.
