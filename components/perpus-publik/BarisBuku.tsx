'use client';
import { useRef } from 'react';
import Link from 'next/link';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import type { Bahasa } from '@/lib/perpus/ddc';
import { t } from '@/lib/perpus/i18n';
import type { BukuPublik } from '@/lib/perpus/tipe';
import { KartuBuku } from './KartuBuku';

type Props = { lang: Bahasa; buku: BukuPublik[]; judul: React.ReactNode; semua: string; jumlah: number };

export function BarisBuku({ lang, buku, judul, semua, jumlah }: Props) {
  const baris = useRef<HTMLDivElement>(null);
  const geser = (arah: 1 | -1) => baris.current?.scrollBy({ left: arah * baris.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">{judul}</div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" className="p-panah" aria-label={t(lang, 'beranda.geserKiri')} onClick={() => geser(-1)}><CaretLeft size={16} weight="bold" aria-hidden /></button>
          <button type="button" className="p-panah" aria-label={t(lang, 'beranda.geserKanan')} onClick={() => geser(1)}><CaretRight size={16} weight="bold" aria-hidden /></button>
          <Link href={semua} className="p-pil">{t(lang, 'beranda.lihatSemua', { n: jumlah })}</Link>
        </div>
      </div>
      <div ref={baris} className="p-baris-buku">
        {buku.map(b => <KartuBuku key={b.id} lang={lang} buku={b} className="w-56 shrink-0 snap-start" />)}
      </div>
    </div>
  );
}
