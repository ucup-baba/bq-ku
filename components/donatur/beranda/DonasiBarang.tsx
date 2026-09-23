import { Package } from '@phosphor-icons/react/dist/ssr';
import { twMerge } from 'tailwind-merge';
import { kelasKartu } from '@/components/ui/Kartu';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { formatDateIndonesian } from '@/lib/utils/formatters';
import type { Rekap } from '@/lib/db/donatur-repo';

export function DonasiBarang({ barang, className }: { barang: Rekap['barang'] | null; className?: string }) {
  return (
    <section aria-labelledby="judul-barang" className={twMerge(kelasKartu('biasa', 'space-y-3 p-5'), className)}>
      <div className="flex items-center gap-2.5">
        <IkonUbin ikon={Package} warna="jingga" ukuran="sm" />
        <h2 id="judul-barang" className="text-sm font-extrabold text-bq-tinta">Donasi barang periode ini</h2>
      </div>
      {!barang || barang.length === 0 ? (
        <p className="text-sm text-bq-redup">Belum ada donasi barang pada periode ini.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {barang.map((b, i) => (
            <li key={i} className="space-y-1 rounded-2xl border border-bq-garis p-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-bq-redup">{formatDateIndonesian(b.tanggal)}</span>
                <span className="truncate font-bold text-bq-biru">{b.donatur}</span>
              </div>
              <p className="text-sm font-bold text-bq-tinta">{b.deskripsi}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
