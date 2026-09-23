'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  DownloadSimple, CheckCircle, Clock, Warning,
  MagnifyingGlass, X, WhatsappLogo, FileText, ArrowUpRight, PlusCircle,
} from '@phosphor-icons/react';
import { labelSapaan } from '@/lib/surat/data';
import { formatRupiah } from '@/lib/utils/terbilang';
import { formatDateIndonesian } from '@/lib/utils/formatters';
import type { SuratWithRelasi } from '@/lib/db/donatur-repo';

type StatusFilter = 'SEMUA' | 'BELUM' | 'SUDAH';

function bulanIni(): string {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

function rentangBulan(bulan: string): { dari: string; sampai: string } {
  const [tahun, bln] = bulan.split('-').map(Number);
  const dari = `${bulan}-01`;
  const akhir = new Date(tahun, bln, 0).getDate();
  const sampai = `${bulan}-${String(akhir).padStart(2, '0')}`;
  return { dari, sampai };
}

function nilaiSurat(s: SuratWithRelasi): string {
  return s.donasi.bentuk === 'UANG'
    ? `Rp ${formatRupiah(s.donasi.nominal ?? 0)}`
    : (s.donasi.deskripsiBarang || '-');
}

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

function BadgeStatusPill({ terkirim }: { terkirim: boolean }) {
  return terkirim ? (
    <span className="inline-flex items-center gap-1.5 text-[#0E9F54] font-extrabold text-xs whitespace-nowrap bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
      <CheckCircle size={14} weight="fill" aria-hidden="true" /> Terkirim
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-extrabold text-xs whitespace-nowrap bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200/60 dark:border-amber-800/40 animate-pulse">
      <Clock size={14} weight="bold" aria-hidden="true" /> Belum WA
    </span>
  );
}

export function DaftarSurat() {
  const [bulan, setBulan] = useState(bulanIni());
  const [status, setStatus] = useState<StatusFilter>('SEMUA');
  const [cari, setCari] = useState('');
  const [surat, setSurat] = useState<SuratWithRelasi[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { dari, sampai } = useMemo(() => rentangBulan(bulan), [bulan]);

  useEffect(() => {
    let batal = false;
    setError(null);
    (async () => {
      try {
        const p = new URLSearchParams({ dari, sampai });
        if (status !== 'SEMUA') p.set('terkirim', status === 'SUDAH' ? 'true' : 'false');
        const res = await fetch(`/api/donatur/surat?${p.toString()}`);
        const data = await res.json();
        if (batal) return;
        if (!res.ok) { setError(data.error || 'Gagal memuat daftar surat'); return; }
        setSurat(data.data);
      } catch {
        if (!batal) setError('Tidak dapat terhubung ke server.');
      }
    })();
    return () => { batal = true; };
  }, [dari, sampai, status]);

  const OPSI_STATUS: Array<{ id: StatusFilter; label: string }> = [
    { id: 'SEMUA', label: 'Semua' },
    { id: 'BELUM', label: 'Belum terkirim' },
    { id: 'SUDAH', label: 'Sudah terkirim' },
  ];

  // Hitung KPI ringkasan
  const totalSurat = surat ? surat.length : 0;
  const belumTerkirim = surat ? surat.filter(s => !s.terkirimWa).length : 0;
  const sudahTerkirim = surat ? surat.filter(s => s.terkirimWa).length : 0;

  // Filter pencarian client-side
  const suratTersaring = useMemo(() => {
    if (!surat) return null;
    if (!cari.trim()) return surat;
    const q = cari.toLowerCase();
    return surat.filter(s =>
      s.nomorSurat.toLowerCase().includes(q) ||
      s.donasi.donatur.nama.toLowerCase().includes(q) ||
      (s.donasi.donatur.noWa && s.donasi.donatur.noWa.includes(q))
    );
  }, [surat, cari]);

  return (
    <div className="space-y-6">
      {/* 1. KPI MINI-BENTO STATUS CARDS */}
      <div className="animate-bento-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Surat */}
        <div className="rounded-[24px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-center gap-4 shadow-xs hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#0B5FA5] flex items-center justify-center shrink-0">
            <FileText size={24} weight="duotone" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Surat</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {surat === null ? '...' : totalSurat}
            </p>
            <p className="text-[11px] text-slate-400">Dibuat bulan ini</p>
          </div>
        </div>

        {/* Belum Terkirim WA */}
        <div className={`rounded-[24px] border p-5 flex items-center gap-4 shadow-xs hover:shadow-md transition-all ${
          belumTerkirim > 0
            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/60'
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
        }`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            belumTerkirim > 0 ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            <Clock size={24} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Belum Terkirim</p>
              {belumTerkirim > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </div>
            <p className={`text-2xl font-black ${belumTerkirim > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
              {surat === null ? '...' : belumTerkirim}
            </p>
            <p className="text-[11px] text-slate-400">Perlu tindak lanjut WA</p>
          </div>
        </div>

        {/* Sudah Terkirim WA */}
        <div className="rounded-[24px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-center gap-4 shadow-xs hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0E9F54] flex items-center justify-center shrink-0">
            <CheckCircle size={24} weight="duotone" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sudah Terkirim</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {surat === null ? '...' : sudahTerkirim}
            </p>
            <p className="text-[11px] text-slate-400">Sukses via WhatsApp</p>
          </div>
        </div>
      </div>

      {/* 2. FILTER & INSTANT SEARCH TOOLBAR */}
      <div className="animate-bento-2 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-[26px] p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Picker */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-500">Bulan:</span>
            <input
              type="month"
              value={bulan}
              onChange={e => setBulan(e.target.value)}
              aria-label="Pilih bulan surat"
              className="bg-transparent text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            {OPSI_STATUS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStatus(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  status === opt.id
                    ? 'bg-white dark:bg-slate-900 text-[#0B5FA5] shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input & Buat Surat Button */}
        <div className="flex items-center gap-2 flex-1 md:max-w-md">
          <div className="relative flex-1">
            <MagnifyingGlass size={16} weight="bold" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={cari}
              onChange={e => setCari(e.target.value)}
              placeholder="Cari no. surat atau donatur..."
              className="w-full h-10 pl-9 pr-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B5FA5]"
            />
            {cari && (
              <button
                type="button"
                onClick={() => setCari('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} weight="bold" />
              </button>
            )}
          </div>

          <Link
            href="/donatur/surat/baru"
            className="h-10 px-4 rounded-2xl bg-[#0B5FA5] hover:bg-[#094a84] text-white font-extrabold text-xs flex items-center gap-1.5 shrink-0 shadow-xs transition-all"
          >
            <PlusCircle size={16} weight="bold" />
            <span>+ Surat</span>
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div role="alert" className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-2xl p-4 flex items-center gap-2 border border-rose-200 dark:border-rose-900/40">
          <Warning size={18} weight="bold" aria-hidden="true" /> {error}
        </div>
      )}

      {/* Loading state */}
      {surat === null && !error && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-[22px] bg-slate-100 dark:bg-slate-800/60 animate-pulse border border-slate-200/60 dark:border-slate-800" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {suratTersaring !== null && suratTersaring.length === 0 && (
        <div className="rounded-[26px] border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 space-y-3">
          <FileText size={48} weight="thin" className="mx-auto opacity-40 text-[#0B5FA5]" />
          <p className="text-base font-semibold text-slate-600 dark:text-slate-300">
            {cari.trim() ? `Tidak ditemukan surat dengan kata kunci "${cari}".` : 'Tidak ada surat pada periode bulan ini.'}
          </p>
          <p className="text-xs text-slate-400">
            {cari.trim() ? 'Periksa kembali kata kunci pencarian.' : 'Mulai buat surat ucapan pertama dengan mengklik tombol "+ Surat".'}
          </p>
        </div>
      )}

      {/* 3. TABLE DESKTOP & CARDS MOBILE */}
      {suratTersaring !== null && suratTersaring.length > 0 && (
        <div className="animate-bento-3 space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-[26px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="px-5 py-4">Nomor Surat</th>
                  <th className="px-5 py-4">Tanggal</th>
                  <th className="px-5 py-4">Donatur</th>
                  <th className="px-5 py-4">Nilai Donasi</th>
                  <th className="px-5 py-4">Status WA</th>
                  <th className="px-5 py-4 text-right">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {suratTersaring.map((s, idx) => {
                  const donatur = s.donasi.donatur;
                  const inisial = getInisial(donatur.nama);
                  const gradient = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group">
                      {/* Nomor Surat */}
                      <td className="px-5 py-4 font-mono font-bold text-slate-900 dark:text-white text-xs">
                        <Link href={`/donatur/surat/${s.id}`} className="hover:text-[#0B5FA5] transition-colors">
                          {s.nomorSurat}
                        </Link>
                      </td>

                      {/* Tanggal */}
                      <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                        {formatDateIndonesian(s.tanggalSurat)}
                      </td>

                      {/* Donatur */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${gradient} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
                            {inisial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                              {labelSapaan(donatur.sapaan)} {donatur.nama}
                            </p>
                            {donatur.noWa && (
                              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                <WhatsappLogo size={12} weight="fill" className="text-emerald-600" />
                                <span>{donatur.noWa}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Nilai */}
                      <td className="px-5 py-4 font-extrabold text-slate-900 dark:text-white text-sm">
                        {nilaiSurat(s)}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <BadgeStatusPill terkirim={s.terkirimWa} />
                      </td>

                      {/* Aksi Cepat */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Tombol 1-Klik Kirim WhatsApp jika Belum Terkirim */}
                          {!s.terkirimWa ? (
                            <Link
                              href={`/donatur/surat/${s.id}`}
                              className="h-8 px-3 rounded-xl bg-[#0E9F54] hover:bg-[#0c8747] text-white font-extrabold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all hover:gap-2"
                              title="Buka untuk kirim via WhatsApp sekarang"
                            >
                              <WhatsappLogo size={15} weight="bold" />
                              <span>Kirim WA</span>
                            </Link>
                          ) : (
                            <Link
                              href={`/donatur/surat/${s.id}`}
                              className="h-8 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-400 text-slate-600 dark:text-slate-300 font-bold text-xs inline-flex items-center gap-1 transition-colors"
                            >
                              <span>Detail</span>
                              <ArrowUpRight size={13} weight="bold" />
                            </Link>
                          )}

                          {/* Tombol Unduh PNG */}
                          <a
                            href={`/api/donatur/surat/${s.id}/png`}
                            download={`${s.nomorSurat.replace(/\//g, '-')}.png`}
                            aria-label={`Unduh PNG surat ${s.nomorSurat}`}
                            className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#0B5FA5] hover:text-[#0B5FA5] text-slate-500 inline-flex items-center justify-center transition-colors"
                            title="Unduh berkas PNG surat"
                          >
                            <DownloadSimple size={16} weight="bold" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {suratTersaring.map((s, idx) => {
              const donatur = s.donasi.donatur;
              const inisial = getInisial(donatur.nama);
              const gradient = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];

              return (
                <div
                  key={s.id}
                  className="rounded-[24px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${gradient} text-white flex items-center justify-center font-bold text-xs shrink-0`}>
                        {inisial}
                      </div>
                      <div>
                        <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {labelSapaan(donatur.sapaan)} {donatur.nama}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400">{s.nomorSurat}</p>
                      </div>
                    </div>
                    <BadgeStatusPill terkirim={s.terkirimWa} />
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                    <span className="text-slate-400">{formatDateIndonesian(s.tanggalSurat)}</span>
                    <span className="font-black text-slate-900 dark:text-white">{nilaiSurat(s)}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {!s.terkirimWa ? (
                      <Link
                        href={`/donatur/surat/${s.id}`}
                        className="flex-1 h-10 rounded-xl bg-[#0E9F54] hover:bg-[#0c8747] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                      >
                        <WhatsappLogo size={16} weight="bold" />
                        <span>Kirim via WA Sekarang</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/donatur/surat/${s.id}`}
                        className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 font-extrabold text-xs flex items-center justify-center gap-1 text-[#0B5FA5]"
                      >
                        <span>Lihat Detail</span>
                        <ArrowUpRight size={14} weight="bold" />
                      </Link>
                    )}

                    <a
                      href={`/api/donatur/surat/${s.id}/png`}
                      download={`${s.nomorSurat.replace(/\//g, '-')}.png`}
                      aria-label={`Unduh PNG surat ${s.nomorSurat}`}
                      className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900"
                    >
                      <DownloadSimple size={18} weight="bold" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
