import { describe, it, expect } from 'vitest';
import { labelBulan, rentangPeriode } from '@/lib/utils/rekap';

describe('labelBulan', () => {
  it('mengubah YYYY-MM menjadi label bulan Indonesia singkat', () => {
    expect(labelBulan('2026-09')).toBe('Sep 2026');
    expect(labelBulan('2026-01')).toBe('Jan 2026');
    expect(labelBulan('2025-12')).toBe('Des 2025');
    expect(labelBulan('2026-05')).toBe('Mei 2026');
  });

  it('mengembalikan input apa adanya bila format tidak dikenali', () => {
    expect(labelBulan('tidak-valid')).toBe('tidak-valid');
  });
});

describe('rentangPeriode', () => {
  it("'bulan-ini' untuk 2026-09-23 menghasilkan dari 2026-09-01 sampai 2026-09-30", () => {
    const hariIni = new Date(2026, 8, 23); // bulan lokal, 0-based (September)
    expect(rentangPeriode('bulan-ini', hariIni)).toEqual({ dari: '2026-09-01', sampai: '2026-09-30' });
  });

  it("'3-bulan' untuk 2026-09-23 menghasilkan dari 2026-07-01 sampai 2026-09-30", () => {
    const hariIni = new Date(2026, 8, 23);
    expect(rentangPeriode('3-bulan', hariIni)).toEqual({ dari: '2026-07-01', sampai: '2026-09-30' });
  });

  it("'3-bulan' melintasi pergantian tahun", () => {
    const hariIni = new Date(2026, 0, 15); // Januari 2026
    expect(rentangPeriode('3-bulan', hariIni)).toEqual({ dari: '2025-11-01', sampai: '2026-01-31' });
  });

  it("'tahun-ini' untuk 2026-09-23 menghasilkan dari 2026-01-01 sampai 2026-12-31", () => {
    const hariIni = new Date(2026, 8, 23);
    expect(rentangPeriode('tahun-ini', hariIni)).toEqual({ dari: '2026-01-01', sampai: '2026-12-31' });
  });

  it('menangani bulan Februari tahun kabisat dengan benar untuk bulan-ini', () => {
    const hariIni = new Date(2028, 1, 10); // Februari 2028 (kabisat)
    expect(rentangPeriode('bulan-ini', hariIni)).toEqual({ dari: '2028-02-01', sampai: '2028-02-29' });
  });
});
