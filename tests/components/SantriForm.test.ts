import { describe, it, expect } from 'vitest';
import { parseOcrText } from '@/lib/ocr/parser';

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
});
