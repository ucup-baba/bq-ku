'use client';
import { useCallback, useEffect, useState } from 'react';
import { DownloadSimple, ArrowClockwise } from '@phosphor-icons/react';
import { csvRingkasan, type PeriodeLembaga, type Ringkasan } from '@/lib/lembaga/ringkasan';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { ChipPilihan } from '@/components/ui/ChipPilihan';
import { TombolIkon } from '@/components/ui/Tombol';
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

/** Beranda Ruang Lembaga: pilih periode, muat ringkasan, unduh CSV. */
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
      <KepalaHalaman judul="Ruang Lembaga" sub={namaDepan ? `Assalamu'alaikum, ${namaDepan}` : "Assalamu'alaikum"} subTampilDiHp
        aksi={<TombolIkon ikon={DownloadSimple} label="Unduh ringkasan (CSV)" disabled={!data} onClick={() => data && unduh(data)} />} />
      <ChipPilihan<PeriodeLembaga> label="Periode" nilai={periode} onPilih={setPeriode}
        opsi={[
          { value: 'bulan-ini', label: 'Bulan ini' },
          { value: '3-bulan', label: '3 bulan' },
          { value: '12-bulan', label: '12 bulan' },
          { value: 'tahun-ini', label: 'Tahun ini' },
        ]} />
      {galat && (
        <div className="space-y-2">
          <PesanGalat pesan={galat} />
          <button type="button" onClick={coba} className="tekan inline-flex items-center gap-1.5 rounded-xl border border-bq-garis px-3 py-2 text-xs font-bold text-bq-tinta">
            <ArrowClockwise size={14} weight="bold" aria-hidden="true" /> Coba lagi
          </button>
        </div>
      )}
      {!data && !galat && <div className="h-40 animate-pulse rounded-kartu bg-slate-200/60 dark:bg-slate-800/60" />}
      {data && <BagianRingkasan r={data} />}
    </div>
  );
}
