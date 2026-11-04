'use client';
import { useState } from 'react';
import Link from 'next/link';
import { CaretUp, SignOut, UserCircle } from '@phosphor-icons/react';
import type { Bahasa } from '@/lib/perpus/ddc';
import { t } from '@/lib/perpus/i18n';
import { createBrowserSupabase } from '@/lib/supabase/client';

/** Kartu pengguna di dasar sidebar desktop; tamu melihat tombol Masuk. */
export function MenuPengguna({ lang, nama }: { lang: Bahasa; nama: string | null }) {
  const [buka, setBuka] = useState(false);
  if (!nama) return <Link href={`/${lang}/masuk`} className="p-tombol w-full">{t(lang, 'nav.masuk')}</Link>;

  const keluar = async () => {
    await createBrowserSupabase().auth.signOut();
    window.location.assign(`/${lang}`);
  };
  return (
    <div className="relative">
      {buka && (
        <div className="p-menu">
          <Link href={`/${lang}/akun`} className="p-menu-item" onClick={() => setBuka(false)}><UserCircle size={20} aria-hidden /> {t(lang, 'nav.akun')}</Link>
          <button type="button" className="p-menu-item" onClick={keluar}><SignOut size={20} aria-hidden /> {t(lang, 'akun.keluar')}</button>
        </div>
      )}
      <button type="button" className="p-pengguna" aria-expanded={buka} aria-label={t(lang, 'nav.menu')} onClick={() => setBuka(!buka)}>
        <span className="p-avatar">{nama.charAt(0).toUpperCase()}</span>
        <span className="min-w-0 flex-1 truncate text-left">{nama}</span>
        <CaretUp size={16} aria-hidden className={buka ? '' : 'rotate-180'} />
      </button>
    </div>
  );
}
