'use client';
import { CheckCircle } from '@phosphor-icons/react';
import { twMerge } from 'tailwind-merge';
import { Carousel } from '@/components/ui/Carousel';
import { Kartu } from '@/components/ui/Kartu';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { TautanUtama } from '@/components/ui/Tombol';
import { statusBerkas, type DokRingkas } from '@/lib/santri/ringkasan';
import { TombolPengingatWa } from '../TombolPengingatWa';

type SantriPerlu = { id: string; namaLengkap: string; kontakWali?: string | null; documents?: DokRingkas[] };

export function PerluDilengkapi({ santri, className }: { santri: SantriPerlu[]; className?: string }) {
  return (
    <section aria-labelledby="judul-perlu-lengkap" className={twMerge('space-y-2', className)}>
      <h2 id="judul-perlu-lengkap" className="px-1 text-sm font-extrabold text-bq-tinta">
        Perlu dilengkapi {santri.length > 0 && <span className="font-bold text-bq-jingga">({santri.length})</span>}
      </h2>
      {santri.length === 0 ? (
        <Kartu className="flex items-center gap-3 p-4">
          <IkonUbin ikon={CheckCircle} warna="hijau" doodle="bintang" />
          <p className="text-sm text-bq-tinta">Semua berkas wajib sudah lengkap. Alhamdulillah!</p>
        </Kartu>
      ) : (
        <Carousel label="Santri yang berkasnya perlu dilengkapi" slideClassName="basis-[82%] md:basis-full">
          {santri.map(s => {
            const st = statusBerkas(s.documents);
            return (
              <Kartu key={s.id} varian="peringatan" className="space-y-2 p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-bq-tinta">{s.namaLengkap}</p>
                  {st.kurang.length > 0 && <p className="truncate text-xs text-bq-redup">{st.ada}/{st.total} · kurang {st.kurang.join(', ')}</p>}
                  {st.perluPerbaikan.length > 0 && <p className="truncate text-xs text-bq-jingga">Perlu perbaikan: {st.perluPerbaikan.join(', ')}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TautanUtama href={`/santri/${s.id}?tab=berkas`} className="h-9 px-3 text-xs">Lengkapi</TautanUtama>
                  <TombolPengingatWa santriId={s.id} nama={s.namaLengkap} kontakWali={s.kontakWali} docs={s.documents} />
                </div>
              </Kartu>
            );
          })}
        </Carousel>
      )}
    </section>
  );
}
