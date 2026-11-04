'use client';
import { useRef } from 'react';
import Link from 'next/link';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import type { Bahasa } from '@/lib/perpus/ddc';
import { t } from '@/lib/perpus/i18n';
import type { BukuPublik } from '@/lib/perpus/tipe';
import { SampulBuku } from './SampulBuku';

export function BarisBuku({ lang, buku }: { lang: Bahasa; buku: BukuPublik[] }) {
  const baris = useRef<HTMLDivElement>(null);
  const geser = (arah: 1 | -1) => baris.current?.scrollBy({ left: arah * baris.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <div className="relative">
      <div ref={baris} className="p-baris-buku">
        {buku.map(b => (
          <Link key={b.id} href={`/${lang}/buku/${b.idPendek}`} className="w-40 shrink-0 snap-start space-y-2">
            <SampulBuku buku={b} besar />
            <p className="line-clamp-2 text-sm font-extrabold leading-snug">{b.judul}</p>
          </Link>
        ))}
      </div>
      <button type="button" className="p-panah left-0" aria-label={t(lang, 'beranda.geserKiri')} onClick={() => geser(-1)}><CaretLeft size={18} weight="bold" aria-hidden /></button>
      <button type="button" className="p-panah right-0" aria-label={t(lang, 'beranda.geserKanan')} onClick={() => geser(1)}><CaretRight size={18} weight="bold" aria-hidden /></button>
    </div>
  );
}
