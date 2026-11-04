import { describe, it, expect } from 'vitest';
import { adaBahasa, bahasaDari, gagalCallback, hostPerpus, nextAman, pathBahasa, putusanSesi, ruteHostPerpus, tujuanCallback } from '@/lib/perpus/domain';

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
    for (const p of ['/api/santri', '/api', '/api/auth/logout', '/auth/lain', '/auth', '/perpusbq', '/perpusbq/id']) {
      expect(ruteHostPerpus(p, null)).toEqual({ jenis: 'tolak' });
    }
  });
  it('callback & API anggota dilewatkan', () => {
    for (const p of ['/auth/callback', '/api/perpus-publik', '/api/perpus-publik/status']) {
      expect(ruteHostPerpus(p, null)).toEqual({ jenis: 'lewat' });
    }
  });
  it('awalan mirip API anggota tetap ditolak', () => {
    expect(ruteHostPerpus('/api/perpus-publikasi', null)).toEqual({ jenis: 'tolak' });
  });
  it('hanya halaman akun peminjam yang meminta cek sesi', () => {
    expect(ruteHostPerpus('/en/pinjamanku', null)).toEqual({ jenis: 'tulis-ulang', ke: '/perpusbq/en/pinjamanku', sesi: 'pinjamanku', lang: 'en' });
    expect(ruteHostPerpus('/id/masuk', null)).toMatchObject({ sesi: 'masuk' });
    expect(ruteHostPerpus('/id/daftar', null)).toMatchObject({ sesi: 'daftar' });
    expect(ruteHostPerpus('/en/akun', null)).toMatchObject({ sesi: 'akun', lang: 'en' });
    expect(ruteHostPerpus('/id/katalog', null)).toEqual({ jenis: 'tulis-ulang', ke: '/perpusbq/id/katalog' });
  });
  it('manifest memakai milik perpus, bukan manifest bq-ku', () => {
    expect(ruteHostPerpus('/manifest.webmanifest', null)).toEqual({ jenis: 'tulis-ulang', ke: '/perpusbq/manifest' });
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

describe('nextAman', () => {
  it('hanya path berbahasa di situs sendiri', () => {
    expect(nextAman('/id/buku/abcd1234')).toBe('/id/buku/abcd1234');
    expect(nextAman('/en')).toBe('/en');
  });
  it('menolak tautan luar dan path lain', () => {
    for (const p of [null, '', '//evil.com', '/id//evil.com', '/\\evil.com', 'https://evil.com', '/perpus', '/idola']) {
      expect(nextAman(p)).toBeNull();
    }
  });
});

describe('putusanSesi', () => {
  const tamu = { masuk: false, anggota: false };
  const baru = { masuk: true, anggota: false };
  const anggota = { masuk: true, anggota: true };
  it('tamu: pinjamanku & daftar ke masuk, masuk dibiarkan', () => {
    expect(putusanSesi('pinjamanku', 'id', tamu, null)).toBe('/id/masuk?next=%2Fid%2Fpinjamanku');
    expect(putusanSesi('daftar', 'en', tamu, '/en/buku/abcd1234')).toBe('/en/masuk?next=%2Fen%2Fbuku%2Fabcd1234');
    expect(putusanSesi('masuk', 'id', tamu, null)).toBeNull();
  });
  it('sesi tanpa anggota: ke daftar, daftar dibiarkan', () => {
    expect(putusanSesi('pinjamanku', 'id', baru, null)).toBe('/id/daftar?next=%2Fid%2Fpinjamanku');
    expect(putusanSesi('masuk', 'id', baru, '/id/buku/abcd1234')).toBe('/id/daftar?next=%2Fid%2Fbuku%2Fabcd1234');
    expect(putusanSesi('daftar', 'id', baru, null)).toBeNull();
  });
  it('anggota: pinjamanku dibiarkan, masuk & daftar ke tujuan', () => {
    expect(putusanSesi('pinjamanku', 'id', anggota, null)).toBeNull();
    expect(putusanSesi('masuk', 'en', anggota, null)).toBe('/en/pinjamanku');
    expect(putusanSesi('daftar', 'id', anggota, '/id/buku/abcd1234')).toBe('/id/buku/abcd1234');
  });
  it('akun: tamu ke masuk lalu kembali ke akun; anggota dibiarkan', () => {
    expect(putusanSesi('akun', 'id', tamu, null)).toBe('/id/masuk?next=%2Fid%2Fakun');
    expect(putusanSesi('akun', 'en', baru, null)).toBe('/en/daftar?next=%2Fen%2Fakun');
    expect(putusanSesi('akun', 'id', anggota, null)).toBeNull();
  });
  it('next berbahaya diabaikan', () => {
    expect(putusanSesi('masuk', 'id', anggota, '//evil.com')).toBe('/id/pinjamanku');
  });
});

describe('tujuan callback', () => {
  it('anggota menuju next; bahasa mengikuti next', () => {
    expect(tujuanCallback('/en/buku/abcd1234', true, null)).toBe('/en/buku/abcd1234');
  });
  it('tanpa next memakai Accept-Language', () => {
    expect(tujuanCallback(null, true, 'en')).toBe('/en/pinjamanku');
  });
  it('belum anggota dialihkan ke daftar sambil membawa tujuan', () => {
    expect(tujuanCallback('/id/buku/abcd1234', false, null)).toBe('/id/daftar?next=%2Fid%2Fbuku%2Fabcd1234');
  });
  it('gagal kembali ke halaman masuk', () => {
    expect(gagalCallback('/en/buku/abcd1234', null)).toBe('/en/masuk?error=tautan-tidak-valid');
    expect(gagalCallback(null, null)).toBe('/id/masuk?error=tautan-tidak-valid');
  });
});
