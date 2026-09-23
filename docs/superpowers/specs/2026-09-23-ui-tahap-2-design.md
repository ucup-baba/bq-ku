# Spesifikasi Desain — Perombakan UI/UX Tahap 2 (Ruang Santri)

**Tanggal:** 23 September 2026
**Status:** Disetujui (brainstorming selesai)
**Melanjutkan:** `docs/superpowers/specs/2026-09-23-ui-tahap-1-design.md` (sistem desain Clay Doodle, navigasi, Ruang Donatur).

---

## 1. Latar & Masalah

Audit DOM di HP 390 px (23-09-2026, data santri = 0):

| Halaman | Panjang | Masalah |
|---|---|---|
| `/` Beranda Santri | 1,6 layar | `/tambah` ×3 dan `/santri` ×3 per layar; paragraf hero panjang; kartu "Smart OCR" hanya dekorasi; gaya lama (teal/slate) |
| `/santri` Direktori | 1,0 layar (kosong) | `/tambah` ×3; kartu santri besar (291 baris) |
| `/tambah` Input Berkas | 2,9 layar | teks 10–11 px; `SantriForm.tsx` 1.827 baris; stepper HP ada tetapi semua bagian panjang |
| Detail/Edit | — | tidak bisa diaudit tanpa data |
| Panel Akun | — | pegangan tarik menempel di samping ✕; kartu profil bergradien teal gaya lama |

## 2. Ruang Lingkup

**Masuk:** Beranda Santri, Direktori, Detail Santri (tab CV & Berkas), modal pratinjau dokumen, wizard Input & Edit (termasuk pemecahan `SantriForm`), perbaikan panel Akun, label menu "Santri baru".

**Tidak masuk:** logika OCR/Gemini, API, skema database, halaman publik `/upload-mandiri/[token]`.

## 3. Keputusan

| Topik | Keputusan |
|---|---|
| Form Input/Edit | **Wizard 4 langkah, satu layar per langkah, harus urut** (HP & desktop) |
| Beranda | **Pola Beranda Donatur**: hero total, carousel angka, carousel "Perlu dilengkapi", santri terbaru |
| Detail | **Dua tab: CV \| Berkas** |
| Direktori | Pola Daftar Donatur: cari menempel, chip gender, jenjang di lembar bawah, kartu satu baris |
| Data uji | Controller boleh membuat **satu** santri uji di produksi untuk verifikasi visual, lalu menghapusnya (beserta dokumen/fotonya) setelah selesai |

Semua komponen memakai sistem desain Tahap 1 (`IkonUbin`, `Kartu`, `Carousel`, `ChipPilihan`, `LembarBawah`, `KepalaHalaman`, `AngkaNaik`, `InisialUbin`, `TombolIkon`/`TautanUtama`, kelas `bergilir`) — tidak ada komponen dasar baru kecuali disebut.

## 4. Navigasi & Panel Akun

- `lib/nav/menu.ts`: item Ruang Santri `/tambah` berlabel **"Santri baru"** di rail (ikon tetap `FilePlus`, kunci `berkas`) dan **"Santri"** di tombol tengah HP (ikon Plus).
- `AccountDrawer`: pegangan tarik di tengah atas (baris sendiri), tombol ✕ absolut di pojok kanan atas; kartu identitas memakai `InisialUbin` ukuran besar + chip peran (`bg-emerald-50 text-bq-hijau` untuk superadmin, `bg-sky-50 text-bq-biru` lainnya); latar `Kartu` biasa (tanpa gradien teal). Isi & perilaku tetap.

## 5. Beranda Santri (`/`)

Helper murni `lib/santri/ringkasan.ts`:
- `BERKAS_WAJIB = ['KARTU_KELUARGA', 'AKTA_KELAHIRAN', 'KTP_ORTU', 'SKL_IJAZAH']` dengan label pendek (KK, Akta, KTP Ortu, SKL).
- `statusBerkas(santri)` → `{ ada: number; total: 4; kurang: string[]; perluPerbaikan: string[]; lengkap: boolean }` (dokumen berstatus `REJECTED` dihitung kurang; `NEED_FIX` masuk `perluPerbaikan` dan membuat `lengkap` false).
- `ringkasanSantri(list)` → `{ total, ikhwan, akhwat, smp, smaSmk, alumni, berkasLengkap }`.
- `perluDilengkapi(list)` → santri dengan `!lengkap`, urut terbaru, maks. 5.

Tampilan:
- `KepalaHalaman` "Ruang Santri", sub salam nama depan (tampil di HP), aksi `TautanUtama` "Santri baru" `hidden md:inline-flex`.
- **Hero** (`Kartu` hero): "Total santri" (`AngkaNaik`), bar Ikhwan/Akhwat dengan angka, doodle tergambar.
- **Carousel angka** (HP carousel, md+ grid 4): SMP, SMA/SMK, Alumni, "Berkas lengkap x/y".
- **Perlu dilengkapi** (carousel, `Kartu` peringatan): nama, "2/4 · kurang Akta, SKL" (+ "perlu perbaikan: …"), `TautanUtama` kecil **Lengkapi** → `/santri/[id]?tab=berkas`, `TombolIkon` WhatsApp **Ingatkan wali** (memakai logika pesan pengingat yang sudah ada di `SantriCard`, dipindah ke `lib/santri/pengingat.ts`; tidak tampil bila `kontakWali` kosong). Kosong → kartu "Semua berkas lengkap".
- **Santri terbaru**: baris ringkas (foto/inisial, nama, jenjang·kelas), 2 di HP, 5 di desktop, `data-audit-daftar`.
- Dihapus: paragraf hero, tombol "Upload Berkas & OCR Scan" & "Buka Direktori" di hero, kartu "Smart OCR", "Lihat semua", tombol di empty state.
- Data diambil server-side (`listSantri`) seperti sekarang; komponen tampilan menerima data lewat props.

## 6. Direktori (`/santri`)

- `KepalaHalaman` "Direktori Santri" (tanpa tombol tambah).
- Blok menempel: input cari (nama/NIK/asal sekolah), `ChipPilihan` Semua/Ikhwan/Akhwat dengan jumlah, `TombolIkon` ⋯ "Filter jenjang" membuka `LembarBawah` berisi `ChipPilihan` Semua/SMP/SMA/SMK/Alumni; label jenjang aktif tampil sebagai chip kecil yang bisa dihapus.
- Daftar (`data-audit-daftar`, grid 1/2/3 kolom): kartu satu baris — foto profil (atau `InisialUbin`), nama (truncate), "SMA · Kelas 10", badge status berkas (✓ Lengkap hijau / "2/4" jingga), seluruh kartu tautan ke detail.
- Filter & pencarian tetap di klien seperti sekarang (logika filter dipindah ke `lib/santri/filter.ts` + test).
- `SantriCard.tsx` lama dan `FilterBar.tsx` dihapus bila tak dipakai lagi.

## 7. Detail Santri (`/santri/[id]`)

- `KepalaHalaman`: ← ke `/santri`, judul nama, aksi `TautanUtama` **Edit** + `MenuSantri` ⋯ (Bagikan, Cetak).
- `ChipPilihan` tab `CV | Berkas n/4`; tab awal dari `?tab=berkas`, default CV. Perpindahan tab memperbarui URL (`router.replace`, tanpa scroll).
- **Tab CV**: `SantriPosterCv` tanpa toolbar sendiri (dipindah ke header) dan tanpa blok arsip dokumen (pindah ke tab Berkas); warna mengikuti token (tetap mendukung cetak); teks HP ≥12 px kecuali elemen cetak diberi `data-audit-abaikan` bila dekoratif.
- **Tab Berkas** (`components/profile/TabBerkas.tsx`): dua grup (Wajib, Pendukung), baris per kategori: `IkonUbin`, nama kategori, status (Belum ada / Menunggu / Terverifikasi / Perlu perbaikan / Ditolak) + catatan; baris berdokumen membuka `DocumentPreviewModal`. Bila ada wajib yang kurang: satu `TautanUtama` **Lengkapi berkas** → `/santri/[id]/edit` (langkah 1).
- `DocumentPreviewModal`: teks ≥12 px, gaya token; perilaku tetap.

## 8. Wizard Input & Edit

Struktur baru `components/forms/santri/`:
- `useSantriForm.ts` — seluruh state & logika `SantriForm` lama (OCR, batch scan, draft recovery, penjaga identitas, foto, submit) dipindah tanpa mengubah perilaku.
- `LangkahBerkas.tsx`, `LangkahSantri.tsx`, `LangkahKeluarga.tsx`, `LangkahSekolah.tsx` — isi bagian lama dipindah per langkah.
- `lib/santri/langkah.ts` (murni, diuji): `LANGKAH = [{ id: 1, label: 'Berkas', field: ['namaLengkap'] }, { id: 2, label: 'Santri', field: ['nik','tempatLahir','tanggalLahir','jenisKelamin'] }, { id: 3, label: 'Keluarga', field: ['kontakWali'] }, { id: 4, label: 'Sekolah & CV', field: ['jenjang','kelas','sekolahSekarang'] }]`; `validasiLangkah(langkah, form)` memakai `santriBase` zod (`.pick` field langkah; aturan kelas-sesuai-jenjang diikutkan di langkah 4) → `Record<field, pesan>`; `langkahBolehDibuka(target, langkahTertinggiValid, modeEdit)`.
- `SantriForm.tsx` menjadi komposisi: `useSantriForm` + progres + langkah aktif + bar tombol menempel.

Perilaku:
- Progres 4 titik berlabel di atas (menempel di HP). Langkah yang sudah dilewati bisa diketuk; langkah di depan terkunci (tombolnya `disabled`, `aria-disabled`).
- Bar bawah menempel: **Kembali** (sekunder, disembunyikan di langkah 1) dan **Lanjut** / **Simpan** (langkah 4). Lanjut memvalidasi field langkah itu; bila gagal: pesan per field, fokus & gulir ke field pertama yang salah, tidak pindah langkah.
- **Mode edit**: semua langkah langsung bisa dibuka lewat progres; tombol Simpan tetap hanya di langkah 4.
- Pergantian langkah: animasi masuk `animate-halaman`, gulir ke atas.
- Di halaman wizard, bottom nav HP disembunyikan (seperti Buat Surat): `sembunyikanNavHp` mencakup `/tambah` dan `/santri/[id]/edit`.
- Input `text-base md:text-sm`; teks ≥12 px; banner hasil OCR ringkas.
- Galat dari server (400 dengan `fields`) → pindah ke langkah pertama yang memuat field bergalat.

## 9. Pengujian & Kriteria Selesai

- Unit test: `lib/santri/ringkasan.ts`, `lib/santri/filter.ts`, `lib/santri/langkah.ts`, `lib/santri/pengingat.ts`, `menu.ts` (label & `sembunyikanNavHp`), render test komponen utama (beranda, direktori, tab berkas, progres wizard).
- Verifikasi visual oleh controller memakai **satu santri uji** yang dibuat lewat aplikasi lalu dihapus setelah selesai (termasuk dokumen & foto di storage).
- **Kriteria:**
  1. Di 390×844: Beranda & Direktori ≤1,5 layar; tab CV & tab Berkas masing-masing ≤1,5 layar; tiap langkah wizard ≤~1,5 layar.
  2. Audit: tanpa tautan ganda per layar, tanpa ikon + "+", tanpa teks <12 px (kecuali elemen bertanda `data-audit-abaikan`), tanpa luapan horizontal.
  3. Wizard: Lanjut ditolak bila field wajib langkah belum valid; Kembali selalu bisa; mode edit membuka semua langkah.
  4. `npm test`, `tsc`, `next build` hijau.
