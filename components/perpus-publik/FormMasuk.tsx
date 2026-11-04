'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { GoogleLogo } from '@phosphor-icons/react';
import type { Bahasa } from '@/lib/perpus/ddc';
import { nextAman } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';
import { createBrowserSupabase } from '@/lib/supabase/client';

export function FormMasuk({ lang }: { lang: Bahasa }) {
  const params = useSearchParams();
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState(params.get('error') === 'tautan-tidak-valid');

  const masuk = async () => {
    setSibuk(true); setGalat(false);
    // Lewat cookie: URL callback harus persis sama dengan entri Redirect URLs di Supabase.
    const next = nextAman(params.get('next')) ?? `/${lang}/pinjamanku`;
    document.cookie = `bq_next=${encodeURIComponent(next)}; path=/; max-age=600; samesite=lax`;
    const { error } = await createBrowserSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setSibuk(false); setGalat(true); }
  };

  return (
    <section className="p-kartu mx-auto w-full max-w-md space-y-4 p-6">
      <h1 className="p-h2 text-3xl">{t(lang, 'masuk.judul')}</h1>
      <p className="text-perpus-tinta-lembut">{t(lang, 'masuk.sub')}</p>
      {galat && <p role="alert" className="font-bold">{t(lang, 'masuk.gagal')}</p>}
      <button type="button" onClick={masuk} disabled={sibuk} className="p-tombol w-full">
        <GoogleLogo size={20} weight="bold" aria-hidden />
        {t(lang, sibuk ? 'masuk.mengalihkan' : 'masuk.tombol')}
      </button>
    </section>
  );
}
