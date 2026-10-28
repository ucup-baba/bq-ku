import { describe, it, expect } from 'vitest';
import { pasIsian, UKURAN_MINIMUM } from '@/lib/surat/pas-isian';

describe('pasIsian', () => {
  it('teks pendek tetap ukuran dasar', () => {
    expect(pasIsian('Sleman', 55, 31)).toEqual({ teks: 'Sleman', ukuran: 31 });
  });
  it('teks lebih panjang → huruf dikecilkan sebanding', () => {
    const r = pasIsian('x'.repeat(110), 55, 32);
    expect(r.ukuran).toBe(16);
    expect(r.teks).toHaveLength(110);
  });
  it('terlalu panjang meski sudah minimum → dipotong dengan …', () => {
    const r = pasIsian('a'.repeat(300), 55, 32);
    expect(r.ukuran).toBe(UKURAN_MINIMUM);
    expect(r.teks.endsWith('…')).toBe(true);
    expect(r.teks.length).toBe(110);
  });
  it('merapikan spasi berlebih', () => {
    expect(pasIsian('  Jl.  Kaliurang   Km 14 ', 55, 31).teks).toBe('Jl. Kaliurang Km 14');
  });
});
