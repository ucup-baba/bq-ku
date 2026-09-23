import { describe, it, expect } from 'vitest';
import { susunRingkasan } from '@/lib/donatur/ringkasan';
import type { Rekap } from '@/lib/db/donatur-repo';

const rekap = (over: Partial<Rekap> = {}): Rekap => ({
  totalUang: 2_500_000,
  jumlahDonasiUang: 3,
  perBulan: [{ bulan: '2026-09', total: 2_500_000 }],
  barang: [
    { tanggal: '2026-09-05', donatur: 'Budi', deskripsi: 'Beras 50kg' },
    { tanggal: '2026-09-10', donatur: 'Siti', deskripsi: 'Sarung' },
  ],
  ...over,
});

describe('susunRingkasan', () => {
  it('menyusun total uang, jumlah donasi, jumlah barang, dan surat terkirim', () => {
    expect(susunRingkasan(rekap(), 4)).toEqual({
      totalUang: 2_500_000,
      jumlahDonasi: 3,
      jumlahBarang: 2,
      suratTerkirim: 4,
    });
  });

  it('menghasilkan nol untuk rekap kosong dan surat terkirim nol', () => {
    expect(susunRingkasan(rekap({ totalUang: 0, jumlahDonasiUang: 0, barang: [] }), 0)).toEqual({
      totalUang: 0,
      jumlahDonasi: 0,
      jumlahBarang: 0,
      suratTerkirim: 0,
    });
  });

  it('tidak terpengaruh oleh isi perBulan', () => {
    const a = susunRingkasan(rekap({ perBulan: [] }), 1);
    const b = susunRingkasan(rekap({ perBulan: [{ bulan: '2026-01', total: 999 }] }), 1);
    expect(a).toEqual(b);
  });
});
