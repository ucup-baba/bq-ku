// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { susunLabelPdf, teksAman } from '@/lib/perpus/label-pdf';

const baris = (n: number) => Array.from({ length: n }, (_, i) => ({ judul: `Buku ${i}`, baru: `899.221 LIY b.${i}` }));

describe('label PDF', () => {
  it('24 label per halaman A4', async () => {
    const doc = await PDFDocument.load(await susunLabelPdf(baris(25)));
    expect(doc.getPageCount()).toBe(2);
    expect(Math.round(doc.getPage(0).getWidth())).toBe(595);
  });
  it('judul dengan huruf Arab atau tanda khusus tidak membuat galat', async () => {
    await expect(susunLabelPdf([{ judul: 'تفسير ‘Ibnu’ Café', baru: '297 KAT t' }])).resolves.toBeInstanceOf(Uint8Array);
  });
  it('teksAman hanya menyisakan karakter WinAnsi dasar', () => {
    expect(teksAman('Café ‘x’ تفسير')).toBe('Cafe x');
  });
  it('tanpa baris tetap menghasilkan satu halaman', async () => {
    expect((await PDFDocument.load(await susunLabelPdf([]))).getPageCount()).toBe(1);
  });
});
