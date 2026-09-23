'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  HandCoins, Receipt, Package, PaperPlaneTilt,
  CheckCircle, Clock, Warning, PlusCircle,
  ChartBar, DownloadSimple, CalendarBlank,
  ArrowUpRight, WhatsappLogo, Sparkle, CaretRight, Check,
} from '@phosphor-icons/react';
import type { Rekap, SuratWithRelasi } from '@/lib/db/donatur-repo';
import { rentangPeriode, type PilihanPeriode, labelBulan, isiBulanKosong } from '@/lib/utils/rekap';
import { formatRupiah } from '@/lib/utils/terbilang';
import { formatDateIndonesian } from '@/lib/utils/formatters';
import { labelSapaan } from '@/lib/surat/data';
import { susunRingkasan, type Ringkasan } from '@/lib/donatur/ringkasan';
import { OPSI_CEPAT, unduhCsv } from '@/components/donatur/Rekap';

type Status = 'memuat' | 'siap' | 'error';

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

const JENIS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  ZAKAT: {
    label: 'Zakat',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  INFAQ: {
    label: 'Infaq',
    dot: 'bg-[#0B5FA5]',
    bg: 'bg-[#0B5FA5]',
    text: 'text-[#0B5FA5] dark:text-blue-400',
  },
  SHADAQAH: {
    label: 'Shadaqah',
    dot: 'bg-amber-500',
    bg: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
  },
  LAINNYA: {
    label: 'Lainnya / Wakaf',
    dot: 'bg-purple-500',
    bg: 'bg-purple-500',
    text: 'text-purple-700 dark:text-purple-400',
  },
};

function BadgeStatus({ terkirim }: { terkirim: boolean }) {
  return terkirim ? (
    <span className="inline-flex items-center gap-1 text-[#0E9F54] font-bold text-xs whitespace-nowrap bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
      <CheckCircle size={14} weight="fill" aria-hidden="true" /> Terkirim WA
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-xs whitespace-nowrap bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200/60 dark:border-amber-800/40 animate-pulse">
      <Clock size={14} weight="bold" aria-hidden="true" /> Belum WA
    </span>
  );
}

function ErrorBanner({ pesan }: { pesan: string }) {
  return (
    <div role="alert" className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-2xl p-4 flex items-center gap-2 border border-rose-200 dark:border-rose-900/40">
      <Warning size={18} weight="bold" aria-hidden="true" /> {pesan}
    </div>
  );
}

async function ambilJson(url: string): Promise<any> {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const rincian = json.fields ? Object.values<string>(json.fields).join(' ') : '';
    throw new Error([json.error || 'Gagal memuat data.', rincian].filter(Boolean).join(' — '));
  }
  return json.data;
}

/**
 * Capsule Bar Chart ala Donezo dengan pill membulat penuh & bubble tooltip mengapung
 */
function GrafikKapsulBulanan({
  perBulan,
  dari,
  sampai,
}: {
  perBulan: Rekap['perBulan'];
  dari: string;
  sampai: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!perBulan || perBulan.length === 0) {
    return (
      <div className="h-52 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center p-6 text-slate-400">
        <ChartBar size={36} weight="thin" className="mb-2 opacity-50 text-[#0B5FA5]" />
        <p className="text-sm font-medium">Belum ada donasi uang pada rentang periode ini.</p>
      </div>
    );
  }

  const lengkap = isiBulanKosong(perBulan, dari, sampai);
  const max = Math.max(...lengkap.map(p => p.total), 1);
  
  // Highlight bulan terakhir yang memiliki nominal > 0 atau bulan paling kanan bila tidak sedang di-hover
  const activeIdx = hoveredIdx !== null
    ? hoveredIdx
    : (() => {
        const lastNonZero = lengkap.map((p, i) => p.total > 0 ? i : -1).filter(i => i !== -1).pop();
        return lastNonZero !== undefined ? lastNonZero : (lengkap.length - 1);
      })();

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2 sm:gap-3.5 h-56 pt-9 pb-2 px-1 overflow-x-auto">
        {lengkap.map((p, idx) => {
          const persen = Math.max(Math.round((p.total / max) * 100), p.total > 0 ? 8 : 4);
          const isActive = idx === activeIdx;
          const nilai = `Rp ${formatRupiah(p.total)}`;

          return (
            <div
              key={p.bulan}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="group flex flex-col items-center justify-end h-full min-w-[3.25rem] flex-1 cursor-pointer select-none relative"
            >
              {/* Floating Tooltip Bubble */}
              <div
                className={`absolute -top-3 sm:-top-4 z-10 transition-all duration-200 pointer-events-none ${
                  isActive
                    ? 'opacity-100 scale-100 -translate-y-1'
                    : 'opacity-0 scale-95 translate-y-0 group-hover:opacity-100 group-hover:scale-100 group-hover:-translate-y-1'
                }`}
              >
                <div className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[11px] font-extrabold px-2.5 py-1 rounded-xl shadow-lg whitespace-nowrap flex items-center gap-1">
                  <span>{nilai}</span>
                </div>
                <div className="w-2 h-2 bg-slate-900 dark:bg-white rotate-45 mx-auto -mt-1 shadow-xs" />
              </div>

              {/* Pill / Capsule Bar Track */}
              <div className="w-full max-w-[2.75rem] h-40 bg-slate-100 dark:bg-slate-800/80 rounded-full p-1 sm:p-1.5 flex flex-col justify-end relative overflow-hidden transition-colors duration-200 group-hover:bg-slate-200/90 dark:group-hover:bg-slate-700/80">
                {/* Inner Filled Capsule */}
                <div
                  style={{ height: `${persen}%` }}
                  className={`w-full rounded-full transition-all duration-700 ease-out ${
                    isActive
                      ? 'bg-gradient-to-t from-[#0B5FA5] to-[#248ee6] shadow-sm shadow-blue-500/30 ring-2 ring-blue-400/40'
                      : p.total > 0
                        ? 'bg-gradient-to-t from-[#0B5FA5] to-[#1c7ecf] opacity-85 group-hover:opacity-100'
                        : 'bg-slate-200 dark:bg-slate-700/50'
                  }`}
                  role="img"
                  aria-label={`${labelBulan(p.bulan)}: ${nilai}`}
                />
              </div>

              {/* Month Label */}
              <span
                className={`text-[11px] mt-2.5 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'font-extrabold text-[#0B5FA5] dark:text-blue-400'
                    : 'font-semibold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100'
                }`}
              >
                {labelBulan(p.bulan)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RingkasanDonatur() {
  const awal = rentangPeriode('bulan-ini', new Date());
  const [pilihan, setPilihan] = useState<PilihanPeriode | 'manual'>('bulan-ini');
  const [dari, setDari] = useState(awal.dari);
  const [sampai, setSampai] = useState(awal.sampai);

  const [dataRekap, setDataRekap] = useState<Rekap | null>(null);
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [statusRingkasan, setStatusRingkasan] = useState<Status>('memuat');
  const [errorRingkasan, setErrorRingkasan] = useState<string | null>(null);

  const [suratTerbaru, setSuratTerbaru] = useState<SuratWithRelasi[] | null>(null);
  const [suratBelumTerkirim, setSuratBelumTerkirim] = useState<SuratWithRelasi[] | null>(null);
  const [statusSurat, setStatusSurat] = useState<Status>('memuat');
  const [errorSurat, setErrorSurat] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    setStatusRingkasan('memuat');
    setErrorRingkasan(null);

    Promise.all([
      ambilJson(`/api/donatur/rekap?dari=${encodeURIComponent(dari)}&sampai=${encodeURIComponent(sampai)}`) as Promise<Rekap>,
      ambilJson(`/api/donatur/surat?dari=${encodeURIComponent(dari)}&sampai=${encodeURIComponent(sampai)}&terkirim=true&limit=500`) as Promise<SuratWithRelasi[]>,
    ])
      .then(([rekap, suratTerkirimBulanIni]) => {
        if (batal) return;
        setDataRekap(rekap);
        setRingkasan(susunRingkasan(rekap, suratTerkirimBulanIni.length));
        setStatusRingkasan('siap');
      })
      .catch((err) => {
        if (batal) return;
        setErrorRingkasan(err instanceof Error ? err.message : 'Tidak dapat terhubung ke server.');
        setStatusRingkasan('error');
      });

    return () => { batal = true; };
  }, [dari, sampai]);

  useEffect(() => {
    let batal = false;
    setStatusSurat('memuat');
    setErrorSurat(null);

    Promise.all([
      ambilJson('/api/donatur/surat?limit=5') as Promise<SuratWithRelasi[]>,
      ambilJson('/api/donatur/surat?terkirim=false&limit=5') as Promise<SuratWithRelasi[]>,
    ])
      .then(([terbaru, belumTerkirim]) => {
        if (batal) return;
        setSuratTerbaru(terbaru);
        setSuratBelumTerkirim(belumTerkirim);
        setStatusSurat('siap');
      })
      .catch((err) => {
        if (batal) return;
        setErrorSurat(err instanceof Error ? err.message : 'Tidak dapat terhubung ke server.');
        setStatusSurat('error');
      });

    return () => { batal = true; };
  }, []);

  const pilihCepat = (p: PilihanPeriode) => {
    const rentang = rentangPeriode(p, new Date());
    setPilihan(p);
    setDari(rentang.dari);
    setSampai(rentang.sampai);
  };

  const labelPeriodeAktif =
    pilihan === 'bulan-ini'
      ? 'Bulan Ini'
      : pilihan === '3-bulan'
      ? '3 Bulan Terakhir'
      : pilihan === 'tahun-ini'
      ? 'Tahun Ini'
      : 'Periode Kustom';

  // Persiapan data komposisi jenis donasi
  const perJenis = dataRekap?.perJenis ?? [];
  const totalNominalJenis = perJenis.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div className="space-y-6">
      {/* 1. FILTER & ACTION TOOLBAR (Bento Header) */}
      <div className="animate-bento-1 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-[26px] border border-slate-200/90 dark:border-slate-800 shadow-xs">
        {/* Pilihan Periode Pills */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {OPSI_CEPAT.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => pilihCepat(o.value)}
              aria-pressed={pilihan === o.value}
              className={`h-10 px-4 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 ${
                pilihan === o.value
                  ? 'bg-[#0B5FA5] text-white shadow-xs shadow-blue-500/25'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Date Inputs & Direct Actions */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            <CalendarBlank size={16} weight="bold" className="text-slate-400 shrink-0" aria-hidden="true" />
            <input
              type="date"
              value={dari}
              max={sampai}
              onChange={e => { setPilihan('manual'); setDari(e.target.value); }}
              aria-label="Dari tanggal"
              className="h-8 px-1 text-xs rounded-lg border-0 bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B5FA5]"
            />
            <span className="text-slate-400 text-xs font-semibold">s/d</span>
            <input
              type="date"
              value={sampai}
              min={dari}
              onChange={e => { setPilihan('manual'); setSampai(e.target.value); }}
              aria-label="Sampai tanggal"
              className="h-8 px-1 text-xs rounded-lg border-0 bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B5FA5]"
            />
          </div>

          {dataRekap && (
            <button
              type="button"
              onClick={() => unduhCsv(dataRekap, dari, sampai)}
              aria-label="Unduh rekap sebagai CSV"
              className="h-10 px-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#0E9F54] hover:text-[#0E9F54] text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all shadow-xs"
            >
              <DownloadSimple size={16} weight="bold" />
              <span>Export CSV</span>
            </button>
          )}

          <Link
            href="/donatur/surat/baru"
            className="h-10 px-4 rounded-2xl bg-[#0B5FA5] hover:bg-[#094a84] text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all shadow-xs shadow-blue-600/20"
          >
            <PlusCircle size={16} weight="bold" aria-hidden="true" />
            <span>+ Buat Surat</span>
          </Link>
        </div>
      </div>

      {/* Error state */}
      {statusRingkasan === 'error' && (
        <ErrorBanner pesan={errorRingkasan || 'Gagal memuat ringkasan donasi.'} />
      )}

      {/* 2. ROW 1: BENTO TOP STATS (Hero Card + 3 Floating Cards) */}
      <div className="animate-bento-2 grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* HERO CARD: Dark Emerald ala Donezo */}
        <div className="md:col-span-12 lg:col-span-5 bg-gradient-to-br from-[#0c3825] via-[#092b1d] to-[#04170f] text-white rounded-[26px] p-6 sm:p-7 relative overflow-hidden border border-emerald-800/50 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
          {/* Ambient Glow */}
          <div className="absolute -right-8 -top-8 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/25 transition-all duration-500" />
          
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300/85">
                Total Penghimpunan Dana
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 backdrop-blur-xs">
                {labelPeriodeAktif}
              </span>
            </div>

            {statusRingkasan === 'memuat' ? (
              <div className="h-10 w-48 rounded-xl bg-white/10 animate-pulse my-2" />
            ) : (
              <p className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Rp {formatRupiah(ringkasan?.totalUang ?? 0)}
              </p>
            )}

            <p className="text-xs text-emerald-200/70 leading-relaxed">
              Akumulasi penerimaan uang tunai & transfer resmi tercatat pada periode terpilih.
            </p>
          </div>

          <div className="relative z-10 pt-6 mt-4 border-t border-emerald-800/40 flex items-center justify-between">
            <Link
              href="/donatur/surat/baru"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0E9F54] hover:bg-[#0c8747] text-white font-bold text-xs shadow-sm transition-all duration-200 hover:gap-2.5"
            >
              <PlusCircle size={16} weight="bold" />
              <span>Input Donasi Baru</span>
            </Link>

            <Link
              href="/donatur/surat"
              className="text-xs font-semibold text-emerald-300/80 hover:text-white transition-colors flex items-center gap-1"
            >
              <span>Arsip Surat</span>
              <ArrowUpRight size={14} weight="bold" />
            </Link>
          </div>
        </div>

        {/* 3 ACCOMPANYING STAT CARDS */}
        <div className="md:col-span-12 lg:col-span-7 grid sm:grid-cols-3 gap-4">
          {/* Card 1: Frekuensi Donasi Uang */}
          <div className="rounded-[26px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#0B5FA5] flex items-center justify-center">
                <Receipt size={20} weight="duotone" />
              </div>
              <Link
                href="/donatur/surat"
                aria-label="Lihat daftar surat donasi uang"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:text-[#0B5FA5] group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 transition-all"
              >
                <ArrowUpRight size={16} weight="bold" />
              </Link>
            </div>
            <div className="space-y-1 my-3">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {statusRingkasan === 'memuat' ? '...' : (ringkasan?.jumlahDonasi ?? 0)}
              </p>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Donasi Uang</p>
            </div>
            <p className="text-[11px] text-slate-400">Total transaksi terverifikasi</p>
          </div>

          {/* Card 2: Donasi Barang */}
          <div className="rounded-[26px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                <Package size={20} weight="duotone" />
              </div>
              <a
                href="#donasi-barang"
                aria-label="Lihat daftar donasi barang"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:text-amber-600 group-hover:bg-amber-50 dark:group-hover:bg-amber-950/40 transition-all"
              >
                <ArrowUpRight size={16} weight="bold" />
              </a>
            </div>
            <div className="space-y-1 my-3">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {statusRingkasan === 'memuat' ? '...' : (ringkasan?.jumlahBarang ?? 0)}
              </p>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Donasi Barang</p>
            </div>
            <p className="text-[11px] text-slate-400">Sembako, sarana & logistik</p>
          </div>

          {/* Card 3: Surat Terkirim WA */}
          <div className="rounded-[26px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0E9F54] flex items-center justify-center">
                <PaperPlaneTilt size={20} weight="duotone" />
              </div>
              <Link
                href="/donatur/surat"
                aria-label="Lihat daftar surat terkirim"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:text-[#0E9F54] group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40 transition-all"
              >
                <ArrowUpRight size={16} weight="bold" />
              </Link>
            </div>
            <div className="space-y-1 my-3">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {statusRingkasan === 'memuat' ? '...' : (ringkasan?.suratTerkirim ?? 0)}
              </p>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Surat Terkirim WA</p>
            </div>
            <p className="text-[11px] text-slate-400">Ucapan terima kasih terkirim</p>
          </div>
        </div>
      </div>

      {/* 3. ROW 2: BENTO MAIN SECTION (Capsule Chart + WhatsApp Reminder Card) */}
      <div className="animate-bento-3 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* KIRI: Capsule Bar Chart (8 cols) */}
        <div className="lg:col-span-8 rounded-[26px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-xs hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="flex items-center gap-2 font-black text-base sm:text-lg text-slate-900 dark:text-white">
                <ChartBar size={20} weight="duotone" className="text-[#0B5FA5]" aria-hidden="true" />
                <span>Tren Donasi Uang per Bulan</span>
              </h2>
              <p className="text-xs text-slate-400">Analisis perbandingan nominal donasi uang yang dihimpun.</p>
            </div>

            {dataRekap && (
              <span className="text-xs font-bold text-[#0B5FA5] bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-900/50">
                Total: Rp {formatRupiah(dataRekap.totalUang)}
              </span>
            )}
          </div>

          {statusRingkasan === 'memuat' ? (
            <div className="h-56 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse flex items-center justify-center text-slate-400 text-xs">
              Memuat grafik...
            </div>
          ) : dataRekap ? (
            <GrafikKapsulBulanan perBulan={dataRekap.perBulan} dari={dari} sampai={sampai} />
          ) : null}
        </div>

        {/* KANAN: Reminder Card ala Donezo (4 cols) */}
        <div className="lg:col-span-4 flex flex-col">
          {suratBelumTerkirim && suratBelumTerkirim.length > 0 ? (
            /* Warning / Action Needed Card */
            <div className="h-full rounded-[26px] bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-orange-50/30 dark:from-amber-950/30 dark:to-slate-900 border border-amber-200/90 dark:border-amber-800/60 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-extrabold text-[11px] uppercase tracking-wider bg-amber-100/80 dark:bg-amber-900/50 px-3 py-1 rounded-full border border-amber-300/60 dark:border-amber-700/60">
                    <Clock size={14} weight="bold" />
                    <span>Perlu Tindak Lanjut</span>
                  </span>
                  <span className="text-xs font-black text-amber-700 dark:text-amber-400">
                    {suratBelumTerkirim.length} Tertunda
                  </span>
                </div>

                <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug">
                  Surat Belum Terkirim ke WhatsApp Donatur
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Ada surat ucapan yang telah digenerate tapi belum terkirim via WhatsApp. Kirimkan segera agar transparansi donasi terjaga.
                </p>

                {/* Mini preview penerima tertunda */}
                <div className="space-y-1.5 pt-1">
                  {suratBelumTerkirim.slice(0, 2).map((s) => (
                    <Link
                      key={s.id}
                      href={`/donatur/surat/${s.id}`}
                      className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-amber-200/50 dark:border-amber-900/40 hover:border-amber-400 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold truncate text-slate-800 dark:text-slate-200">
                          {labelSapaan(s.donasi.donatur.sapaan)} {s.donasi.donatur.nama}
                        </p>
                        <p className="text-[11px] text-slate-500">{nilaiSurat(s)}</p>
                      </div>
                      <CaretRight size={14} className="text-amber-600 shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>

              <Link
                href="/donatur/surat"
                className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-[#0E9F54] hover:bg-[#0c8747] text-white font-extrabold text-xs shadow-sm transition-all mt-2"
              >
                <WhatsappLogo size={18} weight="bold" />
                <span>Kirim via WhatsApp Sekarang</span>
              </Link>
            </div>
          ) : (
            /* All Sent / Celebratory Card */
            <div className="h-full rounded-[26px] bg-gradient-to-br from-emerald-500/10 via-emerald-50/40 to-teal-50/20 dark:from-emerald-950/30 dark:to-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-extrabold text-[11px] uppercase tracking-wider bg-emerald-100/80 dark:bg-emerald-900/50 px-3 py-1 rounded-full border border-emerald-300/60 dark:border-emerald-700/60">
                    <CheckCircle size={14} weight="fill" />
                    <span>Semua Bersih</span>
                  </span>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">100% Terkirim</span>
                </div>

                <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug">
                  Seluruh Surat Berhasil Dikirimkan
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Luar biasa! Tidak ada antrean surat donatur yang tertunda. Seluruh ucapan terima kasih telah terkirim via WhatsApp secara sempurna.
                </p>

                <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-emerald-200/50 dark:border-emerald-900/30 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-[#0E9F54] flex items-center justify-center shrink-0">
                    <Sparkle size={18} weight="fill" />
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight font-medium">
                    Menjaga komunikasi cepat meningkatkan kenyamanan donatur hingga 90%.
                  </p>
                </div>
              </div>

              <Link
                href="/donatur/surat/baru"
                className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-[#0B5FA5] hover:bg-[#094a84] text-white font-extrabold text-xs shadow-sm transition-all mt-2"
              >
                <PlusCircle size={17} weight="bold" />
                <span>Buat Surat Ucapan Baru</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 4. ROW 3: BENTO DETAILS SECTION (Donatur Terkini + Komposisi Jenis Donasi) */}
      <div className="animate-bento-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* KIRI: Donatur Terkini & Rutin (7 cols) */}
        <div className="lg:col-span-7 rounded-[26px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-xs hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                Donatur Terkini & Rutin
              </h2>
              <p className="text-xs text-slate-400">Daftar transaksi donatur terbaru yang telah dibuatkan surat.</p>
            </div>
            <Link href="/donatur/surat" className="text-xs font-bold text-[#0B5FA5] hover:underline flex items-center gap-1">
              <span>Lihat Semua</span>
              <CaretRight size={12} weight="bold" />
            </Link>
          </div>

          {statusSurat === 'memuat' && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/70 animate-pulse" />
              ))}
            </div>
          )}

          {statusSurat === 'error' && <ErrorBanner pesan={errorSurat || 'Gagal memuat daftar surat terbaru.'} />}

          {statusSurat === 'siap' && suratTerbaru && suratTerbaru.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-400">
              Belum ada surat donasi dibuat. Mulai dengan membuat surat pertama Anda.
            </div>
          )}

          {statusSurat === 'siap' && suratTerbaru && suratTerbaru.length > 0 && (
            <div className="space-y-2.5">
              {suratTerbaru.map((s, idx) => {
                const donatur = s.donasi.donatur;
                const gradientClass = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
                const inisial = getInisial(donatur.nama);

                return (
                  <div
                    key={s.id}
                    className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 group"
                  >
                    <Link href={`/donatur/surat/${s.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Avatar Inisial Bergradien */}
                      <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${gradientClass} flex items-center justify-center font-black text-xs shrink-0 shadow-xs`}>
                        {inisial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-[#0B5FA5] transition-colors">
                            {labelSapaan(donatur.sapaan)} {donatur.nama}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {nilaiSurat(s)} · {formatDateIndonesian(s.tanggalSurat)}
                        </p>
                      </div>
                    </Link>

                    <div className="flex items-center gap-2.5 shrink-0 self-center">
                      <BadgeStatus terkirim={s.terkirimWa} />
                      {/* Tombol Donasi Lagi Cepat */}
                      <Link
                        href={`/donatur/surat/baru?donaturId=${donatur.id}`}
                        title="Donasi lagi untuk donatur ini"
                        className="h-8 px-3 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-[#0B5FA5] hover:text-[#0B5FA5] text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1 transition-all"
                      >
                        <PlusCircle size={14} weight="bold" />
                        <span>Donasi Lagi</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* KANAN: Komposisi Jenis Donasi (5 cols) */}
        <div className="lg:col-span-5 rounded-[26px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="space-y-1">
            <h2 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
              Komposisi Donasi
            </h2>
            <p className="text-xs text-slate-400">Distribusi penerimaan berdasarkan akad donasi.</p>
          </div>

          {/* Segmented Pill Progress Bar */}
          <div className="space-y-2 my-2">
            <div className="h-3.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden p-0.5 gap-0.5">
              {perJenis.length > 0 ? (
                perJenis.map((item) => {
                  const pct = totalNominalJenis > 0 ? (item.total / totalNominalJenis) * 100 : (1 / perJenis.length) * 100;
                  const cfg = JENIS_CONFIG[item.jenis] ?? JENIS_CONFIG.LAINNYA;
                  return (
                    <div
                      key={item.jenis}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${cfg.bg}`}
                      title={`${cfg.label}: ${pct.toFixed(1)}%`}
                    />
                  );
                })
              ) : (
                <div className="h-full w-full rounded-full bg-slate-200 dark:bg-slate-700" />
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Proporsi Berdasarkan Rupiah</span>
              <span>{perJenis.length} Kategori Akad</span>
            </div>
          </div>

          {/* List Breakdown per Jenis */}
          <div className="space-y-2.5 flex-1">
            {perJenis.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-400">
                Belum ada data akad donasi pada periode ini.
              </div>
            ) : (
              perJenis.map((item) => {
                const pct = totalNominalJenis > 0 ? Math.round((item.total / totalNominalJenis) * 100) : 0;
                const cfg = JENIS_CONFIG[item.jenis] ?? JENIS_CONFIG.LAINNYA;

                return (
                  <div
                    key={item.jenis}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} shrink-0`} />
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{cfg.label}</p>
                        <p className="text-[11px] text-slate-400">{item.jumlah} donasi tercatat</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-extrabold text-slate-900 dark:text-white">
                        Rp {formatRupiah(item.total)}
                      </p>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 dark:bg-slate-700 px-1.5 py-0.5 rounded-md">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 5. ROW 4: DONASI BARANG TERKINI (Anchor #donasi-barang) */}
      <div id="donasi-barang" className="animate-bento-5 rounded-[26px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
              <Package size={20} weight="duotone" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                Donasi Barang
              </h2>
              <p className="text-xs text-slate-400">Penerimaan sembako, buku, perlengkapan, dan barang lainnya.</p>
            </div>
          </div>
          {dataRekap && (
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-3 py-1 rounded-full border border-amber-200/60 dark:border-amber-900/40">
              {dataRekap.barang.length} Paket Barang
            </span>
          )}
        </div>

        {(!dataRekap || dataRekap.barang.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-400">
            Belum ada donasi barang pada periode ini.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dataRekap.barang.map((b, i) => (
              <div key={i} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-1.5 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">{formatDateIndonesian(b.tanggal)}</span>
                  <span className="font-extrabold text-[#0B5FA5] text-[11px]">{b.donatur}</span>
                </div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{b.deskripsi}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
