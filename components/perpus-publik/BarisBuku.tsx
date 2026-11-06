'use client';
import { useRef } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import type { Bahasa } from '@/lib/perpus/ddc';
import { t } from '@/lib/perpus/i18n';

type Props = { lang: Bahasa; judul: React.ReactNode; aksi?: React.ReactNode; children: React.ReactNode };

/** Baris geser dengan panah di kanan atas; isi kartunya dari pemanggil. */
export function BarisBuku({ lang, judul, aksi, children }: Props) {
  const baris = useRef<HTMLDivElement>(null);
  const geser = (arah: 1 | -1) => baris.current?.scrollBy({ left: arah * baris.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">{judul}</div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" className="p-panah" aria-label={t(lang, 'beranda.geserKiri')} onClick={() => geser(-1)}><CaretLeft size={16} weight="bold" aria-hidden /></button>
          <button type="button" className="p-panah" aria-label={t(lang, 'beranda.geserKanan')} onClick={() => geser(1)}><CaretRight size={16} weight="bold" aria-hidden /></button>
          {aksi}
        </div>
      </div>
      <div ref={baris} className="p-baris-buku">
        {children}
      </div>
    </div>
  );
}
