'use client';
import { useSelectedLayoutSegments } from 'next/navigation';
import type { MouseEvent } from 'react';
import type { Bahasa } from '@/lib/perpus/ddc';
import { BAHASA, pathBahasa } from '@/lib/perpus/domain';

/** Memakai segmen layout, bukan usePathname: halaman ini di-rewrite (lihat Global Constraints). */
export function PengalihBahasa({ lang, label }: { lang: Bahasa; label: string }) {
  const segmen = useSelectedLayoutSegments();
  const pindah = (e: MouseEvent<HTMLAnchorElement>, tujuan: string) => {
    e.preventDefault();
    window.location.assign(tujuan + window.location.search);
  };
  return (
    <div className="p-bahasa" role="group" aria-label={label}>
      {BAHASA.map(b => {
        const tujuan = pathBahasa(b, segmen);
        return <a key={b} href={tujuan} hrefLang={b} aria-current={b === lang} onClick={e => pindah(e, tujuan)}>{b.toUpperCase()}</a>;
      })}
    </div>
  );
}
