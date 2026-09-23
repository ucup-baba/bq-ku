// Merender dua baris teks Arab (kop surat & doa) menjadi PNG statis memakai
// sharp/libvips (Pango + HarfBuzz), karena Satori (mesin next/og) tidak
// mendukung bidi/shaping Arab: huruf-huruf lafaz seperti "الله" pecah dan
// urutan kata terbalik saat dirender langsung sebagai teks di ImageResponse.
// Jalankan: npm run render:arab
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FONTFILE = path.resolve(ROOT, 'public/fonts/NotoNaskhArabic-Regular.ttf');

async function renderLine({ text, color, fontSize, dpi, out }) {
  const svgText = `<span foreground="${color}">${text}</span>`;
  const image = sharp({
    text: {
      text: svgText,
      font: `Noto Naskh Arabic ${fontSize}`,
      fontfile: FONTFILE,
      rgba: true,
      dpi,
    },
  });
  const outPath = path.resolve(ROOT, out);
  const info = await image.png().toFile(outPath);
  console.log(`${out}: ${info.width}x${info.height}px, ${info.size} byte`);
}

async function main() {
  // Kop surat: setinggi kira-kira teks 24px pada kanvas 1240px.
  await renderLine({
    text: 'منظمة الحضانة بيت القوام',
    color: '#0E9F54',
    fontSize: 24,
    dpi: 150,
    out: 'assets/surat/kop-arab.png',
  });

  // Doa: setinggi kira-kira teks 28px pada kanvas 1240px.
  await renderLine({
    text: 'بارك الله فيما أعطيت وبارك الله فيما أبقيت وجعله لك طهورا',
    color: '#111111',
    fontSize: 28,
    dpi: 150,
    out: 'assets/surat/doa-arab.png',
  });
}

main().catch((e) => {
  console.error('Gagal merender PNG Arab:', e);
  process.exit(1);
});
