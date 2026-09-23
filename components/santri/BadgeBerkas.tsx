import { CheckCircle } from '@phosphor-icons/react/dist/ssr';
import { twMerge } from 'tailwind-merge';
import { statusBerkas, type DokRingkas } from '@/lib/santri/ringkasan';

/** Pil status 4 berkas wajib: "✓ Lengkap" atau "2/4". */
export function BadgeBerkas({ docs, className }: { docs?: DokRingkas[]; className?: string }) {
  const s = statusBerkas(docs);
  return s.lengkap ? (
    <span className={twMerge('inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-[#0E9F54] dark:bg-emerald-950/40 dark:text-emerald-300', className)}>
      <CheckCircle size={14} weight="fill" aria-hidden="true" /> Lengkap
    </span>
  ) : (
    <span className={twMerge('inline-flex shrink-0 items-center rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold tabular-nums text-orange-700 dark:bg-orange-950/40 dark:text-orange-300', className)}
      aria-label={`Berkas wajib ${s.ada} dari ${s.total}`}>
      {s.ada}/{s.total}
    </span>
  );
}
