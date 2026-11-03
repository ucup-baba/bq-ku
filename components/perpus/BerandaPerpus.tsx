'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CloudArrowDown, Books, ListChecks, Wallet } from '@phosphor-icons/react';
import type { RingkasanPerpus } from '@/lib/perpus/tipe';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { TombolUtama } from '@/components/ui/Tombol';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { rupiah } from './format';

type Pratinjau = { buku: number; donasi: number; pengadaan: number; perluAudit: number; tidakCocok: { sumber: string; judul: string }[]; sudahAda: number };

export function BerandaPerpus() {
  const [r, setR] = useState<RingkasanPerpus | null>(null);
  const [pratinjau, setPratinjau] = useState<Pratinjau | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const muat = async () => {
    const res = await fetch('/api/perpus/ringkasan');
    const d = await res.json();
    if (!res.ok) { setGalat(d.error || 'Gagal memuat ringkasan'); return; }
    setR(d.data);
  };
  useEffect(() => { muat(); }, []);

  const lihatPratinjau = async () => {
    setSibuk(true); setGalat(null);
    const res = await fetch('/api/perpus/impor');
    const d = await res.json();
    setSibuk(false);
    if (!res.ok) { setGalat(d.error || 'Gagal membaca Google Sheets'); return; }
    setPratinjau(d.data);
  };
  const impor = async () => {
    setSibuk(true); setGalat(null);
    const res = await fetch('/api/perpus/impor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const d = await res.json();
    setSibuk(false);
    if (!res.ok) { setGalat(d.error || 'Impor gagal'); return; }
    setPratinjau(null);
    await muat();
  };

  const ubin = (ikon: React.ReactNode, label: string, nilai: string, href?: string) => {
    const isi = (
      <Kartu className="p-4 flex items-center gap-3">
        {ikon}
        <div className="min-w-0">
          <p className="text-xs text-bq-redup">{label}</p>
          <p className="text-lg font-extrabold text-bq-tinta truncate">{nilai}</p>
        </div>
      </Kartu>
    );
    return href ? <Link href={href} className="block">{isi}</Link> : isi;
  };

  return (
    <div className="space-y-5">
      <KepalaHalaman judul="Ruang Perpus" sub="Perpustakaan Baitul Qowwam" subTampilDiHp />
      {galat && <PesanGalat pesan={galat} />}
      {r && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {ubin(<Books size={28} className="text-orange-600" aria-hidden />, 'Judul / eksemplar', `${r.judul} / ${r.eksemplar}`, '/perpus/buku')}
          {ubin(<ListChecks size={28} className="text-violet-600" aria-hidden />, 'Perlu audit kode', String(r.perluAudit), '/perpus/audit')}
          {ubin(<Wallet size={28} className="text-emerald-600" aria-hidden />, 'Infaq terkumpul', rupiah(r.totalInfaq), '/perpus/donasi')}
          {ubin(<Wallet size={28} className="text-sky-600" aria-hidden />, 'Saldo (infaq − pengadaan)', rupiah(r.saldo), '/perpus/donasi')}
        </div>
      )}
      {r && r.judul === 0 && (
        <Kartu className="p-5 space-y-3">
          <h2 className="font-extrabold text-bq-tinta">Impor dari Google Sheets</h2>
          <p className="text-sm text-bq-redup">Mengambil sheet <em>Copy of Daftar Buku</em>, <em>Infaq</em>, dan <em>Pengadaan Buku</em>. Semua buku hasil impor ditandai “perlu audit” untuk dipindah ke DDC baku.</p>
          {!pratinjau && <TombolUtama ikon={CloudArrowDown} onClick={lihatPratinjau} disabled={sibuk}>{sibuk ? 'Membaca…' : 'Lihat pratinjau'}</TombolUtama>}
          {pratinjau && (
            <div className="space-y-3 text-sm">
              <p>{pratinjau.buku} judul · {pratinjau.donasi} donasi · {pratinjau.pengadaan} pengadaan · {pratinjau.perluAudit} kode bermasalah</p>
              {pratinjau.tidakCocok.length > 0 && (
                <details>
                  <summary className="cursor-pointer font-semibold">{pratinjau.tidakCocok.length} judul wakaf/pengadaan tidak tertaut (tautkan manual nanti)</summary>
                  <ul className="mt-2 list-disc pl-5 text-bq-redup">{pratinjau.tidakCocok.map((t, i) => <li key={i}>{t.sumber}: {t.judul}</li>)}</ul>
                </details>
              )}
              <TombolUtama ikon={CloudArrowDown} onClick={impor} disabled={sibuk}>{sibuk ? 'Mengimpor…' : 'Impor sekarang'}</TombolUtama>
            </div>
          )}
        </Kartu>
      )}
    </div>
  );
}
