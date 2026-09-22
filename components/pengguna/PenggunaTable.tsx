'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserPlus, Prohibit, CheckCircle, ShieldCheck, ArrowsClockwise, Trash, Warning, PencilSimple, Check, X } from '@phosphor-icons/react';
import { UndangPenggunaModal } from './UndangPenggunaModal';
import { ALL_ROLES, getRoleLabel, type UserRole } from '@/lib/auth/roles';
import { roomsFor, ROOM_LABEL, type Room } from '@/lib/auth/rooms';

type Row = { id: string; nama: string; email: string; roles: UserRole[]; aktif: boolean; createdAt: string; status: 'PROFIL' | 'MENUNGGU'; lastSignInAt: string | null };

const ROLE_BADGE: Record<UserRole, string> = {
  SUPERADMIN: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  ADMIN_SANTRI: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200',
  ADMIN_DONATUR: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  VIEWER: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};
const RUANGAN_FILTER: { value: 'semua' | Room; label: string }[] = [
  { value: 'semua', label: 'Semua' },
  { value: 'santri', label: ROOM_LABEL.santri },
  { value: 'donatur', label: ROOM_LABEL.donatur },
];
const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum pernah';
const fmtMasuk = (r: Row) => r.status === 'MENUNGGU' ? 'Menunggu masuk pertama via Google' : fmt(r.lastSignInAt);

export function PenggunaTable({ currentUserId }: { currentUserId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [konfirmHapus, setKonfirmHapus] = useState<Row | null>(null);
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [editRoles, setEditRoles] = useState<UserRole[]>([]);
  const [ruangan, setRuangan] = useState<'semua' | Room>('semua');

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

  const filteredRows = useMemo(() => {
    if (ruangan === 'semua') return rows;
    return rows.filter(r => roomsFor(r.roles).includes(ruangan));
  }, [rows, ruangan]);

  const patch = async (id: string, body: { roles?: UserRole[]; aktif?: boolean }) => {
    setBusyId(id); setError(null);
    try {
      const res = await fetch(`/api/pengguna/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui');
      setEditRoleId(null);
      await load();
    } catch (e: any) { setError(e.message); } finally { setBusyId(null); }
  };

  const hapus = async (r: Row) => {
    setBusyId(r.id); setError(null);
    try {
      const res = await fetch(`/api/pengguna/${encodeURIComponent(r.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus');
      setKonfirmHapus(null);
      await load();
    } catch (e: any) { setError(e.message); } finally { setBusyId(null); }
  };

  const bukaEditRole = (r: Row) => { setEditRoleId(r.id); setEditRoles(r.roles); };
  const toggleEditRole = (role: UserRole) => {
    setEditRoles(prev => prev.includes(role) ? prev.filter(x => x !== role) : [...prev, role]);
  };
  const simpanRole = (r: Row) => {
    if (editRoles.length === 0) { setError('Pilih minimal satu peran'); return; }
    patch(r.id, { roles: editRoles });
  };

  const RolePeran = ({ r }: { r: Row }) => {
    const diriSendiri = r.id === currentUserId;
    const busy = busyId === r.id;
    if (editRoleId === r.id) {
      return (
        <div className="space-y-2 rounded-2xl border border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-900/10 p-3 w-64">
          {ALL_ROLES.map(role => (
            <label key={role} className="flex items-center gap-2 min-h-11 py-0.5 cursor-pointer">
              <input type="checkbox" checked={editRoles.includes(role)} onChange={() => toggleEditRole(role)}
                className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-2 focus:ring-teal-500" />
              <span className="text-sm">{getRoleLabel(role)}</span>
            </label>
          ))}
          <div className="flex gap-2 pt-1">
            <button type="button" aria-label={`Simpan peran ${r.nama}`} disabled={busy} onClick={() => simpanRole(r)}
              className="h-11 flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold inline-flex items-center justify-center gap-1 text-sm">
              <Check size={16} weight="bold" /> {busy ? 'Menyimpan…' : 'Simpan'}
            </button>
            <button type="button" aria-label="Batal ubah peran" disabled={busy} onClick={() => setEditRoleId(null)}
              className="h-11 w-11 rounded-xl border border-slate-200 dark:border-slate-700 inline-flex items-center justify-center">
              <X size={16} weight="bold" />
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {r.roles.map(role => (
          <span key={role} className={`rounded-full px-2 py-0.5 text-[11px] font-bold inline-flex items-center gap-1 ${ROLE_BADGE[role]}`}>
            <ShieldCheck size={12} weight="bold" />{getRoleLabel(role)}
          </span>
        ))}
        <button type="button" aria-label={`Ubah peran ${r.nama}`} disabled={diriSendiri || busy}
          onClick={() => bukaEditRole(r)}
          className="h-8 w-8 rounded-full inline-flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-teal-600 hover:border-teal-300 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-teal-500">
          <PencilSimple size={14} weight="bold" />
        </button>
      </div>
    );
  };

  const AktifToggle = ({ r }: { r: Row }) => (
    <button type="button" aria-pressed={!r.aktif} aria-label={`${r.aktif ? 'Blokir' : 'Buka blokir'} ${r.nama}`}
      disabled={r.id === currentUserId || busyId === r.id || r.status === 'MENUNGGU'} onClick={() => patch(r.id, { aktif: !r.aktif })}
      className={`h-11 px-3 rounded-xl inline-flex items-center gap-2 text-sm font-bold border transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
        r.aktif ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800'}`}>
      {r.aktif ? <CheckCircle size={16} weight="bold" /> : <Prohibit size={16} weight="bold" />}
      {r.status === 'MENUNGGU' ? 'Diizinkan' : r.aktif ? 'Aktif' : 'Diblokir'}
    </button>
  );
  const HapusButton = ({ r }: { r: Row }) => (
    <button type="button" aria-label={`Hapus ${r.nama}`} disabled={r.id === currentUserId || busyId === r.id}
      onClick={() => setKonfirmHapus(r)}
      className="h-11 w-11 rounded-xl inline-flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-colors">
      <Trash size={18} weight="bold" />
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
        <div className="flex items-center gap-1 rounded-2xl border border-slate-200 dark:border-slate-700 p-1" role="group" aria-label="Filter ruangan">
          {RUANGAN_FILTER.map(f => (
            <button key={f.value} type="button" onClick={() => setRuangan(f.value)}
              aria-pressed={ruangan === f.value}
              className={`h-9 px-3 rounded-xl text-xs font-bold transition-colors ${ruangan === f.value ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500">{filteredRows.length} pengguna</span>
      </div>
      {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl px-3 py-2">{error}</p>}

      {/* Desktop: tabel */}
      <div className="hidden md:block overflow-x-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <th className="px-5 py-3">Nama</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Peran</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Terakhir masuk</th><th className="px-5 py-3 text-right">Aksi</th>
          </tr></thead>
          <tbody>
            {filteredRows.map(r => (
              <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                <td className="px-5 py-3 font-bold align-top">{r.nama}{r.id === currentUserId && <span className="ml-2 text-[11px] font-semibold text-teal-600">(Anda)</span>}</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300 align-top">{r.email}</td>
                <td className="px-5 py-3 align-top"><RolePeran r={r} /></td>
                <td className="px-5 py-3 align-top"><AktifToggle r={r} /></td>
                <td className="px-5 py-3 text-slate-500 align-top">{fmtMasuk(r)}</td>
                <td className="px-5 py-3 text-right align-top"><HapusButton r={r} /></td>
              </tr>
            ))}
            {!loading && filteredRows.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">Belum ada pengguna.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Mobile: kartu */}
      <ul className="md:hidden space-y-3">
        {filteredRows.map(r => (
          <li key={r.id} className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="font-bold truncate">{r.nama}{r.id === currentUserId && <span className="ml-2 text-[11px] font-semibold text-teal-600">(Anda)</span>}</p>
                <p className="text-xs text-slate-500 truncate">{r.email}</p></div>
            </div>
            <RolePeran r={r} />
            <div className="flex flex-wrap items-center gap-2"><AktifToggle r={r} /><HapusButton r={r} /></div>
            <p className="text-[11px] text-slate-500">Terakhir masuk: {fmtMasuk(r)}</p>
          </li>
        ))}
        {!loading && filteredRows.length === 0 && <li className="px-5 py-8 text-center text-slate-500">Belum ada pengguna.</li>}
      </ul>

      <UndangPenggunaModal open={modal} onClose={() => setModal(false)} onInvited={load} />

      {konfirmHapus && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="alertdialog" aria-modal="true" aria-labelledby="hapus-title">
          <button type="button" aria-label="Batal" onClick={() => setKonfirmHapus(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-600"><Warning size={22} weight="duotone" /><h2 id="hapus-title" className="font-extrabold text-lg">Hapus pengguna?</h2></div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-bold">{konfirmHapus.nama}</span> ({konfirmHapus.email}) akan kehilangan akses dan datanya dihapus dari daftar. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setKonfirmHapus(null)} className="flex-1 h-11 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold">Batal</button>
              <button type="button" disabled={busyId === konfirmHapus.id} onClick={() => hapus(konfirmHapus)}
                className="flex-1 h-11 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold inline-flex items-center justify-center gap-2">
                <Trash size={18} weight="bold" /> {busyId === konfirmHapus.id ? 'Menghapus…' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
