import Link from 'next/link';
import { FileText, CaretRight, WarningCircle } from '@phosphor-icons/react';
import type { Ringkasan } from '@/lib/lembaga/ringkasan';
import { MODE_LEMBAGA } from '@/lib/ruang/mode';
import { kelasKartu } from '@/components/ui/Kartu';
import { IkonUbin } from '@/components/ui/IkonUbin';

/** Kelengkapan 4 berkas wajib santri aktif (status saja — isi berkas tidak pernah dimuat di sini). */
export function KartuKelengkapan({ r, className }: { r: Ringkasan; className?: string }) {
  const b = r.berkas;
  return (
    <section aria-labelledby="judul-kelengkapan" className={kelasKartu('biasa', `space-y-3 p-4 md:p-5 ${className ?? ''}`)}>
      <h2 id="judul-kelengkapan" className="text-sm font-extrabold text-bq-tinta">Kelengkapan berkas</h2>
      {b === null ? (
        <p className="flex items-center gap-2 text-sm text-bq-redup"><WarningCircle size={16} weight="bold" aria-hidden="true" /> Status berkas tidak dapat dimuat.</p>
      ) : b.total === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <IkonUbin ikon={FileText} warna="jingga" ukuran="lg" doodle="coretan" />
          <p className="text-sm font-bold text-bq-tinta">Belum ada santri aktif</p>
          <p className="max-w-xs text-xs text-bq-redup">Persentase kelengkapan KK, akta, KTP orang tua, dan ijazah muncul di sini.</p>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-black leading-none tracking-tight text-bq-tinta">{`${b.persen}%`}</p>
            <p className="pb-1 text-xs text-bq-redup">{`${b.lengkap} dari ${b.total} santri aktif lengkap`}</p>
          </div>
          <span className="block h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <span className="block h-full rounded-full bg-[#0E9F54]" style={{ width: `${b.persen}%` }} />
          </span>
          {b.belumLengkap.length > 0 && (
            <ul className="divide-y divide-bq-garis">
              {b.belumLengkap.map(s => (
                <li key={s.id}>
                  <Link href={MODE_LEMBAGA.rute.santri(s.id)} className="flex items-center gap-2 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-bq-tinta">{s.namaLengkap}</span>
                      <span className="block truncate text-xs text-bq-redup">{`Kurang: ${s.kurang.join(', ')}`}</span>
                    </span>
                    <CaretRight size={14} weight="bold" className="text-bq-redup" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
