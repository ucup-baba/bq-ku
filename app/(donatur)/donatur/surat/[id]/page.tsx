import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSurat } from '@/lib/db/donatur-repo';
import { labelSapaan } from '@/lib/surat/data';
import { formatRupiah, terbilang } from '@/lib/utils/terbilang';
import { formatDateIndonesian } from '@/lib/utils/formatters';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { TombolKirimWa } from '@/components/donatur/TombolKirimWa';
import { MenuSurat } from '@/components/donatur/MenuSurat';
import { StatusSurat } from '@/components/donatur/StatusSurat';

export const metadata = { title: 'Detail Surat — BQ-ku' };

export default async function DetailSuratPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const surat = await getSurat(supabase, id);
  if (!surat) notFound();

  const donatur = surat.donasi.donatur;
  const donasi = surat.donasi;

  return (
    <div className="space-y-4 pb-24 md:pb-0">
      <KepalaHalaman
        judul={`Surat ${surat.nomorSurat}`}
        sub={formatDateIndonesian(surat.tanggalSurat)}
        subTampilDiHp
        kembali={{ href: '/donatur/surat', label: 'Kembali ke daftar surat' }}
        aksi={<MenuSurat suratId={surat.id} nomorSurat={surat.nomorSurat} terkirim={surat.terkirimWa} />}
      />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Wadah gulir + pinch-zoom agar tulisan kecil di surat bisa diperbesar di HP */}
        <div className="max-h-[62dvh] overflow-auto overscroll-contain rounded-kartu border border-bq-garis bg-white shadow-kartu [touch-action:pan-x_pan-y_pinch-zoom] lg:max-h-none">
          <img src={`/api/donatur/surat/${surat.id}/png`} alt={`Surat ucapan terima kasih nomor ${surat.nomorSurat}`} className="h-auto w-full" />
        </div>
        <div className="space-y-3 lg:sticky lg:top-6">
          <Kartu className="space-y-3 p-4 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-bold text-bq-tinta">{labelSapaan(donatur.sapaan)} {donatur.nama}</p>
                <p className="truncate text-xs text-bq-redup">{donatur.noWa || 'Nomor WhatsApp belum diisi'}</p>
              </div>
              <StatusSurat terkirim={surat.terkirimWa} />
            </div>
            {donasi.bentuk === 'UANG' ? (
              <div>
                <p className="text-lg font-black text-bq-tinta">Rp {formatRupiah(donasi.nominal ?? 0)}</p>
                <p className="line-clamp-2 text-xs italic text-bq-redup">{terbilang(donasi.nominal ?? 0)} Rupiah</p>
              </div>
            ) : (
              <p className="font-bold text-bq-tinta">{donasi.deskripsiBarang || '-'}</p>
            )}
          </Kartu>
          <div className="fixed inset-x-4 bottom-24 z-30 md:static">
            <TombolKirimWa surat={surat} className="-m-2 rounded-2xl bg-bq-bg/90 p-2 backdrop-blur md:m-0 md:bg-transparent md:p-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
