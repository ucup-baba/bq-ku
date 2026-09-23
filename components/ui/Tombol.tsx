import Link from 'next/link';
import type { Icon } from '@phosphor-icons/react';
import { twMerge } from 'tailwind-merge';

export const kelasTombolUtama =
  'tekan inline-flex items-center justify-center gap-2 h-11 px-4 rounded-2xl bg-[#0E9F54] hover:bg-[#0c8a49] text-white text-sm font-bold ' +
  'shadow-[0_8px_16px_-8px_rgb(14_159_84/0.7)] disabled:opacity-60 disabled:cursor-not-allowed ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5FA5] focus-visible:ring-offset-2';

type IsiTombol = { ikon?: Icon; children: React.ReactNode; className?: string };

export function TautanUtama({ href, ikon: Ikon, children, className }: IsiTombol & { href: string }) {
  return (
    <Link href={href} className={twMerge(kelasTombolUtama, className)}>
      {Ikon && <Ikon size={18} weight="bold" aria-hidden="true" />}
      <span className="truncate">{children}</span>
    </Link>
  );
}

export function TombolUtama({ ikon: Ikon, children, className, type = 'button', ...rest }:
  IsiTombol & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'>) {
  return (
    <button type={type} {...rest} className={twMerge(kelasTombolUtama, className)}>
      {Ikon && <Ikon size={18} weight="bold" aria-hidden="true" />}
      <span className="truncate">{children}</span>
    </button>
  );
}

const VARIAN_IKON = {
  lembut: 'bg-bq-surface border border-bq-garis text-bq-tinta hover:border-bq-biru hover:text-bq-biru',
  utama: 'bg-[#0E9F54] text-white hover:bg-[#0c8a49] shadow-[0_8px_16px_-8px_rgb(14_159_84/0.7)]',
  polos: 'text-bq-redup hover:text-bq-tinta hover:bg-slate-100 dark:hover:bg-slate-800',
} as const;

const UKURAN_IKON = {
  md: { kotak: 'w-11 h-11 rounded-2xl', ikon: 20 },
  sm: { kotak: 'w-9 h-9 rounded-xl', ikon: 18 },
} as const;

type PropsTombolIkon = {
  ikon: Icon; label: string; varian?: keyof typeof VARIAN_IKON; ukuran?: keyof typeof UKURAN_IKON; className?: string;
} & (
  | { href: string }
  | ({ href?: undefined } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>)
);

/** Tombol/tautan berisi ikon saja. `label` wajib: menjadi aria-label dan tooltip. */
export function TombolIkon(props: PropsTombolIkon) {
  const { ikon: Ikon, label, varian = 'lembut', ukuran = 'md', className } = props;
  const u = UKURAN_IKON[ukuran];
  const kelas = twMerge(
    'tekan inline-flex items-center justify-center shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5FA5] disabled:opacity-40',
    u.kotak, VARIAN_IKON[varian], className,
  );
  const isi = <Ikon size={u.ikon} weight="bold" aria-hidden="true" />;
  if (props.href !== undefined) {
    return <Link href={props.href} aria-label={label} title={label} className={kelas}>{isi}</Link>;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ikon, label: _l, varian: _v, ukuran: _u, className: _c, href: _h, ...rest } = props;
  return <button type="button" {...rest} aria-label={label} title={label} className={kelas}>{isi}</button>;
}
