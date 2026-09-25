'use client';
import { useMemo, useState } from 'react';
import { MagnifyingGlass, X, Funnel, Users } from '@phosphor-icons/react';
import { twMerge } from 'tailwind-merge';
import type { Santri } from '@/lib/db/santri-repo';
import { saringSantri, hitungGender, type FilterSantri } from '@/lib/santri/filter';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { ChipPilihan } from '@/components/ui/ChipPilihan';
import { TombolIkon } from '@/components/ui/Tombol';
import { LembarBawah } from '@/components/ui/LembarBawah';
import { kelasInput } from '@/components/ui/kelas';
import { BarisSantri } from '@/components/santri/BarisSantri';
import { useModeRuang } from '@/components/ruang/ModeRuang';

const LABEL_JENJANG: Record<FilterSantri['jenjang'], string> = {
  SEMUA: 'Semua', SMP: 'SMP', SMA: 'SMA', SMK: 'SMK', ALUMNI: 'Alumni',
};

export function SantriDirectory({ initialSantriList }: { initialSantriList: Santri[] }) {
  const mode = useModeRuang();
  const [filter, setFilter] = useState<FilterSantri>({ q: '', gender: 'SEMUA', jenjang: 'SEMUA' });
  const [jenjangBuka, setJenjangBuka] = useState(false);
  const ubah = (p: Partial<FilterSantri>) => setFilter(f => ({ ...f, ...p }));

  const tersaring = useMemo(() => saringSantri(initialSantriList, filter), [initialSantriList, filter]);
  const jumlah = hitungGender(initialSantriList, filter.q, filter.jenjang);

  return (
    <div className="space-y-3 md:space-y-5">
      <KepalaHalaman judul="Direktori Santri" sub="Cari santri, lihat CV & kelengkapan berkas." />

      <div className="sticky top-0 z-20 -mx-4 space-y-2 bg-bq-bg/90 px-4 py-2 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="relative">
          <MagnifyingGlass size={18} weight="bold" aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-bq-redup" />
          <input type="search" value={filter.q} onChange={e => ubah({ q: e.target.value })}
            placeholder="Cari nama, NIK, atau sekolah…" aria-label="Cari santri" className={twMerge(kelasInput, 'pl-11 pr-12')} />
          {filter.q && (
            <TombolIkon ikon={X} label="Hapus pencarian" ukuran="sm" varian="polos" onClick={() => ubah({ q: '' })}
              className="absolute right-1 top-1/2 -translate-y-1/2" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ChipPilihan<FilterSantri['gender']> label="Saring gender" nilai={filter.gender} onPilih={g => ubah({ gender: g })}
            opsi={[
              { value: 'SEMUA', label: 'Semua', jumlah: jumlah.SEMUA },
              { value: 'IKHWAN', label: 'Ikhwan', jumlah: jumlah.IKHWAN },
              { value: 'AKHWAT', label: 'Akhwat', jumlah: jumlah.AKHWAT },
            ]} />
          <TombolIkon ikon={Funnel} label="Filter jenjang" ukuran="sm" onClick={() => setJenjangBuka(true)} aria-pressed={filter.jenjang !== 'SEMUA'} />
          {filter.jenjang !== 'SEMUA' && (
            <button type="button" onClick={() => ubah({ jenjang: 'SEMUA' })} aria-label={`Hapus filter jenjang ${LABEL_JENJANG[filter.jenjang]}`}
              className="tekan inline-flex h-8 items-center gap-1 rounded-full bg-sky-50 px-3 text-xs font-bold text-[#0B5FA5] dark:bg-sky-950/40 dark:text-sky-300">
              {LABEL_JENJANG[filter.jenjang]} <X size={12} weight="bold" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {tersaring.length === 0 ? (
        <Kartu className="flex flex-col items-center gap-3 p-8 text-center">
          <IkonUbin ikon={Users} warna="biru" ukuran="lg" doodle="lingkaran" />
          <p className="text-sm font-semibold text-bq-tinta">
            {initialSantriList.length === 0 ? 'Belum ada santri terdaftar.' : 'Tidak ada santri yang cocok dengan pencarian.'}
          </p>
        </Kartu>
      ) : (
        <ul data-audit-daftar className="bergilir grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {tersaring.map((s, i) => <li key={s.id}><BarisSantri santri={s} indeks={i} href={mode.rute.santri(s.id)} /></li>)}
        </ul>
      )}

      <LembarBawah buka={jenjangBuka} onTutup={() => setJenjangBuka(false)} judul="Filter jenjang">
        <ChipPilihan<FilterSantri['jenjang']> label="Pilih jenjang" nilai={filter.jenjang} className="flex-wrap"
          onPilih={j => { ubah({ jenjang: j }); setJenjangBuka(false); }}
          opsi={(Object.keys(LABEL_JENJANG) as FilterSantri['jenjang'][]).map(j => ({ value: j, label: LABEL_JENJANG[j] }))} />
      </LembarBawah>
    </div>
  );
}
