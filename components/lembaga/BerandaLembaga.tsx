'use client';
import { useCallback, useEffect, useState } from 'react';
import { ArrowClockwise } from '@phosphor-icons/react';
import { csvRingkasan, type PeriodeLembaga, type Ringkasan } from '@/lib/lembaga/ringkasan';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { BagianRingkasan } from './BagianRingkasan';

const dua = (n: number) => String(n).padStart(2, '0');
const hariIniLokal = () => { const d = new Date(); return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`; };

function unduh(r: Ringkasan) {
  // BOM UTF-8 agar Excel versi Indonesia membaca karakter dengan benar.
  const blob = new Blob(['﻿' + csvRingkasan(r)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ringkasan-lembaga-${r.periode.dari}-${r.periode.sampai}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Kerangka() {
  const blok = 'animate-pulse rounded-kartu bg-slate-200/60 dark:bg-slate-800/60';
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5" aria-label="Memuat ringkasan">
      <div className={`${blok} h-44 md:col-span-7`} />
      <div className={`${blok} h-44 md:col-span-5`} />
      <div className={`${blok} h-24 md:col-span-12`} />
      <div className={`${blok} h-56 md:col-span-7`} />
      <div className={`${blok} h-56 md:col-span-5`} />
    </div>
  );
}

/** Beranda Ruang Lembaga: muat ringkasan per periode; data lama tetap tampil saat periode diganti. */
export function BerandaLembaga({ namaDepan }: { namaDepan?: string }) {
  const [periode, setPeriode] = useState<PeriodeLembaga>('bulan-ini');
  const [data, setData] = useState<Ringkasan | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [ulang, setUlang] = useState(0);
  const coba = useCallback(() => setUlang(n => n + 1), []);

  useEffect(() => {
    let batal = false;
    setGalat(null);
    (async () => {
      try {
        const res = await fetch(`/api/lembaga/ringkasan?periode=${periode}&hariIni=${hariIniLokal()}`);
        const json = await res.json().catch(() => ({}));
        if (batal) return;
        if (!res.ok) { setGalat(json.error || 'Gagal memuat ringkasan.'); return; }
        setData(json.data);
      } catch {
        if (!batal) setGalat('Tidak dapat terhubung ke server.');
      }
    })();
    return () => { batal = true; };
  }, [periode, ulang]);

  return (
    <div className="space-y-4 md:space-y-6">
      <KepalaHalaman judul="Ruang Lembaga" sub={namaDepan ? `Assalamu'alaikum, ${namaDepan}` : "Assalamu'alaikum"} subTampilDiHp />
      {galat && (
        <div className="space-y-2">
          <PesanGalat pesan={galat} />
          <button type="button" onClick={coba} className="tekan inline-flex items-center gap-1.5 rounded-xl border border-bq-garis px-3 py-2 text-xs font-bold text-bq-tinta">
            <ArrowClockwise size={14} weight="bold" aria-hidden="true" /> Coba lagi
          </button>
        </div>
      )}
      {data ? <BagianRingkasan r={data} periode={periode} onPeriode={setPeriode} onUnduh={() => unduh(data)} /> : !galat && <Kerangka />}
    </div>
  );
}
