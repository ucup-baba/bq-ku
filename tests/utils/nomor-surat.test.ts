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
  it('parse menolak nomor urut dengan nol di depan, nol, atau lebih dari 6 digit', () => {
    // '01/...' berbeda string dari '1/...' sehingga akan lolos constraint unik
    expect(parseNomorSurat('01/PBQ/IX/2026')).toBeNull();
    expect(parseNomorSurat('0/PBQ/IX/2026')).toBeNull();
    expect(parseNomorSurat('1234567/PBQ/IX/2026')).toBeNull();
  });
  it('parse tetap menerima urut 1..999999', () => {
    expect(parseNomorSurat('271/PBQ/IX/2026')).toEqual({ urut: 271, bulan: 9, tahun: 2026 });
    expect(parseNomorSurat('1/PBQ/I/2026')).toEqual({ urut: 1, bulan: 1, tahun: 2026 });
    expect(parseNomorSurat('999999/PBQ/XII/2026')).toEqual({ urut: 999999, bulan: 12, tahun: 2026 });
  });
  it('format tanggal awal tahun tanpa geser zona waktu', () => {
    expect(formatNomorSurat(1, '2026-01-01')).toBe('1/PBQ/I/2026');
  });
});
