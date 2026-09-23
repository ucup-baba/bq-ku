import { describe, it, expect } from 'vitest';
import { statusDariParam, bulanDari, rentangBulan, hitungStatus, saringSurat } from '@/lib/donatur/daftar-surat';
import type { SuratWithRelasi } from '@/lib/db/donatur-repo';

const s = (id: string, nama: string, terkirim: boolean, noWa: string | null = null) => ({
  id, nomorSurat: `${id}/PBQ/IX/2026`, terkirimWa: terkirim,
  donasi: { donatur: { nama, noWa } },
}) as unknown as SuratWithRelasi;

const daftar = [s('1', 'Aris Eko', false, '62811'), s('2', 'Budi', true), s('3', 'Citra', false)];

describe('statusDariParam', () => {
  it('hanya menerima BELUM/SUDAH', () => {
    expect(statusDariParam('BELUM')).toBe('BELUM');
    expect(statusDariParam('SUDAH')).toBe('SUDAH');
    expect(statusDariParam('lain')).toBe('SEMUA');
    expect(statusDariParam(null)).toBe('SEMUA');
  });
});

describe('bulan', () => {
  it('bulanDari memakai waktu lokal', () => {
    expect(bulanDari(new Date(2026, 8, 30, 23, 30))).toBe('2026-09');
  });
  it('rentangBulan menghitung hari terakhir', () => {
    expect(rentangBulan('2026-02')).toEqual({ dari: '2026-02-01', sampai: '2026-02-28' });
  });
});

describe('hitungStatus & saringSurat', () => {
  it('menghitung per status', () => {
    expect(hitungStatus(daftar)).toEqual({ semua: 3, belum: 2, sudah: 1 });
  });
  it('menyaring status lalu kata kunci (nama, nomor, WA)', () => {
    expect(saringSurat(daftar, 'BELUM', '').map(x => x.id)).toEqual(['1', '3']);
    expect(saringSurat(daftar, 'SEMUA', 'budi').map(x => x.id)).toEqual(['2']);
    expect(saringSurat(daftar, 'SEMUA', '3/PBQ').map(x => x.id)).toEqual(['3']);
    expect(saringSurat(daftar, 'SEMUA', '62811').map(x => x.id)).toEqual(['1']);
  });
});
