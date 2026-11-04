'use client';
import { useState } from 'react';
import { WhatsappLogo } from '@phosphor-icons/react';
import { Kartu } from '@/components/ui/Kartu';
import { TombolUtama } from '@/components/ui/Tombol';
import { kelasInput } from '@/components/ui/kelas';
import { LABEL_STATUS, hariIniWib, jatuhTempoBawaan, pesanPengingatWa, terlambat } from '@/lib/perpus/pinjaman';
import type { PinjamanAdmin } from '@/lib/perpus/tipe';
import { waLink } from '@/lib/surat/pesan';
import { tanggalPendek } from './format';
import type { KirimAksi } from './usePinjaman';

const kelasSekunder = 'tekan inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-bq-garis bg-bq-surface px-4 text-sm font-bold text-bq-tinta disabled:opacity-50';

export function KartuPinjaman({ p, sibuk, kirim }: { p: PinjamanAdmin; sibuk: boolean; kirim: KirimAksi }) {
  const hari = hariIniWib();
  const [tanggal, setTanggal] = useState(p.jatuhTempo && p.jatuhTempo > hari ? p.jatuhTempo : jatuhTempoBawaan());
  const [catatan, setCatatan] = useState('');
  const lewat = terlambat(p, hari);
  const wa = p.status === 'dipinjam' && p.jatuhTempo
    ? waLink(p.anggota.noWa, pesanPengingatWa({ nama: p.anggota.nama, judul: p.buku.judul, jatuhTempo: p.jatuhTempo }, hari))
    : null;

  return (
    <Kartu className="p-4 space-y-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-extrabold text-bq-tinta">{p.buku.judul}</p>
          <p className="text-bq-redup">{p.buku.nomorPanggil} · {p.anggota.nama}{p.anggota.status === 'diblokir' ? ' (diblokir)' : ''}</p>
        </div>
        <span className={`shrink-0 font-bold ${lewat ? 'text-rose-600' : 'text-bq-redup'}`}>{lewat ? 'Terlambat' : LABEL_STATUS[p.status]}</span>
      </div>
      {p.jatuhTempo && p.status === 'dipinjam' && <p>Jatuh tempo {tanggalPendek(p.jatuhTempo)}</p>}
      {p.catatan && <p className="text-bq-redup">Catatan: {p.catatan}</p>}

      {p.status === 'diajukan' && (
        <div className="space-y-2">
          <label className="block space-y-1"><span className="text-xs font-semibold text-bq-redup">Jatuh tempo</span>
            <input type="date" className={kelasInput} min={hari} value={tanggal} onChange={e => setTanggal(e.target.value)} /></label>
          <TombolUtama disabled={sibuk} onClick={() => kirim(p.id, { aksi: 'acc', jatuhTempo: tanggal })}>ACC & serahkan</TombolUtama>
          <label className="block space-y-1"><span className="text-xs font-semibold text-bq-redup">Alasan penolakan (opsional)</span>
            <input className={kelasInput} value={catatan} onChange={e => setCatatan(e.target.value)} /></label>
          <button type="button" className={kelasSekunder} disabled={sibuk} onClick={() => kirim(p.id, { aksi: 'tolak', catatan: catatan || null })}>Tolak</button>
        </div>
      )}
      {p.status === 'menunggu_verifikasi' && (
        <TombolUtama disabled={sibuk} onClick={() => kirim(p.id, { aksi: 'verifikasi' })}>Verifikasi kembali</TombolUtama>
      )}
      {p.status === 'dipinjam' && (
        <div className="flex flex-wrap items-end gap-2">
          <TombolUtama disabled={sibuk} onClick={() => kirim(p.id, { aksi: 'tandai_kembali' })}>Tandai dikembalikan</TombolUtama>
          <label className="block space-y-1"><span className="text-xs font-semibold text-bq-redup">Perpanjang sampai</span>
            <input type="date" className={kelasInput} min={hari} value={tanggal} onChange={e => setTanggal(e.target.value)} /></label>
          <button type="button" className={kelasSekunder} disabled={sibuk} onClick={() => kirim(p.id, { aksi: 'perpanjang', jatuhTempo: tanggal })}>Perpanjang</button>
          {wa && <a href={wa} target="_blank" rel="noopener" className={kelasSekunder}><WhatsappLogo size={18} weight="bold" aria-hidden /> Kirim WA</a>}
        </div>
      )}
    </Kartu>
  );
}
