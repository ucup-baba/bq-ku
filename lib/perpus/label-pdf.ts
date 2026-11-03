import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const A4 = { lebar: 595.28, tinggi: 841.89 };
const TEPI = 18;
const KOLOM = 3;
const BARIS = 8;

/** Font bawaan PDF hanya WinAnsi; karakter lain membuat pdf-lib melempar galat. */
export const teksAman = (s: string) =>
  s.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim();

export async function susunLabelPdf(baris: { judul: string; baru: string }[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const tebal = await doc.embedFont(StandardFonts.HelveticaBold);
  const biasa = await doc.embedFont(StandardFonts.Helvetica);
  const lebar = (A4.lebar - TEPI * 2) / KOLOM;
  const tinggi = (A4.tinggi - TEPI * 2) / BARIS;
  const perHalaman = KOLOM * BARIS;
  let halaman = doc.addPage([A4.lebar, A4.tinggi]);

  baris.forEach((label, i) => {
    const posisi = i % perHalaman;
    if (i > 0 && posisi === 0) halaman = doc.addPage([A4.lebar, A4.tinggi]);
    const x = TEPI + (posisi % KOLOM) * lebar;
    const y = A4.tinggi - TEPI - (Math.floor(posisi / KOLOM) + 1) * tinggi;
    halaman.drawRectangle({ x, y, width: lebar, height: tinggi, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5 });
    // Satu bagian nomor per baris, seperti label punggung buku.
    teksAman(label.baru).split(' ').forEach((bagian, n) => {
      halaman.drawText(bagian, { x: x + 12, y: y + tinggi - 24 - n * 17, size: 14, font: tebal });
    });
    halaman.drawText(teksAman(label.judul).slice(0, 34), { x: x + 12, y: y + 8, size: 7, font: biasa });
  });
  return doc.save();
}
