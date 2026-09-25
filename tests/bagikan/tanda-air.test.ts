// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { unzipSync, strFromU8 } from 'fflate';
import { tandaAirPdf, tandaAirGambar, buatZip, teksTandaAir } from '@/lib/bagikan/tanda-air';

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
