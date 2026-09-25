import Link from 'next/link';
import { FileText, PaperPlaneTilt, FolderSimple, CheckCircle, CaretRight, Warning, type Icon } from '@phosphor-icons/react';
import type { Ringkasan } from '@/lib/lembaga/ringkasan';
import { daftarPerhatian, type ItemPerhatian } from '@/lib/lembaga/tampilan';
import { kelasKartu } from '@/components/ui/Kartu';
import { IkonUbin, type WarnaUbin } from '@/components/ui/IkonUbin';

const IKON: Record<ItemPerhatian['id'], { ikon: Icon; warna: WarnaUbin }> = {
  'berkas-lembaga': { ikon: Warning, warna: 'jingga' },
  'berkas-santri': { ikon: FileText, warna: 'jingga' },
  'surat-belum': { ikon: PaperPlaneTilt, warna: 'biru' },
};
const kelasBaris = 'goyang-saat-hover flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60';

/** Hal yang perlu ditindaklanjuti (berkas lembaga, berkas santri, surat), ditambah pintu ke Berkas lembaga. */
export function PerluPerhatian({ r, className }: { r: Ringkasan; className?: string }) {
  const daftar = daftarPerhatian(r);
  return (
    <section aria-labelledby="judul-perhatian" className={kelasKartu('biasa', `space-y-2 p-4 md:p-5 ${className ?? ''}`)}>
      <h2 id="judul-perhatian" className="px-1 text-sm font-extrabold text-bq-tinta">Perlu perhatian</h2>
      {daftar.length === 0 ? (
        <div className="flex items-center gap-3 p-2">
          <IkonUbin ikon={CheckCircle} warna="hijau" />
          <span>
            <span className="block text-sm font-bold text-bq-tinta">Semua beres</span>
            <span className="block text-xs text-bq-redup">Tidak ada yang perlu ditindaklanjuti.</span>
          </span>
        </div>
      ) : (
        <ul className="space-y-1">
          {daftar.map(d => (
            <li key={d.id}>
              <Link href={d.href} className={kelasBaris}>
                <IkonUbin ikon={IKON[d.id].ikon} warna={IKON[d.id].warna} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-bq-tinta">{d.judul}</span>
                  <span className="block truncate text-xs text-bq-redup">{d.sub}</span>
                </span>
                <CaretRight size={16} weight="bold" className="shrink-0 text-bq-redup" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/lembaga/berkas" className={`${kelasBaris} border-t border-dashed border-bq-garis pt-3`}>
        <IkonUbin ikon={FolderSimple} warna="ungu" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-bq-tinta">Berkas lembaga</span>
          <span className="block truncate text-xs text-bq-redup">SK, akta, NPWP, izin, cap & tanda tangan</span>
        </span>
        <CaretRight size={16} weight="bold" className="shrink-0 text-bq-redup" aria-hidden="true" />
      </Link>
    </section>
  );
}
