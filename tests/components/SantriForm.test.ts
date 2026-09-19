import { describe, it, expect } from 'vitest';
import { parseOcrText } from '@/lib/ocr/parser';
import { matchBestFamilyMember } from '@/lib/utils/formatters';

describe('Document Upload and OCR Form Logic', () => {
  it('should accurately auto-fill form state fields from OCR output', () => {
    const rawSampleKtp = `
      PROVINSI DAERAH ISTIMEWA YOGYAKARTA
      KABUPATEN SLEMAN
      NIK : 3304122506080001
      Nama : FAIZ AHMAD RAMADHAN
      Tempat/Tgl Lahir : SLEMAN, 15-07-2008
      Jenis Kelamin : LAKI-LAKI
      Alamat : JL. KALIURANG KM 14
      Pekerjaan : WIRASWASTA
    `;

    const extracted = parseOcrText(rawSampleKtp, 'KTP_ORTU');

    expect(extracted.nik).toBe('3304122506080001');
    expect(extracted.namaLengkap).toBe('FAIZ AHMAD RAMADHAN');
    expect(extracted.tempatLahir).toBe('SLEMAN');
    expect(extracted.tanggalLahir).toBe('2008-07-15');
    expect(extracted.jenisKelamin).toBe('IKHWAN');
  });

  it('should auto-match the pre-filled santri name from KK family members without manual selection', () => {
    const rawSampleKk = `
      KARTU KELUARGA
      No. 3401052209100001
      Nama Kepala Keluarga : ARIFIN, S.PD
      Alamat : DUKUH 1 RT 02 RW 01 KULON PROGO

      Nama Lengkap NIK Jenis Kelamin Tempat Lahir Tanggal Lahir Hubungan
      1 ARIFIN, S.PD 3401051508700002 LAKI-LAKI KEBUMEN 15-08-1970 KEPALA KELUARGA
      2 SURATMI, S.PD 3401056501740001 PEREMPUAN KULON PROGO 25-01-1974 ISTRI
      3 MUHAMMAD IKHSAN SYAIFULLOH 3401051203000001 LAKI-LAKI SLEMAN 12-03-2000 ANAK
      4 MUHAMMAD HANIF 3401052301070001 LAKI-LAKI KULON PROGO 23-01-2007 ANAK
      5 MUHAMMAD HAMID AMIRUDIN 3401053004090002 LAKI-LAKI KULON PROGO 30-04-2009 ANAK
    `;

    const parsed = parseOcrText(rawSampleKk, 'KARTU_KELUARGA');
    // Parser filters children from parents (3 children)
    expect(parsed.anggotaKeluarga?.length).toBe(3);

    // Simulate Step 1 name: user typed "muhammad hanif"
    const targetNamaSantri = 'muhammad hanif';
    const matched = matchBestFamilyMember(targetNamaSantri, parsed.anggotaKeluarga || []);

    expect(matched).not.toBeNull();
    expect(matched?.nama).toBe('MUHAMMAD HANIF');
    expect(matched?.nik).toBe('3401052301070001');
  });
});
