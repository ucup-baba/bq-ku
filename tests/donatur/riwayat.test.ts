import { describe, it, expect } from 'vitest';
import { labelJenis, formatNilaiDonasi } from '@/lib/donatur/riwayat';

describe('labelJenis', () => {
  it('memetakan setiap jenis donasi ke label Indonesia', () => {
    expect(labelJenis('ZAKAT')).toBe('Zakat');
    expect(labelJenis('INFAQ')).toBe('Infaq');
    expect(labelJenis('SHADAQAH')).toBe('Shadaqah');
    expect(labelJenis('LAINNYA')).toBe('Lainnya');
  });
});

describe('formatNilaiDonasi', () => {
  it('memformat donasi UANG sebagai Rupiah', () => {
    expect(formatNilaiDonasi({ bentuk: 'UANG', nominal: 2500000, deskripsiBarang: null })).toBe('Rp 2.500.000');
  });

  it('memformat donasi UANG tanpa nominal sebagai Rp 0', () => {
    expect(formatNilaiDonasi({ bentuk: 'UANG', nominal: null, deskripsiBarang: null })).toBe('Rp 0');
  });

  it('memformat donasi BARANG sebagai deskripsi', () => {
    expect(formatNilaiDonasi({ bentuk: 'BARANG', nominal: null, deskripsiBarang: '50 kg beras' })).toBe('50 kg beras');
  });

  it('memformat donasi BARANG tanpa deskripsi sebagai tanda strip', () => {
    expect(formatNilaiDonasi({ bentuk: 'BARANG', nominal: null, deskripsiBarang: null })).toBe('-');
  });
});
