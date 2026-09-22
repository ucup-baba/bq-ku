'use client';
import { LockKey, SignOut } from '@phosphor-icons/react';

export function AkunBelumAktif({ email, onLogout }: { email: string; onLogout: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-300"><LockKey size={28} weight="duotone" /></div>
        <h1 className="font-extrabold text-lg">Akun belum diaktifkan</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">Anda masuk sebagai <span className="font-bold">{email}</span>, tetapi email ini belum didaftarkan oleh panitia. Hubungi Superadmin untuk mengaktifkan akses.</p>
        <button type="button" onClick={onLogout} className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold inline-flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800">
          <SignOut size={18} weight="bold" /> Keluar
        </button>
      </div>
    </div>
  );
}
