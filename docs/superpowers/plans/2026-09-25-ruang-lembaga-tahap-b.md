# Ruang Lembaga Tahap B (Berkas Lembaga) — Implementation Plan

> Dikerjakan inline (superpowers:executing-plans). Tiap task: tes gagal → implementasi → tes lulus → commit. Rencana ini sengaja di tingkat task (antarmuka + daftar tes); kode ditulis saat eksekusi dengan TDD.

**Goal:** Berkas legal yayasan (unggah, versi, masa berlaku), tautan bagikan aman (masa berlaku, tanda air, PIN, batas buka), catatan akses, dan cap/tanda tangan untuk surat.

**Spec:** `docs/superpowers/specs/2026-09-25-ruang-lembaga-tahap-b-design.md`

## Global Constraints
- Bahasa UI/komentar Indonesia; gaya kode mengikuti sekitar.
- Pengurus **tidak pernah** melihat/unduh CAP & TANDA_TANGAN; keduanya tidak bisa masuk tautan (ditegakkan DB).
- Kunci admin hanya di server untuk `/bagikan/*` dan aset pengesahan surat.
- Log akses tidak bisa diubah/dihapus.
- File ≤ 10 MB; PDF/JPG/PNG; rahasia PNG saja. Unggah langsung browser → Storage (signed upload URL).
- Setelah `next build`: `git checkout next-env.d.ts`.
- Commit diakhiri `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Tasks

### Task 1: Migrasi 0011 + domain jenis & masa berlaku
- Create `supabase/migrations/0011_berkas_lembaga.sql` (tabel, fungsi, RLS, trigger, storage policy — spec §2).
- Create `lib/lembaga/berkas.ts`: `JENIS_BERKAS` (kunci, label, ikon-kunci, rahasia), `labelJenis`, `jenisRahasia`, `statusMasaBerlaku(berlakuSampai, hariIni)`, `sisaHari`, `MIME_DIIZINKAN`, `validasiUnggah({ jenis, mime, ukuran })`.
- Tests `tests/lembaga/berkas.test.ts`: status tiap ambang (91/90/31/30/0/-1 hari, null), validasi (PDF ok, 11 MB ditolak, JPG untuk CAP ditolak).

### Task 2: Keamanan tautan
- Create `lib/bagikan/keamanan.ts`: `buatToken()`, `hashToken()`, `buatPin()`, `hashPin()`/`cocokPin()` (scrypt + salt), `tandaiSesi(payload, kunci)`/`bacaSesi(nilai, kunci, sekarang)`, `kunciSesi()` (HMAC turunan service role), `samarkanIp()`, `ringkasPerangkat(ua)`.
- Tests: token 43 karakter base64url & hash stabil; PIN 6 digit; cocokPin benar/salah; sesi dirusak/kedaluwarsa ditolak; IPv4/IPv6/kosong; UA Chrome Android, Safari iPhone, Firefox Windows.

### Task 3: Tanda air & ZIP
- `npm i fflate`. Create `lib/bagikan/tanda-air.ts`: `tandaAirPdf(buf, teks, kode)`, `tandaAirGambar(buf, mime, teks)`, `buatZip(berkas[])`.
- Tests: PDF 2 halaman tetap 2 halaman & bisa dimuat ulang; PNG dimensi tetap & berubah isi; ZIP bisa diurai `unzipSync` dengan nama berkas.

### Task 4: Repo berkas lembaga
- Create `lib/db/berkas-lembaga-repo.ts`: tipe `BerkasLembaga`, `VersiBerkas`, `TautanBagikan`, `LogAkses`; `listBerkas`, `getBerkas`, `buatBerkas`, `tambahVersi`, `ubahDataBerkas`, `hapusBerkas`, `getPengaturanKelola`, `setPengaturanKelola`, `listTautan`, `buatTautan`, `cabutTautan`, `listLog`, `catatAkses` (rpc), `segarkanSuratBelumTerkirim`.
- Tests (klien palsu): versi terbaru dipilih; versi berikutnya = max+1; buat tautan menyimpan hash (bukan token) & relasi berkas; catatAkses memanggil rpc.

### Task 5: API internal Lembaga
- `app/api/lembaga/pengaturan/route.ts` (GET, PUT Superadmin)
- `app/api/lembaga/berkas/route.ts` (GET, POST) · `unggah-url/route.ts` (POST) · `[id]/route.ts` (GET detail + signed URL pratinjau, PATCH, DELETE) · `[id]/versi/route.ts` (POST) · `[id]/unduh/route.ts` (GET → redirect signed URL + log)
- `app/api/lembaga/tautan/route.ts` (GET, POST) · `[id]/route.ts` (DELETE = cabut) · `app/api/lembaga/log/route.ts` (GET)
- Tests: validasi, hak (saklar mati → 403), rahasia tak bisa dibagikan (400), token & PIN hanya di respons buat.

### Task 6: Halaman publik bagikan
- `lib/bagikan/tautan-publik.ts` (kunci admin): `muatTautanPublik(token)` → `{ status: 'tidak-berlaku' } | { status: 'perlu-pin' | 'ok', tautan, berkas[] }`, `catatBuka`, `ambilFileTerbaru`.
- `app/bagikan/[token]/page.tsx` + `components/bagikan/*`; `app/api/bagikan/[token]/pin/route.ts`, `unduh/[berkasId]/route.ts`, `unduh-semua/route.ts`.
- `lib/auth/public-paths.ts` tambah `/bagikan`, `/api/bagikan`.
- Tests: tidak berlaku (4 kasus → satu pesan), PIN salah → 401 + kunci setelah 5, PIN benar → cookie, batas buka, unduh butuh sesi, tanda air diterapkan bila aktif, log dicatat.

### Task 7: UI `/lembaga/berkas`
- `components/lembaga/berkas/HalamanBerkas.tsx` (tab), `KartuBerkas.tsx`, `LembarDetailBerkas.tsx`, `FormUnggahBerkas.tsx`, `FormTautan.tsx`, `DaftarTautan.tsx`, `CatatanAkses.tsx`; `app/(lembaga)/lembaga/berkas/page.tsx`.
- Tests: kartu jenis tetap tampil walau belum diunggah; penanda masa berlaku; tombol kelola hanya bila boleh; 🔒 pada rahasia; hasil tautan menampilkan tautan & PIN.

### Task 8: Saklar Akun, notifikasi, beranda
- `HalamanAkun`: saklar Superadmin. `lib/notifikasi/jenis.ts` + `/api/notifikasi`: `berkas-lembaga`. `/api/lembaga/ringkasan` + `Ringkasan.berkasLembaga`; `daftarPerhatian` memuat berkas; `PerluPerhatian` tanpa "segera hadir".
- Tests: notifikasi disusun; perhatian memuat berkas mendesak dengan tautan `/lembaga/berkas`; saklar hanya untuk Superadmin.

### Task 9: Cap & tanda tangan di surat
- `lib/surat/pengesahan.ts` `ambilAsetPengesahan()`; `SuratAssets.namaPenandatangan`; `SuratTemplate` pakai nama + `objectFit: contain`; `render-png` & `assets.ts` memakai pengesahan; rute aset pratinjau & `GET /api/donatur/surat/pengesahan`; `PratinjauSurat` memuat nama.
- Tests: fallback ke aset bawaan; nama dari berkas TTD; template menampilkan nama.

### Task 10: Verifikasi
- `npx vitest run`, `tsc`, `next build`, cek browser (Superadmin): unggah, buat tautan, buka tautan publik di tab tanpa login, PIN, unduh bertanda air, catatan akses.
