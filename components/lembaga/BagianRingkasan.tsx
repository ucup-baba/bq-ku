import Link from 'next/link';
import { Users, FileText, HandCoins, UserCircle, Scroll, FolderSimple, CaretRight, WarningCircle, type Icon } from '@phosphor-icons/react';
import type { Ringkasan } from '@/lib/lembaga/ringkasan';
import type { JenisDonasi } from '@/lib/db/donatur-repo';
import { formatRupiah } from '@/lib/utils/terbilang';
import { labelJenis } from '@/lib/donatur/riwayat';
import { MODE_LEMBAGA } from '@/lib/ruang/mode';
import { Kartu, kelasKartu } from '@/components/ui/Kartu';
import { IkonUbin, type WarnaUbin } from '@/components/ui/IkonUbin';
import { GrafikTren } from '@/components/donatur/beranda/GrafikTren';

const LABEL_SOSIAL: Record<string, string> = { REGULER: 'Reguler', YATIM: 'Yatim', PIATU: 'Piatu', YATIM_PIATU: 'Yatim piatu', DHUAFA: 'Dhuafa' };
const LABEL_JENJANG: Record<string, string> = { SMP: 'SMP', SMA: 'SMA', SMK: 'SMK', ALUMNI: 'Alumni' };
const LABEL_GENDER: Record<string, string> = { IKHWAN: 'Ikhwan', AKHWAT: 'Akhwat' };

function Batang({ label, nilai, maks }: { label: string; nilai: number; maks: number }) {
  return (
    <li className="grid grid-cols-[88px_minmax(0,1fr)_32px] items-center gap-2 text-xs">
      <span className="truncate text-bq-redup">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <span className="block h-full rounded-full bg-[#0B5FA5]" style={{ width: `${maks > 0 ? (nilai / maks) * 100 : 0}%` }} />
      </span>
      <span className="text-right font-bold tabular-nums text-bq-tinta">{nilai}</span>
    </li>
  );
}

function Kelompok({ judul, data, label }: { judul: string; data: Record<string, number>; label: Record<string, string> }) {
  const maks = Math.max(0, ...Object.values(data));
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-extrabold uppercase tracking-wider text-bq-redup">{judul}</h3>
      <ul className="space-y-1.5">{Object.entries(data).map(([k, v]) => <Batang key={k} label={label[k] ?? k} nilai={v} maks={maks} />)}</ul>
    </div>
  );
}

function Judul({ ikon, warna, children }: { ikon: Icon; warna: WarnaUbin; children: React.ReactNode }) {
  return <h2 className="flex items-center gap-2 text-sm font-extrabold text-bq-tinta"><IkonUbin ikon={ikon} warna={warna} ukuran="sm" />{children}</h2>;
}

/**
 * Isi beranda Ruang Lembaga dari satu objek Ringkasan (tanpa fetch — mudah dites).
 * Teks gabungan ditulis sebagai satu template literal agar tidak terpecah penanda SSR.
 */
export function BagianRingkasan({ r }: { r: Ringkasan }) {
  const rute = MODE_LEMBAGA.rute;
  const ubah = r.donasi.persenPerubahan;
  return (
    <div className="space-y-4">
      {/* 1. Angka utama */}
      <Kartu varian="hero" className="grid grid-cols-3 gap-2 p-5 text-center">
        <div><p className="text-xs text-white/80">Santri aktif</p><p className="text-2xl font-black">{r.santri.aktif}</p></div>
        <div className="min-w-0">
          <p className="text-xs text-white/80">Donasi uang</p>
          <p className="truncate text-lg font-black">{`Rp ${formatRupiah(r.donasi.totalUang)}`}</p>
          {ubah !== null && <p className="text-[11px] text-white/85">{`${ubah >= 0 ? '▲' : '▼'} ${Math.abs(ubah)}% dari periode lalu`}</p>}
        </div>
        <div><p className="text-xs text-white/80">Donatur</p><p className="text-2xl font-black">{r.donatur.total}</p></div>
      </Kartu>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* 2. Santri */}
        <Kartu className="space-y-4 p-5">
          <Judul ikon={Users} warna="biru">{`Santri (${r.santri.total})`}</Judul>
          <Kelompok judul="Jenjang" data={r.santri.perJenjang} label={LABEL_JENJANG} />
          <Kelompok judul="Jenis kelamin" data={r.santri.perGender} label={LABEL_GENDER} />
          <Kelompok judul="Status sosial" data={r.santri.perStatusSosial} label={LABEL_SOSIAL} />
          <Link href={rute.santriDaftar} className="inline-block text-xs font-bold text-bq-biru hover:underline">Lihat semua santri</Link>
        </Kartu>

        {/* 3. Kelengkapan berkas */}
        <Kartu className="space-y-3 p-5">
          <Judul ikon={FileText} warna="jingga">Kelengkapan berkas</Judul>
          {r.berkas === null ? (
            <p className="flex items-center gap-2 text-sm text-bq-redup"><WarningCircle size={16} weight="bold" aria-hidden="true" /> Status berkas tidak dapat dimuat.</p>
          ) : (
            <>
              <p className="text-sm text-bq-tinta"><strong className="text-2xl font-black">{`${r.berkas.persen}%`}</strong>{` · ${r.berkas.lengkap} dari ${r.berkas.total} santri aktif lengkap`}</p>
              <span className="block h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <span className="block h-full rounded-full bg-[#0E9F54]" style={{ width: `${r.berkas.persen}%` }} />
              </span>
              {r.berkas.belumLengkap.length > 0 && (
                <ul className="divide-y divide-bq-garis">
                  {r.berkas.belumLengkap.map(s => (
                    <li key={s.id}>
                      <Link href={rute.santri(s.id)} className="flex items-center gap-2 py-2 text-sm">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-bq-tinta">{s.namaLengkap}</span>
                          <span className="block truncate text-xs text-bq-redup">{`Kurang: ${s.kurang.join(', ')}`}</span>
                        </span>
                        <CaretRight size={14} weight="bold" className="text-bq-redup" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Kartu>

        {/* 4. Donasi */}
        <div className="space-y-4">
          <GrafikTren tren={r.donasi.tren} judul="Tren 12 bulan" />
          <Kartu className="space-y-3 p-5">
            <Judul ikon={HandCoins} warna="hijau">Donasi periode ini</Judul>
            <dl className="grid grid-cols-2 gap-2 text-center">
              <div><dt className="text-xs text-bq-redup">Uang</dt><dd className="truncate text-sm font-black text-bq-tinta">{`Rp ${formatRupiah(r.donasi.totalUang)}`}</dd></div>
              <div><dt className="text-xs text-bq-redup">Barang</dt><dd className="text-sm font-black text-bq-tinta">{`${r.donasi.jumlahBarang} catatan`}</dd></div>
            </dl>
            {r.donasi.perJenis.length > 0 && (
              <ul className="space-y-1 text-xs">
                {r.donasi.perJenis.map(j => (
                  <li key={j.jenis} className="flex justify-between gap-2">
                    <span className="text-bq-redup">{labelJenis(j.jenis as JenisDonasi)}</span>
                    <span className="font-bold text-bq-tinta">{`${j.total > 0 ? `Rp ${formatRupiah(j.total)} · ` : ''}${j.jumlah}×`}</span>
                  </li>
                ))}
              </ul>
            )}
          </Kartu>
        </div>

        <div className="space-y-4">
          {/* 5. Donatur */}
          <Kartu className="space-y-3 p-5">
            <Judul ikon={UserCircle} warna="biru">Donatur</Judul>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div><dt className="text-xs text-bq-redup">Total</dt><dd className="text-lg font-black text-bq-tinta">{r.donatur.total}</dd></div>
              <div><dt className="text-xs text-bq-redup">Baru</dt><dd className="text-lg font-black text-bq-tinta">{r.donatur.baru}</dd></div>
              <div><dt className="text-xs text-bq-redup">Rutin</dt><dd className="text-lg font-black text-bq-tinta">{r.donatur.rutin}</dd></div>
            </dl>
            <p className="text-[11px] text-bq-redup">Rutin = berdonasi di ≥ 3 bulan berbeda dalam 12 bulan terakhir.</p>
            <Link href={rute.donaturDaftar} className="inline-block text-xs font-bold text-bq-biru hover:underline">Lihat semua donatur</Link>
          </Kartu>

          {/* 6. Surat */}
          <Kartu className="space-y-3 p-5">
            <Judul ikon={Scroll} warna="jingga">Surat</Judul>
            <dl className="grid grid-cols-2 gap-2 text-center">
              <div><dt className="text-xs text-bq-redup">Terbit periode ini</dt><dd className="text-lg font-black text-bq-tinta">{r.surat.terbit}</dd></div>
              <div>
                <dt className="text-xs text-bq-redup">Belum terkirim</dt>
                <dd><Link href={`${rute.suratDaftar}?status=BELUM`} className="text-lg font-black text-bq-jingga hover:underline">{r.surat.belumTerkirim}</Link></dd>
              </div>
            </dl>
            <Link href={rute.suratDaftar} className="inline-block text-xs font-bold text-bq-biru hover:underline">Lihat semua surat</Link>
          </Kartu>

          {/* 7. Berkas lembaga (Tahap B) */}
          <Link href="/lembaga/berkas" className={kelasKartu('biasa', 'flex items-center gap-3 p-5')}>
            <IkonUbin ikon={FolderSimple} warna="ungu" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-bq-tinta">Berkas lembaga</span>
              <span className="block text-xs text-bq-redup">Segera hadir — SK, akta, NPWP, izin & masa berlakunya</span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
