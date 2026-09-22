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
});
