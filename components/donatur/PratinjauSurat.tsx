'use client';
import { Kalam, Patrick_Hand } from 'next/font/google';
import { SealCheck, Sparkle } from '@phosphor-icons/react';
import type { SuratData } from '@/lib/surat/data';
import type { GayaTulisan } from '@/lib/db/donatur-repo';

const kalam = Kalam({ weight: '400', subsets: ['latin'] });
const patrickHand = Patrick_Hand({ weight: '400', subsets: ['latin'] });

/** className Tailwind per gaya tulisan tangan — dipakai di pratinjau & pemilih gaya (FormSurat). */
export const KELAS_FONT_GAYA: Record<GayaTulisan, string> = {
  KALAM: kalam.className,
  PATRICK: patrickHand.className,
};

const TINTA = 'text-[#1a3891] dark:text-[#6ba1ff]';

/**
 * Pratinjau Kertas Realistis (Realistic Paper Letter Mockup)
 * Menampilkan lembar sertifikat resmi BQ dengan kop, kaligrafi doa, tinta tulisan tangan asli, dan stempel digital.
 */
export function PratinjauSurat({ data }: { data: SuratData }) {
  const isian = KELAS_FONT_GAYA[data.gayaTulisan];

  return (
    <div className="space-y-3" data-audit-abaikan>
      {/* Live Indicator Bar */}
      <div className="flex items-center justify-between px-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-extrabold text-[#0E9F54] uppercase tracking-wider text-[11px]">
          <span className="w-2 h-2 rounded-full bg-[#0E9F54] animate-ping" />
          <span>Pratinjau Kertas Realistis</span>
        </span>
        <span className="text-[11px] font-semibold text-slate-400">
          Gaya: {data.gayaTulisan === 'KALAM' ? 'Kalam (Tebal)' : 'Patrick Hand (Luwes)'}
        </span>
      </div>

      {/* Lembar Surat Fisik (A5 proportioned paper) */}
      <div className="relative rounded-[26px] bg-[#FEFDF9] dark:bg-[#15201c] border-2 border-[#dbe6d5] dark:border-[#223d33] p-5 sm:p-7 shadow-2xl shadow-slate-900/10 space-y-4 overflow-hidden select-none">
        {/* Ornamen Garis Ganda / Double Frame Khas Piagam */}
        <div className="border border-emerald-600/25 dark:border-emerald-500/30 rounded-2xl p-4 sm:p-5 relative bg-white/60 dark:bg-slate-900/30">
          
          {/* Header Kop Surat */}
          <div className="text-center pb-3 border-b-2 border-emerald-800/20 dark:border-emerald-700/40 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#0E9F54] dark:text-emerald-400">
              Pondok Pesantren Tahfidz Qur&apos;an
            </p>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight uppercase">
              Binaul Qur&apos;an
            </h3>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">
              Tempel, Sleman, D.I. Yogyakarta · Telp/WA: 0812-2591-6232
            </p>
            <div className="pt-1.5">
              <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px] font-extrabold text-[#0B5FA5] uppercase tracking-wider">
                Surat Tanda Terima &amp; Ucapan Terima Kasih
              </span>
            </div>
          </div>

          {/* Kaligrafi / Doa Pembuka */}
          <div className="py-2.5 text-center">
            <p className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300 font-serif">
              جَزَاكُمُ اللهُ خَيْرًا كَثِيْرًا
            </p>
            <p className="text-[10px] italic text-slate-400 mt-0.5">
              &ldquo;Semoga Allah membalas kebaikan Anda dengan kebaikan yang berlipat ganda&rdquo;
            </p>
          </div>

          {/* Isian Surat dengan Tinta Tulisan Tangan */}
          <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 pt-1">
            {/* Nomor Surat */}
            <div className="flex items-baseline gap-1 text-[11px]">
              <span className="text-slate-500 font-medium shrink-0">Nomor:</span>
              <span className={`font-bold ${isian} ${TINTA} text-base tracking-wide`}>
                {data.nomorUrut || '…'}
              </span>
              <span className="text-slate-400">/PBQ/</span>
              <span className={`font-bold ${isian} ${TINTA} text-base tracking-wide`}>
                {data.nomorBulanRomawi || '…'}
              </span>
              <span className="text-slate-400">/20</span>
              <span className={`font-bold ${isian} ${TINTA} text-base tracking-wide`}>
                {data.nomorTahunDuaDigit || '…'}
              </span>
            </div>

            {/* Diterima dari */}
            <div className="border-b border-dashed border-slate-200 dark:border-slate-700 pb-1">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Telah Diterima Dari:</span>
              <p className={`text-base sm:text-lg font-bold ${isian} ${TINTA} leading-snug mt-0.5`}>
                {data.namaDonatur ? `${data.namaDonatur}` : '—'}
              </p>
            </div>

            {/* Nominal / Bentuk Donasi */}
            {data.barisNilai.tipe === 'UANG' ? (
              <div className="space-y-1 border-b border-dashed border-slate-200 dark:border-slate-700 pb-1">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Uang Sejumlah:</span>
                  <p className={`text-lg sm:text-xl font-bold ${isian} ${TINTA} mt-0.5`}>
                    Rp {data.barisNilai.rupiah || '0'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Terbilang:</span>
                  <p className={`text-xs sm:text-sm font-semibold italic ${isian} ${TINTA} leading-relaxed`}>
                    {data.barisNilai.terbilang ? `# ${data.barisNilai.terbilang} Rupiah #` : '# Nol Rupiah #'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="border-b border-dashed border-slate-200 dark:border-slate-700 pb-1">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Berupa Barang:</span>
                <p className={`text-sm sm:text-base font-bold ${isian} ${TINTA} mt-0.5`}>
                  {data.barisNilai.deskripsi || '-'}
                </p>
              </div>
            )}

            {/* Keterangan Peruntukan */}
            <div className="border-b border-dashed border-slate-200 dark:border-slate-700 pb-1">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Untuk Keperluan:</span>
              <p className={`text-xs sm:text-sm font-medium ${isian} ${TINTA} mt-0.5`}>
                {data.keterangan || 'Operasional & Kesejahteraan Santri Penghafal Al-Qur\'an'}
              </p>
            </div>

            {/* Footer Surat: Tanggal, TTD & Stempel */}
            <div className="pt-3 flex items-end justify-between">
              {/* Cap Stempel Resmi Digital */}
              <div className="relative pl-1">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-blue-600/40 dark:border-blue-400/40 flex flex-col items-center justify-center p-1 -rotate-12 text-blue-700 dark:text-blue-300">
                  <SealCheck size={20} weight="duotone" className="opacity-80" />
                  <span className="text-[7px] font-black uppercase text-center leading-tight tracking-tighter mt-0.5">
                    BINAUL QUR&apos;AN<br />RESMI
                  </span>
                </div>
              </div>

              {/* Tempat & Tanggal Penyerahan */}
              <div className="text-right space-y-0.5">
                <p className="text-[10px] text-slate-500">
                  Tempel, <span className={`font-bold ${isian} ${TINTA} text-xs`}>{data.tanggalTeks}</span>
                </p>
                <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 pt-1">
                  Pimpinan Pondok Pesantren
                </p>
                <div className="h-8 flex items-center justify-end">
                  <span className={`text-base font-bold italic ${isian} ${TINTA} opacity-90 pr-2`}>
                    Ust. Yusuf
                  </span>
                </div>
                <div className="w-28 border-b border-slate-400 ml-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
