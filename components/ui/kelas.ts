import { twMerge } from 'tailwind-merge';

/** 16px di HP (mencegah zoom otomatis iOS), 14px di desktop. */
export const kelasInput =
  'w-full min-h-11 px-4 py-2.5 rounded-2xl border border-bq-garis bg-bq-surface text-base md:text-sm text-bq-tinta ' +
  'placeholder:text-bq-redup/70 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5]';
export const kelasInputGalat = 'border-rose-400';
export const kelasLabel = 'block text-xs font-semibold text-bq-redup';

export function kelasField(galat?: string): string {
  return twMerge(kelasInput, galat ? kelasInputGalat : '');
}
