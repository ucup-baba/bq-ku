import { describe, it, expect } from 'vitest';
import { gabungPenulis, kelompokGenre, kelompokPenulis } from '@/lib/perpus/beranda';
import type { BukuPublik, Penulis } from '@/lib/perpus/tipe';

const buku = (penulis: string, kelasDdc: string) => ({ penulis, kelasDdc }) as BukuPublik;
const ulang = (n: number, b: BukuPublik) => Array.from({ length: n }, () => b);

describe('kelompokGenre', () => {
  const rows = [...ulang(2, buku('A', '297')), ...ulang(5, buku('B', '899.221')), ...ulang(3, buku('C', '332'))];
  it('terbanyak dulu, genre kecil dilewati', () => {
    expect(kelompokGenre(rows).map(k => k.genre)).toEqual(['sastra', 'ekonomi_bisnis']);
  });
  it('dibatasi jumlah baris & buku', () => {
    const k = kelompokGenre(rows, { baris: 1, buku: 2 });
    expect(k).toHaveLength(1);
    expect(k[0].buku).toHaveLength(2);
    expect(k[0].jumlah).toBe(5);
  });
});

describe('kelompokPenulis', () => {
  const rows = [...ulang(4, buku('Penerbit Andi', '004')), ...ulang(3, buku('Tere Liye', '899.221')), buku('Sendiri', '297'), ...ulang(2, buku('', '297'))];
  it('melewati penerbit, penulis kosong, dan penulis satu buku', () => {
    expect(kelompokPenulis(rows, new Set(['Penerbit Andi'])).map(k => k.penulis)).toEqual(['Tere Liye']);
  });
});

describe('gabungPenulis', () => {
  it('memakai nama dari buku, menghitung, dan menempelkan profil', () => {
    const profil = { nama: 'Tere Liye', bioId: 'x' } as Penulis;
    expect(gabungPenulis(['Tere Liye', 'Budi', 'Tere Liye', ' '], [profil])).toEqual([
      { nama: 'Tere Liye', jumlahBuku: 2, profil },
      { nama: 'Budi', jumlahBuku: 1, profil: null },
    ]);
  });
});
