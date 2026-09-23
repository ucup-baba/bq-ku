'use client';
import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle } from '@phosphor-icons/react';
import { twMerge } from 'tailwind-merge';
import { Carousel } from '@/components/ui/Carousel';
import { Kartu } from '@/components/ui/Kartu';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { TombolKirimWa } from '@/components/donatur/TombolKirimWa';
import { labelSapaan } from '@/lib/surat/data';
import { formatNilaiDonasi } from '@/lib/donatur/riwayat';
import { formatDateIndonesian } from '@/lib/utils/formatters';
import type { SuratWithRelasi } from '@/lib/db/donatur-repo';
import type { Status } from './useDataBeranda';

export function PerluDikirim({ surat, status, galat, onTerkirim, className }: {
  surat: SuratWithRelasi[] | null; status: Status; galat: string | null; onTerkirim: (id: string) => void; className?: string;
}) {
  const [aktif, setAktif] = useState(0);
  const jumlah = surat?.length ?? 0;
  return (
    <section aria-labelledby="judul-perlu-kirim" className={twMerge('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 id="judul-perlu-kirim" className="text-sm font-extrabold text-bq-tinta">Perlu dikirim ke WhatsApp</h2>
        <Link href={jumlah > 0 ? '/donatur/surat?status=BELUM' : '/donatur/surat'} className="shrink-0 text-xs font-bold text-bq-biru hover:underline">
          {jumlah > 0 ? `${jumlah} surat` : 'Arsip surat'}
        </Link>
      </div>
      {status === 'memuat' && <div className="h-28 animate-pulse rounded-kartu bg-slate-200/60 dark:bg-slate-800/60" />}
      {status === 'error' && <PesanGalat pesan={galat ?? 'Gagal memuat surat.'} />}
      {status === 'siap' && jumlah === 0 && (
        <Kartu className="flex items-center gap-3 p-4">
          <IkonUbin ikon={CheckCircle} warna="hijau" doodle="bintang" />
          <p className="text-sm text-bq-tinta">Semua surat sudah terkirim. Alhamdulillah!</p>
        </Kartu>
      )}
      {status === 'siap' && surat && jumlah > 0 && (
        <Carousel label="Surat yang perlu dikirim" onPilih={setAktif} slideClassName="basis-[82%] md:basis-full">
          {surat.map((s, i) => (
            <Kartu key={s.id} varian="peringatan" className="space-y-2 p-3.5">
              <Link href={`/donatur/surat/${s.id}`} className="block min-w-0">
                <p className="truncate text-sm font-bold text-bq-tinta">{labelSapaan(s.donasi.donatur.sapaan)} {s.donasi.donatur.nama}</p>
                <p className="truncate text-xs text-bq-redup">{formatNilaiDonasi(s.donasi)} · {formatDateIndonesian(s.tanggalSurat)}</p>
              </Link>
              <TombolKirimWa surat={s} aktif={i === aktif} onTerkirim={() => onTerkirim(s.id)} />
            </Kartu>
          ))}
        </Carousel>
      )}
    </section>
  );
}
