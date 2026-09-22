import { describe, it, expect } from 'vitest';
import { terbilang, formatRupiah } from '@/lib/utils/terbilang';

describe('terbilang', () => {
  it('angka dasar', () => {
    expect(terbilang(0)).toBe('Nol');
    expect(terbilang(7)).toBe('Tujuh');
    expect(terbilang(11)).toBe('Sebelas');
    expect(terbilang(19)).toBe('Sembilan Belas');
    expect(terbilang(21)).toBe('Dua Puluh Satu');
  });
  it('ratusan dan seratus/seribu', () => {
    expect(terbilang(100)).toBe('Seratus');
    expect(terbilang(250)).toBe('Dua Ratus Lima Puluh');
    expect(terbilang(1000)).toBe('Seribu');
    expect(terbilang(1500)).toBe('Seribu Lima Ratus');
  });
  it('nominal surat contoh', () => {
    expect(terbilang(2500000)).toBe('Dua Juta Lima Ratus Ribu');
  });
  it('angka besar', () => {
    expect(terbilang(1000000)).toBe('Satu Juta');
    expect(terbilang(1250750)).toBe('Satu Juta Dua Ratus Lima Puluh Ribu Tujuh Ratus Lima Puluh');
    expect(terbilang(2000000000)).toBe('Dua Miliar');
  });
  it('menolak negatif', () => {
    expect(() => terbilang(-5)).toThrow();
  });
});

describe('formatRupiah', () => {
  it('memakai titik ribuan', () => {
    expect(formatRupiah(2500000)).toBe('2.500.000');
    expect(formatRupiah(750)).toBe('750');
  });
});
