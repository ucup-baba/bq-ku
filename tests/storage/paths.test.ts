import { describe, it, expect } from 'vitest';
import { storagePathFromUrl, isPathSuratDonatur } from '@/lib/storage/paths';

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

  // Celah keamanan: ADMIN_SANTRI tidak boleh mengarahkan dokumen/foto santri
  // ke folder surat/ (PNG surat ucapan donatur, ruang akses terpisah).
  it('menolak path folder surat/ langsung', () => {
    expect(() => storagePathFromUrl('surat/2026/1-PBQ-IX-2026.png')).toThrow();
  });
  it('menolak path folder surat/ dengan slash di depan', () => {
    expect(() => storagePathFromUrl('/surat/x.png')).toThrow();
  });
  it('menolak signed URL yang menunjuk ke folder surat/', () => {
    const u = 'https://x.supabase.co/storage/v1/object/sign/berkas/surat/2026/x.png?token=1';
    expect(() => storagePathFromUrl(u)).toThrow();
  });
  it('menolak path dengan segmen traversal ".."', () => {
    expect(() => storagePathFromUrl('a/../surat/x.png')).toThrow();
  });
  it('menolak path dengan backslash', () => {
    expect(() => storagePathFromUrl('a\\b.png')).toThrow();
  });
  it('menerima folder yang mirip tapi bukan surat/ persis', () => {
    expect(storagePathFromUrl('surat-lama/x.pdf')).toBe('surat-lama/x.pdf');
  });
});

describe('isPathSuratDonatur', () => {
  it('true untuk path di folder surat/', () => {
    expect(isPathSuratDonatur('surat/2026/x.png')).toBe(true);
  });
  it('false untuk folder yang mirip namanya', () => {
    expect(isPathSuratDonatur('surat-lama/x.pdf')).toBe(false);
  });
  it('false untuk path dokumen santri biasa', () => {
    expect(isPathSuratDonatur('2026_ikhwan_ahmad_kk.pdf')).toBe(false);
  });
});
