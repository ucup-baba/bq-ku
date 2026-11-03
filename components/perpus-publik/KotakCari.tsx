import type { Bahasa } from '@/lib/perpus/ddc';
import { t } from '@/lib/perpus/i18n';

/** Form GET biasa: tetap berfungsi tanpa JavaScript. */
export function KotakCari({ lang, nilai, children }: { lang: Bahasa; nilai?: string; children?: React.ReactNode }) {
  return (
    <form action={`/${lang}/katalog`} role="search" className="flex gap-2">
      <input type="search" name="q" defaultValue={nilai} className="p-input" aria-label={t(lang, 'cari.label')} placeholder={t(lang, 'cari.label')} />
      {children}
      <button type="submit" className="p-tombol shrink-0">{t(lang, 'cari.tombol')}</button>
    </form>
  );
}
