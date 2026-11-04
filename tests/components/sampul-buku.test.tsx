import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SampulBuku } from '@/components/perpus-publik/SampulBuku';

const buku = { judul: 'Rembulan Tenggelam', penulis: 'Tere Liye', sampulPath: null, kelasDdc: '899.221' };

describe('SampulBuku', () => {
  it('tanpa foto: motif, judul, penulis, tanpa nama genre', () => {
    const html = renderToStaticMarkup(<SampulBuku buku={buku} />);
    expect(html).toContain('<svg');
    expect(html).toContain('Rembulan Tenggelam');
    expect(html).toContain('Tere Liye');
    expect(html).not.toContain('Sastra');
  });
  it('tanpa penulis tetap tampil', () => {
    expect(renderToStaticMarkup(<SampulBuku buku={{ ...buku, penulis: '' }} />)).toContain('Rembulan Tenggelam');
  });
  it('foto sampul didahulukan', () => {
    const html = renderToStaticMarkup(<SampulBuku buku={{ ...buku, sampulPath: 'a.webp' }} />);
    expect(html).toContain('<img');
    expect(html).not.toContain('Tere Liye');
  });
});
