import { notFound } from 'next/navigation';
import { DownloadSimple } from '@phosphor-icons/react/dist/ssr';
import { requireRoom } from '@/lib/auth/session';
import { getSurat } from '@/lib/db/donatur-repo';
import { labelSapaan } from '@/lib/surat/data';
import { formatRupiah, terbilang } from '@/lib/utils/terbilang';
import { formatDateIndonesian, formatJam } from '@/lib/utils/formatters';
import { MODE_LEMBAGA } from '@/lib/ruang/mode';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { StatusSurat } from '@/components/donatur/StatusSurat';

export const metadata = { title: 'Detail Surat — Ruang Lembaga' };

export default async function DetailSuratLembagaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRoom('lembaga');
  const surat = await getSurat(supabase, id);
  if (!surat) notFound();
  const donatur = surat.donasi.donatur;
  const donasi = surat.donasi;
  const png = MODE_LEMBAGA.api.pngSurat(surat.id);

  return (
    <div className="space-y-4">
      <KepalaHalaman
        judul={`Surat ${surat.nomorSurat}`}
        sub={`${formatDateIndonesian(surat.tanggalSurat)}${surat.createdAt ? ` · Dibuat pukul ${formatJam(surat.createdAt)}` : ''}`}
        subTampilDiHp
        kembali={{ href: MODE_LEMBAGA.rute.suratDaftar, label: 'Kembali ke daftar surat' }}
        aksi={<a href={png} download={`${surat.nomorSurat.replace(/\//g, '-')}.png`} aria-label="Unduh gambar PNG" title="Unduh gambar PNG"
          className="tekan inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-bq-garis bg-bq-surface text-bq-tinta hover:border-bq-biru hover:text-bq-biru">
          <DownloadSimple size={20} weight="bold" aria-hidden="true" />
        </a>}
      />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="max-h-[62dvh] overflow-auto overscroll-contain rounded-kartu border border-bq-garis bg-white shadow-kartu [touch-action:pan-x_pan-y_pinch-zoom] lg:max-h-none">
          <img src={png} alt={`Surat ucapan terima kasih nomor ${surat.nomorSurat}`} className="h-auto w-full" />
        </div>
        <Kartu className="space-y-3 p-4 text-sm lg:sticky lg:top-6">
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
      </div>
    </div>
  );
}
