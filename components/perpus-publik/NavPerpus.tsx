'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import { BookBookmark, Books, HandHeart, House, SignIn } from '@phosphor-icons/react';
import type { Bahasa } from '@/lib/perpus/ddc';
import { t } from '@/lib/perpus/i18n';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { PengalihBahasa } from './PengalihBahasa';

const ITEM = [
  { segmen: null, path: '', kunci: 'nav.beranda', Ikon: House },
  { segmen: 'katalog', path: '/katalog', kunci: 'nav.katalog', Ikon: Books },
  { segmen: 'donatur', path: '/donatur', kunci: 'nav.donatur', Ikon: HandHeart },
] as const;
const PINJAMANKU = { segmen: 'pinjamanku', path: '/pinjamanku', kunci: 'nav.pinjamanku', Ikon: BookBookmark } as const;
const MASUK = { segmen: 'masuk', path: '/masuk', kunci: 'nav.masuk', Ikon: SignIn } as const;

export function NavPerpus({ lang }: { lang: Bahasa }) {
  const aktif = useSelectedLayoutSegment();
  // Detail buku bagian dari Katalog; daftar bagian dari Masuk.
  const segmen = aktif === 'buku' ? 'katalog' : aktif === 'daftar' ? 'masuk' : aktif;
  // Dibaca di klien agar layout tetap statis; getSession hanya membaca cookie browser.
  const [masuk, setMasuk] = useState(false);
  useEffect(() => {
    createBrowserSupabase().auth.getSession().then(({ data }) => setMasuk(!!data.session));
  }, []);
  return (
    <nav className="p-nav" aria-label={t(lang, 'nav.utama')}>
      <Link href={`/${lang}`} className="p-nav-merek">{t(lang, 'situs.nama')}</Link>
      {[...ITEM, masuk ? PINJAMANKU : MASUK].map(({ segmen: s, path, kunci, Ikon }) => (
        <Link key={kunci} href={`/${lang}${path}`} className="p-nav-item" aria-current={segmen === s ? 'page' : undefined}>
          <Ikon size={22} weight={segmen === s ? 'fill' : 'regular'} aria-hidden />
          {t(lang, kunci)}
        </Link>
      ))}
      <PengalihBahasa lang={lang} label={t(lang, 'nav.bahasa')} />
    </nav>
  );
}
