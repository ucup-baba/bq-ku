'use client';
import { useEffect, useRef, useState } from 'react';
import {
  MagnifyingGlass,
  UserPlus,
  UserCircle,
  X,
  NotePencil,
  SpinnerGap,
} from '@phosphor-icons/react';
import type { Sapaan, Donatur } from '@/lib/db/donatur-repo';
import { labelSapaan } from '@/lib/surat/data';
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

const field = 'w-full px-4 py-3 rounded-2xl border bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5] min-h-11 text-base md:text-sm';
const borderNormal = 'border-slate-200 dark:border-slate-700';
const borderError = 'border-rose-400';

export type PilihDonaturErrors = { nama?: string; sapaan?: string; noWa?: string };

export function PilihDonatur({
  value,
  onChange,
  errors,
}: {
  value: PilihDonaturValue;
  onChange: (value: PilihDonaturValue) => void;
  errors?: PilihDonaturErrors;
}) {
  const [q, setQ] = useState('');
  const [hasil, setHasil] = useState<Donatur[]>([]);
  const [mencari, setMencari] = useState(false);
  const [bukaDropdown, setBukaDropdown] = useState(false);
  const [modeBaru, setModeBaru] = useState(false);
  const [donaturBaruTersimpan, setDonaturBaruTersimpan] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const inputCariRef = useRef<HTMLInputElement>(null);
  const inputNamaBaruRef = useRef<HTMLInputElement>(null);

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
    if (modeBaru || value.donaturId) {
      setHasil([]);
      setMencari(false);
      return;
    }
    if (q.trim() === '') {
      setHasil([]);
      setMencari(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setMencari(true);
      try {
        const res = await fetch(`/api/donatur?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        if (res.ok) {
          setHasil(data.data || []);
        }
      } catch {
        // Biarkan daftar kosong jika fetch gagal
      } finally {
        setMencari(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, modeBaru, value.donaturId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setBukaDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const pilihDonatur = (d: Donatur) => {
    onChange({ donaturId: d.id, nama: d.nama, sapaan: d.sapaan, noWa: d.noWa || '' });
    setQ('');
    setHasil([]);
    setBukaDropdown(false);
  };

  const bukaModeBaruDenganNama = (namaAwal?: string) => {
    const namaFinal = (namaAwal ?? q).trim();
    setModeBaru(true);
    setBukaDropdown(false);
    onChange({
      donaturId: undefined,
      nama: namaFinal,
      sapaan: value.sapaan || 'BAPAK',
      noWa: value.noWa || '',
    });
    setTimeout(() => {
      inputNamaBaruRef.current?.focus();
    }, 50);
  };

  const batalkanModeBaru = () => {
    setModeBaru(false);
    if (value.nama) {
      setQ(value.nama);
      setBukaDropdown(true);
    }
    onChange({ donaturId: undefined, nama: '', sapaan: 'BAPAK', noWa: '' });
    setTimeout(() => {
      inputCariRef.current?.focus();
    }, 50);
  };

  const gantiDonatur = () => {
    setModeBaru(false);
    setDonaturBaruTersimpan(false);
    setQ('');
    setHasil([]);
    setBukaDropdown(false);
    onChange({ donaturId: undefined, nama: '', sapaan: 'BAPAK', noWa: '' });
    setTimeout(() => {
      inputCariRef.current?.focus();
    }, 50);
  };

  const handleKeyDownCari = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setBukaDropdown(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (hasil.length > 0) {
        pilihDonatur(hasil[0]);
      } else if (q.trim() !== '') {
        bukaModeBaruDenganNama(q.trim());
      }
    }
  };

  // 1. TAMPILAN TERPILIH (Donatur terdaftar atau donatur baru yang baru tersimpan)
  if (value.donaturId) {
    const sapaanTeks = labelSapaan(value.sapaan) || value.sapaan;
    return (
      <div className="flex items-center justify-between rounded-2xl border-2 border-[#0B5FA5]/30 bg-gradient-to-r from-[#0B5FA5]/5 to-transparent dark:from-[#0B5FA5]/15 p-3.5 sm:p-4 transition-all">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-[#0B5FA5]/10 dark:bg-[#0B5FA5]/25 text-[#0B5FA5] flex items-center justify-center shrink-0">
            <UserCircle size={28} weight="duotone" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-slate-900 dark:text-white truncate">
                {sapaanTeks} {value.nama}
              </p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                donaturBaruTersimpan
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : 'bg-sky-100 text-[#0B5FA5] dark:bg-sky-950/60 dark:text-sky-300'
              }`}>
                {donaturBaruTersimpan ? 'Donatur Baru Tersimpan' : 'Donatur Terdaftar'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {value.noWa ? `WhatsApp: ${value.noWa}` : 'Belum ada No. WhatsApp'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={gantiDonatur}
          aria-label="Ganti donatur"
          className="h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
        >
          <NotePencil size={15} weight="bold" />
          <span>Ganti</span>
        </button>
      </div>
    );
  }

  // 2. TAMPILAN MODE TAMBAH DONATUR BARU
  if (modeBaru) {
    return (
      <div className="space-y-3.5 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 transition-all">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <UserPlus size={18} weight="bold" className="text-[#0E9F54]" /> Tambah Donatur Baru
          </p>
          <button
            type="button"
            onClick={batalkanModeBaru}
            aria-label="Kembali ke pencarian donatur terdaftar"
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <MagnifyingGlass size={14} weight="bold" />
            <span>Cari Donatur Terdaftar</span>
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Lengkap Donatur</span>
          <input
            ref={inputNamaBaruRef}
            value={value.nama}
            onChange={e => onChange({ ...value, nama: e.target.value })}
            className={`${field} ${errors?.nama ? borderError : borderNormal}`}
            placeholder="Mis. H. Ahmad Dahlan / Siti Aminah"
          />
          {errors?.nama && <span className="block text-xs text-rose-600 font-medium">{errors.nama}</span>}
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Sapaan</span>
            <select
              value={value.sapaan}
              onChange={e => onChange({ ...value, sapaan: e.target.value as Sapaan })}
              className={`${field} ${errors?.sapaan ? borderError : borderNormal}`}
            >
              {OPSI_SAPAAN.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {errors?.sapaan && <span className="block text-xs text-rose-600 font-medium">{errors.sapaan}</span>}
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">No. WhatsApp</span>
            <input
              value={value.noWa}
              onChange={e => onChange({ ...value, noWa: e.target.value })}
              inputMode="tel"
              className={`${field} ${errors?.noWa ? borderError : borderNormal}`}
              placeholder="08xxxxxxxxxx"
            />
            {errors?.noWa && <span className="block text-xs text-rose-600 font-medium">{errors.noWa}</span>}
          </label>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          💡 Donatur baru ini akan otomatis disimpan ke database saat surat ucapan dibuat.
        </p>
      </div>
    );
  }

  // 3. TAMPILAN SMART COMBOBOX / AUTOCOMPLETE (Default view)
  return (
    <div className="space-y-2 relative" ref={comboboxRef}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {mencari ? (
              <SpinnerGap size={18} weight="bold" className="animate-spin text-[#0B5FA5]" />
            ) : (
              <MagnifyingGlass size={18} weight="bold" />
            )}
          </div>
          <input
            ref={inputCariRef}
            type="text"
            value={q}
            onChange={e => {
              setQ(e.target.value);
              setBukaDropdown(true);
            }}
            onFocus={() => {
              if (q.trim() !== '' || hasil.length > 0) setBukaDropdown(true);
            }}
            onKeyDown={handleKeyDownCari}
            placeholder="Ketik nama atau No. WhatsApp donatur..."
            aria-label="Cari donatur terdaftar"
            role="combobox"
            aria-expanded={bukaDropdown}
            className={`${field} ${errors?.nama ? borderError : borderNormal} pl-10 pr-10`}
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ('');
                setHasil([]);
                setBukaDropdown(false);
              }}
              aria-label="Hapus ketikan"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={15} weight="bold" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => bukaModeBaruDenganNama(q)}
          aria-label="Tambah donatur baru"
          className="h-11 px-3.5 sm:px-4 rounded-2xl border-2 border-[#0E9F54] text-[#0E9F54] hover:bg-[#0E9F54]/10 font-bold flex items-center gap-1.5 shrink-0 transition-colors text-sm"
        >
          <UserPlus size={18} weight="bold" />
          <span className="hidden sm:inline">Donatur</span> Baru
        </button>
      </div>

      {errors?.nama && (
        <div className="space-y-1">
          <p className="text-xs text-rose-600 font-medium">{errors.nama}</p>
          {q.trim() !== '' && (
            <button
              type="button"
              onClick={() => bukaModeBaruDenganNama(q)}
              className="text-xs text-[#0E9F54] font-bold hover:underline inline-flex items-center gap-1"
            >
              <UserPlus size={14} weight="bold" />
              <span>Daftarkan &quot;{q.trim()}&quot; sebagai donatur baru sekarang</span>
            </button>
          )}
        </div>
      )}

      {/* DROPDOWN HASIL PENCARIAN & SMART ACTION */}
      {bukaDropdown && q.trim() !== '' && (
        <div
          id="donatur-search-results"
          className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100"
        >
          {mencari && (
            <div className="px-4 py-3 flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
              <SpinnerGap size={16} weight="bold" className="animate-spin text-[#0B5FA5]" />
              <span>Mencari donatur terdaftar di database...</span>
            </div>
          )}

          {!mencari && hasil.length > 0 && (
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              <div className="px-3.5 py-1.5 bg-slate-50/80 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Donatur Terdaftar ({hasil.length})
              </div>
              {hasil.map(d => {
                const sapaanTeks = labelSapaan(d.sapaan) || d.sapaan;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => pilihDonatur(d)}
                    className="w-full min-h-12 px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-sky-50 dark:hover:bg-slate-800/80 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:bg-[#0B5FA5] group-hover:text-white transition-colors">
                        <UserCircle size={20} weight="duotone" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {sapaanTeks} {d.nama}
                        </p>
                        {d.noWa && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{d.noWa}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#0B5FA5] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 ml-2">
                      Pilih
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!mencari && hasil.length === 0 && (
            <div className="p-4 text-center space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Belum ada donatur terdaftar dengan kata kunci &quot;<span className="font-semibold text-slate-800 dark:text-slate-200">{q.trim()}</span>&quot;
              </p>
            </div>
          )}

          {/* AKSI CERDAS: BUAT DONATUR BARU DARI NAMA YANG DIKETIK */}
          <div className="p-2 bg-emerald-50/50 dark:bg-emerald-950/20 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => bukaModeBaruDenganNama(q)}
              className="w-full min-h-11 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <UserPlus size={16} weight="bold" />
              <span>Buat sebagai donatur baru: &quot;<strong>{q.trim()}</strong>&quot;</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
