import 'server-only';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export type SuratAssets = { logo: string; stempel: string; ttd: string };

const asDataUri = async (rel: string, mime: string) => {
  const buf = await fs.readFile(path.join(process.cwd(), 'public', rel));
  return `data:${mime};base64,${buf.toString('base64')}`;
};

// Satori/resvg (mesin di balik next/og) gagal mem-parsing dimensi gambar WEBP
// ("u2 is not iterable"), jadi aset .webp ditranskode ke PNG di memori sebelum
// dijadikan data URI. Berkas asli di public/brand/ tidak diubah.
const asPngDataUriFromWebp = async (rel: string) => {
  const buf = await fs.readFile(path.join(process.cwd(), 'public', rel));
  const png = await sharp(buf).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
};

export async function loadSuratAssets(): Promise<SuratAssets> {
  const [logo, stempel, ttd] = await Promise.all([
    asPngDataUriFromWebp('brand/logo.webp'),
    asPngDataUriFromWebp('brand/stempel.webp'),
    asDataUri('brand/ttd.png', 'image/png'),
  ]);
  return { logo, stempel, ttd };
}

export async function loadSuratFonts() {
  const read = (f: string) => fs.readFile(path.join(process.cwd(), 'public', 'fonts', f));
  const [reg, bold, arab] = await Promise.all([
    read('PlusJakartaSans-Regular.ttf'),
    read('PlusJakartaSans-Bold.ttf'),
    read('NotoNaskhArabic-Regular.ttf'),
  ]);
  return [
    { name: 'Jakarta', data: reg, weight: 400 as const, style: 'normal' as const },
    { name: 'Jakarta', data: bold, weight: 700 as const, style: 'normal' as const },
    { name: 'Naskh', data: arab, weight: 400 as const, style: 'normal' as const },
  ];
}
