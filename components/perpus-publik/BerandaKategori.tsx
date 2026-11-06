'use client';
import { useState } from 'react';
import Link from 'next/link';
import { LABEL_GENRE, type Bahasa, type Genre } from '@/lib/perpus/ddc';
import { t } from '@/lib/perpus/i18n';
import { urlKatalog } from '@/lib/perpus/katalog';
import type { BukuPublik, Penulis } from '@/lib/perpus/tipe';
import { gayaWarna, warnaGenre } from '@/lib/perpus/warna';
import { BarisBuku } from './BarisBuku';
import { KartuBuku } from './KartuBuku';
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
  const semua = (href: string, n: number) => <Link href={href} className="p-pil">{t(lang, 'beranda.lihatSemua', { n })}</Link>;
  const kartu = (buku: BukuPublik[]) => buku.map(b => <KartuBuku key={b.id} lang={lang} buku={b} className="w-56 shrink-0 snap-start" />);
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
        <BarisBuku key={k.genre} lang={lang} aksi={semua(urlKatalog(lang, { genre: k.genre }), k.jumlah)}
          judul={<h3 className="w-fit rounded-lg px-2 py-0.5 font-extrabold" style={gayaWarna(warnaGenre(k.genre))}>{LABEL_GENRE[k.genre][lang]}</h3>}>
          {kartu(k.buku)}
        </BarisBuku>
      ))}
      {mode === 'penulis' && penulis.map(k => (
        <div key={k.penulis} className="space-y-3">
          <KartuPenulis lang={lang} nama={k.penulis} jumlah={k.jumlah} penulis={profil.find(x => x.nama === k.penulis)} />
          <BarisBuku lang={lang} aksi={semua(urlKatalog(lang, { pengarang: k.penulis }), k.jumlah)} judul={null}>{kartu(k.buku)}</BarisBuku>
        </div>
      ))}
    </section>
  );
}
