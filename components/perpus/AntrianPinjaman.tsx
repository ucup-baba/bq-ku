'use client';
import Link from 'next/link';
import { Kartu } from '@/components/ui/Kartu';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { hariIniWib, susunAntrian } from '@/lib/perpus/pinjaman';
import { KartuPinjaman } from './KartuPinjaman';
import { usePinjaman } from './usePinjaman';

export function AntrianPinjaman() {
  const { daftar, galat, sibuk, kirim } = usePinjaman();
  if (!daftar) return galat ? <PesanGalat pesan={galat} /> : null;
  const a = susunAntrian(daftar, hariIniWib());
  const bagian = [
    ['Pengajuan baru', a.pengajuan],
    ['Klaim kembali', a.klaim],
    ['Terlambat', a.terlambat],
  ] as const;
  const kosong = bagian.every(([, rows]) => rows.length === 0);
  return (
    <section className="space-y-3">
      {galat && <PesanGalat pesan={galat} />}
      {kosong && <Kartu className="p-4 text-sm text-bq-redup">Antrian kosong. <Link href="/perpus/pinjaman" className="font-bold underline">Lihat semua pinjaman</Link></Kartu>}
      {bagian.map(([judul, rows]) => rows.length > 0 && (
        <div key={judul} className="space-y-2">
          <h2 className="font-extrabold text-bq-tinta">{judul} ({rows.length})</h2>
          {rows.map(p => <KartuPinjaman key={p.id} p={p} sibuk={sibuk === p.id} kirim={kirim} />)}
        </div>
      ))}
    </section>
  );
}
