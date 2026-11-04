'use client';
import { useState } from 'react';
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
        <BarisBuku key={k.genre} lang={lang} buku={k.buku} jumlah={k.jumlah} semua={urlKatalog(lang, { genre: k.genre })}
          judul={<h3 className="w-fit rounded-lg px-2 py-0.5 font-extrabold" style={gayaWarna(warnaGenre(k.genre))}>{LABEL_GENRE[k.genre][lang]}</h3>} />
      ))}
      {mode === 'penulis' && penulis.map(k => (
        <div key={k.penulis} className="space-y-3">
          <KartuPenulis lang={lang} nama={k.penulis} jumlah={k.jumlah} penulis={profil.find(x => x.nama === k.penulis)} />
          <BarisBuku lang={lang} buku={k.buku} jumlah={k.jumlah} semua={urlKatalog(lang, { pengarang: k.penulis })} judul={null} />
        </div>
      ))}
    </section>
  );
}
