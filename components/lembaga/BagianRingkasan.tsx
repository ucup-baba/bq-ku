'use client';
import { Users, HandHeart, Repeat, Scroll, Package } from '@phosphor-icons/react';
import type { PeriodeLembaga, Ringkasan } from '@/lib/lembaga/ringkasan';
import type { JenisDonasi } from '@/lib/db/donatur-repo';
import { porsiAkad } from '@/lib/donatur/beranda';
import { MODE_LEMBAGA } from '@/lib/ruang/mode';
import { Carousel } from '@/components/ui/Carousel';
import { AngkaNaik } from '@/components/ui/AngkaNaik';
import { KartuAngka, KartuAkad } from '@/components/donatur/beranda/CarouselAngka';
import { GrafikTren } from '@/components/donatur/beranda/GrafikTren';
import { HeroLembaga } from './HeroLembaga';
import { PerluPerhatian } from './PerluPerhatian';
import { KomposisiSantri } from './KomposisiSantri';
import { KartuKelengkapan } from './KartuKelengkapan';

/**
 * Beranda Ruang Lembaga (bento 12 kolom di desktop, satu kolom di HP):
 * ringkasan | perlu perhatian; deretan angka; komposisi santri | kelengkapan; tren | akad.
 */
export function BagianRingkasan({ r, periode, onPeriode, onUnduh }: {
  r: Ringkasan; periode: PeriodeLembaga; onPeriode: (p: PeriodeLembaga) => void; onUnduh: () => void;
}) {
  const rute = MODE_LEMBAGA.rute;
  return (
    <div className="bergilir grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
      <HeroLembaga className="md:col-span-7" r={r} periode={periode} onPeriode={onPeriode} onUnduh={onUnduh} />
      <PerluPerhatian className="md:col-span-5" r={r} />

      <Carousel label="Angka yayasan" className="md:col-span-12" nonaktifMulai="md"
        wadahClassName="md:grid md:grid-cols-5 md:gap-4" slideClassName="basis-auto">
        <KartuAngka ikon={Users} warna="biru" href={rute.santriDaftar} nilai={<AngkaNaik nilai={r.santri.aktif} />} label="Santri aktif" />
        <KartuAngka ikon={HandHeart} warna="hijau" doodle="bintang" href={rute.donaturDaftar}
          nilai={<><AngkaNaik nilai={r.donatur.total} />{r.donatur.baru > 0 && <span className="text-xs font-bold text-[#0E9F54]">{` +${r.donatur.baru} baru`}</span>}</>}
          label="Donatur" />
        <KartuAngka ikon={Repeat} warna="ungu" nilai={<AngkaNaik nilai={r.donatur.rutin} />} label="Donatur rutin" />
        <KartuAngka ikon={Scroll} warna="jingga" href={rute.suratDaftar} nilai={<AngkaNaik nilai={r.surat.terbit} />} label="Surat terbit" />
        <KartuAngka ikon={Package} warna="jingga" nilai={<AngkaNaik nilai={r.donasi.jumlahBarang} />} label="Donasi barang" />
      </Carousel>

      <KomposisiSantri className="md:col-span-7" r={r} />
      <KartuKelengkapan className="md:col-span-5" r={r} />

      <GrafikTren className="md:col-span-7" tren={r.donasi.tren} judul="Tren 12 bulan" />
      <KartuAkad className="w-full md:col-span-5 md:p-5"
        // Komposisi akad dihitung dari nominal uang; akad yang hanya berisi donasi barang (Rp 0) tidak ditampilkan sebagai "0%".
        akad={porsiAkad((r.donasi.perJenis as Array<{ jenis: JenisDonasi; total: number; jumlah: number }>).filter(j => j.total > 0))} />
    </div>
  );
}
