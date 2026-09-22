import 'server-only';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export type SuratAssets = {
  logo: string;
  stempel: string;
  ttd: string;
  /** PNG statis "منظمة الحضانة بيت القوام" pra-render dengan Pango/HarfBuzz (lihat scripts/render-arab.mjs). */
  kopArab: string;
  /** PNG statis baris doa Arab pra-render dengan Pango/HarfBuzz (lihat scripts/render-arab.mjs). */
  doaArab: string;
};

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

async function buildSuratAssets(): Promise<SuratAssets> {
  const [logo, stempel, ttd, kopArab, doaArab] = await Promise.all([
    asPngDataUriFromWebp('brand/logo.webp'),
    asPngDataUriFromWebp('brand/stempel.webp'),
    asDataUri('brand/ttd.png', 'image/png'),
    // Satori tidak mendukung bidi/shaping Arab (kata terbalik, huruf lafaz
    // "الله" pecah), jadi kedua baris Arab dipra-render menjadi PNG statis
    // oleh scripts/render-arab.mjs dan dimuat di sini sebagai <img> biasa.
    asDataUri('brand/kop-arab.png', 'image/png'),
    asDataUri('brand/doa-arab.png', 'image/png'),
  ]);
  return { logo, stempel, ttd, kopArab, doaArab };
}

async function buildSuratFonts() {
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

// Membaca berkas & mentranskode WebP pada setiap request itu mahal; kedua
// hasil dimemoisasi tingkat modul sehingga hanya dikerjakan sekali per
// instans server (mengikuti pola lain di repo ini).
let assetsPromise: Promise<SuratAssets> | null = null;
let fontsPromise: ReturnType<typeof buildSuratFonts> | null = null;

export function loadSuratAssets(): Promise<SuratAssets> {
  return (assetsPromise ??= buildSuratAssets());
}

export function loadSuratFonts() {
  return (fontsPromise ??= buildSuratFonts());
}
