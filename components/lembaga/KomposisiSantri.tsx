import Link from 'next/link';
import { Users } from '@phosphor-icons/react';
import type { Ringkasan } from '@/lib/lembaga/ringkasan';
import { segmen } from '@/lib/lembaga/tampilan';
import { MODE_LEMBAGA } from '@/lib/ruang/mode';
import { kelasKartu } from '@/components/ui/Kartu';
import { IkonUbin } from '@/components/ui/IkonUbin';

const LABEL: Record<string, string> = {
  SMP: 'SMP', SMA: 'SMA', SMK: 'SMK', ALUMNI: 'Alumni', IKHWAN: 'Ikhwan', AKHWAT: 'Akhwat',
  REGULER: 'Reguler', YATIM: 'Yatim', PIATU: 'Piatu', YATIM_PIATU: 'Yatim piatu', DHUAFA: 'Dhuafa',
};
const WARNA: Record<string, string> = {
  SMP: 'bg-[#0E9F54]', SMA: 'bg-[#0B5FA5]', SMK: 'bg-amber-500', ALUMNI: 'bg-slate-400',
  IKHWAN: 'bg-[#0B5FA5]', AKHWAT: 'bg-rose-400',
  REGULER: 'bg-slate-400', YATIM: 'bg-[#0E9F54]', PIATU: 'bg-teal-500', YATIM_PIATU: 'bg-violet-500', DHUAFA: 'bg-amber-500',
};

function Batang({ judul, data }: { judul: string; data: Record<string, number> }) {
  const s = segmen(data);
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-bold text-bq-tinta">{judul}</h3>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {s.map(x => <span key={x.kunci} className={WARNA[x.kunci] ?? 'bg-slate-400'} style={{ width: `${Math.max(x.persen, 3)}%` }} />)}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {s.map(x => (
          <li key={x.kunci} className="flex items-center gap-1.5 text-bq-redup">
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${WARNA[x.kunci] ?? 'bg-slate-400'}`} />
            {LABEL[x.kunci] ?? x.kunci}
            <span className="font-bold tabular-nums text-bq-tinta">{x.nilai}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Komposisi santri: tiga batang tunggal bersegmen (jenjang, jenis kelamin, status sosial). */
export function KomposisiSantri({ r, className }: { r: Ringkasan; className?: string }) {
  return (
    <section aria-labelledby="judul-komposisi" className={kelasKartu('biasa', `space-y-4 p-4 md:p-5 ${className ?? ''}`)}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="judul-komposisi" className="text-sm font-extrabold text-bq-tinta">{`Komposisi santri (${r.santri.total})`}</h2>
        <Link href={MODE_LEMBAGA.rute.santriDaftar} className="text-xs font-bold text-bq-biru hover:underline">Lihat semua</Link>
      </div>
      {r.santri.total === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <IkonUbin ikon={Users} warna="biru" ukuran="lg" doodle="lingkaran" />
          <p className="text-sm font-bold text-bq-tinta">Belum ada santri terdaftar</p>
          <p className="max-w-xs text-xs text-bq-redup">Komposisi jenjang, jenis kelamin, dan status sosial muncul di sini setelah data santri diisi.</p>
        </div>
      ) : (
        <>
          <Batang judul="Jenjang" data={r.santri.perJenjang} />
          <Batang judul="Jenis kelamin" data={r.santri.perGender} />
          <Batang judul="Status sosial" data={r.santri.perStatusSosial} />
        </>
      )}
    </section>
  );
}
