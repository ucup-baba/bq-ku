import Link from 'next/link';
import { ArrowLeft, WhatsappLogo, MapPin, NotePencil, ArrowClockwise, HandCoins } from '@phosphor-icons/react/dist/ssr';
import type { Donatur, Donasi } from '@/lib/db/donatur-repo';
import { labelSapaan } from '@/lib/surat/data';
import { formatDateIndonesian } from '@/lib/utils/formatters';
import { labelJenis, formatNilaiDonasi } from '@/lib/donatur/riwayat';

export function DetailDonatur({ donatur }: { donatur: Donatur & { donasi: Donasi[] } }) {
  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/donatur/daftar" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0B5FA5] hover:underline">
        <ArrowLeft size={16} weight="bold" aria-hidden="true" /> Kembali ke daftar donatur
      </Link>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-extrabold">{labelSapaan(donatur.sapaan)} {donatur.nama}</h1>
            {donatur.noWa ? (
              <p className="text-sm text-slate-500 flex items-center gap-1.5">
                <WhatsappLogo size={16} weight="bold" aria-hidden="true" /> {donatur.noWa}
              </p>
            ) : (
              <p className="text-sm text-slate-400">Nomor WhatsApp belum diisi</p>
            )}
            {donatur.alamat && (
              <p className="text-sm text-slate-500 flex items-center gap-1.5">
                <MapPin size={16} weight="bold" aria-hidden="true" /> {donatur.alamat}
              </p>
            )}
            {donatur.catatan && (
              <p className="text-sm text-slate-500 flex items-start gap-1.5">
                <NotePencil size={16} weight="bold" aria-hidden="true" className="mt-0.5 shrink-0" /> {donatur.catatan}
              </p>
            )}
          </div>
          <Link
            href={`/donatur/surat/baru?donaturId=${donatur.id}`}
            className="h-12 px-5 rounded-2xl bg-[#0E9F54] hover:bg-[#0c8747] text-white font-bold flex items-center justify-center gap-2 shrink-0"
          >
            <ArrowClockwise size={20} weight="bold" aria-hidden="true" /> Donasi lagi
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 font-bold text-lg">
          <HandCoins size={20} weight="duotone" className="text-[#0B5FA5]" aria-hidden="true" />
          Riwayat donasi
          <span className="text-sm font-normal text-slate-500">({donatur.donasi.length})</span>
        </h2>

        {donatur.donasi.length === 0 ? (
          <p className="text-sm text-slate-500 px-1">Belum ada donasi dari donatur ini.</p>
        ) : (
          <>
            {/* Tabel — desktop */}
            <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Jenis</th>
                    <th className="px-4 py-3">Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {donatur.donasi.map(d => (
                    <tr key={d.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3 text-slate-500">{formatDateIndonesian(d.tanggal)}</td>
                      <td className="px-4 py-3">{labelJenis(d.jenis)}</td>
                      <td className="px-4 py-3 font-bold">{formatNilaiDonasi(d)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Kartu — mobile */}
            <div className="md:hidden space-y-3">
              {donatur.donasi.map(d => (
                <div key={d.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">{formatDateIndonesian(d.tanggal)}</p>
                    <span className="text-xs font-bold text-[#0B5FA5]">{labelJenis(d.jenis)}</span>
                  </div>
                  <p className="font-bold">{formatNilaiDonasi(d)}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
