import { FileText, Image as IkonGambar, DownloadSimple, ArrowSquareOut, FileZip, LinkBreak, ShieldCheck } from '@phosphor-icons/react/dist/ssr';
import type { TautanPublik } from '@/lib/bagikan/tautan-publik';
import { PESAN_TIDAK_BERLAKU } from '@/lib/bagikan/respons';
import { labelJenisBerkas } from '@/lib/lembaga/berkas';
import { formatDateIndonesian } from '@/lib/utils/formatters';
import { Kartu } from '@/components/ui/Kartu';
import { IkonUbin } from '@/components/ui/IkonUbin';

/** Kerangka halaman publik (tanpa navigasi aplikasi): logo + satu kartu di tengah. */
export function KerangkaBagikan({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-start justify-center bg-bq-bg px-4 py-8 text-bq-tinta sm:items-center">
      <div className="w-full max-w-xl space-y-4">
        <div className="flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 rounded-2xl" />
          <div>
            <p className="text-sm font-extrabold">Panti Asuhan Baitul Qowwam</p>
            <p className="text-xs text-bq-redup">Berkas yang dibagikan</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

export function TautanTidakBerlaku() {
  return (
    <KerangkaBagikan>
      <Kartu className="flex flex-col items-center gap-3 p-8 text-center">
        <IkonUbin ikon={LinkBreak} warna="abu" ukuran="lg" />
        <p className="text-sm font-bold">{PESAN_TIDAK_BERLAKU}</p>
      </Kartu>
    </KerangkaBagikan>
  );
}

const ukuranTeks = (b: number) => (b >= 1_048_576 ? `${(b / 1_048_576).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const kelasTombol = 'tekan inline-flex h-9 items-center gap-1.5 rounded-xl border border-bq-garis bg-bq-surface px-3 text-xs font-bold text-bq-tinta hover:border-bq-biru hover:text-bq-biru';

export function DaftarBerkasPublik({ token, t }: { token: string; t: TautanPublik }) {
  const berkas = t.berkas.filter(b => b.versi);
  const dasar = `/api/bagikan/${token}`;
  return (
    <KerangkaBagikan>
      <Kartu className="space-y-4 p-5">
        <div>
          <p className="text-sm text-bq-redup">Berkas ini dibagikan untuk</p>
          <h1 className="text-xl font-extrabold">{t.penerima}</h1>
          <p className="mt-1 text-xs text-bq-redup">{`Berlaku sampai ${formatDateIndonesian(t.kedaluwarsaAt.slice(0, 10))}`}</p>
        </div>
        <ul className="divide-y divide-bq-garis">
          {berkas.map(b => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 py-3">
              <IkonUbin ikon={b.versi!.mime === 'application/pdf' ? FileText : IkonGambar} warna="biru" ukuran="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{b.jenis === 'LAINNYA' ? b.namaLainnya : labelJenisBerkas(b.jenis)}</span>
                <span className="block truncate text-xs text-bq-redup">{[b.nomorDokumen, ukuranTeks(b.versi!.ukuran)].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="flex gap-2">
                <a href={`${dasar}/unduh/${b.id}?tampil=1`} target="_blank" rel="noopener noreferrer" className={kelasTombol}>
                  <ArrowSquareOut size={14} weight="bold" aria-hidden="true" /> Buka
                </a>
                <a href={`${dasar}/unduh/${b.id}`} className={kelasTombol}>
                  <DownloadSimple size={14} weight="bold" aria-hidden="true" /> Unduh
                </a>
              </span>
            </li>
          ))}
        </ul>
        {berkas.length > 1 && (
          <a href={`${dasar}/unduh-semua`} className="tekan flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#0E9F54] text-sm font-bold text-white hover:bg-[#0c8a49]">
            <FileZip size={18} weight="bold" aria-hidden="true" /> Unduh semua (ZIP)
          </a>
        )}
      </Kartu>
      {t.tandaAir && (
        <p className="flex items-start gap-2 px-1 text-xs text-bq-redup">
          <ShieldCheck size={16} weight="bold" className="mt-0.5 shrink-0" aria-hidden="true" />
          {`Berkas ini diberi tanda air untuk ${t.penerima}. Mohon tidak disebarluaskan.`}
        </p>
      )}
    </KerangkaBagikan>
  );
}
