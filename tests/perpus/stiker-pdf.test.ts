// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { STIKER, susunStikerPdf, tataStiker, urlStiker } from '@/lib/perpus/stiker-pdf';

describe('tataStiker', () => {
  it('6 kolom x 14 baris di A3, semua dalam halaman', () => {
    const t = tataStiker();
    expect([t.kolom, t.baris]).toEqual([6, 14]);
    expect(t.x0).toBeGreaterThan(0);
    expect(t.x0 + t.kolom * STIKER.lebar + (t.kolom - 1) * STIKER.jarak).toBeLessThanOrEqual(STIKER.a3.lebar);
  });
});

describe('susunStikerPdf', () => {
  it('85 stiker = 2 halaman A3', async () => {
    const isi = Array.from({ length: 85 }, (_, i) => ({ nomor: `813 LIY ${i}`, url: `https://perpusbq.vercel.app/b/abcd${String(i).padStart(4, '0')}` }));
    const pdf = await PDFDocument.load(await susunStikerPdf(isi));
    expect(pdf.getPageCount()).toBe(2);
    const { width, height } = pdf.getPage(0).getSize();
    expect(Math.round(width)).toBe(842);
    expect(Math.round(height)).toBe(1191);
  });
  it('karakter non-ASCII tidak membuat galat', async () => {
    await expect(susunStikerPdf([{ nomor: '297 ŞAŪ b', url: 'https://x.id/b/abcd1234' }])).resolves.toBeInstanceOf(Uint8Array);
  });
});

describe('urlStiker', () => {
  it('memakai host perpus pertama', () => {
    expect(urlStiker('abcd1234', 'perpusbq.vercel.app, perpus.localhost')).toBe('https://perpusbq.vercel.app/b/abcd1234');
  });
});
