# Task 3 Brief: OCR Extraction Engine & Indonesian Document Regex Parser

## Files
- Create: `lib/ocr/parser.ts`
- Create: `lib/ocr/engine.ts`
- Test: `tests/ocr/parser.test.ts`

## Requirements
1. **Parser Types & Functions (`lib/ocr/parser.ts`)**:
   - `ExtractedDocumentData` interface:
     - `kategori: string`
     - `nik?: string` (16 digits)
     - `noKk?: string` (16 digits)
     - `nisn?: string` (10 digits)
     - `namaLengkap?: string`
     - `tempatLahir?: string`
     - `tanggalLahir?: string` (ISO format `YYYY-MM-DD`)
     - `jenisKelamin?: 'IKHWAN' | 'AKHWAT'`
     - `namaAyah?: string`
     - `namaIbu?: string`
     - `pekerjaanOrtu?: string`
     - `alamat?: string`
     - `asalSekolahSebelumnya?: string`
     - `nomorDokumen?: string`
     - `rawText?: string`
     - `confidence?: number`
   - `cleanOcrDigits(input: string): string` (corrects 'O'/'D' -> '0', 'I'/'l' -> '1', etc. for numeric codes like NIK/No KK/NISN).
   - `parseIndonesianDate(input: string): string | null` (supports numeric `DD-MM-YYYY`, `DD/MM/YYYY`, and Indonesian month names `Januari`, `Februari`, `Maret`, `April`, `Mei`, `Juni`, `Juli`, `Agustus`, `September`, `Oktober`, `November`, `Desember`).
   - `parseOcrText(rawText: string, kategori: string): ExtractedDocumentData`:
     - Dispatches extraction based on `kategori`:
       - `KTP_ORTU`: Extract NIK, Nama, Tempat/Tgl Lahir, Jenis Kelamin, Alamat (RT/RW/Desa/Kecamatan), Pekerjaan.
       - `KARTU_KELUARGA`: Extract No KK, Nama Kepala Keluarga, Nama Ayah/Ibu, NIK, Alamat.
       - `AKTA_KELAHIRAN`: Extract Nomor Akta, Nama Anak, Tempat Tgl Lahir, Nama Ayah, Nama Ibu.
       - `SKL_IJAZAH`: Extract Nomor SKL/Ijazah, NISN (10 digit), Nama Siswa, Asal Sekolah (SMP/MTs/SD), Tempat Tgl Lahir.
       - `KIP_PIP`: Extract Nomor KIP, Nama Siswa, Asal Sekolah.
       - `KRM_PKH_KKS`: Extract Nomor Kartu, Nama Peserta.
       - `SKTM`: Extract Nomor Surat, Nama, Keperluan.
     - Safe error handling: never crash on noisy or incomplete text, always return best-effort extracted fields.

2. **OCR Engine Wrapper (`lib/ocr/engine.ts`)**:
   - `processOcrImage(imageBufferOrUrl: string | Buffer, kategori: string): Promise<{ rawText: string; data: ExtractedDocumentData }>`
   - Provides a resilient wrapper that parses the image text, with fallback text mock / simulation for tests and offline processing if Tesseract worker is not installed or network is unavailable.

3. **Tests (`tests/ocr/parser.test.ts`)**:
   - TDD approach: Write failing tests first with realistic mock OCR text strings for KTP, KK, Akta, SKL, and KIP.
   - Test NIK extraction with OCR noise (e.g. `NIK : 33O41225O6O8OOO1` -> `3304122506080001`).
   - Test Indonesian date parsing with textual months (`15 Juli 2008` -> `2008-07-15`).
   - Test gender detection (`LAKI-LAKI` -> `IKHWAN`, `PEREMPUAN` -> `AKHWAT`).
   - Test noisy/empty input returns gracefully without crashing.
   - Verify `npm test` runs and all tests pass.
