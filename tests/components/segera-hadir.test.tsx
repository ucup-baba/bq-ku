import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SegeraHadir } from '@/components/ruang/SegeraHadir';

describe('SegeraHadir', () => {
  it('judul halaman + pesan segera hadir', () => {
    const h = renderToStaticMarkup(<SegeraHadir judul="Keuangan" sub="Pemasukan & pengeluaran yayasan." />);
    expect(h).toMatch(/<h1[^>]*>Keuangan<\/h1>/);
    expect(h).toContain('Segera hadir');
  });
});
