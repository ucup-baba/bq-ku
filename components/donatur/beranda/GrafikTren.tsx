'use client';
import { useState } from 'react';
import { ChartBar } from '@phosphor-icons/react';
import { twMerge } from 'tailwind-merge';
import { kelasKartu } from '@/components/ui/Kartu';
import { formatRupiah } from '@/lib/utils/terbilang';
import { labelBulan, type PerBulan } from '@/lib/utils/rekap';

export function GrafikTren({ tren, judul = 'Tren 6 bulan', className }: { tren: PerBulan[] | null; judul?: string; className?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...(tren ?? []).map(p => p.total), 1);
  const terakhirBerisi = (tren ?? []).map((p, i) => (p.total > 0 ? i : -1)).filter(i => i >= 0).pop();
  const aktif = hover ?? terakhirBerisi ?? (tren ? tren.length - 1 : -1);

  return (
    <section aria-labelledby="judul-tren" className={twMerge(kelasKartu('biasa', 'space-y-3 p-5'), className)}>
      <h2 id="judul-tren" className="flex items-center gap-2 text-sm font-extrabold text-bq-tinta">
        <ChartBar size={18} weight="duotone" className="text-bq-biru" aria-hidden="true" /> {judul}
      </h2>
      {tren === null ? (
        <div className="h-52 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
      ) : tren.every(p => p.total === 0) ? (
        <p className="py-10 text-center text-sm text-bq-redup">{`Belum ada donasi uang dalam ${tren.length} bulan terakhir.`}</p>
      ) : (
        <div className="flex h-52 items-end justify-between gap-3 px-1 pt-8">
          {tren.map((p, i) => {
            const persen = Math.max(Math.round((p.total / max) * 100), p.total > 0 ? 8 : 4);
            const nilai = `Rp ${formatRupiah(p.total)}`;
            const isAktif = i === aktif;
            return (
              <div key={p.bulan} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                className="relative flex h-full flex-1 flex-col items-center justify-end">
                <span className={`absolute -top-1 whitespace-nowrap rounded-xl bg-slate-900 px-2 py-0.5 text-xs font-bold text-white transition-opacity dark:bg-white dark:text-slate-900 ${isAktif ? 'opacity-100' : 'opacity-0'}`}>{nilai}</span>
                <div className="flex h-36 w-full max-w-[2.75rem] flex-col justify-end rounded-full bg-slate-100 p-1 dark:bg-slate-800/80">
                  <div role="img" aria-label={`${labelBulan(p.bulan)}: ${nilai}`} style={{ height: `${persen}%` }}
                    className={`w-full rounded-full transition-all duration-700 ease-out ${isAktif ? 'bg-gradient-to-t from-[#0B5FA5] to-[#248ee6]' : p.total > 0 ? 'bg-[#0B5FA5]/70' : 'bg-slate-200 dark:bg-slate-700/50'}`} />
                </div>
                <span className={`mt-2 text-xs ${isAktif ? 'font-extrabold text-bq-biru' : 'font-semibold text-bq-redup'}`}>{labelBulan(p.bulan).split(' ')[0]}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
