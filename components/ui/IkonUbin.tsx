import type { Icon } from '@phosphor-icons/react';
import { twMerge } from 'tailwind-merge';
import { DoodleCoretan, DoodleLingkaran, DoodleSparkle } from './DoodleStickers';

export type WarnaUbin = 'hijau' | 'biru' | 'jingga' | 'ungu' | 'abu';
export type JenisDoodle = 'coretan' | 'bintang' | 'lingkaran';

/** Ubin warna lembut + bayangan offset sewarna (gaya "clay"). */
export const KELAS_UBIN: Record<WarnaUbin, { ubin: string; ikon: string; bayangan: string; doodle: string }> = {
  hijau: { ubin: 'bg-emerald-100 dark:bg-emerald-900/50', ikon: 'text-bq-hijau', bayangan: 'shadow-[3px_4px_0_rgb(14_159_84/0.25)]', doodle: 'text-emerald-500' },
  biru: { ubin: 'bg-sky-100 dark:bg-sky-900/50', ikon: 'text-bq-biru', bayangan: 'shadow-[3px_4px_0_rgb(11_95_165/0.25)]', doodle: 'text-sky-500' },
  jingga: { ubin: 'bg-orange-100 dark:bg-orange-900/40', ikon: 'text-bq-jingga', bayangan: 'shadow-[3px_4px_0_rgb(234_88_12/0.25)]', doodle: 'text-orange-400' },
  ungu: { ubin: 'bg-violet-100 dark:bg-violet-900/40', ikon: 'text-violet-600 dark:text-violet-300', bayangan: 'shadow-[3px_4px_0_rgb(124_58_237/0.25)]', doodle: 'text-violet-400' },
  abu: { ubin: 'bg-slate-100 dark:bg-slate-800', ikon: 'text-slate-600 dark:text-slate-300', bayangan: 'shadow-[3px_4px_0_rgb(100_116_139/0.2)]', doodle: 'text-slate-400' },
};

const UKURAN = {
  sm: { kotak: 'w-8 h-8 rounded-[10px]', ikon: 16 },
  md: { kotak: 'w-10 h-10 rounded-xl', ikon: 20 },
  lg: { kotak: 'w-12 h-12 rounded-2xl', ikon: 24 },
} as const;

const DOODLE: Record<JenisDoodle, (p: { className?: string }) => React.ReactElement> = {
  coretan: (p) => <DoodleCoretan className={twMerge('w-4 h-2', p.className)} />,
  bintang: (p) => <DoodleSparkle size={14} className={p.className} />,
  lingkaran: (p) => <DoodleLingkaran className={twMerge('w-3.5 h-3.5', p.className)} />,
};

export function IkonUbin({ ikon: Ikon, warna = 'hijau', ukuran = 'md', doodle, className }: {
  ikon: Icon; warna?: WarnaUbin; ukuran?: keyof typeof UKURAN; doodle?: JenisDoodle; className?: string;
}) {
  const k = KELAS_UBIN[warna];
  const u = UKURAN[ukuran];
  const Doodle = doodle ? DOODLE[doodle] : null;
  return (
    <span aria-hidden="true" className={twMerge('relative inline-flex items-center justify-center shrink-0', u.kotak, k.ubin, k.bayangan, className)}>
      <Ikon size={u.ikon} weight="duotone" className={k.ikon} />
      {Doodle && (
        <span className="doodle-goyang absolute -top-1.5 -right-1.5 inline-flex">
          <Doodle className={k.doodle} />
        </span>
      )}
    </span>
  );
}
