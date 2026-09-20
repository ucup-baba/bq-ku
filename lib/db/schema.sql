CREATE TABLE IF NOT EXISTS santri (
  id TEXT PRIMARY KEY,
  namaLengkap TEXT NOT NULL,
  namaPanggilan TEXT,
  nik TEXT NOT NULL,
  noKk TEXT,
  nisn TEXT,
  tempatLahir TEXT NOT NULL,
  tanggalLahir TEXT NOT NULL,
  jenisKelamin TEXT NOT NULL CHECK(jenisKelamin IN ('IKHWAN', 'AKHWAT')),
  tahunMasuk INTEGER DEFAULT 2026,
  jenjang TEXT NOT NULL CHECK(jenjang IN ('SMP', 'SMA', 'SMK', 'ALUMNI')),
  kelas TEXT NOT NULL,
  sekolahSekarang TEXT NOT NULL,
  asalSekolahSebelumnya TEXT,
  namaAyah TEXT,
  namaIbu TEXT,
  statusSosial TEXT DEFAULT 'REGULER',
  kontakWali TEXT,
  pekerjaanOrtu TEXT,
  alamat TEXT,
  ringkasanTentang TEXT,
  riwayatTahfidz TEXT,
  keahlian TEXT,
  fotoFormalUrl TEXT,
  fotoProfilUrl TEXT,
  createdAt TEXT,
  updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  santriId TEXT NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  kategori TEXT NOT NULL CHECK(kategori IN ('KARTU_KELUARGA', 'AKTA_KELAHIRAN', 'KTP_ORTU', 'SKL_IJAZAH', 'KIP_PIP', 'KRM_PKH_KKS', 'SKTM', 'SERTIFIKAT_PRESTASI', 'LAINNYA')),
  nomorDokumen TEXT,
  fileUrl TEXT NOT NULL,
  rawOcrText TEXT,
  extractedFields TEXT,
  statusVerifikasi TEXT DEFAULT 'PENDING' CHECK(statusVerifikasi IN ('PENDING', 'VERIFIED', 'REJECTED', 'NEED_FIX')),
  catatanVerifikasi TEXT,
  createdAt TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  nama TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('SUPERADMIN', 'PANITIA', 'VIEWER')),
  createdAt TEXT
);
