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
  it('status ketersediaan diterjemahkan', () => {
    expect(renderToStaticMarkup(<KartuBuku lang="en" buku={buku} />)).toContain('Available');
    expect(renderToStaticMarkup(<KartuBuku lang="id" buku={{ ...buku, tersedia: 0 }} />)).toContain('Dipinjam');
  });
  it('nomor panggil kosong tidak menampilkan chip', () => {
    expect(renderToStaticMarkup(<KartuBuku lang="id" buku={buku} />)).not.toContain('p-buku-nomor');
    expect(renderToStaticMarkup(<KartuBuku lang="id" buku={{ ...buku, nomorPanggil: '813 LIY b' }} />)).toContain('813 LIY b');
  });
  it('foto menggantikan judul di panel', () => {
    const html = renderToStaticMarkup(<KartuBuku lang="id" buku={{ ...buku, sampulPath: 'a.webp' }} />);
    expect(html).toContain('<img');
    expect(html).not.toContain('p-buku-judul');
  });
});
