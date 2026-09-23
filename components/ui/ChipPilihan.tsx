'use client';
import { twMerge } from 'tailwind-merge';

export type OpsiChip<T extends string> = { value: T; label: string; labelPendek?: string; jumlah?: number };

const GAYA = {
  terang: { wadah: 'bg-slate-100 dark:bg-slate-800/80', aktif: 'bg-bq-surface text-bq-biru shadow-sm', pasif: 'text-bq-redup hover:text-bq-tinta' },
  hero: { wadah: 'bg-white/15', aktif: 'bg-white text-[#0B5FA5] shadow-sm', pasif: 'text-white/90 hover:text-white' },
} as const;

/** Segmented chip (periode, filter status). `nilai` null = tak ada yang aktif. */
export function ChipPilihan<T extends string>({ opsi, nilai, onPilih, label, gaya = 'terang', className }: {
  opsi: OpsiChip<T>[]; nilai: T | null; onPilih: (v: T) => void; label: string; gaya?: keyof typeof GAYA; className?: string;
}) {
  const g = GAYA[gaya];
  return (
    <div role="group" aria-label={label} className={twMerge('inline-flex items-center gap-0.5 rounded-full p-0.5', g.wadah, className)}>
      {opsi.map(o => {
        const aktif = o.value === nilai;
        return (
          <button key={o.value} type="button" aria-pressed={aktif} onClick={() => onPilih(o.value)}
            className={twMerge('tekan h-8 px-3 rounded-full text-xs font-bold whitespace-nowrap transition-colors duration-200', aktif ? g.aktif : g.pasif)}>
            {o.labelPendek
              ? (<><span className="sm:hidden">{o.labelPendek}</span><span className="hidden sm:inline">{o.label}</span></>)
              : o.label}
            {o.jumlah !== undefined && <span className="ml-1 tabular-nums opacity-70">{o.jumlah}</span>}
          </button>
        );
      })}
    </div>
  );
}
