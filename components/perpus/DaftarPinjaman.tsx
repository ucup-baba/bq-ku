'use client';
import { useState } from 'react';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { LABEL_STATUS } from '@/lib/perpus/pinjaman';
import type { StatusPinjaman } from '@/lib/perpus/tipe';
import { KartuPinjaman } from './KartuPinjaman';
import { usePinjaman } from './usePinjaman';

const SARINGAN = Object.keys(LABEL_STATUS) as StatusPinjaman[];

export function DaftarPinjaman() {
  const { daftar, galat, sibuk, kirim } = usePinjaman();
  const [status, setStatus] = useState<StatusPinjaman | 'semua'>('dipinjam');
  const baris = (daftar ?? []).filter(p => status === 'semua' || p.status === status);
  return (
    <div className="space-y-4">
      <KepalaHalaman judul="Pinjaman" sub="Semua pinjaman perpustakaan" subTampilDiHp />
      {galat && <PesanGalat pesan={galat} />}
      <label className="block">
        <span className="sr-only">Saring status</span>
        <select className="h-11 rounded-2xl border border-bq-garis bg-bq-surface px-3 text-sm font-bold text-bq-tinta" value={status} onChange={e => setStatus(e.target.value as StatusPinjaman | 'semua')}>
          <option value="semua">Semua status</option>
          {SARINGAN.map(s => <option key={s} value={s}>{LABEL_STATUS[s]}</option>)}
        </select>
      </label>
      {daftar && baris.length === 0 && <Kartu className="p-4 text-sm text-bq-redup">Tidak ada pinjaman.</Kartu>}
      <div className="space-y-2">
        {baris.map(p => <KartuPinjaman key={p.id} p={p} sibuk={sibuk === p.id} kirim={kirim} />)}
      </div>
    </div>
  );
}
