import { describe, it, expect } from 'vitest';
import { escapeOrFilterValue } from '@/lib/db/filters';

describe('escapeOrFilterValue', () => {
  it('tidak mengubah nilai biasa', () => {
    expect(escapeOrFilterValue('Ahmad')).toBe('Ahmad');
  });

  it('membuang koma', () => {
    expect(escapeOrFilterValue('x,noWa.is.null')).not.toContain(',');
  });

  it('membuang kurung', () => {
    expect(escapeOrFilterValue('a(b)c')).not.toMatch(/[()]/);
  });

  it('membuang kutip ganda dan backslash', () => {
    const hasil = escapeOrFilterValue('a"b\\c');
    expect(hasil).not.toContain('"');
    expect(hasil).not.toContain('\\');
  });

  it('memotong input sangat panjang jadi 80 karakter', () => {
    const panjang = 'a'.repeat(200);
    expect(escapeOrFilterValue(panjang)).toHaveLength(80);
  });

  it('men-trim spasi di ujung', () => {
    expect(escapeOrFilterValue('  Ahmad  ')).toBe('Ahmad');
  });

  it('mengembalikan string kosong untuk input kosong', () => {
    expect(escapeOrFilterValue('')).toBe('');
  });
});
