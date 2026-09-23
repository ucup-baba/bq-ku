'use client';
import { Kalam, Patrick_Hand } from 'next/font/google';
import type { SuratData } from '@/lib/surat/data';
import type { GayaTulisan } from '@/lib/db/donatur-repo';

const kalam = Kalam({ weight: '400', subsets: ['latin'] });
const patrickHand = Patrick_Hand({ weight: '400', subsets: ['latin'] });

/** className Tailwind per gaya tulisan tangan — dipakai di pratinjau & pemilih gaya (FormSurat). */
export const KELAS_FONT_GAYA: Record<GayaTulisan, string> = {
  KALAM: kalam.className,
  PATRICK: patrickHand.className,
};

const TINTA = 'text-[#1d3b8f]';

/** Pratinjau ringkas — tata letak PNG final dibuat server (SuratTemplate). */
export function PratinjauSurat({ data }: { data: SuratData }) {
  const isian = KELAS_FONT_GAYA[data.gayaTulisan];
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3 text-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pratinjau surat</p>
      <p className="font-bold">
        No : <span className={`${isian} ${TINTA} text-lg`}>{data.nomorUrut || '…'}</span>/PBQ/
        <span className={`${isian} ${TINTA} text-lg`}>{data.nomorBulanRomawi || '…'}</span>/20
        <span className={`${isian} ${TINTA} text-lg`}>{data.nomorTahunDuaDigit || '…'}</span>
      </p>
      <p>Tempel, <span className={`${isian} ${TINTA} text-lg`}>{data.tanggalTeks}</span></p>
      <p>Kepada Yth. Bapak/Ibu/Sdr : <span className={`${isian} ${TINTA} text-lg`}>{data.namaDonatur || '—'}</span></p>
      {data.barisNilai.tipe === 'UANG' ? (
        <div className="space-y-1">
          <p>Rp. : <span className={`${isian} ${TINTA} text-lg`}>{data.barisNilai.rupiah}</span></p>
          <p>Terbilang : <span className={`${isian} ${TINTA} text-lg`}>{data.barisNilai.terbilang} Rupiah</span></p>
        </div>
      ) : (
        <p>Berupa : <span className={`${isian} ${TINTA} text-lg`}>{data.barisNilai.deskripsi}</span></p>
      )}
      {data.keterangan && <p className="text-slate-500">Keterangan: {data.keterangan}</p>}
    </div>
  );
}
