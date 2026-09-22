'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EnvelopeSimple, LockKey, SignIn, BookOpen } from '@phosphor-icons/react';
import { createBrowserSupabase } from '@/lib/supabase/client';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(params.get('error') === 'tautan-tidak-valid' ? 'Tautan tidak valid atau sudah kedaluwarsa.' : null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    const { error } = await createBrowserSupabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setError('Email atau kata sandi salah.'); return; }
    const next = params.get('next') || '/';
    router.push(next.startsWith('/') ? next : '/'); router.refresh();
  };

  const forgot = async () => {
    if (!email) { setError('Isi email dulu untuk mengirim tautan atur ulang.'); return; }
    setBusy(true); setError(null);
    const { error } = await createBrowserSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (error) setError('Gagal mengirim tautan. Coba lagi.');
    else setInfo('Tautan atur ulang kata sandi telah dikirim ke email Anda.');
  };

  const field = 'w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500';
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center text-white"><BookOpen size={24} weight="duotone" /></div>
          <div><h1 className="font-extrabold text-lg leading-tight">Baitul Qowwam</h1><p className="text-xs text-slate-500">Masuk panitia administrasi</p></div>
        </div>
        {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl px-3 py-2">{error}</p>}
        {info && <p role="status" className="text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2">{info}</p>}
        <label className="block space-y-1"><span className="text-xs font-semibold">Email</span>
          <div className="relative"><EnvelopeSimple size={20} className="absolute left-4 top-3.5 text-slate-400" />
            <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={field} /></div></label>
        <label className="block space-y-1"><span className="text-xs font-semibold">Kata sandi</span>
          <div className="relative"><LockKey size={20} className="absolute left-4 top-3.5 text-slate-400" />
            <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={field} /></div></label>
        <button type="submit" disabled={busy} className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2">
          <SignIn size={20} weight="bold" /> {busy ? 'Memproses…' : 'Masuk'}
        </button>
        <button type="button" onClick={forgot} disabled={busy} className="w-full text-xs text-slate-500 hover:text-teal-600">Lupa kata sandi?</button>
      </form>
    </div>
  );
}
