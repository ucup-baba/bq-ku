'use client';
import { useEffect, useState } from 'react';
import { Check, DownloadSimple } from '@phosphor-icons/react';
import { LembarBawah } from '@/components/ui/LembarBawah';
import { TombolUtama } from '@/components/ui/Tombol';
import { kelasInput, kelasLabel } from '@/components/ui/kelas';

export function PanelPeriode({ buka, onTutup, dari, sampai, onTerapkan, onUnduh, bisaUnduh }: {
  buka: boolean; onTutup: () => void; dari: string; sampai: string;
  onTerapkan: (dari: string, sampai: string) => void; onUnduh: () => void; bisaUnduh: boolean;
}) {
  const [d, setD] = useState(dari);
  const [s, setS] = useState(sampai);
  useEffect(() => { if (buka) { setD(dari); setS(sampai); } }, [buka, dari, sampai]);
  const valid = d !== '' && s !== '' && d <= s;

  return (
    <LembarBawah buka={buka} onTutup={onTutup} judul="Periode & ekspor">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className={kelasLabel}>Dari</span>
            <input type="date" value={d} max={s || undefined} onChange={e => setD(e.target.value)} className={kelasInput} />
          </label>
          <label className="space-y-1">
            <span className={kelasLabel}>Sampai</span>
            <input type="date" value={s} min={d || undefined} onChange={e => setS(e.target.value)} className={kelasInput} />
          </label>
        </div>
        {!valid && <p role="alert" className="text-xs text-rose-600">Tanggal awal harus sebelum atau sama dengan tanggal akhir.</p>}
        <TombolUtama ikon={Check} disabled={!valid} className="w-full" onClick={() => { onTerapkan(d, s); onTutup(); }}>
          Terapkan periode
        </TombolUtama>
        <button type="button" onClick={onUnduh} disabled={!bisaUnduh}
          className="tekan inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-bq-garis text-sm font-bold text-bq-tinta disabled:opacity-50">
          <DownloadSimple size={18} weight="bold" aria-hidden="true" /> Unduh rekap CSV
        </button>
      </div>
    </LembarBawah>
  );
}
