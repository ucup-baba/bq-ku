import { describe, it, expect } from 'vitest';
import { rentangTren, titikSparkline, bandingkanBulan, keteranganPeriode, porsiAkad, OPSI_PERIODE } from '@/lib/donatur/beranda';

describe('rentangTren', () => {
  it('6 bulan terakhir termasuk bulan berjalan', () => {
    expect(rentangTren(new Date(2026, 8, 23))).toEqual({ dari: '2026-04-01', sampai: '2026-09-30' });
  });
  it('melintasi pergantian tahun', () => {
    expect(rentangTren(new Date(2026, 1, 10))).toEqual({ dari: '2025-09-01', sampai: '2026-02-28' });
  });
});

describe('titikSparkline', () => {
  it('kosong → string kosong', () => {
    expect(titikSparkline([])).toBe('');
  });
  it('satu nilai → garis datar di tengah', () => {
    expect(titikSparkline([5], 200, 28)).toBe('0,14 200,14');
  });
  it('nilai terendah di bawah, tertinggi di atas (dengan padding)', () => {
    expect(titikSparkline([0, 10], 200, 28, 3)).toBe('0,25 200,3');
  });
});

describe('bandingkanBulan', () => {
  it('membandingkan dua bulan terakhir', () => {
    expect(bandingkanBulan([{ bulan: '2026-08', total: 100 }, { bulan: '2026-09', total: 200 }])).toEqual({ arah: 'naik', bulanLalu: 'Agu' });
    expect(bandingkanBulan([{ bulan: '2026-08', total: 200 }, { bulan: '2026-09', total: 50 }])?.arah).toBe('turun');
    expect(bandingkanBulan([{ bulan: '2026-08', total: 0 }, { bulan: '2026-09', total: 0 }])?.arah).toBe('sama');
  });
  it('kurang dari dua bulan → null', () => {
    expect(bandingkanBulan([{ bulan: '2026-09', total: 1 }])).toBeNull();
  });
});

describe('keteranganPeriode', () => {
  it('bulan ini dengan perbandingan', () => {
    expect(keteranganPeriode('bulan-ini', '2026-09-01', '2026-09-30', { arah: 'naik', bulanLalu: 'Agu' })).toBe('Sep 2026 · naik dari Agu');
  });
  it('bulan ini tanpa perbandingan', () => {
    expect(keteranganPeriode('bulan-ini', '2026-09-01', '2026-09-30', null)).toBe('Sep 2026');
  });
  it('periode cepat lain', () => {
    expect(keteranganPeriode('3-bulan', '2026-07-01', '2026-09-30', null)).toBe('3 bulan terakhir');
    expect(keteranganPeriode('tahun-ini', '2026-01-01', '2026-12-31', null)).toBe('Tahun 2026');
  });
  it('manual menampilkan rentang tanggal', () => {
    const t = keteranganPeriode('manual', '2026-09-01', '2026-09-15', null);
    expect(t).toContain('–');
    expect(t).toContain('2026');
  });
});

describe('porsiAkad', () => {
  it('menghitung persen dan mengurutkan dari terbesar', () => {
    const p = porsiAkad([
      { jenis: 'INFAQ', total: 4_000_000, jumlah: 1 },
      { jenis: 'ZAKAT', total: 9_000_000, jumlah: 2 },
      { jenis: 'SHADAQAH', total: 2_000_000, jumlah: 1 },
    ]);
    expect(p.map(x => x.jenis)).toEqual(['ZAKAT', 'INFAQ', 'SHADAQAH']);
    expect(p[0].persen).toBe(60);
  });
  it('tanpa data → array kosong', () => {
    expect(porsiAkad(undefined)).toEqual([]);
  });
});

describe('OPSI_PERIODE', () => {
  it('label pendek untuk HP', () => {
    expect(OPSI_PERIODE.map(o => o.labelPendek)).toEqual(['Bulan', '3 bln', 'Tahun']);
  });
});
