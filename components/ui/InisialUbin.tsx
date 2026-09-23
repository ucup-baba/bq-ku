import { twMerge } from 'tailwind-merge';
import { inisial } from '@/lib/ui/inisial';

const WARNA = [
  'bg-sky-100 text-[#0B5FA5] dark:bg-sky-900/50 dark:text-sky-200',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
];

export function InisialUbin({ nama, indeks = 0, className }: { nama: string; indeks?: number; className?: string }) {
  return (
    <span aria-hidden="true" className={twMerge('inline-flex w-10 h-10 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold', WARNA[indeks % WARNA.length], className)}>
      {inisial(nama)}
    </span>
  );
}
