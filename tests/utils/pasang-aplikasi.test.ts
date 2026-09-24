import { describe, it, expect } from 'vitest';
import { statusPasang } from '@/components/pwa/usePasangAplikasi';

const dasar = { modeAplikasi: false, terpasang: false, adaTawaran: false, ios: false };

describe('statusPasang', () => {
  it('sudah dibuka sebagai aplikasi (PWA) → tombol disembunyikan', () => {
    expect(statusPasang({ ...dasar, modeAplikasi: true, adaTawaran: true })).toBe('tersembunyi');
    expect(statusPasang({ ...dasar, modeAplikasi: true, ios: true })).toBe('tersembunyi');
  });
  it('baru saja dipasang → disembunyikan', () => {
    expect(statusPasang({ ...dasar, terpasang: true, adaTawaran: true })).toBe('tersembunyi');
  });
  it('browser menawarkan pemasangan (Android/Chrome) → tombol Pasang', () => {
    expect(statusPasang({ ...dasar, adaTawaran: true })).toBe('bisa-dipasang');
  });
  it('iPhone di browser → petunjuk manual', () => {
    expect(statusPasang({ ...dasar, ios: true })).toBe('ios');
  });
  it('browser tanpa dukungan pasang → disembunyikan', () => {
    expect(statusPasang(dasar)).toBe('tersembunyi');
  });
});
