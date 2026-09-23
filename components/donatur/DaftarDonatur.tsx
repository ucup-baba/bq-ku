'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  MagnifyingGlass, UserPlus, WhatsappLogo, Warning, X, Check,
  Users, CheckCircle, ArrowUpRight, PlusCircle, HandCoins, CalendarBlank,
} from '@phosphor-icons/react';
import type { Donatur, DonaturWithDonasi, Sapaan } from '@/lib/db/donatur-repo';
import { labelSapaan } from '@/lib/surat/data';
import { formatRupiah } from '@/lib/utils/terbilang';
import { formatDateIndonesian } from '@/lib/utils/formatters';

const OPSI_SAPAAN: Array<{ value: Sapaan; label: string }> = [
  { value: 'BAPAK', label: 'Bapak' },
  { value: 'IBU', label: 'Ibu' },
  { value: 'SDR', label: 'Sdr.' },
  { value: 'SDRI', label: 'Sdri.' },
  { value: 'BAPAK_IBU', label: 'Bapak/Ibu' },
];

const field = 'w-full px-4 py-3 rounded-2xl border bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5] min-h-11';

function getInisial(nama: string): string {
  const parts = nama.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_GRADIENTS = [
  'from-blue-600 to-indigo-600',
  'from-emerald-600 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-purple-600 to-indigo-600',
  'from-rose-500 to-pink-600',
  'from-cyan-600 to-blue-600',
];

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
  const [donatur, setDonatur] = useState<DonaturWithDonasi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const id = ++requestIdRef.current;
      setError(null);
      try {
        const res = await fetch(`/api/donatur?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (id !== requestIdRef.current) return;
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
    if (q.trim() !== '') { setQ(''); return; }
    setDonatur(prev => (prev ? [d, ...prev] : [d]));
  };

  const bulanIni = new Date().toISOString().slice(0, 7);
  const totalDonatur = donatur ? donatur.length : 0;
  const donaturAktif = donatur ? donatur.filter(d => d.donasi && d.donasi.some(x => x.tanggal.startsWith(bulanIni))).length : 0;
  const terhubungWa = donatur ? donatur.filter(d => Boolean(d.noWa)).length : 0;

  return (
    <div className="space-y-6">
      {/* 1. STATISTIK MICRO-CARDS (Bento Header) */}
      <div className="animate-bento-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Donatur */}
        <div className="rounded-[24px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-center gap-4 shadow-xs hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#0B5FA5] flex items-center justify-center shrink-0">
            <Users size={24} weight="duotone" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Donatur</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {donatur === null ? '...' : totalDonatur}
            </p>
            <p className="text-[11px] text-slate-400">Terdaftar di sistem</p>
          </div>
        </div>

        {/* Card 2: Donatur Aktif Bulan Ini */}
        <div className="rounded-[24px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-center gap-4 shadow-xs hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0E9F54] flex items-center justify-center shrink-0">
            <CheckCircle size={24} weight="duotone" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Donatur Aktif</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {donatur === null ? '...' : donaturAktif}
            </p>
            <p className="text-[11px] text-slate-400">Berdonasi bulan ini</p>
          </div>
        </div>

        {/* Card 3: Terhubung WhatsApp */}
        <div className="rounded-[24px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-center gap-4 shadow-xs hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 flex items-center justify-center shrink-0">
            <WhatsappLogo size={24} weight="duotone" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Terhubung WA</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {donatur === null ? '...' : terhubungWa}
            </p>
            <p className="text-[11px] text-slate-400">Siap kirim surat WA</p>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & ACTION TOOLBAR */}
      <div className="animate-bento-2 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={18} weight="bold" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Cari nama atau nomor WhatsApp donatur..."
            aria-label="Cari donatur"
            className={`${field} border-slate-200 dark:border-slate-700 pl-11 pr-10 shadow-xs`}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X size={16} weight="bold" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="h-11 px-5 rounded-2xl bg-[#0E9F54] hover:bg-[#0c8747] text-white font-extrabold text-sm flex items-center justify-center gap-2 shrink-0 shadow-xs shadow-emerald-600/20 transition-all hover:shadow-md"
        >
          <UserPlus size={18} weight="bold" />
          <span>+ Donatur Baru</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div role="alert" className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-2xl p-4 flex items-center gap-2 border border-rose-200 dark:border-rose-900/40">
          <Warning size={18} weight="bold" aria-hidden="true" /> {error}
        </div>
      )}

      {/* Loading state */}
      {donatur === null && !error && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-[26px] bg-slate-100 dark:bg-slate-800/60 animate-pulse border border-slate-200/60 dark:border-slate-800" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {donatur !== null && donatur.length === 0 && (
        <div className="rounded-[26px] border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 space-y-3">
          <Users size={48} weight="thin" className="mx-auto opacity-40 text-[#0B5FA5]" />
          <p className="text-base font-semibold text-slate-600 dark:text-slate-300">
            {q.trim() ? `Tidak ditemukan donatur dengan kata kunci "${q}".` : 'Belum ada donatur tersimpan.'}
          </p>
          <p className="text-xs text-slate-400">
            {q.trim() ? 'Coba periksa ejaan nama atau nomor WhatsApp.' : 'Klik tombol "+ Donatur Baru" di atas untuk menambahkan donatur pertama.'}
          </p>
        </div>
      )}

      {/* 3. EXECUTIVE DONOR CARDS GRID */}
      {donatur !== null && donatur.length > 0 && (
        <div className="animate-bento-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {donatur.map((d, idx) => {
            const inisial = getInisial(d.nama);
            const gradient = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
            const donasiList = d.donasi || [];
            const totalUang = donasiList.reduce((acc, curr) => curr.bentuk === 'UANG' ? acc + (curr.nominal || 0) : acc, 0);
            const terakhir = donasiList.length > 0 ? donasiList[0].tanggal : null;

            return (
              <div
                key={d.id}
                className="rounded-[26px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group shadow-xs space-y-4"
              >
                {/* Header Kartu: Avatar & Identitas */}
                <div className="flex items-start gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${gradient} text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs group-hover:scale-105 transition-transform`}>
                    {inisial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/donatur/daftar/${d.id}`}
                      className="font-extrabold text-slate-900 dark:text-white truncate block hover:text-[#0B5FA5] transition-colors text-base"
                    >
                      {labelSapaan(d.sapaan)} {d.nama}
                    </Link>
                    {d.noWa ? (
                      <a
                        href={`https://wa.me/${d.noWa.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 mt-0.5 transition-colors"
                      >
                        <WhatsappLogo size={13} weight="fill" className="text-emerald-600" />
                        <span>{d.noWa}</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 mt-0.5 block">No. WhatsApp belum diisi</span>
                    )}
                  </div>
                </div>

                {/* Bagian Metrik Finansial Donatur */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Donasi</span>
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate mt-0.5">
                      {totalUang > 0 ? `Rp ${formatRupiah(totalUang)}` : (donasiList.length > 0 ? 'Donasi Barang' : 'Rp 0')}
                    </p>
                    <span className="text-[10px] text-slate-400">{donasiList.length} transaksi</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Terakhir</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate mt-0.5">
                      {terakhir ? formatDateIndonesian(terakhir) : '-'}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {terakhir && terakhir.startsWith(bulanIni) ? '🟢 Bulan ini' : 'Riwayat lalu'}
                    </span>
                  </div>
                </div>

                {/* Footer Kartu: Aksi Cepat */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <Link
                    href={`/donatur/surat/baru?donaturId=${d.id}`}
                    className="flex-1 h-9 rounded-xl bg-[#0B5FA5]/10 hover:bg-[#0B5FA5] text-[#0B5FA5] hover:text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <PlusCircle size={15} weight="bold" />
                    <span>+ Donasi</span>
                  </Link>

                  <Link
                    href={`/donatur/daftar/${d.id}`}
                    aria-label={`Lihat detail ${d.nama}`}
                    className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-400 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1 transition-colors"
                  >
                    <span>Detail</span>
                    <ArrowUpRight size={14} weight="bold" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DonaturBaruModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={tambahDonaturBaru} />
    </div>
  );
}
