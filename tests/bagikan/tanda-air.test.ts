// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { unzipSync, strFromU8 } from 'fflate';
import { tandaAirPdf, tandaAirGambar, buatZip, teksTandaAir, posisiTandaAirPdf } from '@/lib/bagikan/tanda-air';

async function pdfContoh(halaman: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < halaman; i++) doc.addPage([595, 842]);
  return doc.save();
}

describe('teksTandaAir', () => {
  it('berisi penerima dan tanggal Indonesia', () => {
    expect(teksTandaAir('CSR Bank X', new Date(2026, 8, 25))).toBe('Untuk: CSR Bank X · 25 September 2026');
  });
});

describe('tandaAirPdf', () => {
  it('jumlah halaman tetap, hasil tetap PDF valid dan berubah', async () => {
    const asli = await pdfContoh(2);
    const hasil = await tandaAirPdf(asli, 'Untuk: CSR Bank X · 25 September 2026', 'T-ABC123');
    const doc = await PDFDocument.load(hasil);
    expect(doc.getPageCount()).toBe(2);
    expect(hasil.byteLength).toBeGreaterThan(asli.byteLength);
  });
});

describe('posisiTandaAirPdf', () => {
  it('tiga baris sejajar berjarak (tidak menumpuk) dan teks ASLI muat utuh di halaman', async () => {
    const { StandardFonts } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const teks = 'Untuk: Corporate Social Responsibility Bank Rakyat - 25 September 2026';
    for (const [w, h] of [[595, 842], [842, 595], [612, 1008]]) {
      const p = posisiTandaAirPdf(w, h, font.widthOfTextAtSize(teks, 1));
      const rad = (p.sudutDerajat * Math.PI) / 180;
      const tegak = (q: { x: number; y: number }) => -q.x * Math.sin(rad) + q.y * Math.cos(rad);
      const d = p.baris.map(tegak).sort((a, b) => a - b);
      expect(d[1] - d[0]).toBeGreaterThan(80);
      expect(d[2] - d[1]).toBeGreaterThan(80);
      for (const q of p.baris) {
        for (const t of [0, 1]) {
          const x = q.x + t * p.lebar * Math.cos(rad), y = q.y + t * p.lebar * Math.sin(rad);
          expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(w);
          expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(h);
        }
      }
    }
  });
});

describe('tandaAirGambar', () => {
  it('dimensi tetap, isi berubah, format mengikuti asal', async () => {
    const asli = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#ffffff' } }).png().toBuffer();
    const hasil = await tandaAirGambar(asli, 'image/png', 'Untuk: CSR Bank X · 25 September 2026');
    const meta = await sharp(hasil).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([800, 600, 'png']);
    const statsAsli = await sharp(asli).stats();
    const statsHasil = await sharp(hasil).stats();
    expect(statsHasil.channels[0].mean).toBeLessThan(statsAsli.channels[0].mean);
    const jpg = await sharp(asli).jpeg().toBuffer();
    expect((await sharp(await tandaAirGambar(jpg, 'image/jpeg', 'x')).metadata()).format).toBe('jpeg');
  });
});

describe('buatZip', () => {
  it('berkas dapat diurai kembali; nama ganda dibedakan', () => {
    const zip = buatZip([
      { nama: 'NPWP.pdf', isi: new TextEncoder().encode('satu') },
      { nama: 'NPWP.pdf', isi: new TextEncoder().encode('dua') },
    ]);
    const isi = unzipSync(zip);
    expect(Object.keys(isi).sort()).toEqual(['NPWP (2).pdf', 'NPWP.pdf']);
    expect(strFromU8(isi['NPWP.pdf'])).toBe('satu');
  });
});
