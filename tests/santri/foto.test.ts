import { describe, it, expect } from 'vitest';
import { ukuranKotakPutar, BINGKAI_FOTO } from '@/lib/santri/foto';

describe('ukuranKotakPutar', () => {
  it('0° dan 180° tidak mengubah ukuran', () => {
    expect(ukuranKotakPutar(400, 300, 0)).toEqual({ lebar: 400, tinggi: 300 });
    expect(ukuranKotakPutar(400, 300, 180)).toEqual({ lebar: 400, tinggi: 300 });
  });
  it('90° menukar lebar & tinggi', () => {
    expect(ukuranKotakPutar(400, 300, 90)).toEqual({ lebar: 300, tinggi: 400 });
    expect(ukuranKotakPutar(400, 300, -90)).toEqual({ lebar: 300, tinggi: 400 });
  });
  it('sudut miring memperbesar kotak pembatas', () => {
    const { lebar, tinggi } = ukuranKotakPutar(100, 100, 45);
    expect(lebar).toBeCloseTo(141.42, 1);
    expect(tinggi).toBeCloseTo(141.42, 1);
  });
});

describe('BINGKAI_FOTO', () => {
  it('ukuran keluaran sesuai rasio bingkai', () => {
    for (const b of Object.values(BINGKAI_FOTO)) expect(b.lebar / b.tinggi).toBeCloseTo(b.rasio, 5);
    expect(BINGKAI_FOTO.fotoFormalUrl.rasio).toBeCloseTo(3 / 4);
    expect(BINGKAI_FOTO.fotoProfilUrl.rasio).toBeCloseTo(4 / 5);
  });
});
