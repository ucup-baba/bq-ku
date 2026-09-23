'use client';
import { Check } from '@phosphor-icons/react';
import { twMerge } from 'tailwind-merge';
import { LANGKAH, bolehBuka, type IdLangkah } from '@/lib/santri/langkah';

/** Progres 4 langkah: yang sudah dilewati bisa diketuk, yang di depan terkunci (kecuali mode edit). */
export function ProgresLangkah({ aktif, tertinggi, modeEdit, onPilih }: {
  aktif: IdLangkah; tertinggi: IdLangkah; modeEdit: boolean; onPilih: (id: IdLangkah) => void;
}) {
  return (
    <ol className="flex items-start" aria-label="Langkah pengisian">
      {LANGKAH.map((l, i) => {
        const id = l.id as IdLangkah;
        const buka = bolehBuka(id, tertinggi, modeEdit);
        const selesai = id < aktif;
        const sekarang = id === aktif;
        return (
          <li key={id} className="relative flex flex-1 flex-col items-center">
            {i > 0 && (
              <span aria-hidden="true" className={twMerge('absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2', id <= tertinggi || modeEdit ? 'bg-[#0E9F54]' : 'bg-bq-garis')} />
            )}
            <button type="button" onClick={() => onPilih(id)} disabled={!buka} aria-disabled={!buka}
              aria-current={sekarang ? 'step' : undefined} aria-label={`Langkah ${id}: ${l.judul}`}
              className="tekan relative z-10 flex flex-col items-center gap-1 disabled:cursor-not-allowed">
              <span className={twMerge(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-black transition-colors',
                sekarang ? 'border-[#0E9F54] bg-[#0E9F54] text-white shadow-[0_6px_14px_-6px_rgb(14_159_84/0.8)]'
                  : selesai ? 'border-[#0E9F54] bg-emerald-50 text-[#0E9F54] dark:bg-emerald-950/40'
                    : buka ? 'border-bq-garis bg-bq-surface text-bq-tinta' : 'border-bq-garis bg-bq-bg text-bq-redup opacity-60',
              )}>
                {selesai ? <Check size={16} weight="bold" aria-hidden="true" /> : id}
              </span>
              <span className={twMerge('text-xs font-bold', sekarang ? 'text-bq-tinta' : 'text-bq-redup')}>{l.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
