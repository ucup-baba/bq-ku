'use client';
import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlass, UserPlus, UserCircle, X } from '@phosphor-icons/react';
import type { Sapaan, Donatur } from '@/lib/db/donatur-repo';

export type PilihDonaturValue = {
  donaturId?: string;
  nama: string;
  sapaan: Sapaan;
  noWa: string;
};

const OPSI_SAPAAN: Array<{ value: Sapaan; label: string }> = [
  { value: 'BAPAK', label: 'Bapak' },
  { value: 'IBU', label: 'Ibu' },
  { value: 'SDR', label: 'Sdr.' },
  { value: 'SDRI', label: 'Sdri.' },
  { value: 'BAPAK_IBU', label: 'Bapak/Ibu' },
];

const field = 'w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5] min-h-11';

export function PilihDonatur({ value, onChange }: { value: PilihDonaturValue; onChange: (value: PilihDonaturValue) => void }) {
  const [q, setQ] = useState('');
  const [hasil, setHasil] = useState<Donatur[]>([]);
  const [mencari, setMencari] = useState(false);
  const [modeBaru, setModeBaru] = useState(!value.donaturId && value.nama === '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (modeBaru) { setHasil([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setMencari(true);
      try {
        const res = await fetch(`/api/donatur?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (res.ok) setHasil(data.data || []);
      } catch {
        // koneksi bermasalah — biarkan daftar kosong, pengguna bisa coba lagi
      } finally {
        setMencari(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, modeBaru]);

  const pilihDonatur = (d: Donatur) => {
    onChange({ donaturId: d.id, nama: d.nama, sapaan: d.sapaan, noWa: d.noWa || '' });
    setQ('');
    setHasil([]);
  };

  const bukaModeBaru = () => {
    setModeBaru(true);
    onChange({ donaturId: undefined, nama: '', sapaan: 'BAPAK', noWa: '' });
  };

  const batalkanModeBaru = () => {
    setModeBaru(false);
    onChange({ donaturId: undefined, nama: '', sapaan: 'BAPAK', noWa: '' });
  };

  if (modeBaru) {
    return (
      <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold flex items-center gap-2"><UserPlus size={18} weight="bold" className="text-[#0E9F54]" /> Donatur baru</p>
          <button type="button" onClick={batalkanModeBaru} aria-label="Batal, cari donatur lama"
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} weight="bold" />
          </button>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-semibold">Nama donatur</span>
          <input value={value.nama} onChange={e => onChange({ ...value, nama: e.target.value })} className={field} placeholder="Nama lengkap" />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold">Sapaan</span>
          <select value={value.sapaan} onChange={e => onChange({ ...value, sapaan: e.target.value as Sapaan })} className={field}>
            {OPSI_SAPAAN.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold">No. WhatsApp (opsional)</span>
          <input value={value.noWa} onChange={e => onChange({ ...value, noWa: e.target.value })} inputMode="tel" className={field} placeholder="08xxxxxxxxxx" />
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass size={18} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Cari nama atau no. WhatsApp donatur"
            aria-label="Cari donatur"
            className={`${field} pl-10`}
          />
        </div>
        <button type="button" onClick={bukaModeBaru} aria-label="Donatur baru"
          className="h-11 px-4 rounded-2xl border-2 border-[#0E9F54] text-[#0E9F54] font-bold flex items-center gap-2 shrink-0 hover:bg-[#0E9F54]/10">
          <UserPlus size={18} weight="bold" /> Baru
        </button>
      </div>

      {value.donaturId && (
        <div className="flex items-center justify-between rounded-2xl border-2 border-[#0B5FA5] bg-[#0B5FA5]/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <UserCircle size={28} weight="duotone" className="text-[#0B5FA5]" />
            <div>
              <p className="font-bold">{value.nama}</p>
              {value.noWa && <p className="text-xs text-slate-500">{value.noWa}</p>}
            </div>
          </div>
          <button type="button" onClick={() => onChange({ donaturId: undefined, nama: '', sapaan: 'BAPAK', noWa: '' })}
            aria-label="Ganti donatur" className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-white dark:hover:bg-slate-800">
            <X size={18} weight="bold" />
          </button>
        </div>
      )}

      {!value.donaturId && q.trim() !== '' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700 max-h-64 overflow-y-auto">
          {mencari && <p className="px-4 py-3 text-sm text-slate-500">Mencari…</p>}
          {!mencari && hasil.length === 0 && <p className="px-4 py-3 text-sm text-slate-500">Tidak ditemukan. Gunakan tombol "Baru" untuk menambah donatur.</p>}
          {!mencari && hasil.map(d => (
            <button
              key={d.id}
              type="button"
              onClick={() => pilihDonatur(d)}
              className="w-full min-h-11 px-4 py-3 flex flex-col items-start text-left hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <span className="font-semibold">{d.nama}</span>
              {d.noWa && <span className="text-xs text-slate-500">{d.noWa}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
