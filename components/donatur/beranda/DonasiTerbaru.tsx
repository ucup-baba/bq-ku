import Link from 'next/link';
import { ArrowClockwise } from '@phosphor-icons/react/dist/ssr';
import { twMerge } from 'tailwind-merge';
import { Kartu } from '@/components/ui/Kartu';
import { InisialUbin } from '@/components/ui/InisialUbin';
import { TombolIkon } from '@/components/ui/Tombol';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { formatNilaiDonasi, labelJenis } from '@/lib/donatur/riwayat';
import type { SuratWithRelasi } from '@/lib/db/donatur-repo';
import type { Status } from './useDataBeranda';

/** Donasi terbaru: 2 baris di HP, 5 di desktop. */
export function DonasiTerbaru({ surat, status, galat, className }: {
  surat: SuratWithRelasi[] | null; status: Status; galat: string | null; className?: string;
}) {
  return (
    <section aria-labelledby="judul-terbaru" className={twMerge('space-y-2', className)}>
      {/* Tanpa "Lihat semua": Daftar Donatur sudah ada di navigasi (hindari tautan ganda). */}
      <h2 id="judul-terbaru" className="px-1 text-sm font-extrabold text-bq-tinta">Donasi terbaru</h2>
      {status === 'memuat' && <div className="h-32 animate-pulse rounded-kartu bg-slate-200/60 dark:bg-slate-800/60" />}
      {status === 'error' && <PesanGalat pesan={galat ?? 'Gagal memuat donasi terbaru.'} />}
      {status === 'siap' && surat && surat.length === 0 && (
        <p className="px-1 text-sm text-bq-redup">Belum ada donasi. Mulai dengan membuat surat pertama.</p>
      )}
      {status === 'siap' && surat && surat.length > 0 && (
        <ul data-audit-daftar className="space-y-2">
          {surat.map((s, i) => {
            const d = s.donasi.donatur;
            return (
              <li key={s.id} className={i >= 2 ? 'hidden md:block' : undefined}>
                <Kartu className="flex items-center gap-3 p-2.5 pr-2">
                  <InisialUbin nama={d.nama} indeks={i} />
                  <Link href={`/donatur/daftar/${d.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-bq-tinta">{d.nama}</p>
                    <p className="truncate text-xs text-bq-redup">{formatNilaiDonasi(s.donasi)} · {labelJenis(s.donasi.jenis)}</p>
                  </Link>
                  <TombolIkon ikon={ArrowClockwise} label={`Donasi lagi dari ${d.nama}`} href={`/donatur/surat/baru?donaturId=${d.id}`} ukuran="sm" varian="polos" />
                </Kartu>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
