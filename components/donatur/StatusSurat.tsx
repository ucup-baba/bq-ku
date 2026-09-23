import { CheckCircle, Clock } from '@phosphor-icons/react/dist/ssr';
import { twMerge } from 'tailwind-merge';

export function StatusSurat({ terkirim, className }: { terkirim: boolean; className?: string }) {
  return terkirim ? (
    <span className={twMerge('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-[#0E9F54] dark:bg-emerald-950/40 dark:text-emerald-300', className)}>
      <CheckCircle size={14} weight="fill" aria-hidden="true" /> Terkirim
    </span>
  ) : (
    <span className={twMerge('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300', className)}>
      <Clock size={14} weight="bold" aria-hidden="true" /> Belum dikirim
    </span>
  );
}
