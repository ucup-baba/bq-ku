# Spesifikasi Desain — Ruang Lembaga Tahap B (Berkas Lembaga)

**Tanggal:** 25 September 2026
**Status:** Disetujui (brainstorming selesai; pengguna meminta langsung dikerjakan)
**Melanjutkan:** `docs/superpowers/specs/2026-09-25-ruang-lembaga-tahap-a-design.md`

---

## 1. Latar & Keputusan

Pengurus menyimpan berkas legal yayasan (SK Kemenkumham, akta, NPWP, izin operasional, dll.), memantau masa berlakunya, dan membagikannya dengan aman ke donatur/mitra. Cap & tanda tangan ketua juga disimpan di sini dan dipakai surat terima kasih donatur.

| Topik | Keputusan |
|---|---|
| Pengelola | Superadmin selalu; **Pengurus** boleh unggah/ganti versi/buat & cabut tautan **bila saklar Superadmin menyala**. Hapus hanya Superadmin. |
| Saklar | `pengaturan.pengurus_kelola_berkas` (boolean), diubah Superadmin di halaman Akun; ditegakkan RLS. |
| Jenis berkas | Daftar tetap + "Lainnya" (nama bebas). Data: nomor, tanggal terbit, berlaku sampai (boleh kosong). |
| Cap & tanda tangan | Arsip 🔒 (lihat/unduh hanya Superadmin, **tidak bisa dibagikan**) **dan** dipakai surat donatur; tanda tangan membawa **nama penandatangan**. |
| Pengingat | Bertahap: ≤ 90 hari "segera urus", ≤ 30 hari "mendesak", lewat "kedaluwarsa". Di dalam aplikasi saja. |
| Catatan akses | Dilihat Superadmin & Pengurus; tidak bisa diubah/dihapus siapa pun. |
| Tautan bagikan | Satu tautan = paket beberapa berkas. Masa berlaku wajib (1/7/30 hari) + dicabut manual; tanda air (bawaan nyala); PIN 6 angka (opsional); batas buka (opsional). |
| Pendekatan | Semua lewat server: halaman publik memeriksa token, menempel tanda air saat unduh (pdf-lib / sharp), mencatat akses. ZIP dengan `fflate`. |
| Versi | Setiap penggantian menyimpan versi lama; yang berlaku & dibagikan = versi terbaru. |
| Format | PDF, JPG, PNG ≤ 10 MB; cap & tanda tangan wajib PNG. |

## 2. Data — migrasi `0011_berkas_lembaga.sql`

```
pengaturan(kunci text pk, nilai jsonb not null, "updatedAt" timestamptz, "updatedBy" uuid)
  -- baris awal: ('pengurus_kelola_berkas', 'false')

berkas_lembaga(id text pk, jenis text check (...), "namaLainnya" text, "nomorDokumen" text,
  "tanggalTerbit" date, "berlakuSampai" date, "namaPenandatangan" text,
  "createdAt", "createdBy" uuid, "updatedAt")
  -- jenis ∈ SK_KEMENKUMHAM, AKTA_PENDIRIAN, AKTA_PERUBAHAN, NPWP, IZIN_OPERASIONAL,
  --          AKREDITASI, REKENING_BANK, CAP, TANDA_TANGAN, LAINNYA
  -- unique (jenis) where jenis <> 'LAINNYA'  → satu baris per jenis tetap
  -- check: jenis = 'LAINNYA' ⇔ namaLainnya tidak kosong

berkas_lembaga_versi(id text pk, "berkasId" text fk → berkas_lembaga on delete cascade,
  versi int, "storagePath" text unique, "namaFile" text, mime text, ukuran int,
  "createdAt", "createdBy" uuid)  -- unique (berkasId, versi)

tautan_bagikan(id text pk, "tokenHash" text unique, penerima text, catatan text,
  "kedaluwarsaAt" timestamptz, "dicabutAt" timestamptz, "pinHash" text,
  "pinGagal" int default 0, "pinTerkunciSampai" timestamptz,
  "batasBuka" int, "jumlahBuka" int default 0, "tandaAir" bool default true,
  "createdAt", "createdBy" uuid)

tautan_bagikan_berkas("tautanId" fk cascade, "berkasId" fk cascade, pk(tautanId, berkasId))

log_akses_berkas(id bigserial pk, waktu timestamptz default now(), aksi text check (...),
  "berkasId" text, "versiId" text, "tautanId" text, "userId" uuid, ip text, perangkat text, rincian text)
  -- aksi ∈ LIHAT, UNDUH, UNGGAH, VERSI_BARU, UBAH_DATA, HAPUS, BUAT_TAUTAN, CABUT_TAUTAN,
  --        BUKA_TAUTAN, UNDUH_TAUTAN, PIN_SALAH
```

**Fungsi**
- `boleh_kelola_berkas()` → `has_role('SUPERADMIN') or (has_role('PENGURUS') and pengaturan.pengurus_kelola_berkas = true)`.
- `berkas_rahasia(jenis)` → `jenis in ('CAP','TANDA_TANGAN')`.
- `catat_akses_berkas(aksi, berkasId, versiId, tautanId, rincian)` security definer — mengisi `userId = auth.uid()`; satu-satunya jalan insert dari klien ber-login.

**RLS**

| Objek | select | insert | update | delete |
|---|---|---|---|---|
| `pengaturan` | Superadmin, Pengurus | — | Superadmin | — |
| `berkas_lembaga` | Superadmin, Pengurus | `boleh_kelola_berkas()`; jenis rahasia hanya Superadmin | idem | Superadmin |
| `berkas_lembaga_versi` | Superadmin; Pengurus bila berkas bukan rahasia | idem insert berkas | — | Superadmin |
| `tautan_bagikan` | Superadmin, Pengurus | `boleh_kelola_berkas()` | `boleh_kelola_berkas()` (cabut) | — |
| `tautan_bagikan_berkas` | Superadmin, Pengurus | `boleh_kelola_berkas()` | — | — |
| `log_akses_berkas` | Superadmin, Pengurus | lewat `catat_akses_berkas()` saja | ❌ | ❌ |
| storage `berkas/lembaga/**` | seperti `berkas_lembaga_versi` (cocokkan `storagePath`) | `boleh_kelola_berkas()`; rahasia hanya Superadmin (path `lembaga/rahasia/…`) | — | Superadmin |

**Trigger**
- Tolak insert `tautan_bagikan_berkas` untuk berkas rahasia.
- Tolak UPDATE/DELETE pada `log_akses_berkas` (juga untuk service role).
- `berkas_lembaga.updatedAt` diperbarui otomatis.

Jalur **kunci admin** (server saja): halaman & API `/bagikan/*`, dan pembacaan cap/tanda tangan untuk render surat.

## 3. Unggah

1. Browser meminta `POST /api/lembaga/berkas/unggah-url` `{ berkasId?, jenis, namaFile, mime, ukuran }` → server memeriksa hak (RLS via klien pengguna), jenis, mime (PDF/JPG/PNG; rahasia PNG saja), ukuran ≤ 10 MB, lalu mengembalikan `path` (`lembaga/<id>/<uuid>.<ext>` atau `lembaga/rahasia/<id>/<uuid>.png`) dan signed upload token.
2. Browser mengunggah langsung ke Supabase Storage (menghindari batas body 4,5 MB Vercel).
3. `POST /api/lembaga/berkas` (baru) atau `POST /api/lembaga/berkas/[id]/versi` (ganti versi) dengan metadata + `path`; server memverifikasi objek ada di path yang diterbitkan, menulis baris, mencatat akses.
4. Ganti versi CAP/TANDA_TANGAN → `storagePath = null` untuk surat **belum terkirim** agar PNG dirender ulang.

## 4. Halaman `/lembaga/berkas`

Tab: **Berkas · Tautan bagikan · Catatan akses**. Tombol **Bagikan** & **Unggah** di kepala halaman hanya untuk yang boleh mengelola.

- **Berkas:** kartu untuk setiap jenis tetap (termasuk "Belum diunggah" + Unggah), lalu "Lainnya". Kartu: ikon, nama jenis, nomor, versi, penanda masa berlaku (Berlaku / Tanpa batas / Segera urus / Mendesak / Kedaluwarsa), 🔒 untuk rahasia. Ketuk → lembar detail: pratinjau (signed URL 5 menit, dicatat LIHAT), data, riwayat versi (unduh versi lama), aksi Unduh / Ganti versi / Ubah data / Hapus (Superadmin).
- **Form unggah/versi:** jenis, nama (Lainnya), nomor, tanggal terbit, berlaku sampai + "Berlaku selamanya", nama penandatangan (tanda tangan), file. Pratinjau PNG di atas latar putih untuk cap/tanda tangan.
- **Tautan bagikan:** daftar (penerima, jumlah berkas, status Aktif/Kedaluwarsa/Dicabut, "dibuka X dari Y", kedaluwarsa) + Cabut. Buat tautan: centang berkas (tanpa rahasia), penerima (wajib), masa berlaku 1/7/30 hari, tanda air (nyala), PIN (opsional; 6 angka acak dibuat server), batas buka (opsional). Hasil: tautan & PIN tampil **sekali**, tombol salin, "Kirim lewat WhatsApp" (tanpa PIN) + pengingat kirim PIN terpisah.
- **Catatan akses:** linimasa terbaru di atas, saring per berkas/tautan, "Muat lebih banyak" (50 per halaman).
- **Akun Superadmin:** saklar "Pengurus boleh mengelola berkas lembaga".
- **Beranda Lembaga:** "Perlu perhatian" berisi berkas segera urus/mendesak/kedaluwarsa (menggantikan "segera hadir").
- **Notifikasi Akun:** `berkas-lembaga` — "N berkas lembaga perlu diperpanjang" untuk pengguna ber-ruang Lembaga.

## 5. Halaman publik `/bagikan/[token]`

- Token 32 byte acak (base64url); DB menyimpan `sha256(token)`. Path publik (`PUBLIC_PATHS`), `noindex`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`.
- Tidak berlaku (tak ada / kedaluwarsa / dicabut / batas habis) → satu pesan umum "Tautan ini sudah tidak berlaku. Silakan hubungi pengirimnya."
- PIN: `POST /api/bagikan/[token]/pin`; salah 5× → kunci 15 menit; setiap salah dicatat `PIN_SALAH`. Benar → cookie sesi httpOnly, `SameSite=Lax`, path `/`, nama `bq_bagikan_<tautanId>`, isi ditandatangani HMAC (kunci diturunkan dari `SUPABASE_SERVICE_ROLE_KEY`), berlaku 1 jam dan tidak melewati `kedaluwarsaAt`.
- Hitungan buka: membuka halaman tanpa sesi valid = satu buka (menaikkan `jumlahBuka` secara atomik dengan syarat batas) lalu memasang cookie sesi; muat ulang dalam masa sesi tidak dihitung. Unduhan dalam sesi tetap diizinkan meski batas baru tercapai.
- Isi: logo BQ, "Panti Asuhan Baitul Qowwam membagikan berkas untuk **{penerima}**", berlaku sampai, daftar berkas (jenis, nomor, ukuran) dengan **Buka** & **Unduh**, **Unduh semua (ZIP)**, catatan kaki tanda air.
- Unduh: `GET /api/bagikan/[token]/unduh/[berkasId]?tampil=1` & `/unduh-semua`. Periksa token + status + cookie sesi → ambil versi terbaru (kunci admin) → tanda air bila aktif → kirim `no-store` → catat `UNDUH_TAUTAN` (berkas, versi, IP sebagian, perangkat).
- Tanda air: PDF (pdf-lib) — teks diagonal transparan "Untuk: {penerima} · {tanggal}" tiap halaman + baris kecil kode tautan; gambar (sharp) — teks miring berulang memenuhi gambar. File asli tidak diubah.
- IP disamarkan (`182.1.xx.xx`; IPv6 empat grup pertama), perangkat diringkas ("Chrome · Android").

## 6. Cap & tanda tangan di surat

- `ambilAsetPengesahan()` (server, kunci admin, cache 5 menit per instans): versi terbaru CAP & TANDA_TANGAN → PNG data URI (tanda tangan dipangkas pinggiran transparannya dengan `sharp.trim()`), plus `namaPenandatangan`. Bila tidak ada → aset `assets/surat` + "Aris Eko Purwanto, S.T".
- `SuratAssets` bertambah `namaPenandatangan`; `SuratTemplate` memakainya dan menampilkan cap/tanda tangan dengan `objectFit: 'contain'`.
- Pratinjau di browser: rute aset `/api/donatur/surat/aset/[nama]` menyajikan cap/tanda tangan terbaru untuk `stempel.webp` & `ttd-rotasi.png` (cache 5 menit); `GET /api/donatur/surat/pengesahan` mengembalikan `namaPenandatangan`.
- Surat terkirim tidak berubah (PNG tersimpan); surat belum terkirim dirender ulang saat versi cap/tanda tangan berganti.

## 7. Pengingat masa berlaku

`statusMasaBerlaku(berlakuSampai, hariIni)` → `tanpa-batas | berlaku | segera (≤ 90 hari) | mendesak (≤ 30 hari) | kedaluwarsa`. Dipakai kartu berkas, "Perlu perhatian" beranda (via `/api/lembaga/ringkasan` → `berkasLembaga: { segera, mendesak, kedaluwarsa, daftar }`), dan notifikasi.

## 8. Penanganan galat

- Unggah gagal di tengah → baris tidak ditulis; objek yatim di storage dibiarkan (dicatat di log server).
- Tanda air gagal (PDF rusak/terenkripsi) → unduhan ditolak dengan pesan "Berkas tidak dapat disiapkan", bukan mengirim tanpa tanda air.
- Saklar dimatikan saat Pengurus membuka form → server/RLS menolak, UI menampilkan "Pengelolaan berkas sedang dinonaktifkan Superadmin".

## 9. Pengujian

- Unit: `statusMasaBerlaku`, token (buat/hash), PIN (buat/verifikasi), cookie sesi (tanda tangan/verifikasi/kedaluwarsa), IP & perangkat, tanda air PDF (halaman bertambah teks, PDF tetap valid) & gambar (dimensi tetap), ZIP (isi bisa dibuka), validasi unggah (mime/ukuran/rahasia).
- API (mock): unggah-url, buat berkas/versi, tautan (buat/cabut), bagikan (tidak berlaku, PIN salah/kunci, batas buka, unduh + log), pengaturan saklar, notifikasi.
- Komponen: halaman berkas (kartu jenis tetap, status masa berlaku, tombol hanya untuk pengelola, 🔒 rahasia), buat tautan (hasil sekali tampil), halaman publik (pesan tidak berlaku umum, form PIN), Akun (saklar hanya Superadmin), beranda (berkas mendesak di Perlu perhatian).
- Surat: `SuratTemplate` memakai `namaPenandatangan`; `ambilAsetPengesahan` jatuh ke aset bawaan.
- Manual setelah migrasi: Pengurus tanpa saklar tidak bisa unggah; Pengurus tidak bisa membuka cap/tanda tangan; tautan dengan cap/tanda tangan ditolak DB.
