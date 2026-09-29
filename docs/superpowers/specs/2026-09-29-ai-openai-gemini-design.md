# Spesifikasi Desain — AI & OCR: OpenAI + Gemini, Pemakaian & Batas

**Tanggal:** 29 September 2026
**Status:** Disetujui per bagian (brainstorming selesai)

---

## 1. Latar & Keputusan

OCR berkas santri kini hanya memakai Gemini (urutan model tertulis di kode). Pengguna ingin memasang OpenAI, memilih penyedia & model sendiri, serta melihat pemakaian dan membatasinya agar biaya tidak melonjak.

Uji banding 29-09-2026 (KK buram Chotidjah): Gemini Flash-Lite paling akurat; model OpenAI sering mengarang nama di tabel KK buram, kecuali `gpt-5.4-mini` yang menulis "?" bila tak terbaca. Pengguna tetap memilih OpenAI sebagai utama.

| Topik | Keputusan |
|---|---|
| Kunci API | Environment variable (`OPENAI_API_KEY`, `GEMINI_API_KEY`) seperti sekarang. Aplikasi hanya menampilkan status terpasang/belum. |
| Pola penyedia | **Utama + cadangan otomatis.** Bawaan: utama OpenAI `gpt-5.4-mini`, cadangan Gemini `gemini-flash-lite-latest`. Cadangan boleh "tanpa cadangan". |
| Tempat mengatur | Baris "AI & OCR" di halaman Akun (hanya SUPERADMIN) → halaman `/ai`. |
| Batas | **Dua-duanya:** jumlah pindai per hari + plafon perkiraan Rp per bulan. |
| Harga | Diisi SUPERADMIN per model (Rp per 1 juta token masuk/keluar). Belum diisi → biaya "–", plafon Rp tidak aktif. |
| Pendekatan | Modul `lib/ai/` sendiri dengan `fetch` (tanpa library baru); dua titik panggil OCR diarahkan ke fungsi pusat. |

Di luar cakupan: model per jenis berkas, kunci API lewat aplikasi, penyedia ketiga, notifikasi email saat batas.

## 2. Data — migrasi `0012_pemakaian_ai.sql`

Dijalankan manual di SQL Editor Supabase.

**Setelan** — baris baru di `pengaturan` (tabel & RLS sudah ada; ubah hanya SUPERADMIN):

```
kunci = 'ai'
nilai = {
  "utama":    { "penyedia": "openai", "model": "gpt-5.4-mini" },
  "cadangan": { "penyedia": "gemini", "model": "gemini-flash-lite-latest" },   -- atau null
  "batasHarian": 200,
  "plafonBulananRp": 50000,
  "harga": { "<model>": { "masukPerJuta": 0, "keluarPerJuta": 0 } }
}
```

Kebijakan baca `pengaturan` sekarang SUPERADMIN & PENGURUS; server membaca setelan `ai` dengan kunci admin (ADMIN_SANTRI yang memindai tidak perlu hak baca).

**Catatan pemakaian** — tabel baru:

```
pemakaian_ai(
  id uuid pk default gen_random_uuid(),
  "idPermintaan" uuid not null,          -- satu pindai; percobaan utama & cadangan berbagi id
  waktu timestamptz not null default now(),
  "penggunaId" uuid references profiles(id),
  fitur text not null,                   -- 'ocr_tunggal' | 'ocr_massal' | 'ocr_mandiri' (unggah mandiri wali)
  peran text not null,                   -- 'utama' | 'cadangan'
  penyedia text not null,                -- 'openai' | 'gemini'
  model text not null,
  "tokenMasuk" int not null default 0,
  "tokenKeluar" int not null default 0,
  "biayaRp" numeric(12,2),               -- null bila harga model belum diisi
  berhasil boolean not null,
  galat text
)
index (waktu desc)
RLS: select hanya SUPERADMIN; tanpa kebijakan insert/update/delete (ditulis server dengan kunci admin).
```

**Daftar model** tetap di kode (`lib/ai/model.ts`), dipilih lewat dropdown:
- OpenAI: `gpt-5.4-mini`, `gpt-4.1-mini`, `gpt-5.4`, `gpt-4.1`
- Gemini: `gemini-flash-lite-latest`, `gemini-3.1-flash-lite`, `gemini-flash-latest`

## 3. Modul `lib/ai/`

```
lib/ai/
  model.ts        daftar penyedia & model, tipe Setelan, setelan bawaan, validasi (zod)
  setelan.ts      baca/simpan setelan 'ai' (server, kunci admin), gabung dengan bawaan
  biaya.ts        hitungBiaya(token, harga) → Rp | null
  batas.ts        cekBatas(pemakaianHariIni, biayaBulanIni, setelan) → { boleh, alasan }
  pemakaian.ts    catat(baris), ringkasan(sekarang) → hari ini / bulan ini / per model / 20 terakhir
  penyedia/
    gemini.ts     panggil(model, prompt, berkas{base64, mime}, batasMs) → { teks, tokenMasuk, tokenKeluar }
    openai.ts     sama; Responses API: input_image (gambar) / input_file (PDF), format json_object
  baca.ts         bacaDokumenAi({ prompt, berkas, fitur, penggunaId, batasTotalMs }) → { teks, penyedia, model } | galat
```

`bacaDokumenAi` hanya mengganti "siapa yang membaca": prompt, parser JSON, pemetaan hasil, dan pencocokan anggota KK tetap. `lib/ocr/gemini.ts` & `lib/ocr/gemini-batch.ts` memanggilnya menggantikan loop `candidateModels` + `fetch` Gemini langsung. Parameter `temperature: 0` dipakai kedua penyedia (bila model mendukung).

## 4. Alur satu pindai

1. **Cek batas** (hari = WIB, bulan = sejak tanggal 1 WIB). Pindai hari ini = jumlah `idPermintaan` berbeda hari ini. Bila ≥ `batasHarian`, atau harga terisi dan biaya bulan ini ≥ `plafonBulananRp` → tidak memanggil AI; galat bertipe `BATAS_AI` → formulir menampilkan "Batas pemakaian AI tercapai — isi data secara manual". Unggah berkas tetap tersimpan.
2. **Utama.** Gagal bila: kunci tak terpasang, timeout, HTTP 429/5xx/4xx, jaringan, jawaban kosong/bukan JSON valid. Batas waktu per panggilan 60 dtk, dan tidak melebihi sisa `batasTotalMs` (anggaran waktu pindai massal yang sudah ada).
3. **Cadangan** (bila ada dan sisa waktu ≥ 5 dtk) dengan prompt & berkas sama.
4. Keduanya gagal / tanpa cadangan → jalur OCR lokal yang sudah ada (pdftotext/Tesseract di `lib/ocr/engine.ts`), tanpa biaya. Itu pun gagal → "Berkas tersimpan, silakan isi manual."
5. **Catat** setiap percobaan (utama & cadangan) ke `pemakaian_ai`. Gagal mencatat tidak menggagalkan pindai (hanya `console.error`).

Batas bersifat lunak: pindai serentak dapat melewati batas beberapa kali; diterima demi kesederhanaan (tanpa penguncian).

## 5. Tampilan

**Halaman Akun** (semua ruang, hanya SUPERADMIN), di dekat "Kelola pengguna":
`AI & OCR — OpenAI gpt-5.4-mini · 23/200 pindai hari ini ›` → `/ai`.

**Halaman `/ai`** (ruang santri, hanya SUPERADMIN; lainnya dialihkan ke `/`), tombol kembali ke Akun:
1. **Pemakaian** — kartu *Hari ini* (`23 / 200 pindai`, bar, jumlah gagal) & *Bulan ini* (`± Rp12.400 / Rp50.000`, bar, total token, "cadangan dipakai 3×"). Bar jingga ≥ 80%, merah saat penuh + "AI berhenti — isi manual".
2. **Penyedia** — Utama & Cadangan: dropdown penyedia + model, status kunci ("Kunci terpasang ✓" / "Kunci belum dipasang di Vercel ✗"); cadangan punya opsi "Tanpa cadangan".
3. **Batas** — pindai per hari; plafon Rp per bulan.
4. **Harga model** — Rp per 1 juta token masuk/keluar untuk model yang dipilih + catatan "cek harga resmi".
5. **Riwayat** — 20 panggilan terakhir: waktu, admin, model, token, Rp, status (✓ / ✗ / cadangan).

Satu tombol **Simpan** untuk bagian 2–4. HP satu kolom; desktop kartu pemakaian berdampingan.

**API:** `GET /api/ai` (setelan + status kunci + ringkasan) dan `PUT /api/ai` (simpan setelan, validasi zod), keduanya hanya SUPERADMIN.

**Formulir santri:** galat `BATAS_AI` ditampilkan di kotak unggah; alur lain tidak berubah.

## 6. Pengujian

- Unit (fetch tiruan, tanpa API asli): `cekBatas` (harian, plafon, harga kosong, pergantian hari WIB), urutan utama → cadangan → gagal, anggaran waktu, `hitungBiaya`, validasi setelan, adaptor OpenAI & Gemini membaca token dari respons.
- API: `PUT /api/ai` menolak selain SUPERADMIN; menolak model di luar daftar & angka negatif.
- Komponen: halaman `/ai` dengan data contoh (bar 80%/penuh, kunci belum terpasang, tanpa cadangan).
- Setelah deploy (manual): satu pindai asli tercatat via OpenAI; dengan `OPENAI_API_KEY` dikosongkan, pindai berikutnya jatuh ke Gemini dan tercatat sebagai cadangan.

## 7. Catatan operasional

- Pasang `OPENAI_API_KEY` di Vercel dengan **kunci baru** (kunci yang pernah ditempel di chat harus dicabut).
- Jika kunci OpenAI memakai kuota gratis harian berbagi data, prompt & berkas santri ikut terkirim untuk pelatihan model — cek *Settings → Data controls*.
- Isi harga per model setelah deploy agar perkiraan biaya & plafon Rp aktif.
