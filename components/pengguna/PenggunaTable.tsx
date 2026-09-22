'use client';
import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Power, ShieldCheck, ArrowsClockwise } from '@phosphor-icons/react';
import { UndangPenggunaModal } from './UndangPenggunaModal';
import type { UserRole } from '@/lib/auth/roles';

type Row = { id: string; nama: string; email: string; role: UserRole; aktif: boolean; createdAt: string; status: 'PROFIL' | 'MENUNGGU'; lastSignInAt: string | null };

const ROLE_BADGE: Record<UserRole, string> = {
  SUPERADMIN: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  PANITIA: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200',
  VIEWER: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};
const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum pernah';
const fmtMasuk = (r: Row) => r.status === 'MENUNGGU' ? 'Menunggu masuk pertama via Google' : fmt(r.lastSignInAt);

export function PenggunaTable({ currentUserId }: { currentUserId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/pengguna');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat pengguna');
      setRows(data.data);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const patch = async (id: string, body: { role?: UserRole; aktif?: boolean }) => {
    setBusyId(id); setError(null);
    try {
      const res = await fetch(`/api/pengguna/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui');
      await load();
    } catch (e: any) { setError(e.message); } finally { setBusyId(null); }
  };

  const select = 'h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50';

  const RoleSelect = ({ r }: { r: Row }) => (
    <select aria-label={`Peran ${r.nama}`} value={r.role} disabled={r.id === currentUserId || busyId === r.id}
      onChange={e => patch(r.id, { role: e.target.value as UserRole })} className={select}>
      <option value="SUPERADMIN">Superadmin</option><option value="PANITIA">Panitia</option><option value="VIEWER">Viewer</option>
    </select>
  );
  const AktifToggle = ({ r }: { r: Row }) => (
    <button type="button" aria-pressed={r.aktif} aria-label={`${r.status === 'MENUNGGU' ? 'Hapus izin' : r.aktif ? 'Nonaktifkan' : 'Aktifkan'} ${r.nama}`}
      disabled={r.id === currentUserId || busyId === r.id} onClick={() => patch(r.id, { aktif: !r.aktif })}
      className={`h-11 px-3 rounded-xl inline-flex items-center gap-2 text-sm font-bold border transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
        r.aktif ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
      <Power size={16} weight="bold" /> {r.status === 'MENUNGGU' ? 'Diizinkan' : r.aktif ? 'Aktif' : 'Nonaktif'}
    </button>
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setModal(true)} className="h-11 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold inline-flex items-center gap-2">
          <UserPlus size={20} weight="bold" /> Tambah email
        </button>
        <button type="button" onClick={load} aria-label="Muat ulang" className="h-11 w-11 rounded-2xl border border-slate-200 dark:border-slate-700 inline-flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowsClockwise size={20} weight="bold" className={loading ? 'animate-spin' : ''} />
        </button>
        <span className="text-xs text-slate-500">{rows.length} pengguna</span>
      </div>
      {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl px-3 py-2">{error}</p>}

      {/* Desktop: tabel */}
      <div className="hidden md:block overflow-x-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <th className="px-5 py-3">Nama</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Peran</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Terakhir masuk</th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                <td className="px-5 py-3 font-bold">{r.nama}{r.id === currentUserId && <span className="ml-2 text-[11px] font-semibold text-teal-600">(Anda)</span>}</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{r.email}</td>
                <td className="px-5 py-3"><RoleSelect r={r} /></td>
                <td className="px-5 py-3"><AktifToggle r={r} /></td>
                <td className="px-5 py-3 text-slate-500">{fmtMasuk(r)}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">Belum ada pengguna.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Mobile: kartu */}
      <ul className="md:hidden space-y-3">
        {rows.map(r => (
          <li key={r.id} className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="font-bold truncate">{r.nama}{r.id === currentUserId && <span className="ml-2 text-[11px] font-semibold text-teal-600">(Anda)</span>}</p>
                <p className="text-xs text-slate-500 truncate">{r.email}</p></div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold inline-flex items-center gap-1 ${ROLE_BADGE[r.role]}`}><ShieldCheck size={12} weight="bold" />{r.role}</span>
            </div>
            <div className="flex items-center gap-2"><RoleSelect r={r} /><AktifToggle r={r} /></div>
            <p className="text-[11px] text-slate-500">Terakhir masuk: {fmtMasuk(r)}</p>
          </li>
        ))}
      </ul>

      <UndangPenggunaModal open={modal} onClose={() => setModal(false)} onInvited={load} />
    </section>
  );
}
