'use client';
import { useState } from 'react';
import { LinkSimple, LockKey, ClockCounterClockwise, Prohibit } from '@phosphor-icons/react';
import type { TautanBagikan } from '@/lib/db/berkas-lembaga-repo';
import { statusTautan } from '@/lib/lembaga/berkas';
import { formatDateIndonesian } from '@/lib/utils/formatters';
import { kelasKartu } from '@/components/ui/Kartu';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { ambil, kirimJson } from './umum';

const LABEL: Record<ReturnType<typeof statusTautan>, { teks: string; kelas: string }> = {
  aktif: { teks: 'Aktif', kelas: 'bg-emerald-50 text-[#0E9F54] dark:bg-emerald-950/40 dark:text-emerald-300' },
  kedaluwarsa: { teks: 'Kedaluwarsa', kelas: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  dicabut: { teks: 'Dicabut', kelas: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
  'batas-habis': { teks: 'Batas buka habis', kelas: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' },
};

export function DaftarTautan({ tautan, bolehKelola, onBerubah, onLihatCatatan }: {
  tautan: TautanBagikan[] | null; bolehKelola: boolean; onBerubah: () => void; onLihatCatatan: (tautanId: string) => void;
}) {
  const [mencabut, setMencabut] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  const cabut = async (id: string) => {
    setMencabut(id); setGalat(null);
    try { await ambil(`/api/lembaga/tautan/${id}`, kirimJson('DELETE')); onBerubah(); }
    catch (e) { setGalat(e instanceof Error ? e.message : 'Gagal mencabut tautan.'); }
    finally { setMencabut(null); }
  };

  if (tautan === null) return <div className="h-24 animate-pulse rounded-kartu bg-slate-200/60 dark:bg-slate-800/60" />;
  if (tautan.length === 0) {
    return (
      <div className={kelasKartu('biasa', 'flex flex-col items-center gap-2 p-8 text-center')}>
        <IkonUbin ikon={LinkSimple} warna="biru" ukuran="lg" doodle="lingkaran" />
        <p className="text-sm font-bold text-bq-tinta">Belum ada tautan bagikan</p>
        <p className="text-xs text-bq-redup">Tekan “Bagikan” untuk mengirim berkas ke donatur atau mitra.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {galat && <PesanGalat pesan={galat} />}
      <ul className="space-y-2">
        {tautan.map(t => {
          const st = statusTautan(t);
          return (
            <li key={t.id} className={kelasKartu('biasa', 'space-y-2 p-3.5')}>
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-sm font-bold text-bq-tinta">
                    {t.penerima}{t.pakaiPin && <LockKey size={13} weight="bold" aria-label="dengan PIN" />}
                  </span>
                  <span className="block truncate text-xs text-bq-redup">
                    {[`${t.berkasIds.length} berkas`, `dibuka ${t.jumlahBuka}${t.batasBuka ? ` dari ${t.batasBuka}` : ''} kali`,
                      st === 'aktif' ? `s.d. ${formatDateIndonesian(t.kedaluwarsaAt.slice(0, 10))}` : null, t.catatan].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${LABEL[st].kelas}`}>{LABEL[st].teks}</span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => onLihatCatatan(t.id)} className="tekan inline-flex h-8 items-center gap-1 rounded-xl px-2 text-xs font-bold text-bq-biru hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <ClockCounterClockwise size={14} weight="bold" aria-hidden="true" /> Catatan
                </button>
                {bolehKelola && st === 'aktif' && (
                  <button type="button" onClick={() => cabut(t.id)} disabled={mencabut === t.id}
                    className="tekan inline-flex h-8 items-center gap-1 rounded-xl px-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:hover:bg-rose-950/40">
                    <Prohibit size={14} weight="bold" aria-hidden="true" /> {mencabut === t.id ? 'Mencabut…' : 'Cabut'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
