-- ==========================================================
-- SCRIPT SETUP SUPABASE POSTGRESQL & STORAGE BUCKET
-- Aplikasi: BQ-Ku (Administrasi Berkas & Digital CV Santri)
-- ==========================================================

-- 1. TABEL SANTRI
CREATE TABLE IF NOT EXISTS public.santri (
  id TEXT PRIMARY KEY,
  "namaLengkap" TEXT NOT NULL,
  "namaPanggilan" TEXT,
  nik TEXT NOT NULL,
  "noKk" TEXT,
  nisn TEXT,
  "tempatLahir" TEXT NOT NULL,
  "tanggalLahir" TEXT NOT NULL,
  "jenisKelamin" TEXT NOT NULL CHECK ("jenisKelamin" IN ('IKHWAN', 'AKHWAT')),
  "tahunMasuk" INTEGER DEFAULT 2026,
  jenjang TEXT NOT NULL CHECK (jenjang IN ('SMP', 'SMA', 'SMK', 'ALUMNI')),
  kelas TEXT NOT NULL,
  "sekolahSekarang" TEXT NOT NULL,
  "asalSekolahSebelumnya" TEXT,
  "namaAyah" TEXT,
  "namaIbu" TEXT,
  "statusSosial" TEXT DEFAULT 'REGULER',
  "kontakWali" TEXT,
  "pekerjaanOrtu" TEXT,
  alamat TEXT,
  "ringkasanTentang" TEXT,
  "riwayatTahfidz" TEXT,
  keahlian TEXT,
  "fotoFormalUrl" TEXT,
  "fotoProfilUrl" TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

-- 2. TABEL DOKUMEN BERKAS
CREATE TABLE IF NOT EXISTS public.documents (
  id TEXT PRIMARY KEY,
  "santriId" TEXT NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
  kategori TEXT NOT NULL CHECK (kategori IN ('KARTU_KELUARGA', 'AKTA_KELAHIRAN', 'KTP_ORTU', 'SKL_IJAZAH', 'KIP_PIP', 'KRM_PKH_KKS', 'SKTM', 'SERTIFIKAT_PRESTASI', 'LAINNYA')),
  "nomorDokumen" TEXT,
  "fileUrl" TEXT NOT NULL,
  "rawOcrText" TEXT,
  "extractedFields" TEXT,
  "statusVerifikasi" TEXT DEFAULT 'PENDING' CHECK ("statusVerifikasi" IN ('PENDING', 'VERIFIED', 'REJECTED', 'NEED_FIX')),
  "catatanVerifikasi" TEXT,
  "createdAt" TEXT
);

-- 3. TABEL USERS / PANITIA
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  nama TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('SUPERADMIN', 'PANITIA', 'VIEWER')),
  "createdAt" TEXT
);

-- 4. TABEL TOKEN UPLOAD MANDIRI WALI
CREATE TABLE IF NOT EXISTS public.upload_tokens (
  id TEXT PRIMARY KEY,
  "santriId" TEXT NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  "expiresAt" TEXT NOT NULL,
  "usedCount" INTEGER DEFAULT 0,
  "createdAt" TEXT
);

-- 5. KEAMANAN DATA (Row Level Security)
ALTER TABLE public.santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_tokens ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses (Memungkinkan aplikasi membaca & menyimpan data)
CREATE POLICY "Public Read Write on santri" ON public.santri FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Write on documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Write on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Write on upload_tokens" ON public.upload_tokens FOR ALL USING (true) WITH CHECK (true);

-- 5. STORAGE BUCKET 'berkas' UNTUK DOKUMEN & FOTO
INSERT INTO storage.buckets (id, name, public)
VALUES ('berkas', 'berkas', true)
ON CONFLICT (id) DO NOTHING;

-- Kebijakan Akses Storage Publik (agar foto & dokumen bisa diakses/diunduh)
CREATE POLICY "Public Read on berkas bucket" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'berkas');

CREATE POLICY "Public Upload on berkas bucket" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'berkas');

CREATE POLICY "Public Update on berkas bucket" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'berkas');

CREATE POLICY "Public Delete on berkas bucket" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'berkas');
