# Sistem desain referensi — ailene.id/dashboard (ekstraksi 4 Nov 2026)

Diekstrak dengan skill `clone-website` **fase 1 saja** (rekon & ekstraksi global, `getComputedStyle` + aturan CSS variabel) lewat browser bawaan, viewport ±1000px. Hanya token & pola. **Tidak** menyimpan screenshot di repo (memuat logo & maskot Ailene), tidak mengunduh aset, tidak menyalin teks.

## Warna (mode terang)

| peran | nilai | catatan |
|---|---|---|
| kertas (latar halaman) | `#f7f7f2` | shell aplikasi `#f3f6f2` |
| kertas-dalam | `#ecece4` | blok sekunder |
| kartu | `#ffffff` | |
| tinta | `#0a0f0d` | teks utama, **garis tepi** & bayangan keras |
| tinta-lembut | `#3d4a44` | teks sekunder; redup `#526158` |
| evergreen | `#122922` | judul & teks nav |
| jungle-teal | `#3f8f77` | aksen sekunder; versi gelap `#1f5c49` |
| lime | `#d6ee30` | aksen utama: tombol CTA, item nav aktif, teks chip gelap |
| lime-dalam | `#c4dc1f` | hover |
| lime-tint | ±`#f4f8c4` | baris terpilih di daftar |
| garis halus | `#0f2e1f24` | pemisah tipis |
| galat | `#9c3828` | |

## Warna kategori (ditambahkan 4 Nov 2026)

Ailene memberi tiap materi blok warna sendiri (thumbnail, chip, gelembung). Ekstraksi pertama hanya mencatat warna tombol & nav, sehingga situs terasa hijau semua. Di Perpus BQ warna ini menandai genre dan status; pasangan latar & teksnya ada di `lib/perpus/warna.ts`.

| nama | latar | teks |
|---|---|---|
| amber | `#e9a93f` | `#2a1c06` |
| periwinkle | `#7c75ff` | `#16133f` |
| terracotta | `#d97757` | `#2a1006` |
| krem | `#f8efdc` | `#6e4709` |
| lavender | `#eeedff` | `#16133f` |
| indigo | `#16133f` | `#eeedff` |
| teal | `#3f8f77` | `#021510` |
| lime | `#d6ee30` | `#1a2004` |

## Warna (mode gelap)

kertas `#1d2b26`, kertas-dalam `#16211d`, kartu `#22342c` / `#101a15`, tinta `#eef5ee`, tinta-lembut `#a7bfb3`, garis `#eef5ee29`, lime `#c9ff5c` (aksen `#e2f34a`), bayangan keras `#0009`. Diaktifkan dengan `[data-theme="dark"]`.

## Tipografi

- Sans tebal bergaya headline untuk semua teks (font berlisensi milik situs; **kita memakai pengganti** dari Google Fonts, mis. *Bricolage Grotesque* atau *Plus Jakarta Sans* 800 yang sudah dipakai bq-ku).
- Aksen tulisan tangan: Caveat (sudah ada di bq-ku).
- H1: 51.2px / 1.0, berat 800, letter-spacing −1.79px (≈ −0.035em). Kata kunci di H1 diberi blok sorot lime di belakangnya.
- Label chip/tombol: 13px, berat 800, letter-spacing 0.01–0.02em.
- Nav: 14px berat 600 (label di bawah ikon).

## Garis, radius, bayangan

- Garis tepi **2px solid tinta** di kartu, chip, tombol, nav.
- Bayangan keras tanpa blur (gaya "stiker"): kartu besar `6px 7px 0 tinta`, nav `3px 3px 0 tinta`, chip/tombol kecil `2px 2px 0 tinta`.
- Radius: kartu besar 24px, nav pil 20px, item nav 14px, baris daftar 13px, label kecil 10px, chip/tombol `999px`.
- Bayangan lembut hanya untuk chip gelap: `0 2px 0 #0a0f0d2e, 0 8px 16px #0f2e1f24`.

## Pola komponen

- **Nav pil bawah**: `position: fixed; bottom: 12px`, kotak kertas `#f7f7f2`, garis 2px tinta, radius 20px, padding 4px, bayangan `3px 3px 0`. Item = ikon di atas label (tinggi 50px, radius 14px); aktif = latar lime. Item tengah menonjol: ikon dalam kotak lime bergaris 2px + bayangan `2px 3px 0`.
- **Chip gelap**: latar tinta, teks lime, pil, 13px/800, padding `5px 14px`.
- **Label bertepi**: latar putih, garis 2px, radius 10px, bayangan `2px 2px 0`, sedikit dimiringkan (rotate ±3°).
- **Kartu besar**: putih, garis 2px, radius 24px, bayangan `6px 7px 0`; kepala kartu berpola titik-titik halus.
- **Baris daftar**: garis 2px, radius 13px, nomor dalam lingkaran kecil bergaris; baris aktif berlatar lime-tint.
- **Tombol CTA**: lime, garis 2px, pil, bayangan `2px 2px 0`, tinggi 36px, ikon panah di kanan.

## Gerak

- Easing: `--ease-out: cubic-bezier(.16,1,.3,1)`, `--ease-pop: cubic-bezier(.34,1.56,.64,1)`.
- Item nav: `transform .14s ease-pop, background-color .16s`. Tombol/kartu ditekan: geser `translate(2px,2px)` + bayangan mengecil (efek stiker ditekan).
- Fokus: cincin `#122922` + halo `0 0 0 6px #d6ee30` (gelap: cincin lime, tanpa halo).

## Tata letak

- Lebar konten maks 1200px; jarak antarbagian 24px.
- Mobile: nav pil bawah selebar layar dikurangi margin; desktop: tetap pil mengambang di bawah (situs referensi memakai pil yang sama di desktop).
