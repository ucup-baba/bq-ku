import { ArrowClockwise, WhatsappLogo, MapPin, NotePencil, HandCoins, Package } from '@phosphor-icons/react/dist/ssr';
import type { Donatur, Donasi } from '@/lib/db/donatur-repo';
import { labelSapaan } from '@/lib/surat/data';
import { formatDateIndonesian } from '@/lib/utils/formatters';
import { formatRupiah } from '@/lib/utils/terbilang';
import { labelJenis, formatNilaiDonasi, ringkasRiwayat } from '@/lib/donatur/riwayat';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { TautanUtama } from '@/components/ui/Tombol';

const kelasChip = 'inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-bq-tinta dark:bg-slate-800';

export function DetailDonatur({ donatur }: { donatur: Donatur & { donasi: Donasi[] } }) {
  const r = ringkasRiwayat(donatur.donasi);
  return (
    <div className="space-y-4 md:space-y-5">
      <KepalaHalaman
        judul={`${labelSapaan(donatur.sapaan)} ${donatur.nama}`}
        kembali={{ href: '/donatur/daftar', label: 'Kembali ke daftar donatur' }}
        aksi={<TautanUtama href={`/donatur/surat/baru?donaturId=${donatur.id}`} ikon={ArrowClockwise}>Donasi lagi</TautanUtama>}
      />

      {/* Desktop: profil & angka di kiri (menempel), riwayat di kanan */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-6">
      <Kartu className="space-y-3 p-4 lg:sticky lg:top-6">
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div><dt className="text-xs text-bq-redup">Total uang</dt><dd className="truncate text-sm font-black text-bq-tinta">Rp {formatRupiah(r.totalUang)}</dd></div>
          <div><dt className="text-xs text-bq-redup">Donasi</dt><dd className="text-sm font-black text-bq-tinta">{r.jumlah}</dd></div>
          <div><dt className="text-xs text-bq-redup">Terakhir</dt><dd className="truncate text-sm font-black text-bq-tinta">{r.terakhir ? formatDateIndonesian(r.terakhir) : '-'}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-2">
          {donatur.noWa
            ? <a href={`https://wa.me/${donatur.noWa}`} target="_blank" rel="noopener noreferrer" className={kelasChip}><WhatsappLogo size={14} weight="fill" className="text-emerald-600" aria-hidden="true" /><span className="truncate">{donatur.noWa}</span></a>
            : <span className={kelasChip}>Nomor WhatsApp belum diisi</span>}
          {donatur.alamat && <span className={kelasChip}><MapPin size={14} weight="bold" aria-hidden="true" /><span className="truncate">{donatur.alamat}</span></span>}
          {donatur.catatan && <span className={kelasChip}><NotePencil size={14} weight="bold" aria-hidden="true" /><span className="truncate">{donatur.catatan}</span></span>}
        </div>
      </Kartu>

      <section aria-labelledby="judul-riwayat" className="space-y-3">
        <h2 id="judul-riwayat" className="px-1 text-sm font-extrabold text-bq-tinta">
          Riwayat donasi <span className="font-normal text-bq-redup">({r.jumlah})</span>
        </h2>
        {r.jumlah === 0 ? (
          <p className="px-1 text-sm text-bq-redup">Belum ada donasi dari donatur ini.</p>
        ) : (
          <ol className="bergilir relative ml-4 space-y-3 border-l-2 border-dashed border-bq-garis pl-6">
            {donatur.donasi.map(d => (
              <li key={d.id} className="relative">
                <span className="absolute -left-[41px] top-2">
                  <IkonUbin ikon={d.bentuk === 'UANG' ? HandCoins : Package} warna={d.bentuk === 'UANG' ? 'hijau' : 'jingga'} ukuran="sm" />
                </span>
                <Kartu className="p-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-bq-redup">{formatDateIndonesian(d.tanggal)}</span>
                    <span className="font-bold text-bq-biru">{labelJenis(d.jenis)}</span>
                  </div>
                  <p className="truncate text-sm font-bold text-bq-tinta">{formatNilaiDonasi(d)}</p>
                  {d.keterangan && <p className="truncate text-xs text-bq-redup">{d.keterangan}</p>}
                </Kartu>
              </li>
            ))}
          </ol>
        )}
      </section>
      </div>
    </div>
  );
}
