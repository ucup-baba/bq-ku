'use client';
import { useEffect, useRef, useState } from 'react';
import { ChartBar, HandCoins, Receipt, Package, DownloadSimple, Warning, CalendarBlank } from '@phosphor-icons/react';
import type { Rekap as RekapData } from '@/lib/db/donatur-repo';
import { formatRupiah } from '@/lib/utils/terbilang';
import { formatDateIndonesian } from '@/lib/utils/formatters';
import { toCsv } from '@/lib/utils/csv';
import { labelBulan, rentangPeriode, isiBulanKosong, type PilihanPeriode } from '@/lib/utils/rekap';

export const OPSI_CEPAT: Array<{ value: PilihanPeriode; label: string }> = [
  { value: 'bulan-ini', label: 'Bulan ini' },
  { value: '3-bulan', label: '3 bulan terakhir' },
  { value: 'tahun-ini', label: 'Tahun ini' },
];

export const dateField = 'h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5]';

export function unduhCsv(data: RekapData, dari: string, sampai: string) {
  const barisUang = data.perBulan.map(pb => ({ bulan: labelBulan(pb.bulan), total: pb.total }));
  const barisBarang = data.barang.map(b => ({
    tanggal: formatDateIndonesian(b.tanggal),
    donatur: b.donatur,
    deskripsi: b.deskripsi,
  }));

  const bagian = [
    'Donasi Uang per Bulan',
    barisUang.length ? toCsv(barisUang) : '(tidak ada data)',
    '',
    'Donasi Barang',
    barisBarang.length ? toCsv(barisBarang) : '(tidak ada data)',
  ].join('\n');

  // BOM UTF-8 di awal agar Excel versi Indonesia membaca karakter dengan benar.
  const blob = new Blob(['\uFEFF' + bagian], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rekap-${dari}-${sampai}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function GrafikBulanan({ perBulan, dari, sampai }: { perBulan: RekapData['perBulan']; dari: string; sampai: string }) {
  if (perBulan.length === 0) {
    return <p className="text-sm text-slate-500 px-1">Belum ada donasi uang pada periode ini.</p>;
  }
  // Lengkapi bulan yang tidak punya donasi uang dengan 0 agar grafik tetap
  // menampilkan seluruh bulan dalam rentang (mis. "3 bulan terakhir" tidak
  // hanya menampilkan satu batang bila dua bulan lain kosong).
  const lengkap = isiBulanKosong(perBulan, dari, sampai);
  const max = Math.max(...lengkap.map(p => p.total), 1);
  return (
    <div className="flex items-end gap-2 sm:gap-3 h-48 px-1 overflow-x-auto">
      {lengkap.map(p => {
        const persen = Math.max((p.total / max) * 100, 2);
        const nilai = `Rp ${formatRupiah(p.total)}`;
        return (
          <div key={p.bulan} className="flex flex-col items-center justify-end h-full min-w-[3.25rem] flex-1">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 whitespace-nowrap">{nilai}</span>
            <div
              className="w-full rounded-t-lg bg-[#0B5FA5]"
              style={{ height: `${persen}%` }}
              role="img"
              aria-label={`${labelBulan(p.bulan)}: ${nilai}`}
              title={`${labelBulan(p.bulan)}: ${nilai}`}
            />
            <span className="text-[11px] text-slate-500 mt-1.5 whitespace-nowrap">{labelBulan(p.bulan)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Rekap() {
  const awal = rentangPeriode('bulan-ini', new Date());
  const [pilihan, setPilihan] = useState<PilihanPeriode | 'manual'>('bulan-ini');
  const [dari, setDari] = useState(awal.dari);
  const [sampai, setSampai] = useState(awal.sampai);
  const [data, setData] = useState<RekapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const id = ++requestIdRef.current;
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/donatur/rekap?dari=${encodeURIComponent(dari)}&sampai=${encodeURIComponent(sampai)}`);
        const json = await res.json();
        if (id !== requestIdRef.current) return; // respons basi, abaikan
        if (!res.ok) {
          const rincian = json.fields ? Object.values<string>(json.fields).join(' ') : '';
          setError([json.error || 'Gagal memuat rekap donasi.', rincian].filter(Boolean).join(' — '));
          setData(null);
          return;
        }
        setData(json.data);
      } catch {
        if (id !== requestIdRef.current) return;
        setError('Tidak dapat terhubung ke server.');
        setData(null);
      }
    })();
  }, [dari, sampai]);

  const pilihCepat = (p: PilihanPeriode) => {
    const rentang = rentangPeriode(p, new Date());
    setPilihan(p);
    setDari(rentang.dari);
    setSampai(rentang.sampai);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {OPSI_CEPAT.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => pilihCepat(o.value)}
            aria-pressed={pilihan === o.value}
            className={`h-11 px-4 rounded-2xl font-bold text-sm transition-colors ${
              pilihan === o.value
                ? 'bg-[#0B5FA5] text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {o.label}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <CalendarBlank size={18} weight="bold" className="text-slate-400 shrink-0" aria-hidden="true" />
          <label className="sr-only" htmlFor="rekap-dari">Dari tanggal</label>
          <input
            id="rekap-dari"
            type="date"
            value={dari}
            max={sampai}
            onChange={e => { setPilihan('manual'); setDari(e.target.value); }}
            className={dateField}
          />
          <span className="text-slate-400 text-sm">s/d</span>
          <label className="sr-only" htmlFor="rekap-sampai">Sampai tanggal</label>
          <input
            id="rekap-sampai"
            type="date"
            value={sampai}
            min={dari}
            onChange={e => { setPilihan('manual'); setSampai(e.target.value); }}
            className={dateField}
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl px-3 py-2 flex items-center gap-2">
          <Warning size={18} weight="bold" aria-hidden="true" /> {error}
        </div>
      )}

      {data === null && !error && (
        <p className="text-sm text-slate-500 px-1">Memuat rekap donasi…</p>
      )}

      {data && (
        <>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <HandCoins size={16} weight="duotone" className="text-[#0E9F54]" aria-hidden="true" /> Total donasi uang
              </p>
              <p className="text-2xl font-extrabold">Rp {formatRupiah(data.totalUang)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <Receipt size={16} weight="duotone" className="text-[#0B5FA5]" aria-hidden="true" /> Jumlah donasi uang
              </p>
              <p className="text-2xl font-extrabold">{data.jumlahDonasiUang}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <Package size={16} weight="duotone" className="text-[#0B5FA5]" aria-hidden="true" /> Jumlah donasi barang
              </p>
              <p className="text-2xl font-extrabold">{data.barang.length}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="flex items-center gap-2 font-bold text-lg">
                <ChartBar size={20} weight="duotone" className="text-[#0B5FA5]" aria-hidden="true" /> Donasi uang per bulan
              </h2>
              <button
                type="button"
                onClick={() => unduhCsv(data, dari, sampai)}
                aria-label="Unduh rekap sebagai CSV"
                className="h-11 px-4 rounded-2xl bg-[#0E9F54] hover:bg-[#0c8747] text-white font-bold flex items-center gap-2"
              >
                <DownloadSimple size={18} weight="bold" aria-hidden="true" /> Export CSV
              </button>
            </div>
            <GrafikBulanan perBulan={data.perBulan} dari={dari} sampai={sampai} />
          </div>

          <div className="space-y-3">
            <h2 className="flex items-center gap-2 font-bold text-lg">
              <Package size={20} weight="duotone" className="text-[#0B5FA5]" aria-hidden="true" /> Donasi barang
              <span className="text-sm font-normal text-slate-500">({data.barang.length})</span>
            </h2>

            {data.barang.length === 0 ? (
              <p className="text-sm text-slate-500 px-1">Belum ada donasi barang pada periode ini.</p>
            ) : (
              <>
                {/* Tabel — desktop */}
                <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                        <th className="px-4 py-3">Tanggal</th>
                        <th className="px-4 py-3">Donatur</th>
                        <th className="px-4 py-3">Barang</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.barang.map((b, i) => (
                        <tr key={i} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                          <td className="px-4 py-3 text-slate-500">{formatDateIndonesian(b.tanggal)}</td>
                          <td className="px-4 py-3 font-bold">{b.donatur}</td>
                          <td className="px-4 py-3">{b.deskripsi}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Kartu — mobile */}
                <div className="md:hidden space-y-3">
                  {data.barang.map((b, i) => (
                    <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">{formatDateIndonesian(b.tanggal)}</p>
                        <span className="text-xs font-bold text-[#0B5FA5]">{b.donatur}</span>
                      </div>
                      <p className="font-bold">{b.deskripsi}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
