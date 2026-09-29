import { describe, it, expect } from 'vitest';
import { fotoDinding, susunKolom, MIN_FOTO_DINDING } from '@/lib/santri/dinding-foto';

const s = (id: string, profil?: string, formal?: string) => ({ id, fotoProfilUrl: profil, fotoFormalUrl: formal });

describe('fotoDinding', () => {
  it('kosong bila santri berfoto kurang dari batas minimal', () => {
    const lima = Array.from({ length: MIN_FOTO_DINDING - 1 }, (_, i) => s(String(i), `p${i}`));
    expect(fotoDinding([...lima, s('x')])).toEqual([]);
  });
  it('memakai foto profil, lalu foto formal; santri tanpa foto dan URL ganda dilewati', () => {
    const daftar = [s('1', 'a'), s('2', undefined, 'b'), s('3'), s('4', 'c'), s('5', 'd'), s('6', 'e'), s('7', 'a'), s('8', 'f')];
    expect(fotoDinding(daftar)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });
  it('dibatasi jumlah maksimal', () => {
    const banyak = Array.from({ length: 40 }, (_, i) => s(String(i), `p${i}`));
    expect(fotoDinding(banyak, 12)).toHaveLength(12);
  });
});

describe('susunKolom', () => {
  it('membagi foto bergiliran ke kolom dan tiap kolom cukup panjang untuk berjalan', () => {
    const k = susunKolom(['a', 'b', 'c', 'd', 'e', 'f'], 3, 4);
    expect(k).toHaveLength(3);
    expect(k[0].slice(0, 2)).toEqual(['a', 'd']);
    for (const kolom of k) expect(kolom.length).toBeGreaterThanOrEqual(4);
  });
  it('kolom bergeser agar baris sejajar tidak berisi foto yang sama', () => {
    const k = susunKolom(['a', 'b', 'c', 'd', 'e', 'f'], 5, 4);
    expect(new Set(k.map(kolom => kolom[0])).size).toBe(5);
  });
});
