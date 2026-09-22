import { describe, it, expect } from 'vitest';
import { storagePathFromUrl } from '@/lib/storage/paths';

describe('storagePathFromUrl', () => {
  it('mengekstrak path dari signed URL', () => {
    const u = 'https://x.supabase.co/storage/v1/object/sign/berkas/2026_ikhwan_ahmad_kk.pdf?token=abc';
    expect(storagePathFromUrl(u)).toBe('2026_ikhwan_ahmad_kk.pdf');
  });
  it('mengekstrak path dari public URL lama', () => {
    const u = 'https://x.supabase.co/storage/v1/object/public/berkas/foto/a%20b.webp';
    expect(storagePathFromUrl(u)).toBe('foto/a b.webp');
  });
  it('mengembalikan path apa adanya', () => {
    expect(storagePathFromUrl('2026_ikhwan_ahmad_kk.pdf')).toBe('2026_ikhwan_ahmad_kk.pdf');
  });
  it('menghormati nama bucket kustom', () => {
    expect(storagePathFromUrl('https://x/storage/v1/object/sign/arsip/a.pdf?token=1', 'arsip')).toBe('a.pdf');
  });
  it('menolak URL luar', () => {
    expect(() => storagePathFromUrl('https://evil.com/a.pdf')).toThrow();
  });
});
