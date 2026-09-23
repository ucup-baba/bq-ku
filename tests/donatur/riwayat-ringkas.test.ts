import { describe, it, expect } from 'vitest';
import { ringkasRiwayat } from '@/lib/donatur/riwayat';

describe('ringkasRiwayat', () => {
  it('menjumlah uang, menghitung donasi, dan mencari tanggal terakhir', () => {
    expect(ringkasRiwayat([
      { bentuk: 'UANG', nominal: 100000, tanggal: '2026-08-01' },
      { bentuk: 'BARANG', nominal: null, tanggal: '2026-09-10' },
      { bentuk: 'UANG', nominal: 50000, tanggal: '2026-07-01' },
    ])).toEqual({ totalUang: 150000, jumlah: 3, terakhir: '2026-09-10' });
  });
  it('kosong', () => {
    expect(ringkasRiwayat([])).toEqual({ totalUang: 0, jumlah: 0, terakhir: null });
  });
});
