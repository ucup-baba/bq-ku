'use client';
import { useEffect, useRef, useState } from 'react';
import { X, UserPlus, Check } from '@phosphor-icons/react';
import { ALL_ROLES, getRoleLabel, type UserRole } from '@/lib/auth/roles';

export function UndangPenggunaModal({ open, onClose, onInvited }: { open: boolean; onClose: () => void; onInvited: () => void }) {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<UserRole[]>(['ADMIN_SANTRI']);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const firstInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setNama(''); setEmail(''); setRoles(['ADMIN_SANTRI']); setFields({}); setError(null);
    setTimeout(() => firstInput.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggleRole = (role: UserRole) => {
    setRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null); setFields({});
    if (roles.length === 0) { setFields({ roles: 'Pilih minimal satu peran' }); setBusy(false); return; }
    try {
      const res = await fetch('/api/pengguna', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, email, roles }),
      });
      const data = await res.json();
      if (res.status === 400 && data.fields) { setFields(data.fields); return; }
      if (!res.ok) { setError(data.error || 'Gagal mengundang pengguna.'); return; }
      onInvited(); onClose();
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally { setBusy(false); }
  };

  const field = 'w-full px-4 py-3 rounded-2xl border bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500';
  const border = (k: string) => fields[k] ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="undang-title">
      <button type="button" aria-label="Tutup" onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <form onSubmit={submit} className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="undang-title" className="flex items-center gap-2 font-extrabold text-lg"><UserPlus size={22} weight="duotone" className="text-teal-600" /> Tambah email yang diizinkan</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="w-11 h-11 -mr-2 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20} weight="bold" /></button>
        </div>
        <p className="text-xs text-slate-500">Pengguna masuk dengan akun Google beremail ini. Tidak ada email undangan yang dikirim.</p>
        {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl px-3 py-2">{error}</p>}
        <label className="block space-y-1"><span className="text-xs font-semibold">Nama</span>
          <input ref={firstInput} value={nama} onChange={e => setNama(e.target.value)} required className={`${field} ${border('nama')}`} />
          {fields.nama && <span className="text-xs text-rose-600">{fields.nama}</span>}</label>
        <label className="block space-y-1"><span className="text-xs font-semibold">Email</span>
          <input type="email" placeholder="nama@gmail.com" value={email} onChange={e => setEmail(e.target.value)} required className={`${field} ${border('email')}`} />
          {fields.email && <span className="text-xs text-rose-600">{fields.email}</span>}</label>
        <fieldset className={`space-y-2 rounded-2xl border p-3 ${border('roles')}`}>
          <legend className="text-xs font-semibold px-1">Peran</legend>
          {ALL_ROLES.map(role => (
            <label key={role} className="flex items-center gap-3 min-h-11 py-1 cursor-pointer">
              <input
                type="checkbox"
                checked={roles.includes(role)}
                onChange={() => toggleRole(role)}
                className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-sm">{getRoleLabel(role)}</span>
            </label>
          ))}
          {fields.roles && <span className="text-xs text-rose-600">{fields.roles}</span>}
        </fieldset>
        <button type="submit" disabled={busy} className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2">
          <Check size={20} weight="bold" /> {busy ? 'Menyimpan…' : 'Simpan'}
        </button>
      </form>
    </div>
  );
}
