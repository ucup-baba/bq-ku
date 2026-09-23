import { Warning } from '@phosphor-icons/react/dist/ssr';
import { twMerge } from 'tailwind-merge';

export function PesanGalat({ pesan, className }: { pesan: string; className?: string }) {
  return (
    <div role="alert" className={twMerge('flex items-start gap-2 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/20 p-3 text-sm text-rose-700 dark:text-rose-300', className)}>
      <Warning size={18} weight="bold" aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>{pesan}</span>
    </div>
  );
}
