'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Check, MagnifyingGlassPlus, SpinnerGap, X, FilePdf } from '@phosphor-icons/react';
import { bukaPdf, gambarHalaman } from '@/lib/pdf/pdfjs-klien';
import { ambilHalamanPdf, namaBerkasTerpilih } from '@/lib/pdf/halaman';

const LEBAR_KECIL = 220;
const LEBAR_BESAR = 900;

/**
 * Langkah "pilih halaman" untuk PDF gabungan di Pindai Massal: gambar kecil tiap halaman + centang.
 * Hanya halaman tercentang yang disusun jadi PDF baru lalu diunggah & dipindai AI (hemat biaya).
 * PDF satu halaman langsung diteruskan tanpa langkah ini.
 */
export function PilihHalamanPdf({ berkas, onBatal, onSelesai }: {
  berkas: File; onBatal: () => void; onSelesai: (hasil: File) => void;
}) {
  const [total, setTotal] = useState(0);
  const [gambar, setGambar] = useState<Record<number, string>>({});
  const [dipilih, setDipilih] = useState<Set<number>>(new Set());
  const [galat, setGalat] = useState<string | null>(null);
  const [menyusun, setMenyusun] = useState(false);
  const [besar, setBesar] = useState<{ nomor: number; url: string | null } | null>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const selesaiRef = useRef(onSelesai);
  selesaiRef.current = onSelesai;

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const doc = await bukaPdf(berkas);
        if (batal) { doc.destroy(); return; }
        docRef.current = doc;
        if (doc.numPages <= 1) { selesaiRef.current(berkas); return; }
        setTotal(doc.numPages);
        setDipilih(new Set(Array.from({ length: doc.numPages }, (_, i) => i + 1)));
        for (let n = 1; n <= doc.numPages && !batal; n++) {
          const url = await gambarHalaman(doc, n, LEBAR_KECIL);
          if (!batal) setGambar(g => ({ ...g, [n]: url }));
        }
      } catch (e) {
        console.error('Gagal membaca PDF:', e);
        if (!batal) setGalat('PDF tidak bisa dibaca. Coba simpan ulang PDF-nya, atau unggah sebagai foto.');
      }
    })();
    return () => { batal = true; docRef.current?.destroy(); docRef.current = null; };
  }, [berkas]);

  const ubah = (n: number) => setDipilih(s => { const b = new Set(s); if (b.has(n)) b.delete(n); else b.add(n); return b; });
  const semua = Array.from({ length: total }, (_, i) => i + 1);

  const perbesar = async (n: number) => {
    setBesar({ nomor: n, url: null });
    const doc = docRef.current;
    if (!doc) return;
    const url = await gambarHalaman(doc, n, LEBAR_BESAR).catch(() => gambar[n] ?? null);
    setBesar(b => (b?.nomor === n ? { nomor: n, url } : b));
  };

  const lanjut = async () => {
    const halaman = [...dipilih];
    if (halaman.length === 0) return;
    if (halaman.length === total) return onSelesai(berkas);
    setMenyusun(true); setGalat(null);
    try {
      const data = await ambilHalamanPdf(await berkas.arrayBuffer(), halaman);
      onSelesai(new File([data as BlobPart], namaBerkasTerpilih(berkas.name, halaman, total), { type: 'application/pdf' }));
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Gagal menyusun PDF');
      setMenyusun(false);
    }
  };

  if (galat && total === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
        <p>{galat}</p>
        <button type="button" onClick={onBatal} className="font-bold underline">Kembali</button>
      </div>
    );
  }

  if (total === 0) {
    return (
      <p className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-bq-redup">
        <SpinnerGap size={18} className="animate-spin" aria-hidden="true" /> Membaca halaman PDF…
      </p>
    );
  }

  return (
    <div className="relative space-y-3">
      <div className="flex items-start gap-2">
        <FilePdf size={20} weight="duotone" className="mt-0.5 shrink-0 text-teal-600" aria-hidden="true" />
        <div className="min-w-0">
          <h4 className="text-sm font-extrabold text-bq-tinta">Pilih halaman yang dipindai</h4>
          <p className="truncate text-xs text-bq-redup" title={berkas.name}>{berkas.name}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="font-bold text-bq-tinta" aria-live="polite">
          {dipilih.size} dari {total} halaman · {dipilih.size} pindai AI
        </p>
        <div className="flex gap-3 font-bold">
          <button type="button" onClick={() => setDipilih(new Set(semua))} className="text-teal-700 hover:underline dark:text-teal-300">Pilih semua</button>
          <button type="button" onClick={() => setDipilih(new Set())} className="text-bq-redup hover:underline">Kosongkan</button>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
        {semua.map(n => {
          const aktif = dipilih.has(n);
          return (
            <li key={n} className="relative">
              <button type="button" onClick={() => ubah(n)} aria-pressed={aktif} aria-label={`Halaman ${n}${aktif ? ', dipilih' : ''}`}
                className={`block w-full overflow-hidden rounded-xl border-2 bg-white transition ${aktif ? 'border-teal-500 shadow-sm' : 'border-bq-garis opacity-50 grayscale'}`}>
                {gambar[n]
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={gambar[n]} alt="" className="block h-auto w-full" />
                  : <span className="flex aspect-[3/4] items-center justify-center"><SpinnerGap size={18} className="animate-spin text-bq-redup" aria-hidden="true" /></span>}
                <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-bold text-white">Hal {n}</span>
                <span className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 ${aktif ? 'border-teal-500 bg-teal-500 text-white' : 'border-white bg-white/80 text-transparent'}`} aria-hidden="true">
                  <Check size={14} weight="bold" />
                </span>
              </button>
              <button type="button" onClick={() => perbesar(n)} aria-label={`Perbesar halaman ${n}`}
                className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75">
                <MagnifyingGlassPlus size={15} weight="bold" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      {galat && <p className="text-xs font-semibold text-rose-600">{galat}</p>}

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <button type="button" onClick={onBatal} disabled={menyusun}
          className="rounded-2xl border border-bq-garis px-4 py-2.5 text-xs font-bold text-bq-redup hover:bg-slate-100 dark:hover:bg-slate-800">
          Batal, jangan pakai PDF ini
        </button>
        <button type="button" onClick={lanjut} disabled={dipilih.size === 0 || menyusun}
          className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
          {menyusun && <SpinnerGap size={14} className="animate-spin" aria-hidden="true" />}
          Pakai {dipilih.size} halaman
        </button>
      </div>

      {besar && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-black/85 p-3" role="dialog" aria-modal="true" aria-label={`Halaman ${besar.nomor}`}>
          <div className="flex items-center justify-between gap-2 pb-2 text-white">
            <span className="text-sm font-bold">Halaman {besar.nomor} dari {total}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => ubah(besar.nomor)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold ${dipilih.has(besar.nomor) ? 'bg-teal-500 text-white' : 'bg-white/15 text-white'}`}>
                {dipilih.has(besar.nomor) ? '✓ Dipilih' : 'Pilih halaman ini'}
              </button>
              <button type="button" onClick={() => setBesar(null)} aria-label="Tutup" className="rounded-full bg-white/15 p-1.5 hover:bg-white/25">
                <X size={18} weight="bold" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
            {besar.url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={besar.url} alt={`Halaman ${besar.nomor}`} className="max-h-full max-w-full object-contain" />
              : <SpinnerGap size={28} className="animate-spin text-white" aria-hidden="true" />}
          </div>
        </div>
      )}
    </div>
  );
}
