'use client';
import { DotsThree } from '@phosphor-icons/react';
import { ChipPilihan } from '@/components/ui/ChipPilihan';
import { AngkaNaik } from '@/components/ui/AngkaNaik';
import { TombolIkon } from '@/components/ui/Tombol';
import { DoodleCoretan } from '@/components/ui/DoodleStickers';
import { DoodleGambar } from '@/components/ui/DoodleGambar';
import { kelasKartu } from '@/components/ui/Kartu';
import { OPSI_PERIODE, titikSparkline, type PilihanBeranda } from '@/lib/donatur/beranda';
import type { PilihanPeriode } from '@/lib/utils/rekap';

export function KartuHero({ total, memuat, keterangan, pilihan, onPilih, onBukaPeriode, tren, className }: {
  total: number | null; memuat: boolean; keterangan: string; pilihan: PilihanBeranda;
  onPilih: (p: PilihanPeriode) => void; onBukaPeriode: () => void; tren: number[]; className?: string;
}) {
  const titik = titikSparkline(tren);
  return (
    <section aria-labelledby="judul-hero" className={kelasKartu('hero', `relative overflow-hidden p-4 md:p-6 ${className ?? ''}`)}>
      <DoodleGambar className="pointer-events-none absolute -right-1 -top-1 text-white/35">
        <DoodleCoretan className="h-8 w-20" />
      </DoodleGambar>
      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <h2 id="judul-hero" className="text-xs font-bold uppercase tracking-wider text-white/90">Total donasi uang</h2>
        <div className="flex items-center gap-1">
          <ChipPilihan gaya="hero" label="Pilih periode" opsi={OPSI_PERIODE} nilai={pilihan === 'manual' ? null : pilihan} onPilih={onPilih} />
          <TombolIkon ikon={DotsThree} label="Periode lain & unduh CSV" ukuran="sm" varian="polos" onClick={onBukaPeriode}
            aria-pressed={pilihan === 'manual'} className="text-white hover:bg-white/15 hover:text-white" />
        </div>
      </div>
      <p className="relative mt-3 text-3xl font-black tracking-tight md:text-4xl">
        {memuat || total === null
          ? <span className="inline-block h-9 w-44 animate-pulse rounded-xl bg-white/20 align-middle" aria-label="Memuat total" />
          : <AngkaNaik nilai={total} format="rupiah" />}
      </p>
      <p className="relative mt-1 truncate text-xs text-white/90">{keterangan}</p>
      {titik && (
        <DoodleGambar className="relative mt-2 block">
          <svg viewBox="0 0 200 28" preserveAspectRatio="none" className="h-8 w-full" aria-hidden="true">
            <polyline data-doodle-garis="" points={titik} fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="text-white/85" />
          </svg>
        </DoodleGambar>
      )}
    </section>
  );
}
