import { describe, it, expect } from 'vitest';
import { bacaPin, simpanPin, KUNCI_PIN } from '@/lib/ui/pin-rail';

const memori = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m };
};

describe('pin rail', () => {
  it('default tidak disematkan', () => {
    expect(bacaPin(memori())).toBe(false);
    expect(bacaPin(null)).toBe(false);
  });
  it('menyimpan dan membaca kembali', () => {
    const s = memori();
    simpanPin(s, true);
    expect(s.m.get(KUNCI_PIN)).toBe('1');
    expect(bacaPin(s)).toBe(true);
    simpanPin(s, false);
    expect(bacaPin(s)).toBe(false);
  });
  it('storage yang melempar galat tidak merusak aplikasi', () => {
    const rusak = { getItem: () => { throw new Error('diblokir'); }, setItem: () => { throw new Error('diblokir'); } };
    expect(bacaPin(rusak)).toBe(false);
    expect(() => simpanPin(rusak, true)).not.toThrow();
  });
});
