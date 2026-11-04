import { genreDari, type Genre } from '@/lib/perpus/ddc';
import type { BukuPublik, Penulis, PenulisAdmin } from '@/lib/perpus/tipe';

const MIN_GENRE = 3;
const MIN_PENULIS = 2;
type Batas = { baris?: number; buku?: number };

function kelompokkan<K>(buku: BukuPublik[], kunci: (b: BukuPublik) => K | null) {
  const peta = new Map<K, BukuPublik[]>();
  for (const b of buku) {
    const k = kunci(b);
    if (k === null) continue;
    peta.set(k, [...(peta.get(k) ?? []), b]);
  }
  return [...peta.entries()].sort((a, b) => b[1].length - a[1].length);
}

export function kelompokGenre(buku: BukuPublik[], { baris = 6, buku: maks = 12 }: Batas = {}) {
  return kelompokkan<Genre>(buku, b => genreDari(b.kelasDdc))
    .filter(([, rows]) => rows.length >= MIN_GENRE)
    .slice(0, baris)
    .map(([genre, rows]) => ({ genre, jumlah: rows.length, buku: rows.slice(0, maks) }));
}

export function kelompokPenulis(buku: BukuPublik[], penerbit: Set<string>, { baris = 8, buku: maks = 12 }: Batas = {}) {
  return kelompokkan<string>(buku, b => (b.penulis.trim() && !penerbit.has(b.penulis) ? b.penulis : null))
    .filter(([, rows]) => rows.length >= MIN_PENULIS)
    .slice(0, baris)
    .map(([penulis, rows]) => ({ penulis, jumlah: rows.length, buku: rows.slice(0, maks) }));
}

export function gabungPenulis(namaBuku: string[], profil: Penulis[]): PenulisAdmin[] {
  const jumlah = new Map<string, number>();
  for (const n of namaBuku) if (n.trim()) jumlah.set(n, (jumlah.get(n) ?? 0) + 1);
  return [...jumlah.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([nama, jumlahBuku]) => ({ nama, jumlahBuku, profil: profil.find(p => p.nama === nama) ?? null }));
}
