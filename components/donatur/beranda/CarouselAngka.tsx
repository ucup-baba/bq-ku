'use client';
import Link from 'next/link';
import { Receipt, Package, PaperPlaneTilt, type Icon } from '@phosphor-icons/react';
import { Carousel } from '@/components/ui/Carousel';
import { IkonUbin, type JenisDoodle, type WarnaUbin } from '@/components/ui/IkonUbin';
import { AngkaNaik } from '@/components/ui/AngkaNaik';
import { kelasKartu } from '@/components/ui/Kartu';
import { labelJenis } from '@/lib/donatur/riwayat';
import type { PorsiAkad } from '@/lib/donatur/beranda';
import type { Ringkasan } from '@/lib/donatur/ringkasan';

const kelasIsi = 'goyang-saat-hover block h-full p-3.5 transition-transform duration-200 hover:-translate-y-0.5 md:p-4';

function KartuAngka({ ikon, warna, doodle, nilai, label, href }: {
  ikon: Icon; warna: WarnaUbin; doodle?: JenisDoodle; nilai: React.ReactNode; label: string; href?: string;
}) {
  const isi = (
    <>
      <IkonUbin ikon={ikon} warna={warna} ukuran="sm" doodle={doodle} />
      <p className="mt-3 text-2xl font-black tabular-nums text-bq-tinta">{nilai}</p>
      <p className="truncate text-xs font-semibold text-bq-redup">{label}</p>
    </>
  );
  return href
    ? <Link href={href} className={kelasKartu('biasa', kelasIsi)}>{isi}</Link>
    : <div className={kelasKartu('biasa', kelasIsi)}>{isi}</div>;
}

const WARNA_AKAD: Record<string, string> = {
  ZAKAT: 'bg-emerald-500', INFAQ: 'bg-[#0B5FA5]', SHADAQAH: 'bg-amber-500', LAINNYA: 'bg-violet-500',
};

function KartuAkad({ akad }: { akad: PorsiAkad[] }) {
  return (
    <div className={kelasKartu('biasa', 'h-full space-y-2 p-3.5 md:p-4')}>
      <p className="text-xs font-bold text-bq-tinta">Komposisi akad</p>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {akad.map(a => <span key={a.jenis} className={WARNA_AKAD[a.jenis] ?? 'bg-slate-400'} style={{ width: `${Math.max(a.persen, 2)}%` }} />)}
      </div>
      {akad.length === 0
        ? <p className="text-xs text-bq-redup">Belum ada data.</p>
        : (
          <ul className="space-y-0.5">
            {akad.slice(0, 3).map(a => (
              <li key={a.jenis} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-1.5 truncate text-bq-redup">
                  <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${WARNA_AKAD[a.jenis] ?? 'bg-slate-400'}`} />
                  {labelJenis(a.jenis)}
                </span>
                <span className="font-bold tabular-nums text-bq-tinta">{a.persen}%</span>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

/** HP: carousel ber-dots. md+: grid 4 kolom (carousel nonaktif). */
export function CarouselAngka({ ringkasan, totalSurat, akad, memuat, className }: {
  ringkasan: Ringkasan | null; totalSurat: number; akad: PorsiAkad[]; memuat: boolean; className?: string;
}) {
  const angka = (v: number | undefined) => (memuat || v === undefined ? '…' : <AngkaNaik nilai={v} />);
  return (
    <Carousel label="Ringkasan angka donasi" className={className} nonaktifMulai="md"
      wadahClassName="md:grid md:grid-cols-4 md:gap-4" slideClassName="basis-[44%] md:basis-auto">
      <KartuAngka ikon={Receipt} warna="biru" nilai={angka(ringkasan?.jumlahDonasi)} label="Donasi uang" />
      <KartuAngka ikon={Package} warna="jingga" nilai={angka(ringkasan?.jumlahBarang)} label="Donasi barang" />
      <KartuAngka ikon={PaperPlaneTilt} warna="hijau" doodle="bintang" href="/donatur/surat?status=SUDAH" label="Surat terkirim"
        nilai={memuat || !ringkasan ? '…' : <>{angka(ringkasan.suratTerkirim)}<span className="text-base font-bold text-bq-redup">/{totalSurat}</span></>} />
      <KartuAkad akad={akad} />
    </Carousel>
  );
}
