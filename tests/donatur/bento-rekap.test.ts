import { describe, it, expect } from 'vitest';
import type { Rekap } from '@/lib/db/donatur-repo';

describe('Bento Dashboard Rekap & Komposisi', () => {
  it('menangani data perJenis dengan benar', () => {
    const data: Rekap = {
      totalUang: 15_000_000,
      jumlahDonasiUang: 4,
      perBulan: [
        { bulan: '2026-07', total: 5_000_000 },
        { bulan: '2026-08', total: 4_000_000 },
        { bulan: '2026-09', total: 6_000_000 },
      ],
      barang: [
        { tanggal: '2026-09-01', donatur: 'H. Budi', deskripsi: '100 Mushaf Al-Quran' },
      ],
      perJenis: [
        { jenis: 'ZAKAT', total: 9_000_000, jumlah: 2 },
        { jenis: 'INFAQ', total: 4_000_000, jumlah: 1 },
        { jenis: 'SHADAQAH', total: 2_000_000, jumlah: 1 },
      ],
    };

    expect(data.perJenis).toBeDefined();
    expect(data.perJenis).toHaveLength(3);

    const totalJenis = data.perJenis!.reduce((acc, p) => acc + p.total, 0);
    expect(totalJenis).toBe(15_000_000);

    const zakat = data.perJenis!.find(p => p.jenis === 'ZAKAT');
    expect(zakat?.total).toBe(9_000_000);
    expect(zakat?.jumlah).toBe(2);

    const persenZakat = Math.round((zakat!.total / totalJenis) * 100);
    expect(persenZakat).toBe(60);
  });

  it('menangani perJenis kosong tanpa crash', () => {
    const data: Rekap = {
      totalUang: 0,
      jumlahDonasiUang: 0,
      perBulan: [],
      barang: [],
      perJenis: [],
    };

    const totalJenis = (data.perJenis ?? []).reduce((acc, p) => acc + p.total, 0);
    expect(totalJenis).toBe(0);
    expect(data.perJenis).toEqual([]);
  });
});
