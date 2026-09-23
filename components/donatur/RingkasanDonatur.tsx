'use client';
import { useState } from 'react';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { susunRingkasan } from '@/lib/donatur/ringkasan';
import { bandingkanBulan, keteranganPeriode, porsiAkad } from '@/lib/donatur/beranda';
import { useDataBeranda } from './beranda/useDataBeranda';
import { KartuHero } from './beranda/KartuHero';
import { CarouselAngka } from './beranda/CarouselAngka';
import { PerluDikirim } from './beranda/PerluDikirim';
import { DonasiTerbaru } from './beranda/DonasiTerbaru';
import { GrafikTren } from './beranda/GrafikTren';
import { DonasiBarang } from './beranda/DonasiBarang';
import { PanelPeriode } from './beranda/PanelPeriode';
import { unduhCsv } from './beranda/unduh-csv';

/**
 * Beranda Ruang Donatur. Urutan HP: hero → angka → perlu dikirim → terbaru.
 * Desktop (bento 12 kolom): hero | perlu dikirim; angka; tren | terbaru; barang.
 */
export function RingkasanDonatur() {
  const b = useDataBeranda();
  const [periodeBuka, setPeriodeBuka] = useState(false);
  const memuat = b.statusRekap === 'memuat';
  const ringkasan = b.rekap && b.suratPeriode ? susunRingkasan(b.rekap, b.suratPeriode.filter(s => s.terkirimWa).length) : null;
  const perbandingan = b.pilihan === 'bulan-ini' && b.tren ? bandingkanBulan(b.tren) : null;

  return (
    <>
      {b.statusRekap === 'error' && <PesanGalat className="mb-4" pesan={b.galatRekap ?? 'Gagal memuat ringkasan donasi.'} />}
      <div className="bergilir grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
        <KartuHero className="order-1 md:col-span-7"
          total={b.rekap?.totalUang ?? null} memuat={memuat}
          keterangan={keteranganPeriode(b.pilihan, b.dari, b.sampai, perbandingan)}
          pilihan={b.pilihan} onPilih={b.pilihCepat} onBukaPeriode={() => setPeriodeBuka(true)}
          tren={(b.tren ?? []).map(t => t.total)} />
        <CarouselAngka className="order-2 md:order-3 md:col-span-12"
          ringkasan={ringkasan} totalSurat={b.suratPeriode?.length ?? 0} akad={porsiAkad(b.rekap?.perJenis)} memuat={memuat} />
        <PerluDikirim className="order-3 md:order-2 md:col-span-5"
          surat={b.belum} status={b.statusSurat} galat={b.galatSurat} onTerkirim={b.suratTerkirim} />
        <DonasiTerbaru className="order-4 md:order-5 md:col-span-5"
          surat={b.terbaru} status={b.statusSurat} galat={b.galatSurat} />
        <GrafikTren className="order-5 hidden md:order-4 md:col-span-7 md:block" tren={b.tren} />
        <DonasiBarang className="order-6 hidden md:col-span-12 md:block" barang={b.rekap?.barang ?? null} />
      </div>
      <PanelPeriode buka={periodeBuka} onTutup={() => setPeriodeBuka(false)} dari={b.dari} sampai={b.sampai}
        onTerapkan={b.pilihManual} bisaUnduh={!!b.rekap}
        onUnduh={() => { if (b.rekap) unduhCsv(b.rekap, b.dari, b.sampai); }} />
    </>
  );
}
