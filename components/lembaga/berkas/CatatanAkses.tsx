'use client';
import { useEffect, useState } from 'react';
import { X, ClockCounterClockwise } from '@phosphor-icons/react';
import type { LogAkses } from '@/lib/db/berkas-lembaga-repo';
import { kalimatLog } from '@/lib/lembaga/berkas';
import { kelasKartu } from '@/components/ui/Kartu';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { ambil } from './umum';

type Baris = LogAkses & { namaPengguna: string | null };

const waktuTeks = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Linimasa catatan akses; bisa disaring per berkas atau per tautan. */
export function CatatanAkses({ saring, labelSaring, onHapusSaring, labelBerkas, penerimaTautan }: {
  saring: { berkasId?: string; tautanId?: string }; labelSaring: string | null; onHapusSaring: () => void;
  labelBerkas: Record<string, string>; penerimaTautan: Record<string, string>;
}) {
  const [baris, setBaris] = useState<Baris[] | null>(null);
  const [habis, setHabis] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const muat = async (sebelum?: number) => {
    setGalat(null);
    try {
      const q = new URLSearchParams({ ...(saring.berkasId ? { berkasId: saring.berkasId } : {}), ...(saring.tautanId ? { tautanId: saring.tautanId } : {}), ...(sebelum ? { sebelum: String(sebelum) } : {}) });
      const data = await ambil<Baris[]>(`/api/lembaga/log?${q}`);
      setBaris(l => (sebelum ? [...(l ?? []), ...data] : data));
      setHabis(data.length < 50);
    } catch (e) { setGalat(e instanceof Error ? e.message : 'Gagal memuat catatan.'); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setBaris(null); muat(); }, [saring.berkasId, saring.tautanId]);

  return (
    <div className="space-y-2">
      {labelSaring && (
        <button type="button" onClick={onHapusSaring} className="tekan inline-flex h-8 items-center gap-1 rounded-full bg-sky-50 px-3 text-xs font-bold text-[#0B5FA5] dark:bg-sky-950/40 dark:text-sky-300">
          {labelSaring} <X size={12} weight="bold" aria-hidden="true" /><span className="sr-only">(hapus saringan)</span>
        </button>
      )}
      {galat && <PesanGalat pesan={galat} />}
      {baris === null ? <div className="h-24 animate-pulse rounded-kartu bg-slate-200/60 dark:bg-slate-800/60" /> : baris.length === 0 ? (
        <div className={kelasKartu('biasa', 'flex flex-col items-center gap-2 p-8 text-center')}>
          <IkonUbin ikon={ClockCounterClockwise} warna="abu" ukuran="lg" />
          <p className="text-sm font-bold text-bq-tinta">Belum ada catatan akses</p>
        </div>
      ) : (
        <ol className={kelasKartu('biasa', 'divide-y divide-bq-garis')}>
          {baris.map(l => (
            <li key={l.id} className="px-4 py-2.5">
              <p className="text-sm text-bq-tinta">{kalimatLog(l, labelBerkas, penerimaTautan)}</p>
              <p className="text-xs text-bq-redup">{[waktuTeks(l.waktu), l.perangkat, l.ip].filter(Boolean).join(' · ')}</p>
            </li>
          ))}
        </ol>
      )}
      {baris && !habis && (
        <button type="button" onClick={() => muat(baris.at(-1)?.id)} className="tekan h-10 w-full rounded-2xl border border-bq-garis text-xs font-bold text-bq-tinta">Muat lebih banyak</button>
      )}
    </div>
  );
}
