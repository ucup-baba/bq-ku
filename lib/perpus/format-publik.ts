import type { Bahasa } from '@/lib/perpus/ddc';

const LOKAL: Record<Bahasa, string> = { id: 'id-ID', en: 'en-US' };

export const rupiahPublik = (lang: Bahasa, n: number) => `Rp${n.toLocaleString(LOKAL[lang])}`;

export function tanggalPublik(lang: Bahasa, iso: string | null, cadangan?: string | null): string {
  if (!iso) return cadangan || '—';
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(LOKAL[lang], { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
