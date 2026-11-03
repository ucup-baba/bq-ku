import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { KartuBuku } from '@/components/perpus-publik/KartuBuku';
import type { BukuPublik } from '@/lib/perpus/tipe';

const buku: BukuPublik = {
  id: 'x', idPendek: 'abcd1234', judul: 'Bumi', penulis: 'Tere Liye', nomorPanggil: null, kelasDdc: '899.221',
  eksemplar: 2, tersedia: 1, sampulPath: null, asal: 'koleksi_awal', namaDonatur: null, createdAt: '2026-01-01T00:00:00Z',
};

describe('KartuBuku', () => {
  it('menaut ke URL publik, bukan folder internal', () => {
    const html = renderToStaticMarkup(<KartuBuku lang="en" buku={buku} />);
    expect(html).toContain('href="/en/buku/abcd1234"');
    expect(html).not.toContain('perpusbq');
  });
  it('label genre diterjemahkan; nomor kosong jadi tanda pisah', () => {
    const html = renderToStaticMarkup(<KartuBuku lang="en" buku={buku} />);
    expect(html).toContain('Literature &amp; fiction');
    expect(html).toContain('—');
  });
});
