import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { teksAman } from '@/lib/perpus/label-pdf';

const MM = 72 / 25.4;

/** Stiker 40 x 25 mm di A3, jarak 3 mm untuk garis potong. */
export const STIKER = {
  a3: { lebar: 297 * MM, tinggi: 420 * MM },
  lebar: 40 * MM, tinggi: 25 * MM, jarak: 3 * MM, tepi: 10 * MM, qr: 19 * MM,
};

export function tataStiker() {
  const { a3, lebar, tinggi, jarak, tepi } = STIKER;
  const kolom = Math.floor((a3.lebar - 2 * tepi + jarak) / (lebar + jarak));
  const baris = Math.floor((a3.tinggi - 2 * tepi + jarak) / (tinggi + jarak));
  // Sisa ruang dibagi rata supaya lembar tetap simetris.
  const x0 = (a3.lebar - (kolom * lebar + (kolom - 1) * jarak)) / 2;
  const y0 = (a3.tinggi - (baris * tinggi + (baris - 1) * jarak)) / 2;
  return { kolom, baris, x0, y0 };
}

export function urlStiker(idPendek: string, host = process.env.PERPUS_HOST ?? ''): string {
  return `https://${host.split(',')[0].trim()}/b/${idPendek}`;
}

export async function susunStikerPdf(isi: { nomor: string; url: string }[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const tebal = await doc.embedFont(StandardFonts.CourierBold);
  const biasa = await doc.embedFont(StandardFonts.Helvetica);
  const { kolom, baris, x0, y0 } = tataStiker();
  const { a3, lebar, tinggi, jarak, qr } = STIKER;
  const perHalaman = kolom * baris;
  let halaman = doc.addPage([a3.lebar, a3.tinggi]);

  isi.forEach((s, i) => {
    const posisi = i % perHalaman;
    if (i > 0 && posisi === 0) halaman = doc.addPage([a3.lebar, a3.tinggi]);
    const x = x0 + (posisi % kolom) * (lebar + jarak);
    const y = a3.tinggi - y0 - (Math.floor(posisi / kolom) + 1) * tinggi - Math.floor(posisi / kolom) * jarak;
    halaman.drawRectangle({ x, y, width: lebar, height: tinggi, borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.4, borderDashArray: [2, 2] });

    const modul = QRCode.create(s.url, { errorCorrectionLevel: 'M' }).modules;
    const tepiQr = 3; // zona sepi QR, dalam satuan modul
    const ukuran = qr / (modul.size + tepiQr * 2);
    const qx = x + (tinggi - qr) / 2;
    const qy = y + (tinggi - qr) / 2;
    for (let r = 0; r < modul.size; r++) {
      for (let k = 0; k < modul.size; k++) {
        if (!modul.get(r, k)) continue;
        halaman.drawRectangle({
          x: qx + (k + tepiQr) * ukuran, y: qy + qr - (r + tepiQr + 1) * ukuran,
          width: ukuran, height: ukuran, color: rgb(0, 0, 0),
        });
      }
    }

    const tx = qx + qr + 1.5 * MM;
    const lebarTeks = x + lebar - tx - 1.5 * MM;
    const potongan = teksAman(s.nomor).split(' ').slice(0, 3);
    potongan.forEach((p, j) => {
      let size = 10;
      while (size > 6 && tebal.widthOfTextAtSize(p, size) > lebarTeks) size -= 0.5;
      halaman.drawText(p, { x: tx, y: y + tinggi - 6 * MM - j * 4.2 * MM, size, font: tebal });
    });
    halaman.drawText('Perpus BQ', { x: tx, y: y + 2.5 * MM, size: 6, font: biasa, color: rgb(0.3, 0.3, 0.3) });
  });
  return doc.save();
}
