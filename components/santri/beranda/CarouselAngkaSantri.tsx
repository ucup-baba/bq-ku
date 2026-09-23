'use client';
import { Student, GraduationCap, Certificate, FolderSimpleUser, type Icon } from '@phosphor-icons/react';
import { Carousel } from '@/components/ui/Carousel';
import { IkonUbin, type JenisDoodle, type WarnaUbin } from '@/components/ui/IkonUbin';
import { AngkaNaik } from '@/components/ui/AngkaNaik';
import { kelasKartu } from '@/components/ui/Kartu';
import type { RingkasanSantri } from '@/lib/santri/ringkasan';

function KartuAngka({ ikon, warna, doodle, nilai, label }: { ikon: Icon; warna: WarnaUbin; doodle?: JenisDoodle; nilai: React.ReactNode; label: string }) {
  return (
    <div className={kelasKartu('biasa', 'goyang-saat-hover h-full p-3.5 md:p-4')}>
      <IkonUbin ikon={ikon} warna={warna} ukuran="sm" doodle={doodle} />
      <p className="mt-3 text-2xl font-black tabular-nums text-bq-tinta">{nilai}</p>
      <p className="truncate text-xs font-semibold text-bq-redup">{label}</p>
    </div>
  );
}

/** HP: carousel ber-dots. md+: grid 4 kolom. */
export function CarouselAngkaSantri({ ringkasan, className }: { ringkasan: RingkasanSantri; className?: string }) {
  return (
    <Carousel label="Ringkasan angka santri" className={className} nonaktifMulai="md"
      wadahClassName="md:grid md:grid-cols-4 md:gap-4" slideClassName="basis-[44%] md:basis-auto">
      <KartuAngka ikon={Student} warna="biru" nilai={<AngkaNaik nilai={ringkasan.smp} />} label="SMP" />
      <KartuAngka ikon={GraduationCap} warna="hijau" nilai={<AngkaNaik nilai={ringkasan.smaSmk} />} label="SMA / SMK" />
      <KartuAngka ikon={Certificate} warna="ungu" nilai={<AngkaNaik nilai={ringkasan.alumni} />} label="Alumni" />
      <KartuAngka ikon={FolderSimpleUser} warna="jingga" doodle="bintang" label="Berkas lengkap"
        nilai={<><AngkaNaik nilai={ringkasan.berkasLengkap} /><span className="text-base font-bold text-bq-redup">/{ringkasan.total}</span></>} />
    </Carousel>
  );
}
