'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  HandCoins, Receipt, Package, PaperPlaneTilt,
  CheckCircle, Clock, Warning, PlusCircle,
  ChartBar, DownloadSimple, CalendarBlank,
} from '@phosphor-icons/react';
import type { Rekap, SuratWithRelasi } from '@/lib/db/donatur-repo';
import { rentangPeriode, type PilihanPeriode } from '@/lib/utils/rekap';
import { formatRupiah } from '@/lib/utils/terbilang';
import { formatDateIndonesian } from '@/lib/utils/formatters';
import { labelSapaan } from '@/lib/surat/data';
import { susunRingkasan, type Ringkasan } from '@/lib/donatur/ringkasan';
import { OPSI_CEPAT, unduhCsv, GrafikBulanan } from '@/components/donatur/Rekap';

type Status = 'memuat' | 'siap' | 'error';

function nilaiSurat(s: SuratWithRelasi): string {
  return s.donasi.bentuk === 'UANG'
    ? `Rp ${formatRupiah(s.donasi.nominal ?? 0)}`
    : (s.donasi.deskripsiBarang || '-');
}

function BadgeStatus({ terkirim }: { terkirim: boolean }) {
  return terkirim ? (
    <span className="inline-flex items-center gap-1 text-[#0E9F54] font-bold text-xs whitespace-nowrap">
      <CheckCircle size={16} weight="bold" aria-hidden="true" /> Sudah terkirim
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-xs whitespace-nowrap">
      <Clock size={16} weight="bold" aria-hidden="true" /> Belum terkirim
    </span>
  );
}

function ErrorBanner({ pesan }: { pesan: string }) {
  return (
    <div role="alert" className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl px-3 py-2 flex items-center gap-2">
      <Warning size={18} weight="bold" aria-hidden="true" /> {pesan}
    </div>
  );
}

function KartuAngka({
  icon, warna, label, nilai, keterangan,
}: { icon: React.ReactNode; warna: string; label: string; nilai: string; keterangan?: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        <span className={warna}>{icon}</span> {label}
      </p>
      <p className="text-2xl font-extrabold">{nilai}</p>
      {keterangan && <p className="text-xs text-slate-400">{keterangan}</p>}
    </div>
  );
}

function KartuAngkaSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2 animate-pulse">
      <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-7 w-20 rounded bg-slate-200 dark:bg-slate-800" />
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
    ambilJson('/api/donatur/surat?limit=5')
      .then((data: SuratWithRelasi[]) => {
        if (batal) return;
        setSuratTerbaru(data);
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

  return (
    <div className="space-y-6">
      {/* Filter Periode & Export CSV */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {OPSI_CEPAT.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => pilihCepat(o.value)}
              aria-pressed={pilihan === o.value}
              className={`h-10 px-3.5 rounded-2xl font-bold text-xs sm:text-sm transition-colors ${
                pilihan === o.value
                  ? 'bg-[#0B5FA5] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5">
            <CalendarBlank size={16} weight="bold" className="text-slate-400 shrink-0" aria-hidden="true" />
            <input
              type="date"
              value={dari}
              max={sampai}
              onChange={e => { setPilihan('manual'); setDari(e.target.value); }}
              aria-label="Dari tanggal"
              className="h-10 px-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5]"
            />
            <span className="text-slate-400 text-xs">s/d</span>
            <input
              type="date"
              value={sampai}
              min={dari}
              onChange={e => { setPilihan('manual'); setSampai(e.target.value); }}
              aria-label="Sampai tanggal"
              className="h-10 px-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5]"
            />
          </div>

          {dataRekap && (
            <button
              type="button"
              onClick={() => unduhCsv(dataRekap, dari, sampai)}
              aria-label="Unduh rekap sebagai CSV"
              className="h-10 px-3.5 rounded-xl bg-[#0E9F54] hover:bg-[#0c8747] text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
            >
              <DownloadSimple size={16} weight="bold" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Kartu Angka Ringkasan */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {statusRingkasan === 'memuat' && Array.from({ length: 4 }).map((_, i) => <KartuAngkaSkeleton key={i} />)}

        {statusRingkasan === 'error' && (
          <div className="sm:col-span-2 lg:col-span-4">
            <ErrorBanner pesan={errorRingkasan || 'Gagal memuat ringkasan donasi.'} />
          </div>
        )}

        {statusRingkasan === 'siap' && ringkasan && (
          <>
            <KartuAngka
              icon={<HandCoins size={16} weight="duotone" />}
              warna="text-[#0E9F54]"
              label="Total uang"
              nilai={`Rp ${formatRupiah(ringkasan.totalUang)}`}
              keterangan={pilihan === 'bulan-ini' ? 'Periode: Bulan Ini' : pilihan === '3-bulan' ? 'Periode: 3 Bulan Terakhir' : pilihan === 'tahun-ini' ? 'Periode: Tahun Ini' : 'Periode Kustom'}
            />
            <KartuAngka
              icon={<Receipt size={16} weight="duotone" />}
              warna="text-[#0B5FA5]"
              label="Jumlah donasi uang"
              nilai={String(ringkasan.jumlahDonasi)}
            />
            <KartuAngka
              icon={<Package size={16} weight="duotone" />}
              warna="text-[#0B5FA5]"
              label="Donasi barang"
              nilai={String(ringkasan.jumlahBarang)}
            />
            <KartuAngka
              icon={<PaperPlaneTilt size={16} weight="duotone" />}
              warna="text-[#0E9F54]"
              label="Surat terkirim"
              nilai={String(ringkasan.suratTerkirim)}
              keterangan="dari donasi periode ini"
            />
          </>
        )}
      </div>

      {/* Grafik Donasi Uang per Bulan */}
      {dataRekap && dataRekap.perBulan && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-xs">
          <h2 className="flex items-center gap-2 font-bold text-base sm:text-lg">
            <ChartBar size={20} weight="duotone" className="text-[#0B5FA5]" aria-hidden="true" />
            <span>Tren Donasi Uang per Bulan</span>
          </h2>
          <GrafikBulanan perBulan={dataRekap.perBulan} dari={dari} sampai={sampai} />
        </div>
      )}

      {/* Tombol Buat Surat */}
      <Link
        href="/donatur/surat/baru"
        className="flex items-center justify-center gap-2 min-h-[52px] rounded-2xl bg-[#0B5FA5] hover:bg-[#094a84] text-white font-extrabold text-base shadow-sm transition-colors"
      >
        <PlusCircle size={22} weight="bold" aria-hidden="true" /> Buat Surat Ucapan Terima Kasih
      </Link>

      {/* Grid Surat Terbaru & Donasi Barang */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Surat Terbaru */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Surat Terbaru</h2>
            <Link href="/donatur/surat" className="text-xs font-bold text-[#0B5FA5] hover:underline">
              Lihat Semua &rarr;
            </Link>
          </div>

          {statusSurat === 'memuat' && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          )}

          {statusSurat === 'error' && <ErrorBanner pesan={errorSurat || 'Gagal memuat daftar surat terbaru.'} />}

          {statusSurat === 'siap' && suratTerbaru && suratTerbaru.length === 0 && (
            <p className="text-sm text-slate-500 px-1">Belum ada surat dibuat. Mulai dengan membuat surat pertama.</p>
          )}

          {statusSurat === 'siap' && suratTerbaru && suratTerbaru.length > 0 && (
            <div className="space-y-2">
              {suratTerbaru.map((s) => (
                <Link
                  key={s.id}
                  href={`/donatur/surat/${s.id}`}
                  className="flex items-center justify-between gap-3 min-h-[44px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-[#0B5FA5] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-bold truncate text-sm">{s.nomorSurat}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {labelSapaan(s.donasi.donatur.sapaan)} {s.donasi.donatur.nama} · {nilaiSurat(s)}
                    </p>
                  </div>
                  <BadgeStatus terkirim={s.terkirimWa} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Donasi Barang di Periode Terpilih */}
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 font-bold text-lg">
            <Package size={20} weight="duotone" className="text-[#0B5FA5]" aria-hidden="true" />
            <span>Donasi Barang</span>
            {dataRekap && <span className="text-sm font-normal text-slate-500">({dataRekap.barang.length})</span>}
          </h2>

          {(!dataRekap || dataRekap.barang.length === 0) ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500">
              Belum ada donasi barang pada periode ini.
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {dataRekap.barang.map((b, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">{formatDateIndonesian(b.tanggal)}</p>
                    <span className="text-xs font-bold text-[#0B5FA5]">{b.donatur}</span>
                  </div>
                  <p className="font-semibold text-sm">{b.deskripsi}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
