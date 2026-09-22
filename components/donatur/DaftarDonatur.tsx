'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MagnifyingGlass, UserPlus, UserCircle, WhatsappLogo, Warning, X, Check } from '@phosphor-icons/react';
import type { Donatur, Sapaan } from '@/lib/db/donatur-repo';
import { labelSapaan } from '@/lib/surat/data';

const OPSI_SAPAAN: Array<{ value: Sapaan; label: string }> = [
  { value: 'BAPAK', label: 'Bapak' },
  { value: 'IBU', label: 'Ibu' },
  { value: 'SDR', label: 'Sdr.' },
  { value: 'SDRI', label: 'Sdri.' },
  { value: 'BAPAK_IBU', label: 'Bapak/Ibu' },
];

const field = 'w-full px-4 py-3 rounded-2xl border bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5] min-h-11';

function DonaturBaruModal({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (donatur: Donatur) => void;
}) {
  const [nama, setNama] = useState('');
  const [sapaan, setSapaan] = useState<Sapaan>('BAPAK');
  const [noWa, setNoWa] = useState('');
  const [alamat, setAlamat] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const firstInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setNama(''); setSapaan('BAPAK'); setNoWa(''); setAlamat(''); setFields({}); setError(null);
    setTimeout(() => firstInput.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null); setFields({});
    try {
      const res = await fetch('/api/donatur', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, sapaan, noWa: noWa || undefined, alamat: alamat || undefined }),
      });
      const data = await res.json();
      if (res.status === 400 && data.fields) { setFields(data.fields); return; }
      if (!res.ok) { setError(data.error || 'Gagal menyimpan donatur.'); return; }
      onCreated(data.data);
      onClose();
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally { setBusy(false); }
  };

  const border = (k: string) => fields[k] ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="donatur-baru-title">
      <button type="button" aria-label="Tutup" onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <form onSubmit={submit} className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="donatur-baru-title" className="flex items-center gap-2 font-extrabold text-lg">
            <UserPlus size={22} weight="duotone" className="text-[#0E9F54]" /> Donatur baru
          </h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="w-11 h-11 -mr-2 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={20} weight="bold" />
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl px-3 py-2">{error}</p>}
        <label className="block space-y-1">
          <span className="text-xs font-semibold">Nama</span>
          <input ref={firstInput} value={nama} onChange={e => setNama(e.target.value)} required
            className={`${field} ${border('nama')}`} placeholder="Nama lengkap" />
          {fields.nama && <span className="text-xs text-rose-600">{fields.nama}</span>}
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold">Sapaan</span>
          <select value={sapaan} onChange={e => setSapaan(e.target.value as Sapaan)} className={`${field} ${border('sapaan')}`}>
            {OPSI_SAPAAN.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {fields.sapaan && <span className="text-xs text-rose-600">{fields.sapaan}</span>}
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold">No. WhatsApp (opsional)</span>
          <input value={noWa} onChange={e => setNoWa(e.target.value)} inputMode="tel"
            className={`${field} ${border('noWa')}`} placeholder="08xxxxxxxxxx" />
          {fields.noWa && <span className="text-xs text-rose-600">{fields.noWa}</span>}
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold">Alamat (opsional)</span>
          <input value={alamat} onChange={e => setAlamat(e.target.value)}
            className={`${field} ${border('alamat')}`} placeholder="Alamat donatur" />
          {fields.alamat && <span className="text-xs text-rose-600">{fields.alamat}</span>}
        </label>
        <button type="submit" disabled={busy}
          className="w-full h-12 rounded-2xl bg-[#0E9F54] hover:bg-[#0c8747] disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2">
          <Check size={20} weight="bold" /> {busy ? 'Menyimpan…' : 'Simpan'}
        </button>
      </form>
    </div>
  );
}

export function DaftarDonatur() {
  const [q, setQ] = useState('');
  const [donatur, setDonatur] = useState<Donatur[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Menandai permintaan terakhir yang dikirim, supaya respons yang datang
  // belakangan (mis. hasil ketikan lama yang lambat) tidak menimpa hasil
  // pencarian yang lebih baru.
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const id = ++requestIdRef.current;
      setError(null);
      try {
        const res = await fetch(`/api/donatur?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (id !== requestIdRef.current) return; // respons basi, abaikan
        if (!res.ok) { setError(data.error || 'Gagal memuat donatur.'); return; }
        setDonatur(data.data || []);
      } catch {
        if (id !== requestIdRef.current) return;
        setError('Tidak dapat terhubung ke server.');
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  const tambahDonaturBaru = (d: Donatur) => {
    setDonatur(prev => (prev ? [d, ...prev] : [d]));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={18} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Cari nama atau no. WhatsApp donatur"
            aria-label="Cari donatur"
            className={`${field} border-slate-200 dark:border-slate-700 pl-10`}
          />
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="h-11 px-4 rounded-2xl bg-[#0E9F54] hover:bg-[#0c8747] text-white font-bold flex items-center gap-2 shrink-0"
        >
          <UserPlus size={18} weight="bold" /> Donatur baru
        </button>
      </div>

      {error && (
        <div role="alert" className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl px-3 py-2 flex items-center gap-2">
          <Warning size={18} weight="bold" aria-hidden="true" /> {error}
        </div>
      )}

      {donatur === null && !error && (
        <p className="text-sm text-slate-500 px-1">Memuat daftar donatur…</p>
      )}

      {donatur !== null && donatur.length === 0 && (
        <p className="text-sm text-slate-500 px-1">
          {q.trim() ? 'Tidak ditemukan donatur yang cocok.' : 'Belum ada donatur. Tambahkan donatur baru untuk memulai.'}
        </p>
      )}

      {donatur !== null && donatur.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {donatur.map(d => (
            <Link
              key={d.id}
              href={`/donatur/daftar/${d.id}`}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-start gap-3 hover:border-[#0B5FA5] hover:shadow-sm transition-all min-h-11"
            >
              <UserCircle size={32} weight="duotone" className="text-[#0B5FA5] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-bold truncate">{labelSapaan(d.sapaan)} {d.nama}</p>
                {d.noWa ? (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <WhatsappLogo size={14} weight="bold" aria-hidden="true" /> {d.noWa}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-0.5">Nomor WhatsApp belum diisi</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <DonaturBaruModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={tambahDonaturBaru} />
    </div>
  );
}
