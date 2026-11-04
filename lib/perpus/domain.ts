import type { Bahasa } from '@/lib/perpus/ddc';

export const BAHASA: readonly Bahasa[] = ['id', 'en'];
export const adaBahasa = (s: string): s is Bahasa => (BAHASA as readonly string[]).includes(s);

export type HalamanSesi = 'masuk' | 'daftar' | 'pinjamanku';

export type RutePerpus =
  | { jenis: 'alihkan'; ke: string }
  | { jenis: 'tulis-ulang'; ke: string; sesi?: HalamanSesi; lang?: Bahasa }
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

/** API bq-ku ditolak karena penjaga ruangan tidak berjalan di host perpus; API anggota menjaga dirinya lewat `requireMasuk`. */
export function ruteHostPerpus(pathname: string, accept: string | null): RutePerpus {
  if (pathname.startsWith('/_next/')) return { jenis: 'lewat' };
  if (pathname === '/auth/callback' || /^\/api\/perpus-publik(\/|$)/.test(pathname)) return { jenis: 'lewat' };
  if (/^\/(api|auth|perpusbq)(\/|$)/.test(pathname)) return { jenis: 'tolak' };
  if (pathname === '/manifest.webmanifest') return { jenis: 'tulis-ulang', ke: '/perpusbq/manifest' };
  if (pathname === '/') return { jenis: 'alihkan', ke: `/${bahasaDari(accept)}` };
  const lang = pathname.split('/')[1];
  if (adaBahasa(lang)) {
    const sesi = /^\/(?:id|en)\/(masuk|daftar|pinjamanku)\/?$/.exec(pathname)?.[1] as HalamanSesi | undefined;
    return { jenis: 'tulis-ulang', ke: `/perpusbq${pathname}`, ...(sesi ? { sesi, lang } : {}) };
  }
  return { jenis: 'alihkan', ke: `/id${pathname}` };
}

/** Tujuan setelah login hanya boleh path berbahasa di situs ini. */
export function nextAman(raw: string | null): string | null {
  if (!raw || raw.includes('\\') || raw.includes('//')) return null;
  return /^\/(id|en)(\/|$|\?)/.test(raw) ? raw : null;
}

const denganNext = (awal: string, next: string) => `${awal}?next=${encodeURIComponent(next)}`;

/** Ke mana halaman sesi dialihkan; null = tampilkan halaman. */
export function putusanSesi(
  halaman: HalamanSesi, lang: Bahasa, status: { masuk: boolean; anggota: boolean }, nextRaw: string | null,
): string | null {
  const tujuan = nextAman(nextRaw) ?? `/${lang}/pinjamanku`;
  if (!status.masuk) return halaman === 'masuk' ? null : denganNext(`/${lang}/masuk`, tujuan);
  if (!status.anggota) return halaman === 'daftar' ? null : denganNext(`/${lang}/daftar`, tujuan);
  return halaman === 'pinjamanku' ? null : tujuan;
}

const bahasaNext = (next: string | null, accept: string | null): Bahasa =>
  (next ? next.split(/[/?]/)[1] as Bahasa : bahasaDari(accept));

export function tujuanCallback(raw: string | null, adaAnggota: boolean, accept: string | null): string {
  const next = nextAman(raw);
  const lang = bahasaNext(next, accept);
  const tujuan = next ?? `/${lang}/pinjamanku`;
  return adaAnggota ? tujuan : denganNext(`/${lang}/daftar`, tujuan);
}

export const gagalCallback = (raw: string | null, accept: string | null) =>
  `/${bahasaNext(nextAman(raw), accept)}/masuk?error=tautan-tidak-valid`;

export const pathBahasa = (lang: Bahasa, segmen: string[]) => `/${[lang, ...segmen].join('/')}`;
