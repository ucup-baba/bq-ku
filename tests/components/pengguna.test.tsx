import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PenggunaTable } from '@/components/pengguna/PenggunaTable';

describe('PenggunaTable', () => {
  const h = renderToStaticMarkup(<PenggunaTable currentUserId="u1" />);
  it('header dengan tombol ikon untuk menambah email', () => {
    expect(h).toMatch(/<h1[^>]*>Kelola Pengguna<\/h1>/);
    expect(h).toContain('aria-label="Tambah email yang diizinkan"');
  });
  it('filter ruangan memakai chip & tanpa teks di bawah 12px', () => {
    expect(h).toContain('aria-label="Filter ruangan"');
    expect(h).not.toMatch(/text-\[1[01]px\]/);
  });
});
