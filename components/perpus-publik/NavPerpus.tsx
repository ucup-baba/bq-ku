'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import { BookBookmark, Books, HandHeart, House, SignIn, UserCircle } from '@phosphor-icons/react';
import type { Bahasa } from '@/lib/perpus/ddc';
import { t } from '@/lib/perpus/i18n';
import { PALET } from '@/lib/perpus/warna';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { MenuPengguna } from './MenuPengguna';
import { PengalihBahasa } from './PengalihBahasa';

const JELAJAH = [
  { segmen: null, path: '', kunci: 'nav.beranda', Ikon: House, warna: PALET.lime },
  { segmen: 'katalog', path: '/katalog', kunci: 'nav.katalog', Ikon: Books, warna: PALET.amber },
  { segmen: 'donatur', path: '/donatur', kunci: 'nav.donatur', Ikon: HandHeart, warna: PALET.lavender },
] as const;
const PINJAMANKU = { segmen: 'pinjamanku', path: '/pinjamanku', kunci: 'nav.pinjamanku', Ikon: BookBookmark, warna: PALET.terracotta } as const;
const AKUN = { segmen: 'akun', path: '/akun', kunci: 'nav.akun', Ikon: UserCircle, warna: PALET.krem } as const;
const MASUK = { segmen: 'masuk', path: '/masuk', kunci: 'nav.masuk', Ikon: SignIn, warna: PALET.krem } as const;

type Item = typeof JELAJAH[number] | typeof PINJAMANKU | typeof AKUN | typeof MASUK;

export function NavPerpus({ lang }: { lang: Bahasa }) {
  const aktif = useSelectedLayoutSegment();
  // Detail buku bagian dari Katalog; daftar bagian dari Masuk.
  const segmen = aktif === 'buku' ? 'katalog' : aktif === 'daftar' ? 'masuk' : aktif;
  // Dibaca di klien agar layout tetap statis; getSession hanya membaca cookie browser.
  const [nama, setNama] = useState<string | null>(null);
  useEffect(() => {
    createBrowserSupabase().auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (user) setNama(user.user_metadata?.full_name || user.email || '?');
    });
  }, []);

  const tautan = ({ segmen: s, path, kunci, Ikon, warna }: Item, hanyaHp = false) => (
    <Link key={kunci} href={`/${lang}${path}`} className={`p-nav-item ${hanyaHp ? 'p-hanya-hp' : ''}`} aria-current={segmen === s ? 'page' : undefined}>
      <span className="p-nav-ikon" style={{ '--ikon': warna.latar } as CSSProperties}><Ikon size={22} weight={segmen === s ? 'fill' : 'regular'} aria-hidden /></span>
      {t(lang, kunci)}
    </Link>
  );

  return (
    <nav className="p-nav" aria-label={t(lang, 'nav.utama')}>
      <Link href={`/${lang}`} className="p-nav-merek">{t(lang, 'situs.nama')}</Link>
      <span className="p-nav-grup">{t(lang, 'nav.jelajah')}</span>
      {JELAJAH.map(i => tautan(i))}
      {nama && <span className="p-nav-grup">{t(lang, 'nav.milikku')}</span>}
      {nama && tautan(PINJAMANKU)}
      {tautan(nama ? AKUN : MASUK, true)}
      <div className="p-nav-bawah">
        <PengalihBahasa lang={lang} label={t(lang, 'nav.bahasa')} />
        <div className="p-hanya-desktop"><MenuPengguna lang={lang} nama={nama} /></div>
      </div>
    </nav>
  );
}
