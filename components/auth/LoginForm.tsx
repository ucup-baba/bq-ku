'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookOpen, GoogleLogo } from '@phosphor-icons/react';
import { createBrowserSupabase } from '@/lib/supabase/client';

export function LoginForm() {
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get('error') === 'tautan-tidak-valid' ? 'Proses masuk gagal. Silakan coba lagi.' : null,
  );

  const signIn = async () => {
    setBusy(true); setError(null);
    // Tujuan setelah masuk dititipkan lewat cookie: URL callback harus persis sama
    // dengan entri Redirect URLs di Supabase (query string ikut dicocokkan).
    const next = params.get('next') || '/';
    document.cookie = `bq_next=${encodeURIComponent(next.startsWith('/') ? next : '/')}; path=/; max-age=600; samesite=lax`;
    const { error } = await createBrowserSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setBusy(false); setError('Tidak dapat menghubungi Google. Coba lagi.'); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center text-white"><BookOpen size={24} weight="duotone" /></div>
          <div><h1 className="font-extrabold text-lg leading-tight">Baitul Qowwam</h1><p className="text-xs text-slate-500">Masuk panitia administrasi</p></div>
        </div>
        {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl px-3 py-2">{error}</p>}
        <button type="button" onClick={signIn} disabled={busy}
          className="w-full h-12 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-950/40 disabled:opacity-60 font-bold flex items-center justify-center gap-3 transition-colors">
          <GoogleLogo size={22} weight="bold" className="text-teal-600" /> {busy ? 'Mengalihkan ke Google…' : 'Masuk dengan Google'}
        </button>
        <p className="text-[11px] text-slate-500 text-center">Hanya email yang didaftarkan panitia yang dapat mengakses aplikasi.</p>
      </div>
    </div>
  );
}
