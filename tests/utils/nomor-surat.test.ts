import { describe, it, expect } from 'vitest';
import { bulanRomawi, formatNomorSurat, parseNomorSurat } from '@/lib/utils/nomor-surat';

describe('nomor surat', () => {
  it('bulan romawi', () => {
    expect(bulanRomawi(1)).toBe('I');
    expect(bulanRomawi(9)).toBe('IX');
    expect(bulanRomawi(12)).toBe('XII');
  });
  it('format lengkap', () => {
    expect(formatNomorSurat(270, '2026-09-21')).toBe('270/PBQ/IX/2026');
  });
  it('parse kembali', () => {
    expect(parseNomorSurat('270/PBQ/IX/2026')).toEqual({ urut: 270, bulan: 9, tahun: 2026 });
  });
  it('parse menolak format asing', () => {
    expect(parseNomorSurat('abc')).toBeNull();
    expect(parseNomorSurat('270/XYZ/IX/2026')).toBeNull();
  });
  it('parse menolak angka romawi tidak sah', () => {
    expect(parseNomorSurat('270/PBQ/IIII/2026')).toBeNull();
    expect(parseNomorSurat('270/PBQ/XIII/2026')).toBeNull();
    expect(parseNomorSurat('270/PBQ/VIIII/2026')).toBeNull();
  });
  it('parse menerima seluruh bulan sah I-XII', () => {
    for (let bulan = 1; bulan <= 12; bulan++) {
      const romawi = bulanRomawi(bulan);
      const nomor = `123/PBQ/${romawi}/2026`;
      const hasil = parseNomorSurat(nomor);
      expect(hasil).toEqual({ urut: 123, bulan, tahun: 2026 });
    }
  });
  it('format tanggal awal tahun tanpa geser zona waktu', () => {
    expect(formatNomorSurat(1, '2026-01-01')).toBe('1/PBQ/I/2026');
  });
});
