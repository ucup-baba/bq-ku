'use client';
import { DownloadSimple } from '@phosphor-icons/react';
import type { PeriodeLembaga, Ringkasan } from '@/lib/lembaga/ringkasan';
import { daftarPerhatian, keteranganDonasi, labelPeriode, rupiahRingkas } from '@/lib/lembaga/tampilan';
import { ChipPilihan } from '@/components/ui/ChipPilihan';
import { TombolIkon } from '@/components/ui/Tombol';
import { DoodleCoretan } from '@/components/ui/DoodleStickers';
import { DoodleGambar } from '@/components/ui/DoodleGambar';
import { kelasKartu } from '@/components/ui/Kartu';

export const OPSI_PERIODE_LEMBAGA: Array<{ value: PeriodeLembaga; label: string; labelPendek: string }> = [
  { value: 'bulan-ini', label: 'Bulan ini', labelPendek: 'Bulan' },
  { value: '3-bulan', label: '3 bulan', labelPendek: '3 bln' },
  { value: '12-bulan', label: '12 bulan', labelPendek: '12 bln' },
  { value: 'tahun-ini', label: 'Tahun ini', labelPendek: 'Tahun' },
];

/** Kartu utama: satu kalimat ringkasan yayasan yang enak dibacakan saat rapat. */
export function HeroLembaga({ r, periode, onPeriode, onUnduh, className }: {
  r: Ringkasan; periode: PeriodeLembaga; onPeriode: (p: PeriodeLembaga) => void; onUnduh: () => void; className?: string;
}) {
  const perhatian = daftarPerhatian(r).length;
  const keterangan = keteranganDonasi(r);
  return (
    <section aria-labelledby="judul-ringkasan" className={kelasKartu('hero', `relative flex flex-col overflow-hidden p-4 md:p-6 ${className ?? ''}`)}>
      <DoodleGambar className="pointer-events-none absolute -right-1 -top-1 text-white/35">
        <DoodleCoretan className="h-8 w-20" />
      </DoodleGambar>
      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <h2 id="judul-ringkasan" className="text-xs font-bold uppercase tracking-wider text-white/90">{`Ringkasan yayasan · ${labelPeriode(r.periode)}`}</h2>
        <div className="flex items-center gap-1">
          <ChipPilihan<PeriodeLembaga> gaya="hero" label="Periode" opsi={OPSI_PERIODE_LEMBAGA} nilai={periode} onPilih={onPeriode} />
          <TombolIkon ikon={DownloadSimple} label="Unduh ringkasan (CSV)" ukuran="sm" varian="polos" onClick={onUnduh}
            className="text-white hover:bg-white/15 hover:text-white" />
        </div>
      </div>
      <p className="relative mt-4 text-2xl font-black leading-snug tracking-tight md:mt-6 md:text-3xl">
        {/* Spasi di sekitar pemisah = titik pindah baris; tiap frasa tetap utuh (nowrap). */}
        <span className="whitespace-nowrap">{`${r.santri.aktif} santri aktif`}</span>
        {' '}<span aria-hidden="true" className="text-white/50">·</span>{' '}
        <span className="whitespace-nowrap">{`${rupiahRingkas(r.donasi.totalUang)} donasi`}</span>
        {' '}<span aria-hidden="true" className="text-white/50">·</span>{' '}
        <span className="whitespace-nowrap">{perhatian > 0 ? `${perhatian} hal perlu perhatian` : 'semua beres'}</span>
      </p>
      {keterangan && <p className="relative mt-auto pt-3 text-xs text-white/90">{keterangan}</p>}
    </section>
  );
}
