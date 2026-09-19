# Task 2 Brief: Database Schema & Santri Repository (SQLite)

## Files
- Create: `lib/db/schema.sql`
- Create: `lib/db/index.ts`
- Create: `lib/db/santri-repo.ts`
- Test: `tests/db/santri-repo.test.ts`

## Requirements
1. **Schema (`lib/db/schema.sql`)**:
   - Table `santri`:
     - `id` (TEXT PRIMARY KEY)
     - `namaLengkap` (TEXT NOT NULL)
     - `namaPanggilan` (TEXT)
     - `nik` (TEXT NOT NULL)
     - `noKk` (TEXT)
     - `nisn` (TEXT)
     - `tempatLahir` (TEXT NOT NULL)
     - `tanggalLahir` (TEXT NOT NULL)
     - `jenisKelamin` (TEXT NOT NULL CHECK(jenisKelamin IN ('IKHWAN', 'AKHWAT')))
     - `jenjang` (TEXT NOT NULL CHECK(jenjang IN ('SMP', 'SMA', 'SMK', 'ALUMNI')))
     - `kelas` (TEXT NOT NULL)
     - `sekolahSekarang` (TEXT NOT NULL)
     - `asalSekolahSebelumnya` (TEXT)
     - `namaAyah` (TEXT)
     - `namaIbu` (TEXT)
     - `kontakWali` (TEXT)
     - `pekerjaanOrtu` (TEXT)
     - `alamat` (TEXT)
     - `ringkasanTentang` (TEXT)
     - `riwayatTahfidz` (TEXT)
     - `keahlian` (TEXT) -- JSON array string
     - `fotoFormalUrl` (TEXT)
     - `fotoProfilUrl` (TEXT)
     - `createdAt` (TEXT)
     - `updatedAt` (TEXT)
   - Table `documents`:
     - `id` (TEXT PRIMARY KEY)
     - `santriId` (TEXT NOT NULL REFERENCES santri(id) ON DELETE CASCADE)
     - `kategori` (TEXT NOT NULL CHECK(kategori IN ('KARTU_KELUARGA', 'AKTA_KELAHIRAN', 'KTP_ORTU', 'SKL_IJAZAH', 'KIP_PIP', 'KRM_PKH_KKS', 'SKTM', 'SERTIFIKAT_PRESTASI', 'LAINNYA')))
     - `nomorDokumen` (TEXT)
     - `fileUrl` (TEXT NOT NULL)
     - `rawOcrText` (TEXT)
     - `extractedFields` (TEXT) -- JSON string
     - `statusVerifikasi` (TEXT DEFAULT 'PENDING' CHECK(statusVerifikasi IN ('PENDING', 'VERIFIED', 'REJECTED', 'NEED_FIX')))
     - `catatanVerifikasi` (TEXT)
     - `createdAt` (TEXT)
   - Table `users`:
     - `id` (TEXT PRIMARY KEY)
     - `username` (TEXT UNIQUE NOT NULL)
     - `passwordHash` (TEXT NOT NULL)
     - `nama` (TEXT NOT NULL)
     - `role` (TEXT NOT NULL CHECK(role IN ('SUPERADMIN', 'PANITIA', 'VIEWER')))
     - `createdAt` (TEXT)

2. **Connection & Init (`lib/db/index.ts`)**:
   - Better-sqlite3 initialization.
   - Support `process.env.DATABASE_PATH` (default to `./data/santri.db`, or `:memory:` for testing).
   - Ensure directory exists and schema runs automatically on initial connection.

3. **Repository (`lib/db/santri-repo.ts`)**:
   - TypeScript types: `Santri`, `SantriInput`, `SantriDocument`, `DocumentInput`, `SantriFilter`.
   - Functions:
     - `createSantri(input: SantriInput): Santri`
     - `getSantriById(id: string): (Santri & { documents: SantriDocument[] }) | null`
     - `listSantri(filter?: SantriFilter): Santri[]` (with search query on `namaLengkap` / `nik`, filter `jenisKelamin`, filter `jenjang`)
     - `updateSantri(id: string, input: Partial<SantriInput>): Santri`
     - `deleteSantri(id: string): boolean`
     - `saveDocument(input: DocumentInput): SantriDocument`
     - `listDocumentsBySantri(santriId: string): SantriDocument[]`
     - `updateDocumentStatus(id: string, status: string, catatan?: string): boolean`
     - `deleteDocument(id: string): boolean`

4. **Testing (`tests/db/santri-repo.test.ts`)**:
   - Use TDD:
     - Write test first with in-memory SQLite (`:memory:`).
     - Test create santri with all fields (including `sekolahSekarang`, `kelas`, without `kamar`).
     - Test filtering by gender (Ikhwan vs Akhwat).
     - Test filtering by level (SMP, SMA, SMK, ALUMNI).
     - Test searching by name/NIK.
     - Test document attachment, status update, cascade delete.
   - Verify `npm test` passes cleanly.
