import { describe, it, expect } from 'vitest';
import { LABEL_GENRE, type Genre } from '@/lib/perpus/ddc';
import { PALET, WARNA_STATUS, kontras, warnaGenre } from '@/lib/perpus/warna';
import type { StatusPinjaman } from '@/lib/perpus/tipe';

describe('palet', () => {
  it.each(Object.entries(PALET))('%s: teks terbaca di atas latarnya', (_nama, w) => {
    expect(kontras(w.latar, w.teks)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('kontras', () => {
  it('hitam di atas putih = 21', () => {
    expect(kontras('#000000', '#ffffff')).toBeCloseTo(21);
  });
});

describe('warnaGenre', () => {
  it('semua genre punya warna', () => {
    for (const g of Object.keys(LABEL_GENRE) as Genre[]) expect(Object.values(PALET)).toContain(warnaGenre(g));
  });
  it('genre yang berbeda jenis tidak semuanya sama', () => {
    const berbeda = new Set((Object.keys(LABEL_GENRE) as Genre[]).map(warnaGenre));
    expect(berbeda.size).toBe(Object.keys(PALET).length);
  });
});

describe('WARNA_STATUS', () => {
  it('semua status pinjaman punya warna', () => {
    const semua: StatusPinjaman[] = ['diajukan', 'dipinjam', 'menunggu_verifikasi', 'dikembalikan', 'ditolak', 'dibatalkan'];
    for (const s of semua) expect(Object.values(PALET)).toContain(WARNA_STATUS[s]);
  });
});
