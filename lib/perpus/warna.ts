import { genreDari, type Genre } from '@/lib/perpus/ddc';
import type { StatusPinjaman } from '@/lib/perpus/tipe';

export type Warna = { latar: string; teks: string };

/** Lihat docs/research/perpus-tema/TOKENS.md. Setiap pasangan diuji kontrasnya minimal 4,5:1. */
export const PALET = {
  teal: { latar: '#3f8f77', teks: '#021510' },
  periwinkle: { latar: '#7c75ff', teks: '#16133f' },
  amber: { latar: '#e9a93f', teks: '#2a1c06' },
  indigo: { latar: '#16133f', teks: '#eeedff' },
  terracotta: { latar: '#d97757', teks: '#2a1006' },
  krem: { latar: '#f8efdc', teks: '#6e4709' },
  lavender: { latar: '#eeedff', teks: '#16133f' },
  lime: { latar: '#d6ee30', teks: '#1a2004' },
} as const satisfies Record<string, Warna>;

const WARNA_GENRE: Record<Genre, keyof typeof PALET> = {
  islam: 'teal',
  agama: 'krem',
  sastra: 'periwinkle',
  pengembangan_diri: 'lime',
  sains: 'indigo',
  teknologi: 'indigo',
  ekonomi_bisnis: 'amber',
  sosial: 'terracotta',
  bahasa: 'krem',
  filsafat: 'lavender',
  sejarah: 'terracotta',
  seni: 'lime',
  referensi: 'lavender',
  lainnya: 'krem',
};

export const warnaGenre = (genre: Genre): Warna => PALET[WARNA_GENRE[genre]];
export const warnaKelas = (kelasDdc: string): Warna => warnaGenre(genreDari(kelasDdc));

export const WARNA_STATUS: Record<StatusPinjaman, Warna> = {
  diajukan: PALET.amber,
  dipinjam: PALET.periwinkle,
  menunggu_verifikasi: PALET.lavender,
  dikembalikan: PALET.teal,
  ditolak: PALET.terracotta,
  dibatalkan: PALET.krem,
};

export const gayaWarna = (w: Warna) => ({ background: w.latar, color: w.teks });

function luminansi(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rasio kontras WCAG. */
export function kontras(a: string, b: string): number {
  const [terang, gelap] = [luminansi(a), luminansi(b)].sort((x, y) => y - x);
  return (terang + 0.05) / (gelap + 0.05);
}
