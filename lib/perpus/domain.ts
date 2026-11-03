import type { Bahasa } from '@/lib/perpus/ddc';

export const BAHASA: readonly Bahasa[] = ['id', 'en'];
export const adaBahasa = (s: string): s is Bahasa => (BAHASA as readonly string[]).includes(s);

export type RutePerpus =
  | { jenis: 'alihkan'; ke: string }
  | { jenis: 'tulis-ulang'; ke: string }
  | { jenis: 'tolak' }
  | { jenis: 'lewat' };

/** `PERPUS_HOST` berisi daftar hostname dipisah koma (produksi, preview, `perpus.localhost`). */
export function hostPerpus(host: string | null, daftar = process.env.PERPUS_HOST): boolean {
  if (!host || !daftar) return false;
  const nama = host.split(':')[0].toLowerCase();
  return daftar.split(',').map(h => h.trim().toLowerCase()).includes(nama);
}

export function bahasaDari(accept: string | null): Bahasa {
  const pilihan = (accept ?? '').split(',').map(bagian => {
    const [tag, ...param] = bagian.trim().split(';');
    const q = param.map(p => p.trim()).find(p => p.startsWith('q='));
    return { tag: tag.trim().toLowerCase().split('-')[0], q: q ? Number(q.slice(2)) : 1 };
  }).filter(b => b.q > 0).sort((a, b) => b.q - a.q);
  return pilihan.map(p => p.tag).find(adaBahasa) ?? 'id';
}

/** API & auth ditolak karena penjaga ruangan bq-ku tidak berjalan di host perpus. */
export function ruteHostPerpus(pathname: string, accept: string | null): RutePerpus {
  if (pathname.startsWith('/_next/')) return { jenis: 'lewat' };
  if (/^\/(api|auth|perpusbq)(\/|$)/.test(pathname)) return { jenis: 'tolak' };
  if (pathname === '/') return { jenis: 'alihkan', ke: `/${bahasaDari(accept)}` };
  if (adaBahasa(pathname.split('/')[1])) return { jenis: 'tulis-ulang', ke: `/perpusbq${pathname}` };
  return { jenis: 'alihkan', ke: `/id${pathname}` };
}

export const pathBahasa = (lang: Bahasa, segmen: string[]) => `/${[lang, ...segmen].join('/')}`;
