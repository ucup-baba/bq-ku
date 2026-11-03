import { describe, it, expect } from 'vitest';
import { adaBahasa, bahasaDari, hostPerpus, pathBahasa, ruteHostPerpus } from '@/lib/perpus/domain';

describe('hostPerpus', () => {
  it('cocok dengan daftar dipisah koma, abaikan port & huruf besar', () => {
    expect(hostPerpus('perpus.localhost:3000', 'perpusbq.vercel.app, perpus.localhost')).toBe(true);
    expect(hostPerpus('PerpusBQ.vercel.app', 'perpusbq.vercel.app')).toBe(true);
  });
  it('host lain, host kosong, atau env kosong → false', () => {
    expect(hostPerpus('bq-ku.vercel.app', 'perpusbq.vercel.app')).toBe(false);
    expect(hostPerpus(null, 'perpusbq.vercel.app')).toBe(false);
    expect(hostPerpus('perpusbq.vercel.app', '')).toBe(false);
  });
});

describe('bahasaDari', () => {
  it('memilih bahasa didukung dengan q tertinggi', () => {
    expect(bahasaDari('en-US,en;q=0.9,id;q=0.8')).toBe('en');
    expect(bahasaDari('en;q=0.5,id;q=0.9')).toBe('id');
    expect(bahasaDari('fr,en;q=0.7')).toBe('en');
  });
  it('bawaan id', () => {
    expect(bahasaDari(null)).toBe('id');
    expect(bahasaDari('fr,de')).toBe('id');
    expect(bahasaDari('en;q=0')).toBe('id');
  });
});

describe('ruteHostPerpus', () => {
  it('/ dialihkan sesuai Accept-Language', () => {
    expect(ruteHostPerpus('/', 'en')).toEqual({ jenis: 'alihkan', ke: '/en' });
    expect(ruteHostPerpus('/', null)).toEqual({ jenis: 'alihkan', ke: '/id' });
  });
  it('path berbahasa ditulis ulang ke folder fisik', () => {
    expect(ruteHostPerpus('/id', null)).toEqual({ jenis: 'tulis-ulang', ke: '/perpusbq/id' });
    expect(ruteHostPerpus('/en/buku/abc', null)).toEqual({ jenis: 'tulis-ulang', ke: '/perpusbq/en/buku/abc' });
  });
  it('path tanpa bahasa mendapat id', () => {
    expect(ruteHostPerpus('/katalog', 'en')).toEqual({ jenis: 'alihkan', ke: '/id/katalog' });
  });
  it('API, auth, dan folder internal ditolak', () => {
    for (const p of ['/api/santri', '/api', '/auth/callback', '/perpusbq', '/perpusbq/id']) {
      expect(ruteHostPerpus(p, null)).toEqual({ jenis: 'tolak' });
    }
  });
  it('aset internal Next dilewatkan', () => {
    expect(ruteHostPerpus('/_next/webpack-hmr', null)).toEqual({ jenis: 'lewat' });
  });
  it('awalan mirip bahasa bukan bahasa', () => {
    expect(ruteHostPerpus('/idola', null)).toEqual({ jenis: 'alihkan', ke: '/id/idola' });
  });
});

describe('pathBahasa & adaBahasa', () => {
  it('menyusun path bahasa lain', () => {
    expect(pathBahasa('en', [])).toBe('/en');
    expect(pathBahasa('id', ['buku', 'abcd1234'])).toBe('/id/buku/abcd1234');
  });
  it('hanya id & en', () => {
    expect(adaBahasa('id')).toBe(true);
    expect(adaBahasa('fr')).toBe(false);
  });
});
