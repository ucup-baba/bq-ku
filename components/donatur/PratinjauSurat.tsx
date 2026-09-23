'use client';
import type { SuratData } from '@/lib/surat/data';
import { labelSapaan } from '@/lib/surat/data';

/** Pratinjau ringkas — tata letak PNG final dibuat server (SuratTemplate). */
export function PratinjauSurat({ data }: { data: SuratData }) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3 text-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pratinjau surat</p>
      <p className="font-bold">{data.nomorSurat}</p>
      <p>Tempel, {data.tanggalTeks}</p>
      <p>Kepada Yth. {labelSapaan(data.sapaan)} <span className="font-bold">{data.namaDonatur || '—'}</span></p>
      {data.barisNilai.tipe === 'UANG' ? (
        <div className="space-y-1">
          <p>Rp. <span className="font-bold">{data.barisNilai.rupiah}</span></p>
          <p className="italic">Terbilang: {data.barisNilai.terbilang} Rupiah</p>
        </div>
      ) : (
        <p>Berupa: <span className="font-bold">{data.barisNilai.deskripsi}</span></p>
      )}
      {data.keterangan && <p className="text-slate-500">Keterangan: {data.keterangan}</p>}
    </div>
  );
}
