import 'server-only';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export type SuratAssets = {
  logo: string;
  stempel: string;
  ttd: string;
  /** Kop lengkap (logo berwarna, tulisan Arab, nama panti, akte/izin/alamat, garis hijau bawah) — hasil ekspor CorelDRAW asli. */
  kop: string;
  /** Baris doa Arab kaligrafi — hasil ekspor CorelDRAW asli. */
  doaCdr: string;
};

// Aset surat (TTD, stempel, logo, kop, doa) sengaja TIDAK berada di public/
// agar tidak bisa diunduh siapa pun tanpa login. Hanya dibaca di server;
// Next men-trace folder ini secara otomatis ke bundle rute PNG karena
// dibaca lewat fs.readFile dengan path statis (bukan dinamis) di atas.
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
  const [logo, stempel, ttd, kop, doaCdr] = await Promise.all([
    asPngDataUriFromWebp('logo.webp'),
    asPngDataUriFromWebp('stempel.webp'),
    asDataUri('ttd-rotasi.png', 'image/png'),
    // TTD memakai ttd-rotasi.png (diputar 90° ke kiri & dipangkas). Kop & doa sudah berupa
    // PNG hasil ekspor CorelDRAW asli (lihat AGENTS.md
    // pengurus), dimuat apa adanya sebagai <img>.
    asDataUri('kop.png', 'image/png'),
    asDataUri('doa-cdr.png', 'image/png'),
  ]);
  return { logo, stempel, ttd, kop, doaCdr };
}

// Font Latin untuk badan surat (Arimo — pengganti Arial, ukuran huruf
// identik), judul "JAZAKUMULLAHU..." (Bebas), dan isian tulisan tangan yang
// bisa dipilih per surat (Kalam / Patrick Hand). Baris Arab sudah berupa PNG
// pra-render (kop.png, doa-cdr.png) sehingga font Arab tidak perlu dimuat.
async function buildSuratFonts() {
  const dir = path.join(process.cwd(), 'assets', 'surat', 'fonts');
  const read = (f: string) => fs.readFile(path.join(dir, f));
  const [arimoReg, arimoBold, arimoItalic, bebas, kalam, patrick] = await Promise.all([
    read('Arimo-Regular.ttf'),
    read('Arimo-Bold.ttf'),
    read('Arimo-Italic.ttf'),
    read('BebasNeue-Regular.ttf'),
    read('Kalam-Regular.ttf'),
    read('PatrickHand-Regular.ttf'),
  ]);
  return [
    { name: 'Arimo', data: arimoReg, weight: 400 as const, style: 'normal' as const },
    { name: 'Arimo', data: arimoBold, weight: 700 as const, style: 'normal' as const },
    { name: 'Arimo', data: arimoItalic, weight: 400 as const, style: 'italic' as const },
    { name: 'Bebas', data: bebas, weight: 400 as const, style: 'normal' as const },
    { name: 'Kalam', data: kalam, weight: 400 as const, style: 'normal' as const },
    { name: 'Patrick', data: patrick, weight: 400 as const, style: 'normal' as const },
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
