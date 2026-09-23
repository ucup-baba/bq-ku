import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { TombolIkon } from './Tombol';

export function KepalaHalaman({ judul, sub, subTampilDiHp = false, aksi, kembali }: {
  judul: string; sub?: string; subTampilDiHp?: boolean; aksi?: React.ReactNode; kembali?: { href: string; label: string };
}) {
  return (
    <header className="flex items-center gap-3">
      {kembali && <TombolIkon href={kembali.href} label={kembali.label} ikon={ArrowLeft} varian="polos" className="-ml-2" />}
      <div className="min-w-0 flex-1">
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-bq-tinta truncate" title={judul}>{judul}</h1>
        {sub && <p className={`${subTampilDiHp ? 'block' : 'hidden sm:block'} text-sm text-bq-redup truncate`}>{sub}</p>}
      </div>
      {aksi && <div className="flex items-center gap-2 shrink-0">{aksi}</div>}
    </header>
  );
}
