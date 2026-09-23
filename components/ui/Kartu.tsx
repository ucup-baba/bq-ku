import { twMerge } from 'tailwind-merge';

export const KELAS_KARTU = {
  biasa: 'rounded-kartu bg-bq-surface border border-bq-garis shadow-kartu',
  hero: 'rounded-kartu text-white bg-gradient-to-br from-[#0E9F54] to-[#0B5FA5] shadow-[0_14px_28px_-12px_rgb(14_159_84/0.55)]',
  peringatan: 'rounded-kartu bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 shadow-[0_8px_18px_-10px_rgb(234_88_12/0.45)]',
} as const;

export type VarianKartu = keyof typeof KELAS_KARTU;

export function kelasKartu(varian: VarianKartu = 'biasa', className?: string): string {
  return twMerge(KELAS_KARTU[varian], className);
}

export function Kartu({ varian = 'biasa', className, children, ...rest }: { varian?: VarianKartu } & React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={kelasKartu(varian, className)}>{children}</div>;
}
