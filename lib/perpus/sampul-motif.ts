import { genreDari, type Genre } from '@/lib/perpus/ddc';
import { PALET, type Warna } from '@/lib/perpus/warna';

export type WarnaSampul = Warna & { aksen: string };
export type DesainSampul = WarnaSampul & { motif: number };

export const JUMLAH_MOTIF = 6;

const w = (dasar: Warna, aksen: string): WarnaSampul => ({ ...dasar, aksen });
const HIJAU_TUA: Warna = { latar: '#122922', teks: '#d6ee30' };
const HITAM: Warna = { latar: '#0a0f0d', teks: '#d6ee30' };
const COKLAT: Warna = { latar: '#2a1c06', teks: '#e9a93f' };

/** Tiap keluarga memberi beberapa pasangan, supaya buku segenre tetap berbeda. Kontrasnya diuji. */
export const KELUARGA = {
  ungu: [w(PALET.periwinkle, '#d6ee30'), w(PALET.indigo, '#7c75ff'), w(PALET.lavender, '#7c75ff'), w(PALET.terracotta, '#f8efdc')],
  teknologi: [w(PALET.indigo, '#d6ee30'), w(HITAM, '#3f8f77'), w(HIJAU_TUA, '#eeedff'), w(PALET.lime, '#16133f')],
  hijau: [w(PALET.teal, '#d6ee30'), w(HIJAU_TUA, '#3f8f77'), w(PALET.krem, '#3f8f77'), w(PALET.lime, '#3f8f77')],
  hangat: [w(PALET.amber, '#ffffff'), w(COKLAT, '#f8efdc'), w(PALET.krem, '#e9a93f'), w(PALET.terracotta, '#e9a93f')],
  netral: [w(PALET.krem, '#d97757'), w(PALET.lavender, '#3f8f77'), w(HIJAU_TUA, '#e9a93f'), w(PALET.amber, '#16133f')],
} satisfies Record<string, WarnaSampul[]>;

const KELUARGA_GENRE: Record<Genre, keyof typeof KELUARGA> = {
  islam: 'hijau', agama: 'hijau', pengembangan_diri: 'hijau',
  sastra: 'ungu', filsafat: 'ungu', seni: 'ungu',
  sains: 'teknologi', teknologi: 'teknologi',
  ekonomi_bisnis: 'hangat', sosial: 'hangat', sejarah: 'hangat',
  bahasa: 'netral', referensi: 'netral', lainnya: 'netral',
};

/** FNV-1a: judul yang mirip tetap tersebar merata. */
function hash(s: string): number {
  let n = 0x811c9dc5;
  for (const c of s) n = Math.imul(n ^ c.charCodeAt(0), 0x01000193);
  return (n ^ (n >>> 15)) >>> 0;
}

/** Dihitung dari judul: sampul sebuah buku selalu sama tanpa perlu disimpan. */
export function desainSampul(judul: string, kelasDdc: string): DesainSampul {
  const k = hash(judul);
  const keluarga = KELUARGA[KELUARGA_GENRE[genreDari(kelasDdc)]];
  return { ...keluarga[k % keluarga.length], motif: (k >>> 8) % JUMLAH_MOTIF };
}

/** Banyak judul impor berawalan nama penerbit; di sampul cukup judul intinya. */
export function judulPanel(judul: string): string {
  const inti = judul.split(' - ').slice(1).join(' - ').trim();
  return inti || judul.trim();
}
