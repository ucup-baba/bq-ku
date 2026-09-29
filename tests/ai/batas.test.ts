import { describe, it, expect } from 'vitest';
import { awalHariWib, awalBulanWib } from '@/lib/ai/waktu';
import { hitungBiaya, hargaTerisi } from '@/lib/ai/biaya';
import { cekBatas, AiBatasError, PESAN_BATAS_AI } from '@/lib/ai/batas';
import { SETELAN_AI_BAWAAN } from '@/lib/ai/model';

describe('waktu WIB', () => {
  it('pukul 23.30 UTC tanggal 29 sudah tanggal 30 di WIB', () => {
    expect(awalHariWib(new Date('2026-09-29T23:30:00Z')).toISOString()).toBe('2026-09-29T17:00:00.000Z');
  });
  it('pukul 16.59 UTC masih hari yang sama di WIB', () => {
    expect(awalHariWib(new Date('2026-09-29T16:59:00Z')).toISOString()).toBe('2026-09-28T17:00:00.000Z');
  });
  it('awal bulan WIB', () => {
    expect(awalBulanWib(new Date('2026-09-30T18:00:00Z')).toISOString()).toBe('2026-09-30T17:00:00.000Z');
    expect(awalBulanWib(new Date('2026-09-15T05:00:00Z')).toISOString()).toBe('2026-08-31T17:00:00.000Z');
  });
});

describe('hitungBiaya', () => {
  const harga = { masukPerJuta: 2000, keluarPerJuta: 8000 };
  it('token × harga per juta', () => {
    expect(hitungBiaya(1_000_000, 500_000, harga)).toBe(6000);
  });
  it('harga belum diisi → null', () => {
    expect(hitungBiaya(1000, 1000, undefined)).toBeNull();
    expect(hitungBiaya(1000, 1000, { masukPerJuta: 0, keluarPerJuta: 0 })).toBeNull();
    expect(hargaTerisi({ masukPerJuta: 0, keluarPerJuta: 0 })).toBe(false);
  });
});

describe('cekBatas', () => {
  const s = { ...SETELAN_AI_BAWAAN, batasHarian: 10, plafonBulananRp: 1000, harga: { 'gpt-5.4-mini': { masukPerJuta: 1, keluarPerJuta: 1 } } };
  it('di bawah batas → boleh', () => {
    expect(cekBatas({ pindaiHariIni: 9, biayaBulanIni: 999 }, s)).toEqual({ boleh: true });
  });
  it('batas harian tercapai', () => {
    expect(cekBatas({ pindaiHariIni: 10, biayaBulanIni: 0 }, s)).toEqual({ boleh: false, alasan: 'harian' });
  });
  it('plafon bulanan tercapai', () => {
    expect(cekBatas({ pindaiHariIni: 0, biayaBulanIni: 1000 }, s)).toEqual({ boleh: false, alasan: 'bulanan' });
  });
  it('plafon Rp tidak aktif bila harga model utama belum diisi', () => {
    expect(cekBatas({ pindaiHariIni: 0, biayaBulanIni: 99_999 }, { ...s, harga: {} })).toEqual({ boleh: true });
  });
  it('AiBatasError membawa kode & pesan baku', () => {
    const e = new AiBatasError('harian');
    expect(e.kode).toBe('BATAS_AI');
    expect(e.message).toBe(PESAN_BATAS_AI);
  });
});
