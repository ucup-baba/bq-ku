'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKey } from '@phosphor-icons/react';
import { createBrowserSupabase } from '@/lib/supabase/client';

export function ResetPasswordForm() {
  const router = useRouter();
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setError('Kata sandi minimal 8 karakter.');
    if (pw !== pw2) return setError('Konfirmasi kata sandi tidak sama.');
    setBusy(true); setError(null);
    const { error } = await createBrowserSupabase().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError('Gagal menyimpan kata sandi. Buka ulang tautan dari email.');
    router.push('/'); router.refresh();
  };
  const field = 'w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500';
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <h1 className="font-extrabold text-lg">Atur kata sandi</h1>
        {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl px-3 py-2">{error}</p>}
        <label className="block space-y-1"><span className="text-xs font-semibold">Kata sandi baru</span>
          <div className="relative"><LockKey size={20} className="absolute left-4 top-3.5 text-slate-400" /><input type="password" required minLength={8} autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} className={field} /></div></label>
        <label className="block space-y-1"><span className="text-xs font-semibold">Ulangi kata sandi</span>
          <div className="relative"><LockKey size={20} className="absolute left-4 top-3.5 text-slate-400" /><input type="password" required autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} className={field} /></div></label>
        <button type="submit" disabled={busy} className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold">{busy ? 'Menyimpan…' : 'Simpan & masuk'}</button>
      </form>
    </div>
  );
}
