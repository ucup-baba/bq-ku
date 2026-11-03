import { genreDari, LABEL_GENRE, type Bahasa, type Genre } from '@/lib/perpus/ddc';
import type { BukuPublik } from '@/lib/perpus/tipe';

export type SaringanKatalog = { q?: string; genre?: Genre; pengarang?: string; tersedia?: boolean };

const normal = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export function saringKatalog(buku: BukuPublik[], s: SaringanKatalog): BukuPublik[] {
  const q = s.q ? normal(s.q) : '';
  return buku.filter(b =>
    (!q || normal(`${b.judul} ${b.penulis}`).includes(q))
    && (!s.genre || genreDari(b.kelasDdc) === s.genre)
    && (!s.pengarang || b.penulis === s.pengarang)
    && (!s.tersedia || b.tersedia > 0));
}

export function daftarGenre(buku: BukuPublik[]): { genre: Genre; jumlah: number }[] {
  const hitung = new Map<Genre, number>();
  for (const b of buku) {
    const g = genreDari(b.kelasDdc);
    hitung.set(g, (hitung.get(g) ?? 0) + 1);
  }
  return [...hitung].map(([genre, jumlah]) => ({ genre, jumlah })).sort((a, b) => b.jumlah - a.jumlah);
}

export function daftarPengarang(buku: BukuPublik[], genre?: Genre): string[] {
  const nama = buku.filter(b => b.penulis && (!genre || genreDari(b.kelasDdc) === genre)).map(b => b.penulis);
  return [...new Set(nama)].sort((a, b) => a.localeCompare(b, 'id'));
}

export function bacaSaringan(sp: Record<string, string | string[] | undefined>): SaringanKatalog {
  const genre = satu(sp.genre);
  const hasil: SaringanKatalog = {};
  const q = satu(sp.q);
  const pengarang = satu(sp.pengarang);
  if (q) hasil.q = q;
  if (genre && genre in LABEL_GENRE) hasil.genre = genre as Genre;
  if (pengarang) hasil.pengarang = pengarang;
  if (satu(sp.tersedia)) hasil.tersedia = true;
  return hasil;
}

export function urlKatalog(lang: Bahasa, s: SaringanKatalog): string {
  const p = new URLSearchParams();
  if (s.q) p.set('q', s.q);
  if (s.genre) p.set('genre', s.genre);
  if (s.pengarang) p.set('pengarang', s.pengarang);
  if (s.tersedia) p.set('tersedia', '1');
  const query = p.toString();
  return `/${lang}/katalog${query ? `?${query}` : ''}`;
}

export const bukuTerbaru = (buku: BukuPublik[], n: number) =>
  [...buku].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, n);
