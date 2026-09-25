'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { ArrowCounterClockwise, ArrowClockwise, ArrowsCounterClockwise, MagnifyingGlassMinus, MagnifyingGlassPlus, X } from '@phosphor-icons/react';
import { TombolIkon, TombolUtama } from '@/components/ui/Tombol';
import { BINGKAI_FOTO, potongFoto, type KolomFoto } from '@/lib/santri/foto';

type Props = {
  src: string;
  kolom: KolomFoto;
  onBatal: () => void;
  onPakai: (hasil: Blob) => void;
};

/**
 * Jendela layar penuh untuk memposisikan foto di bingkainya: geser, perbesar (cubit/scroll/slider),
 * putar 90°, dan luruskan. Hasilnya dipotong permanen di peramban sebelum diunggah.
 * Sengaja bukan LembarBawah: seret-untuk-menutup milik drawer bentrok dengan menggeser foto.
 */
export function AturFoto({ src, kolom, onBatal, onPakai }: Props) {
  const bingkai = BINGKAI_FOTO[kolom];
  const idJudul = useId();
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [putar, setPutar] = useState(0);
  const [luruskan, setLuruskan] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  const [ukuranBingkai, setUkuranBingkai] = useState<{ width: number; height: number } | null>(null);
  const [memproses, setMemproses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const batalRef = useRef(onBatal);
  batalRef.current = onBatal;

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') batalRef.current(); };
    document.addEventListener('keydown', esc);
    const overflowLama = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = overflowLama; };
  }, []);

  const saatSelesaiGeser = useCallback((_: Area, px: Area) => setArea(px), []);
  const reset = () => { setCrop({ x: 0, y: 0 }); setZoom(1); setPutar(0); setLuruskan(0); };

  const pakai = async () => {
    if (!area) return;
    setMemproses(true);
    setGalat(null);
    try {
      onPakai(await potongFoto(src, area, putar + luruskan, { lebar: bingkai.lebar, tinggi: bingkai.tinggi }));
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Gagal memproses foto.');
      setMemproses(false);
    }
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby={idJudul}
      className="fixed inset-0 z-[110] flex items-stretch justify-center bg-slate-950/80 backdrop-blur-sm md:items-center md:p-6">
      <div className="flex h-full w-full flex-col bg-bq-surface md:h-auto md:max-h-[92vh] md:max-w-xl md:rounded-[28px] md:border md:border-bq-garis md:shadow-angkat">
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] md:pt-5">
          <div className="min-w-0">
            <h2 id={idJudul} className="truncate text-base font-extrabold text-bq-tinta">Atur {bingkai.judul.toLowerCase()}</h2>
            <p className="text-xs text-bq-redup">Geser & perbesar sampai pas di bingkai.</p>
          </div>
          <TombolIkon ikon={X} label="Tutup" varian="polos" ukuran="sm" onClick={onBatal} />
        </div>

        <div className="relative min-h-[300px] flex-1 bg-slate-900 md:h-[420px] md:flex-none">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={putar + luruskan}
            aspect={bingkai.rasio}
            minZoom={1}
            maxZoom={4}
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={saatSelesaiGeser}
            onCropSizeChange={setUkuranBingkai}
            mediaProps={{ crossOrigin: 'anonymous' }}
          />
          {bingkai.panduanWajah && ukuranBingkai && (
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ width: ukuranBingkai.width, height: ukuranBingkai.height }}>
              <div className="absolute inset-x-[24%] bottom-[34%] top-[12%] rounded-[50%] border-2 border-dashed border-white/80" />
              <span className="absolute inset-x-0 bottom-2 text-center text-xs font-semibold text-white/90 drop-shadow">Letakkan wajah di dalam oval</span>
            </div>
          )}
        </div>

        <div className="space-y-4 px-5 pt-4">
          <label className="flex items-center gap-3">
            <span className="sr-only">Perbesar</span>
            <MagnifyingGlassMinus size={20} className="shrink-0 text-bq-redup" aria-hidden />
            <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Perbesar foto" className="h-11 w-full accent-[#0E9F54]" />
            <MagnifyingGlassPlus size={20} className="shrink-0 text-bq-redup" aria-hidden />
          </label>
          <label className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs font-semibold text-bq-redup">Luruskan</span>
            <input type="range" min={-15} max={15} step={0.5} value={luruskan} onChange={(e) => setLuruskan(Number(e.target.value))}
              aria-label="Luruskan foto (derajat)" className="h-11 w-full accent-[#0E9F54]" />
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-bq-redup">{luruskan > 0 ? '+' : ''}{luruskan}°</span>
          </label>
          <div className="flex items-center justify-center gap-2">
            <TombolIkon ikon={ArrowCounterClockwise} label="Putar ke kiri 90°" onClick={() => setPutar((p) => p - 90)} />
            <TombolIkon ikon={ArrowClockwise} label="Putar ke kanan 90°" onClick={() => setPutar((p) => p + 90)} />
            <TombolIkon ikon={ArrowsCounterClockwise} label="Kembalikan ke awal" onClick={reset} />
          </div>
          {galat && <p role="alert" className="text-center text-sm font-semibold text-rose-600">{galat}</p>}
        </div>

        <div className="flex gap-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          <button type="button" onClick={onBatal}
            className="tekan h-11 flex-1 rounded-2xl border border-bq-garis bg-bq-surface text-sm font-bold text-bq-tinta hover:border-bq-biru">
            Batal
          </button>
          <TombolUtama onClick={pakai} disabled={!area || memproses} className="flex-1">
            {memproses ? 'Memproses…' : 'Pakai foto'}
          </TombolUtama>
        </div>
      </div>
    </div>,
    document.body,
  );
}
