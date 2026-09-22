import { notFound } from 'next/navigation';
import { CheckCircle, Clock } from '@phosphor-icons/react/dist/ssr';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSurat } from '@/lib/db/donatur-repo';
import { labelSapaan } from '@/lib/surat/data';
import { formatRupiah, terbilang } from '@/lib/utils/terbilang';
import { formatDateIndonesian } from '@/lib/utils/formatters';
import { TombolKirimWa } from '@/components/donatur/TombolKirimWa';

export const metadata = { title: 'Detail Surat — BQ-ku' };

export default async function DetailSuratPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const surat = await getSurat(supabase, id);

  if (!surat) {
    notFound();
  }

  const donatur = surat.donasi.donatur;
  const donasi = surat.donasi;

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold">Surat {surat.nomorSurat}</h1>
        <p className="text-sm text-slate-500">{formatDateIndonesian(surat.tanggalSurat)}</p>
      </header>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Donatur</p>
            <p className="font-bold">{labelSapaan(donatur.sapaan)} {donatur.nama}</p>
            <p className="text-slate-500">{donatur.noWa || 'Nomor WhatsApp belum diisi'}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Nilai donasi</p>
            {donasi.bentuk === 'UANG' ? (
              <>
                <p className="font-bold">Rp {formatRupiah(donasi.nominal ?? 0)}</p>
                <p className="text-slate-500 italic text-xs">Terbilang: {terbilang(donasi.nominal ?? 0)} Rupiah</p>
              </>
            ) : (
              <p className="font-bold">{donasi.deskripsiBarang || '-'}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          {surat.terkirimWa ? (
            <span className="inline-flex items-center gap-1.5 text-[#0E9F54] font-bold">
              <CheckCircle size={18} weight="bold" aria-hidden="true" /> Sudah terkirim via WhatsApp
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-amber-600 font-bold">
              <Clock size={18} weight="bold" aria-hidden="true" /> Belum terkirim
            </span>
          )}
        </div>
      </div>

      <img
        src={`/api/donatur/surat/${surat.id}/png`}
        alt={`Surat ucapan terima kasih nomor ${surat.nomorSurat}`}
        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800"
      />

      <TombolKirimWa surat={surat} />
    </div>
  );
}
