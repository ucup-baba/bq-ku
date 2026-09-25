import 'server-only';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import sharp from 'sharp';
import { zipSync } from 'fflate';
import { formatDateIndonesian } from '@/lib/utils/formatters';

/**
 * Tanda air untuk salinan yang dibagikan. File asli di storage tidak pernah diubah.
 * Gagal menempel tanda air → lempar galat (pemanggil menolak unduhan, bukan mengirim tanpa tanda air).
 */
const dua = (n: number) => String(n).padStart(2, '0');

export function teksTandaAir(penerima: string, tanggal: Date): string {
  const iso = `${tanggal.getFullYear()}-${dua(tanggal.getMonth() + 1)}-${dua(tanggal.getDate())}`;
  return `Untuk: ${penerima} · ${formatDateIndonesian(iso)}`;
}

/** Font standar PDF (WinAnsi) tidak punya semua glif; ganti karakter di luar Latin-1 agar tidak gagal. */
const amanWinAnsi = (s: string) => s.replace(/·/g, '-').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');

/**
 * Tiga baris diagonal SEJAJAR (digeser tegak lurus diagonal) yang muat utuh di halaman.
 * Tiap baris ditaruh di tengah potongan garisnya yang berada di dalam halaman (dikurangi margin),
 * dan ukuran huruf dipilih agar teks muat di potongan terpendek. `lebarPerPt` = lebar teks pada 1 pt.
 * Titik (x, y) = awal baseline sebelum diputar.
 */
export function posisiTandaAirPdf(width: number, height: number, lebarPerPt: number, margin = 18) {
  const sudut = Math.atan2(height, width);
  const [cos, sin] = [Math.cos(sudut), Math.sin(sudut)];
  const jarak = Math.min(width, height) / 3.2;
  // Rentang t (sepanjang arah diagonal) di mana titik C + t·u berada di dalam halaman bermargin.
  const potongan = (cx: number, cy: number) => {
    const [x0, x1] = [(margin - cx) / cos, (width - margin - cx) / cos];
    const [y0, y1] = [(margin - cy) / sin, (height - margin - cy) / sin];
    return { t0: Math.max(Math.min(x0, x1), Math.min(y0, y1)), t1: Math.min(Math.max(x0, x1), Math.max(y0, y1)) };
  };
  const pusat = [-1, 0, 1].map(i => ({ cx: width / 2 - i * jarak * sin, cy: height / 2 + i * jarak * cos }));
  const rentang = pusat.map(p => ({ ...p, ...potongan(p.cx, p.cy) }));
  const terpendek = Math.min(...rentang.map(r => r.t1 - r.t0));
  const ukuran = Math.max(8, Math.min(Math.min(width, height) / 22, (terpendek * 0.92) / Math.max(lebarPerPt, 1)));
  const lebar = lebarPerPt * ukuran;
  // Baseline digeser setengah tinggi huruf ke bawah (tegak lurus) agar badan teks tepat di garis.
  const turun = ukuran * 0.35;
  const baris = rentang.map(r => {
    const tMulai = (r.t0 + r.t1) / 2 - lebar / 2;
    return { x: r.cx + tMulai * cos + turun * sin, y: r.cy + tMulai * sin - turun * cos };
  });
  return { ukuran, sudutDerajat: (sudut * 180) / Math.PI, baris, lebar };
}

export async function tandaAirPdf(isi: Uint8Array, teks: string, kode: string): Promise<Uint8Array> {
  const doc = await PDFDocument.load(isi);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const kecil = await doc.embedFont(StandardFonts.Helvetica);
  const t = amanWinAnsi(teks);
  for (const hal of doc.getPages()) {
    const { width, height } = hal.getSize();
    const posisi = posisiTandaAirPdf(width, height, font.widthOfTextAtSize(t, 1));
    for (const p of posisi.baris) {
      hal.drawText(t, { x: p.x, y: p.y, size: posisi.ukuran, font, color: rgb(0.8, 0.1, 0.1), opacity: 0.18, rotate: degrees(posisi.sudutDerajat) });
    }
    hal.drawText(amanWinAnsi(`${teks} - ${kode} - dibagikan lewat BQ-ku`), { x: 18, y: 12, size: 7, font: kecil, color: rgb(0.4, 0.4, 0.4), opacity: 0.8 });
  }
  return doc.save();
}

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function tandaAirGambar(isi: Uint8Array, mime: string, teks: string): Promise<Uint8Array> {
  const gambar = sharp(isi).rotate(); // hormati orientasi EXIF
  const { width = 1000, height = 1000 } = await gambar.metadata();
  const ukuran = Math.max(14, Math.round(Math.min(width, height) / 20));
  const baris: string[] = [];
  const jarak = ukuran * 5;
  for (let y = -height; y < height * 2; y += jarak) {
    baris.push(`<text x="${-width}" y="${y}" font-size="${ukuran}">${escapeXml(`${teks}     `.repeat(8))}</text>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <g transform="rotate(-30 ${width / 2} ${height / 2})" fill="rgb(200,30,30)" fill-opacity="0.22" font-family="sans-serif" font-weight="700">${baris.join('')}</g>
  </svg>`;
  const hasil = gambar.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]);
  const buf = mime === 'image/png' ? await hasil.png().toBuffer() : await hasil.jpeg({ quality: 88 }).toBuffer();
  return new Uint8Array(buf);
}

/** ZIP tanpa kompresi ulang berlebihan; nama ganda diberi akhiran " (2)". */
export function buatZip(berkas: Array<{ nama: string; isi: Uint8Array }>): Uint8Array {
  const isi: Record<string, Uint8Array> = {};
  for (const b of berkas) {
    let nama = b.nama;
    for (let i = 2; nama in isi; i++) nama = b.nama.replace(/(\.[^.]+)?$/, m => ` (${i})${m}`);
    isi[nama] = b.isi;
  }
  return zipSync(isi, { level: 6 });
}
