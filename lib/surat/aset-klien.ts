import type { SuratAssets } from '@/lib/surat/assets';

/**
 * Aset surat yang boleh dimuat browser untuk pratinjau (lewat rute ber-login
 * ruang donatur, bukan public/). Nama berkas → [subfolder, tipe MIME].
 */
export const ASET_KLIEN: Record<string, readonly [folder: '' | 'fonts', mime: string]> = {
  'kop.png': ['', 'image/png'],
  'doa-cdr.png': ['', 'image/png'],
  'ttd-rotasi.png': ['', 'image/png'],
  'logo.webp': ['', 'image/webp'],
  'stempel.webp': ['', 'image/webp'],
  'Arimo-Regular.ttf': ['fonts', 'font/ttf'],
  'Arimo-Bold.ttf': ['fonts', 'font/ttf'],
  'Arimo-Italic.ttf': ['fonts', 'font/ttf'],
  'BebasNeue-Regular.ttf': ['fonts', 'font/ttf'],
  'Kalam-Regular.ttf': ['fonts', 'font/ttf'],
  'PatrickHand-Regular.ttf': ['fonts', 'font/ttf'],
};

export function asetDiizinkan(nama: string): boolean {
  return Object.prototype.hasOwnProperty.call(ASET_KLIEN, nama);
}

const url = (nama: string) => `/api/donatur/surat/aset/${nama}`;

/** Nama penandatangan bila Berkas lembaga belum punya tanda tangan (boleh dipakai klien & server). */
export const NAMA_PENANDATANGAN_BAWAAN = 'Aris Eko Purwanto, S.T';

/** Aset untuk SuratTemplate di browser (browser membaca WebP langsung, tanpa transkode). */
export const ASET_PRATINJAU: SuratAssets = {
  kop: url('kop.png'),
  doaCdr: url('doa-cdr.png'),
  ttd: url('ttd-rotasi.png'),
  logo: url('logo.webp'),
  stempel: url('stempel.webp'),
  namaPenandatangan: NAMA_PENANDATANGAN_BAWAAN,
};

/** Font dengan nama keluarga yang sama seperti yang didaftarkan ke Satori (lihat loadSuratFonts). */
export const FONT_PRATINJAU = [
  { family: 'Arimo', src: url('Arimo-Regular.ttf'), weight: '400', style: 'normal' },
  { family: 'Arimo', src: url('Arimo-Bold.ttf'), weight: '700', style: 'normal' },
  { family: 'Arimo', src: url('Arimo-Italic.ttf'), weight: '400', style: 'italic' },
  { family: 'Bebas', src: url('BebasNeue-Regular.ttf'), weight: '400', style: 'normal' },
  { family: 'Kalam', src: url('Kalam-Regular.ttf'), weight: '400', style: 'normal' },
  { family: 'Patrick', src: url('PatrickHand-Regular.ttf'), weight: '400', style: 'normal' },
] as const;
