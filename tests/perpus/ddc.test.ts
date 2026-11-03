import { describe, it, expect } from 'vitest';
import { KELAS_DDC, kelasSah, genreDari, labelKelas, LABEL_GENRE } from '@/lib/perpus/ddc';

describe('kelas DDC', () => {
  it('kode unik & berformat DDC', () => {
    expect(new Set(KELAS_DDC.map(k => k.kode)).size).toBe(KELAS_DDC.length);
    for (const k of KELAS_DDC) expect(k.kode).toMatch(/^\d{3}(\.\d+)?$/);
  });
  it('kelasSah hanya untuk kode terdaftar', () => {
    expect(kelasSah('899.221')).toBe(true);
    expect(kelasSah('297.4')).toBe(true);
    expect(kelasSah('999')).toBe(false);
    expect(kelasSah('')).toBe(false);
  });
  it('genre dari kode persis atau awalan terpanjang', () => {
    expect(genreDari('899.221')).toBe('sastra');
    expect(genreDari('297.4')).toBe('islam');
    expect(genreDari('297.12')).toBe('islam');
    expect(genreDari('158')).toBe('pengembangan_diri');
    expect(genreDari('332')).toBe('ekonomi_bisnis');
    expect(genreDari('')).toBe('lainnya');
    expect(genreDari('999')).toBe('lainnya');
  });
  it('label dua bahasa', () => {
    expect(labelKelas('899.221', 'id')).toBe('Sastra Indonesia');
    expect(labelKelas('899.221', 'en')).toBe('Indonesian literature');
    expect(labelKelas('999', 'id')).toBe('999');
    expect(LABEL_GENRE.islam).toEqual({ id: 'Islam', en: 'Islam' });
  });
});
