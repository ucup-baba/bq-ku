import { describe, it, expect } from 'vitest';
import { statistikDonatur, ringkasDonatur } from '@/lib/donatur/daftar';
import type { DonaturWithDonasi } from '@/lib/db/donatur-repo';

const dasar = { alamat: null, catatan: null, createdAt: '', updatedAt: '' };
const daftar: DonaturWithDonasi[] = [
  { ...dasar, id: '1', nama: 'Aris', sapaan: 'BAPAK', noWa: '6281', donasi: [
    { id: 'a', nominal: 500000, bentuk: 'UANG', tanggal: '2026-09-20' },
    { id: 'b', nominal: 250000, bentuk: 'UANG', tanggal: '2026-08-15' },
  ] },
  { ...dasar, id: '2', nama: 'Yusuf', sapaan: 'BAPAK', noWa: null, donasi: [
    { id: 'c', nominal: null, bentuk: 'BARANG', tanggal: '2026-07-10' },
  ] },
  { ...dasar, id: '3', nama: 'Citra', sapaan: 'IBU', noWa: '6282', donasi: [] },
];

describe('statistikDonatur', () => {
  it('menghitung total, aktif bulan ini, dan yang punya WA', () => {
    expect(statistikDonatur(daftar, '2026-09')).toEqual({ total: 3, aktifBulanIni: 1, punyaWa: 2 });
  });
});

describe('ringkasDonatur', () => {
  it('uang: total rupiah · jumlah donasi · tanggal terakhir', () => {
    expect(ringkasDonatur(daftar[0])).toBe('Rp 750.000 · 2 donasi · 20 September 2026');
  });
  it('hanya barang', () => {
    expect(ringkasDonatur(daftar[1])).toBe('Donasi barang · 1 donasi · 10 Juli 2026');
  });
  it('belum ada donasi', () => {
    expect(ringkasDonatur(daftar[2])).toBe('Belum ada donasi');
  });
});
