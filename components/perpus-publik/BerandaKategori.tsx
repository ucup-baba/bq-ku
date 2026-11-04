'use client';
import { useState } from 'react';
import Link from 'next/link';
import { LABEL_GENRE, type Bahasa, type Genre } from '@/lib/perpus/ddc';
import { t } from '@/lib/perpus/i18n';
import { urlKatalog } from '@/lib/perpus/katalog';
import type { BukuPublik, Penulis } from '@/lib/perpus/tipe';
import { gayaWarna, warnaGenre } from '@/lib/perpus/warna';
import { BarisBuku } from './BarisBuku';
import { KartuPenulis } from './KartuPenulis';

type Props = {
  lang: Bahasa;
  genre: { genre: Genre; jumlah: number; buku: BukuPublik[] }[];
  penulis: { penulis: string; jumlah: number; buku: BukuPublik[] }[];
  profil: Penulis[];
};

export function BerandaKategori({ lang, genre, penulis, profil }: Props) {
  const [mode, setMode] = useState<'genre' | 'penulis'>('genre');
  const pilihan = [['genre', 'beranda.perGenre'], ['penulis', 'beranda.perPenulis']] as const;
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="p-h2">{t(lang, 'beranda.jelajah')}</h2>
        <div className="flex gap-2" role="group" aria-label={t(lang, 'beranda.jelajah')}>
          {pilihan.map(([nilai, kunci]) => (
            <button key={nilai} type="button" aria-pressed={mode === nilai} onClick={() => setMode(nilai)} className={`p-pil ${mode === nilai ? 'p-pil-aktif' : ''}`}>{t(lang, kunci)}</button>
          ))}
        </div>
      </div>
      {mode === 'genre' && genre.map(k => (
        <div key={k.genre} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="rounded-lg px-2 py-0.5 font-extrabold" style={gayaWarna(warnaGenre(k.genre))}>{LABEL_GENRE[k.genre][lang]}</h3>
            <Link href={urlKatalog(lang, { genre: k.genre })} className="text-sm font-bold underline underline-offset-2">{t(lang, 'beranda.lihatSemua', { n: k.jumlah })}</Link>
          </div>
          <BarisBuku lang={lang} buku={k.buku} />
        </div>
      ))}
      {mode === 'penulis' && penulis.map(k => {
        const p = profil.find(x => x.nama === k.penulis);
        return (
          <div key={k.penulis} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-extrabold">{k.penulis}</h3>
              <Link href={urlKatalog(lang, { pengarang: k.penulis })} className="shrink-0 text-sm font-bold underline underline-offset-2">{t(lang, 'beranda.lihatSemua', { n: k.jumlah })}</Link>
            </div>
            {p && <KartuPenulis lang={lang} penulis={p} />}
            <BarisBuku lang={lang} buku={k.buku} />
          </div>
        );
      })}
    </section>
  );
}
