import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { ambilHalamanPdf, ringkasHalaman, namaBerkasTerpilih } from '@/lib/pdf/halaman';

async function pdfContoh(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([100, 100]);
  doc.addPage([200, 200]);
  doc.addPage([300, 300]);
  return doc.save();
}

describe('ambilHalamanPdf', () => {
  it('menyusun PDF baru berisi halaman terpilih saja, sesuai urutan', async () => {
    const hasil = await PDFDocument.load(await ambilHalamanPdf(await pdfContoh(), [3, 1]));
    expect(hasil.getPageCount()).toBe(2);
    expect(hasil.getPages().map(p => p.getWidth())).toEqual([100, 300]);
  });
  it('menolak pilihan kosong', async () => {
    await expect(ambilHalamanPdf(await pdfContoh(), [])).rejects.toThrow(/minimal satu halaman/i);
  });
});

describe('ringkasHalaman', () => {
  it('rentang berurutan diringkas', () => {
    expect(ringkasHalaman([5, 1, 2, 3])).toBe('1–3, 5');
    expect(ringkasHalaman([4])).toBe('4');
    expect(ringkasHalaman([1, 3, 5])).toBe('1, 3, 5');
  });
});

describe('namaBerkasTerpilih', () => {
  it('menandai halaman terpilih di nama berkas', () => {
    expect(namaBerkasTerpilih('SMP-A-Chotidjah.pdf', [4, 5], 6)).toBe('SMP-A-Chotidjah (hal 4–5 dari 6).pdf');
  });
  it('semua halaman → nama asli', () => {
    expect(namaBerkasTerpilih('berkas.pdf', [1, 2], 2)).toBe('berkas.pdf');
  });
});
