import { describe, it, expect } from 'vitest';
import { nomorWali, pesanPengingat } from '@/lib/santri/pengingat';

describe('nomorWali', () => {
  it('menormalkan ke format 62', () => {
    expect(nomorWali('08123456789')).toBe('628123456789');
    expect(nomorWali('+62 812-3456-789')).toBe('628123456789');
    expect(nomorWali('8123456789')).toBe('628123456789');
    expect(nomorWali('')).toBeNull();
    expect(nomorWali(null)).toBeNull();
  });
});

describe('pesanPengingat', () => {
  it('memuat nama, jumlah berkas, daftar kurang, dan tautan', () => {
    const p = pesanPengingat('Ahmad Faiz', [
      { kategori: 'KARTU_KELUARGA', statusVerifikasi: 'VERIFIED' },
      { kategori: 'KTP_ORTU', statusVerifikasi: 'PENDING' },
    ], 'https://bq-ku.vercel.app/upload-mandiri/abc');
    expect(p).toContain('*Ahmad Faiz*');
    expect(p).toContain('(2/4 berkas wajib terunggah)');
    expect(p).toContain('• Akta Kelahiran\n• SKL / Ijazah');
    expect(p).toContain('https://bq-ku.vercel.app/upload-mandiri/abc');
  });
});
