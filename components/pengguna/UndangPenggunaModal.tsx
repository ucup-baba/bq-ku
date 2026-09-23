'use client';
import { useEffect, useState } from 'react';
import { Check } from '@phosphor-icons/react';
import { ALL_ROLES, getRoleLabel, type UserRole } from '@/lib/auth/roles';
import { LembarBawah } from '@/components/ui/LembarBawah';
import { TombolUtama } from '@/components/ui/Tombol';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasField, kelasLabel } from '@/components/ui/kelas';

export function UndangPenggunaModal({ open, onClose, onInvited }: { open: boolean; onClose: () => void; onInvited: () => void }) {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<UserRole[]>(['ADMIN_SANTRI']);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNama(''); setEmail(''); setRoles(['ADMIN_SANTRI']); setFields({}); setError(null);
  }, [open]);

  const toggleRole = (role: UserRole) => {
    setRoles(prev => (prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]));
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

  return (
    <LembarBawah buka={open} onTutup={onClose} judul="Tambah email yang diizinkan">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-bq-redup">Pengguna masuk dengan akun Google beremail ini. Tidak ada email undangan yang dikirim.</p>
        {error && <PesanGalat pesan={error} />}
        <label className="block space-y-1">
          <span className={kelasLabel}>Nama</span>
          <input autoFocus value={nama} onChange={e => setNama(e.target.value)} required className={kelasField(fields.nama)} />
          {fields.nama && <span className="text-xs text-rose-600">{fields.nama}</span>}
        </label>
        <label className="block space-y-1">
          <span className={kelasLabel}>Email</span>
          <input type="email" placeholder="nama@gmail.com" value={email} onChange={e => setEmail(e.target.value)} required className={kelasField(fields.email)} />
          {fields.email && <span className="text-xs text-rose-600">{fields.email}</span>}
        </label>
        <fieldset className={`space-y-1 rounded-2xl border p-3 ${fields.roles ? 'border-rose-400' : 'border-bq-garis'}`}>
          <legend className="px-1 text-xs font-semibold text-bq-redup">Peran</legend>
          {ALL_ROLES.map(role => (
            <label key={role} className="flex min-h-11 cursor-pointer items-center gap-3">
              <input type="checkbox" checked={roles.includes(role)} onChange={() => toggleRole(role)}
                className="h-5 w-5 rounded border-slate-300 text-[#0E9F54] focus:ring-2 focus:ring-[#0B5FA5]" />
              <span className="text-sm text-bq-tinta">{getRoleLabel(role)}</span>
            </label>
          ))}
          {fields.roles && <span className="text-xs text-rose-600">{fields.roles}</span>}
        </fieldset>
        <TombolUtama type="submit" ikon={Check} disabled={busy} className="h-12 w-full">{busy ? 'Menyimpan…' : 'Simpan'}</TombolUtama>
      </form>
    </LembarBawah>
  );
}
