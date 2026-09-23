'use client';
import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlass, UserPlus, UserCircle, X } from '@phosphor-icons/react';
import type { Sapaan, Donatur } from '@/lib/db/donatur-repo';
import { tandaiDonaturBaru } from '@/lib/donatur/tandai-donatur-baru';

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

const field = 'w-full px-4 py-3 rounded-2xl border bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5] min-h-11';
const borderNormal = 'border-slate-200 dark:border-slate-700';
const borderError = 'border-rose-400';

export type PilihDonaturErrors = { nama?: string; sapaan?: string; noWa?: string };

export function PilihDonatur({ value, onChange, errors }: {
  value: PilihDonaturValue;
  onChange: (value: PilihDonaturValue) => void;
  errors?: PilihDonaturErrors;
}) {
  const [q, setQ] = useState('');
  const [hasil, setHasil] = useState<Donatur[]>([]);
  const [mencari, setMencari] = useState(false);
  const [modeBaru, setModeBaru] = useState(!value.donaturId && value.nama === '');
  // Ditandai true begitu donaturId muncul SAAT sedang mengisi form "donatur baru"
  // (bukan dari memilih hasil pencarian) — dipakai untuk keterangan kecil di
  // ringkasan terpilih. Direset saat donatur diganti/dikosongkan.
  const [donaturBaruTersimpan, setDonaturBaruTersimpan] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Menyimpan nama & donaturId "sebelumnya" (dari render terakhir efek ini
  // berjalan) — dipakai tandaiDonaturBaru untuk membedakan transisi donatur
  // BARU (nama sudah diketik sebelum id muncul) dari donatur LAMA yang
  // datang lewat prefill "Donasi lagi" (nama & id terisi sekaligus).
  const namaSebelumnyaRef = useRef(value.nama);
  const donaturIdSebelumnyaRef = useRef(value.donaturId);

  useEffect(() => {
    if (tandaiDonaturBaru({
      modeBaru,
      namaSebelumnya: namaSebelumnyaRef.current,
      donaturIdSebelumnya: donaturIdSebelumnyaRef.current,
      donaturIdSekarang: value.donaturId,
    })) {
      setDonaturBaruTersimpan(true);
    } else if (!value.donaturId) {
      setDonaturBaruTersimpan(false);
    }
    donaturIdSebelumnyaRef.current = value.donaturId;
    namaSebelumnyaRef.current = value.nama;
  }, [value.donaturId, value.nama, modeBaru]);

  useEffect(() => {
    if (modeBaru || value.donaturId) { setHasil([]); return; }
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
  }, [q, modeBaru, value.donaturId]);

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

  const gantiDonatur = () => {
    setModeBaru(false);
    setDonaturBaruTersimpan(false);
    onChange({ donaturId: undefined, nama: '', sapaan: 'BAPAK', noWa: '' });
  };

  // Begitu donaturId terisi — baik dari memilih hasil pencarian maupun dari
  // donatur baru yang baru saja tersimpan lewat POST /api/donatur — tampilkan
  // sebagai ringkasan "terpilih", bukan input yang masih bisa diedit. Bila
  // masih bisa diedit, editan itu akan diam-diam diabaikan karena submit
  // berikutnya tidak lagi memanggil POST /api/donatur (donaturId sudah ada).
  if (value.donaturId) {
    return (
      <div className="flex items-center justify-between rounded-2xl border-2 border-[#0B5FA5] bg-[#0B5FA5]/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <UserCircle size={28} weight="duotone" className="text-[#0B5FA5]" />
          <div>
            <p className="font-bold">{value.nama}</p>
            {value.noWa && <p className="text-xs text-slate-500">{value.noWa}</p>}
            {donaturBaruTersimpan && <p className="text-xs text-[#0E9F54] font-semibold">Donatur baru sudah tersimpan</p>}
          </div>
        </div>
        <button type="button" onClick={gantiDonatur}
          aria-label="Ganti donatur" className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-white dark:hover:bg-slate-800">
          <X size={18} weight="bold" />
        </button>
      </div>
    );
  }

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
          <input value={value.nama} onChange={e => onChange({ ...value, nama: e.target.value })}
            className={`${field} ${errors?.nama ? borderError : borderNormal}`} placeholder="Nama lengkap" />
          {errors?.nama && <span className="block text-xs text-rose-600">{errors.nama}</span>}
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold">Sapaan</span>
          <select value={value.sapaan} onChange={e => onChange({ ...value, sapaan: e.target.value as Sapaan })}
            className={`${field} ${errors?.sapaan ? borderError : borderNormal}`}>
            {OPSI_SAPAAN.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {errors?.sapaan && <span className="block text-xs text-rose-600">{errors.sapaan}</span>}
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold">No. WhatsApp (opsional)</span>
          <input value={value.noWa} onChange={e => onChange({ ...value, noWa: e.target.value })} inputMode="tel"
            className={`${field} ${errors?.noWa ? borderError : borderNormal}`} placeholder="08xxxxxxxxxx" />
          {errors?.noWa && <span className="block text-xs text-rose-600">{errors.noWa}</span>}
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
            className={`${field} ${borderNormal} pl-10`}
          />
        </div>
        <button type="button" onClick={bukaModeBaru} aria-label="Donatur baru"
          className="h-11 px-4 rounded-2xl border-2 border-[#0E9F54] text-[#0E9F54] font-bold flex items-center gap-2 shrink-0 hover:bg-[#0E9F54]/10">
          <UserPlus size={18} weight="bold" /> Baru
        </button>
      </div>

      {q.trim() !== '' && (
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
