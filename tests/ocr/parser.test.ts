import { describe, it, expect } from 'vitest';
import { cleanOcrDigits, parseIndonesianDate, parseOcrText, extractBirthDateFromNik } from '../../lib/ocr/parser';

describe('OCR Parser Utilities', () => {
  describe('cleanOcrDigits', () => {
    it('corrects OCR noise in digits', () => {
      expect(cleanOcrDigits('33O41225O6O8OOO1')).toBe('3304122506080001'); // O -> 0
      expect(cleanOcrDigits('l234I6')).toBe('123416'); // l/I -> 1
      expect(cleanOcrDigits('B789')).toBe('8789'); // B -> 8
      expect(cleanOcrDigits('D45')).toBe('045'); // D -> 0
      expect(cleanOcrDigits('Z3S')).toBe('235'); // Z -> 2, S -> 5
      expect(cleanOcrDigits('G9')).toBe('69'); // G -> 6
      expect(cleanOcrDigits('A')).toBe('4'); // A -> 4
      expect(cleanOcrDigits('q')).toBe('9'); // q -> 9
    });
  });

  describe('parseIndonesianDate', () => {
    it('parses numeric dates', () => {
      expect(parseIndonesianDate('15-07-2008')).toBe('2008-07-15');
      expect(parseIndonesianDate('15/07/2008')).toBe('2008-07-15');
    });

    it('parses text month dates', () => {
      expect(parseIndonesianDate('15 Juli 2008')).toBe('2008-07-15');
      expect(parseIndonesianDate('01 Januari 2010')).toBe('2010-01-01');
      expect(parseIndonesianDate('31 Desember 2005')).toBe('2005-12-31');
    });

    it('handles invalid dates gracefully', () => {
      expect(parseIndonesianDate('not a date')).toBeNull();
    });
  });

  describe('extractBirthDateFromNik', () => {
    it('extracts male birth date correctly (Hanif: 23 Jan 2007)', () => {
      expect(extractBirthDateFromNik('3401052301070001')).toBe('2007-01-23');
    });

    it('extracts female birth date correctly by subtracting 40 (Suratmi: 25 Jan 1974)', () => {
      // Digit 7-8: 65 -> 65 - 40 = 25
      expect(extractBirthDateFromNik('3401056501740001')).toBe('1974-01-25');
    });

    it('handles parent born in 1970 (Arifin: 15 Aug 1970)', () => {
      expect(extractBirthDateFromNik('3401051508700002')).toBe('1970-08-15');
    });

    it('returns null for invalid NIK', () => {
      expect(extractBirthDateFromNik('')).toBeNull();
      expect(extractBirthDateFromNik('12345')).toBeNull();
    });
  });
});

describe('parseOcrText', () => {
  describe('KTP_ORTU', () => {
    it('extracts KTP data with OCR noise', () => {
      const rawText = `
        PROVINSI JAWA TENGAH
        KABUPATEN BANYUMAS
        NIK : 33O41225O6O8OOO1
        Nama : BUDI SANTOSO
        Tempat/Tgl Lahir : BANYUMAS, 15 Juli 1980
        Jenis Kelamin : LAKI-LAKI
        Alamat : JL. MERDEKA NO 12 RT 01 RW 02
        Kel/Desa : PURWOKERTO
        Kecamatan : PURWOKERTO TIMUR
        Agama : ISLAM
        Status Perkawinan: KAWIN
        Pekerjaan : WIRASWASTA
        Kewarganegaraan : WNI
        Berlaku Hingga : SEUMUR HIDUP
      `;

      const result = parseOcrText(rawText, 'KTP_ORTU');
      expect(result.kategori).toBe('KTP_ORTU');
      expect(result.nik).toBe('3304122506080001');
      expect(result.namaLengkap).toBe('BUDI SANTOSO');
      expect(result.tempatLahir).toBe('BANYUMAS');
      expect(result.tanggalLahir).toBe('1980-07-15');
      expect(result.jenisKelamin).toBe('IKHWAN');
      expect(result.pekerjaanOrtu).toBe('WIRASWASTA');
      expect(result.alamat).toContain('JL. MERDEKA NO 12');
      expect(result.alamat).toContain('PURWOKERTO'); // Desa/Kec included
    });
  });

  describe('KARTU_KELUARGA', () => {
    it('extracts KK data', () => {
      const rawText = `
        KARTU KELUARGA
        No. 3304121234567890
        Nama Kepala Keluarga : BUDI SANTOSO
        Alamat : JL. MERDEKA NO 12
        RT/RW : 001/002
        Desa/Kelurahan : PURWOKERTO
        Kecamatan : PURWOKERTO TIMUR
        Nama Ibu : SITI AMINAH
        Nama Ayah : ABDULLAH
      `;

      const result = parseOcrText(rawText, 'KARTU_KELUARGA');
      expect(result.kategori).toBe('KARTU_KELUARGA');
      expect(result.noKk).toBe('3304121234567890');
      expect(result.namaLengkap).toBe('BUDI SANTOSO'); // Kepala Keluarga maps to namaLengkap or we can map it to something else
      expect(result.namaAyah).toBe('ABDULLAH');
      expect(result.namaIbu).toBe('SITI AMINAH');
      expect(result.alamat).toContain('JL. MERDEKA NO 12');
    });

    it('extracts real scanned KK with family members table and splits', () => {
      const rawText = `
        KARTU KELUARGA
        Oni of) 2209100001
        Waka No 3401057 . SIDOREJO
        Kecamatan : LENDAH
        Nama Kepala Keluarga : ARIFIN, S.PD
        Alamat : GENTAN 2
        RT/RW : 007/-
        Kode Pos : 55663
        | 1 | ARIFIN, SPD  sa010s1508700002 | LAKI-LAKI | WIRASWASTA
        | 2 | SURATMI, SPD | 3401056501240001 | PEREMPUAN
        | 3 | MUHAMMAD HAMID AMIRUDIN 3401053004000002 | LAKI-LAKI
      `;

      const result = parseOcrText(rawText, 'KARTU_KELUARGA');
      expect(result.kategori).toBe('KARTU_KELUARGA');
      expect(result.noKk).toBe('3401052209100001');
      expect(result.namaAyah).toBe('ARIFIN, S.PD');
      expect(result.namaIbu).toBe('SURATMI, SPD');
      expect(result.namaLengkap).toBe('MUHAMMAD HAMID AMIRUDIN');
      expect(result.nik).toBe('3401053004000002');
      expect(result.jenisKelamin).toBe('IKHWAN');
      expect(result.pekerjaanOrtu).toBe('WIRASWASTA');
      expect(result.alamat).toContain('GENTAN 2');
    });

    it('detects YATIM status and appends (Alm.) when CERAI MATI is present', () => {
      const rawText = `
        KARTU KELUARGA
        No. 3304121234567890
        Nama Kepala Keluarga : SITI KOMARIYAH
        Status Perkawinan : CERAI MATI
        Nama Ayah : DWI SRIYANA
        Nama Ibu : SITI KOMARIYAH
        | 1 | SITI KOMARIYAH | 3404110000000001 | KEPALA KELUARGA
        | 2 | RAHMAT KURNIAWAN | 3404111108060001 | ANAK
      `;

      const result = parseOcrText(rawText, 'KARTU_KELUARGA');
      expect(result.statusSosial).toBe('YATIM');
      expect(result.namaAyah).toBe('DWI SRIYANA (Alm.)');
    });

    it('detects YATIM status when mother is Kepala Keluarga and father is only on children', () => {
      const rawText = `
        KARTU KELUARGA
        No. 3404110407160001
        Nama Kepala Keluarga : SITI KOMARIYAH
        Desa/Kelurahan : WEDOMARTANI
        Kecamatan : NGEMPLAK
        Kabupaten/Kota : SLEMAN
        | 1 | SITI KOMARIYAH | 3404114405650001 | PEREMPUAN
        | 2 | RAHMAT KURNIAWAN | 3404111108060001 | LAKI-LAKI
        Nama Orang Tua:
        DWI SRIYANA | SITI KOMARIYAH
      `;

      const result = parseOcrText(rawText, 'KARTU_KELUARGA');
      expect(result.statusSosial).toBe('YATIM');
      expect(result.namaAyah).toBe('DWI SRIYANA (Alm.)');
    });

    it('tetap REGULER tanpa (Alm.) bila ayah Kepala Keluarga dan orang tua lengkap', () => {
      const rawText = `
        KARTU KELUARGA
        No. 3308011234567890
        Nama Kepala Keluarga : BUDI SANTOSO
        | 1 | BUDI SANTOSO | 3308010101750001 | KEPALA KELUARGA
        | 2 | ANI LESTARI | 3308014102780001 | ISTRI
        | 3 | FAJAR NUGROHO | 3308011505100001 | ANAK
        Nama Orang Tua:
        BUDI SANTOSO | ANI LESTARI
      `;

      const result = parseOcrText(rawText, 'KARTU_KELUARGA');
      expect(result.statusSosial).toBe('REGULER');
      expect(result.namaAyah).toBe('BUDI SANTOSO');
      expect(result.namaIbu).toBe('ANI LESTARI');
    });
  });

  describe('AKTA_KELAHIRAN', () => {
    it('extracts Akta Kelahiran data', () => {
      const rawText = `
        PENCATATAN SIPIL WARGA NEGARA INDONESIA
        KUTIPAN AKTA KELAHIRAN
        Berdasarkan Akta Kelahiran Nomor 3304-LT-12052010-0012
        Bahwa di : BANYUMAS
        Pada tanggal : 12 Mei 2010
        Telah lahir : AHMAD SANTOSO
        Anak ke : 1 (satu), Laki-Laki
        Dari ayah : BUDI SANTOSO
        Dan ibu : SITI AMINAH
      `;

      const result = parseOcrText(rawText, 'AKTA_KELAHIRAN');
      expect(result.kategori).toBe('AKTA_KELAHIRAN');
      expect(result.nomorDokumen).toBe('3304-LT-12052010-0012');
      expect(result.namaLengkap).toBe('AHMAD SANTOSO');
      expect(result.tempatLahir).toBe('BANYUMAS');
      expect(result.tanggalLahir).toBe('2010-05-12');
      expect(result.namaAyah).toBe('BUDI SANTOSO');
      expect(result.namaIbu).toBe('SITI AMINAH');
    });
  });

  describe('SKL_IJAZAH', () => {
    it('extracts SKL/Ijazah data', () => {
      const rawText = `
        SURAT KETERANGAN LULUS
        Nomor : 421.3/012/SMPN1/2026
        Kepala SMP NEGERI 1 PURWOKERTO
        Menerangkan bahwa :
        Nama : AHMAD SANTOSO
        Tempat dan Tanggal Lahir : BANYUMAS, 12 Mei 2010
        Nomor Induk Siswa Nasional : O012345678
      `;

      const result = parseOcrText(rawText, 'SKL_IJAZAH');
      expect(result.kategori).toBe('SKL_IJAZAH');
      expect(result.nomorDokumen).toBe('421.3/012/SMPN1/2026');
      expect(result.namaLengkap).toBe('AHMAD SANTOSO');
      expect(result.tempatLahir).toBe('BANYUMAS');
      expect(result.tanggalLahir).toBe('2010-05-12');
      expect(result.nisn).toBe('0012345678');
      expect(result.asalSekolahSebelumnya).toBe('SMP NEGERI 1 PURWOKERTO');
    });
  });

  describe('KIP_PIP', () => {
    it('extracts KIP/PIP data', () => {
      const rawText = `
        KARTU INDONESIA PINTAR
        Nomor KIP : 1234-5678-9012
        Nama : AHMAD SANTOSO
        Asal Sekolah : SMP NEGERI 1 PURWOKERTO
      `;
      const result = parseOcrText(rawText, 'KIP_PIP');
      expect(result.kategori).toBe('KIP_PIP');
      expect(result.nomorDokumen).toBe('1234-5678-9012');
      expect(result.namaLengkap).toBe('AHMAD SANTOSO');
      expect(result.asalSekolahSebelumnya).toBe('SMP NEGERI 1 PURWOKERTO');
    });
  });
  
  describe('KRM_PKH_KKS', () => {
    it('extracts KRM_PKH_KKS data', () => {
      const rawText = `
        KARTU KELUARGA SEJAHTERA
        Nomor Kartu: 9876543210
        Nama Peserta: SITI AMINAH
      `;
      const result = parseOcrText(rawText, 'KRM_PKH_KKS');
      expect(result.kategori).toBe('KRM_PKH_KKS');
      expect(result.nomorDokumen).toBe('9876543210');
      expect(result.namaLengkap).toBe('SITI AMINAH');
    });
  });
  
  describe('SKTM', () => {
    it('extracts SKTM data', () => {
      const rawText = `
        SURAT KETERANGAN TIDAK MAMPU
        Nomor Surat: 400/123/Desa/2026
        Nama: BUDI SANTOSO
        Keperluan: Pendaftaran Sekolah
      `;
      const result = parseOcrText(rawText, 'SKTM');
      expect(result.kategori).toBe('SKTM');
      expect(result.nomorDokumen).toBe('400/123/Desa/2026');
      expect(result.namaLengkap).toBe('BUDI SANTOSO');
      // Keperluan might not be strictly typed in ExtractedDocumentData but could be in rawText or mapped if needed.
    });
  });

  describe('Empty or noisy input', () => {
    it('handles empty input', () => {
      const result = parseOcrText('', 'KTP_ORTU');
      expect(result.kategori).toBe('KTP_ORTU');
      // Should not crash, fields can be undefined
    });
  });
});
