# Spesifikasi Desain: Sistem Administrasi Berkas Santri & Digital CV Profiler

**Tanggal:** 19 September 2026  
**Status:** Disetujui (Tahap Perancangan Selesai)  
**Tujuan:** Aplikasi web komprehensif untuk pengumpulan, ekstraksi cerdas (OCR), dan arsip berkas santri, serta visualisasi data santri dalam format Kartu Profil/CV interaktif.

---

## 1. Ringkasan Eksekutif & Sasaran

Aplikasi ini menyederhanakan proses penerimaan dan administrasi data santri pada lingkungan pesantren/yayasan (seperti Baitul Qowwam). Melalui fitur Smart OCR, panitia atau santri tidak perlu mengetik ulang seluruh data identitas dari dokumen fisik. Sistem juga mengubah data administratif menjadi profil visual santri bergaya CV poster kreatif (Claymorphism & Block-based), dengan pembedaan tema visual untuk Ikhwan dan Akhwat serta segmentasi jenjang (SMP, SMA/SMK, dan Alumni).

---

## 2. Arsitektur Teknis

* **Framework:** Next.js (App Router, React 19 / 18, TypeScript).
* **Styling & Desain:** Tailwind CSS v3/v4 dengan dukungan penuh Dark/Light Mode.
* **Database & ORM:** SQLite (via Prisma atau `better-sqlite3` / Drizzle) untuk persistensi lokal cepat dan zero-config maintenance.
* **Storage Berkas:** Local upload storage dengan API serving statis yang aman (`/api/uploads` / `public/uploads`).
* **Mesin OCR:** 
  - Engine Client/Server: Tesseract.js (didukung regex parser Bahasa Indonesia untuk dokumen Dukcapil & Ijazah Kemdikbud/Kemenag) dan opsional fallback Gemini Flash API untuk akurasi tinggi saat scan buram.
* **Tipografi:** 
  - Font Utama: *Plus Jakarta Sans* (Elegan, modern, keterbacaan tinggi).
  - Font Aksen Handwriting: *Caveat* / *Architects Daughter* (untuk stiker, status, dan kutipan santri).

---

## 3. Spesifikasi Model Data

### 3.1 Santri
* `id` (String, UUID/CUID)
* `namaLengkap` (String)
* `namaPanggilan` (String, opsional)
* `nik` (String, 16 digit)
* `noKk` (String, 16 digit, opsional)
* `nisn` (String, 10 digit, opsional)
* `tempatLahir` (String)
* `tanggalLahir` (Date / ISO String)
* `jenisKelamin` (Enum: `IKHWAN`, `AKHWAT`)
* `jenjang` (Enum: `SMP`, `SMA`, `SMK`, `ALUMNI`)
* `kelas` (String, misal: "7A", "10 IPA", "Lulus 2025")
* `sekolahSekarang` (String, misal: "SMP IT Baitul Qowwam")
* `asalSekkolahSebelumnya` (String, opsional)
* `namaAyah` (String, opsional)
* `namaIbu` (String, opsional)
* `kontakWali` (String, WhatsApp)
* `pekerjaanOrtu` (String, opsional)
* `alamat` (Text)
* `ringkasanTentang` (Text, ringkasan profil untuk CV)
* `riwayatTahfidz` (String, misal: "5 Juz Mutqin")
* `keahlian` (JSON Array: `["Desain Grafis", "Pidato Bahasa Arab", "Robotik"]`)
* `fotoFormalUrl` (String, pas foto resmi background polos)
* `fotoProfilUrl` (String, foto pose santai / kreatif)
* `createdAt`, `updatedAt`

### 3.2 Berkas Santri (`Document`)
* `id` (String, UUID)
* `santriId` (Foreign Key -> `Santri.id`)
* `kategori` (Enum):
  - **Wajib:** `KARTU_KELUARGA`, `AKTA_KELAHIRAN`, `KTP_ORTU`, `SKL_IJAZAH`
  - **Pendukung:** `KIP_PIP`, `KRM_PKH_KKS`, `SKTM`, `SERTIFIKAT_PRESTASI`, `LAINNYA`
* `nomorDokumen` (String, misal no KIP atau no SKL)
* `fileUrl` (String, path berkas PDF/PNG/JPG)
* `rawOcrText` (Text, hasil mentah pembacaan OCR)
* `extractedFields` (JSON, data terstruktur hasil parser)
* `statusVerifikasi` (Enum: `PENDING`, `VERIFIED`, `REJECTED`, `NEED_FIX`)
* `catatanVerifikasi` (String, catatan panitia jika berkas buram/salah)

### 3.3 Akun Pengguna & Hak Akses (Skema Siap Tahap 2)
* `id`, `username`, `passwordHash`, `nama`
* `role` (Enum):
  - `SUPERADMIN`: Kelola semua data, manajemen akun panitia, export data.
  - `PANITIA`: Input santri, upload berkas, validasi OCR, edit data.
  - `VIEWER`: Akses baca profil dan status kelengkapan berkas.

---

## 4. Alur Kerja OCR & Ekstraksi Data

1. **Upload Dokumen:** Pengguna memilih tipe berkas (misal: "KTP Orang Tua" atau "Kartu Keluarga").
2. **Preprocessing:** Koreksi orientasi gambar dan peningkatan kontras secara otomatis.
3. **Ekstraksi Teks:** OCR memproses gambar dan menghasilkan teks mentah.
4. **Pattern Parser (Regex Heuristics):**
   - Pola NIK: `/\b[1-9]\d{15}\b/`
   - Pola Nama: pencarian baris setelah kata kunci `"Nama"`, `"Nama Lengkap"`
   - Pola Tempat/Tanggal Lahir: ekstraksi kota dan format tanggal `DD-MM-YYYY`
   - Pola Nama Orang Tua: pencarian baris `"Ayah"`, `"Ibu"`, atau `"Kepala Keluarga"`
5. **Auto-Fill & Verifikasi Human-in-the-loop:**
   - Field form otomatis terisi nilai yang berhasil diekstrak.
   - Kolom yang diisi OCR diberi penanda warna/indikator khusus agar pengguna tahu data tersebut hasil deteksi AI.
   - Pengguna memiliki kontrol penuh untuk mengedit, menambah, atau menghapus data sebelum menyimpan.

---

## 5. Standar UI/UX & Tema Visual

### 5.1 Desain Anti-Slop & Identitas Organik Islami
* **Filosofi:** Menggabungkan kesopanan nilai pesantren dengan modernitas layout ala Claymorphism + Block-based UI yang segar (sesuai referensi media 1 & 2).
* **Mode Tampilan:**
  - **Light Mode:** Dominasi Warm Cream (`#F8FAF6`), surface putih murni (`#FFFFFF`), border sage lembut (`#E4EBE0`), teks Forest Charcoal (`#152A26`).
  - **Dark Mode:** Deep Pine Night (`#0C1917`), surface Slate Green (`#142522`), border halus (`#1F3A35`), teks Warm Ivory (`#EFF5F1`).
* **Varian Tema Berdasarkan Gender Santri:**
  - **Ikhwan (Laki-laki):**
    - Aksen: Emerald Teal (`#0D9488`), Vibrant Citron/Lime (`#84CC16`), Deep Forest Navy.
    - Karakter visual: Border tegas dengan lengkungan terukur (`rounded-2xl`), badge geometris.
  - **Akhwat (Perempuan):**
    - Aksen: Soft Mint Teal (`#14B8A6`), Dusty Rose/Coral Clay (`#FB7185`), Warm Sage.
    - Karakter visual: Lengkungan lebih organik (`rounded-3xl`), border halus bernuansa hangat dan santun.

### 5.2 Tipografi & Handwriting Accents
* Header, body, dan form input menggunakan **Plus Jakarta Sans**.
* Elemen stiker, catatan verifikasi, speech bubble ("*Assalamu'alaikum!*", "*Santri Berprestasi*", "*Tahfidz 10 Juz*") menggunakan font **Caveat** dengan kemiringan tipis (*rotate-1*) untuk menghadirkan kesan hangat dan personal ala portofolio kreatif.

### 5.3 Kartu Profil / CV Digital Santri (Inspirasi Gambar 2)
* **Header Kartu:** Nama santri berukuran besar, jenjang & sekolah saat ini, foto profil pose kreatif, dan badge status kelengkapan berkas.
* **Blok Informasi Terstruktur:**
  - *Tentang Santri:* Deskripsi singkat kepribadian dan cita-cita.
  - *Pendidikan & Sekolah Saat Ini:* Menampilkan kelas dan jenjang aktif.
  - *Tahfidz & Prestasi:* Capaian hafalan dan keahlian santri.
  - *Status Berkas:* Indikator checklist berkas wajib (KK, Akta, KTP, SKL) & berkas pendukung (KIP/KRM).
* **Fitur Cetak / Ekspor:** Opsi unduh kartu profil santri dalam format PDF atau gambar siap cetak.

### 5.4 Navigasi Multi-Device
* **Desktop:** Sidebar kiri yang dapat diciutkan (*collapsible*), area kerja form & preview split-screen.
* **Mobile:** Floating Bottom Navigation Bar (Home, Input/OCR, Direktori, Profil CV, Pengaturan Tema).

---

## 6. Rencana Verifikasi & Uji Kualitas

* **Unit & Parser Test:** Validasi regex parser untuk mendeteksi NIK, no KK, dan tanggal lahir dari berbagai sampel format teks OCR.
* **UI Responsiveness:** Uji tata letak pada viewport mobile (375px), tablet (768px), dan desktop (1440px).
* **Theme Switching:** Memastikan kontras warna teks dan elemen tetap terbaca pada Light & Dark mode sesuai standar WCAG AA.
* **State Management:** Memastikan data yang diunggah dan diedit tersimpan dengan akurat di SQLite tanpa kehilangan data saat berganti tab.
