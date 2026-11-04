import { describe, it, expect } from 'vitest';
import { hitungBadge, ringkasPinjaman } from '@/lib/perpus/badge';
import type { Pinjamanku, StatusPinjaman } from '@/lib/perpus/tipe';

const p = (status: StatusPinjaman, o: Partial<Pinjamanku> = {}) => ({
  status, jatuhTempo: '2026-11-18', dikembalikanAt: status === 'dikembalikan' ? '2026-11-10T03:00:00Z' : null, kelasDdc: '899.221', ...o,
});
const dapat = (rows: ReturnType<typeof p>[], catatan = 0) => hitungBadge(rows, catatan).filter(b => b.didapat).map(b => b.kunci);
const selesai = (n: number) => Array.from({ length: n }, () => p('dikembalikan'));

describe('hitungBadge', () => {
  it('tanpa riwayat tidak ada badge', () => {
    expect(dapat([])).toEqual([]);
  });
  it('pengajuan & pinjaman berjalan belum dihitung', () => {
    expect(dapat([p('diajukan'), p('dipinjam'), p('ditolak')])).toEqual([]);
  });
  it('jenjang jumlah selesai', () => {
    expect(dapat(selesai(1))).toEqual(['pertama']);
    expect(dapat(selesai(5))).toEqual(expect.arrayContaining(['pertama', 'kutu_buku']));
    expect(dapat(selesai(10))).toEqual(expect.arrayContaining(['pelahap']));
  });
  it('tepat waktu butuh 3 dan tanpa terlambat', () => {
    expect(dapat(selesai(3))).toContain('tepat_waktu');
    const telat = p('dikembalikan', { jatuhTempo: '2026-11-01' });
    expect(dapat([...selesai(3), telat])).not.toContain('tepat_waktu');
  });
  it('tepat waktu memakai tanggal WIB', () => {
    // 18.00 UTC tanggal 18 = 01.00 WIB tanggal 19: terlambat.
    const telat = p('dikembalikan', { dikembalikanAt: '2026-11-18T18:00:00Z' });
    expect(dapat([...selesai(3), telat])).not.toContain('tepat_waktu');
  });
  it('penjelajah menghitung genre berbeda', () => {
    const rows = ['899.221', '297', '332'].map(kelasDdc => p('dikembalikan', { kelasDdc }));
    expect(dapat(rows)).toContain('penjelajah');
    expect(dapat(rows.slice(0, 2))).not.toContain('penjelajah');
  });
  it('penulis catatan dari jumlah catatan publik', () => {
    expect(dapat([], 1)).toEqual(['penulis_catatan']);
  });
  it('kemajuan tidak melebihi target', () => {
    const b = hitungBadge(selesai(7), 0).find(x => x.kunci === 'kutu_buku')!;
    expect(b).toMatchObject({ kemajuan: 5, target: 5 });
  });
});

describe('ringkasPinjaman', () => {
  it('memisah berjalan & selesai', () => {
    expect(ringkasPinjaman([p('diajukan'), p('dipinjam'), p('menunggu_verifikasi'), p('dikembalikan'), p('ditolak')]))
      .toEqual({ berjalan: 2, selesai: 1 });
  });
});
