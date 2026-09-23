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

// Aset surat (TTD, stempel, logo, baris Arab) sengaja TIDAK berada di public/
// agar tidak bisa diunduh siapa pun tanpa login. Hanya dibaca di server;
// next.config.mjs memastikan folder ini ikut ter-trace ke bundle rute PNG.
const ASET_DIR = path.join(process.cwd(), 'assets', 'surat');

const asDataUri = async (nama: string, mime: string) => {
  const buf = await fs.readFile(path.join(ASET_DIR, nama));
  return `data:${mime};base64,${buf.toString('base64')}`;
};

// Satori/resvg (mesin di balik next/og) gagal mem-parsing dimensi gambar WEBP
// ("u2 is not iterable"), jadi aset .webp ditranskode ke PNG di memori sebelum
// dijadikan data URI. Berkas asli di assets/surat/ tidak diubah.
const asPngDataUriFromWebp = async (nama: string) => {
  const buf = await fs.readFile(path.join(ASET_DIR, nama));
  const png = await sharp(buf).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
};

async function buildSuratAssets(): Promise<SuratAssets> {
  const [logo, stempel, ttd, kopArab, doaArab] = await Promise.all([
    asPngDataUriFromWebp('logo.webp'),
    asPngDataUriFromWebp('stempel.webp'),
    asDataUri('ttd.png', 'image/png'),
    // Satori tidak mendukung bidi/shaping Arab (kata terbalik, huruf lafaz
    // "الله" pecah), jadi kedua baris Arab dipra-render menjadi PNG statis
    // oleh scripts/render-arab.mjs dan dimuat di sini sebagai <img> biasa.
    asDataUri('kop-arab.png', 'image/png'),
    asDataUri('doa-arab.png', 'image/png'),
  ]);
  return { logo, stempel, ttd, kopArab, doaArab };
}

// Hanya font Latin: baris Arab sudah berupa PNG pra-render (kop-arab.png,
// doa-arab.png), jadi font Naskh tidak perlu dimuat ke Satori. Berkas
// NotoNaskhArabic-Regular.ttf tetap di repo untuk scripts/render-arab.mjs.
async function buildSuratFonts() {
  const read = (f: string) => fs.readFile(path.join(process.cwd(), 'public', 'fonts', f));
  const [reg, bold] = await Promise.all([
    read('PlusJakartaSans-Regular.ttf'),
    read('PlusJakartaSans-Bold.ttf'),
  ]);
  return [
    { name: 'Jakarta', data: reg, weight: 400 as const, style: 'normal' as const },
    { name: 'Jakarta', data: bold, weight: 700 as const, style: 'normal' as const },
  ];
}

// Membaca berkas & mentranskode WebP pada setiap request itu mahal; kedua
// hasil dimemoisasi tingkat modul sehingga hanya dikerjakan sekali per
// instans server (mengikuti pola lain di repo ini). Bila pembacaan gagal
// (mis. I/O sementara saat cold start), promise yang ditolak DIBUANG dari
// cache agar percobaan berikutnya membaca ulang berkas alih-alih terus
// mengembalikan galat yang sama sampai server di-restart.
let assetsPromise: Promise<SuratAssets> | null = null;
let fontsPromise: ReturnType<typeof buildSuratFonts> | null = null;

export function loadSuratAssets(): Promise<SuratAssets> {
  if (!assetsPromise) {
    assetsPromise = buildSuratAssets().catch((e) => {
      assetsPromise = null;
      throw e;
    });
  }
  return assetsPromise;
}

export function loadSuratFonts(): ReturnType<typeof buildSuratFonts> {
  if (!fontsPromise) {
    fontsPromise = buildSuratFonts().catch((e) => {
      fontsPromise = null;
      throw e;
    });
  }
  return fontsPromise;
}
