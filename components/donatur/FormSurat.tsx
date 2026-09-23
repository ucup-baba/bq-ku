'use client';
import { useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useMedia } from '@/components/ui/useMedia';
import { PanelTetap, SNAP_PANEL } from '@/components/ui/LembarBawah';
import { ChipPilihan } from '@/components/ui/ChipPilihan';
import { bagianUntukGalat } from '@/lib/donatur/bagian-form';
import type { SuratWithRelasi } from '@/lib/db/donatur-repo';
import { PratinjauSurat } from '@/components/donatur/PratinjauSurat';
import { useFormSurat, type FormSuratCtx } from './form-surat/useFormSurat';
import { BagianDonatur, BagianDonasi, BagianSurat, KotakGalat, TombolSimpan, KartuBagian } from './form-surat/Bagian';

export { hitungPratinjau, petakanErrorField, type FormState } from './form-surat/logika';

function TataLetakDesktop({ f }: { f: FormSuratCtx }) {
  return (
    <div className="grid grid-cols-12 items-start gap-6">
      <form onSubmit={e => { e.preventDefault(); f.simpan(); }} className="bergilir col-span-12 space-y-4 lg:col-span-7">
        <KotakGalat f={f} />
        <KartuBagian nomor={1} judul="Donatur" sub="Pilih donatur terdaftar atau tambahkan baru." warna="biru"><BagianDonatur f={f} /></KartuBagian>
        <KartuBagian nomor={2} judul="Donasi" sub="Jenis, bentuk, dan nilai donasi." warna="hijau"><BagianDonasi f={f} /></KartuBagian>
        <KartuBagian nomor={3} judul="Surat & gaya tulisan" sub="Nomor, tanggal, dan gaya tulisan tangan." warna="ungu"><BagianSurat f={f} /></KartuBagian>
        <TombolSimpan busy={f.busy} type="submit" label={f.modeEdit ? 'Simpan perubahan' : undefined} />
      </form>
      <div className="col-span-12 lg:sticky lg:top-6 lg:col-span-5">
        <PratinjauSurat data={f.pratinjau} />
      </div>
    </div>
  );
}

export const LABEL_BAGIAN = [
  { value: '0', label: 'Donatur' },
  { value: '1', label: 'Donasi' },
  { value: '2', label: 'Surat' },
] as const;
type NilaiBagian = (typeof LABEL_BAGIAN)[number]['value'];

/**
 * HP: pratinjau surat mengisi layar; isian di panel tarik (28% / 60% / penuh) berisi
 * 3 bagian yang bisa digeser. Fokus ke input → panel penuh; keluar panel → 60%.
 * Tombol Simpan menempel di dasar layar pada semua posisi panel.
 */
function TataLetakHp({ f }: { f: FormSuratCtx }) {
  const [snap, setSnap] = useState<number>(SNAP_PANEL[1]);
  const [bagian, setBagian] = useState(0);
  const [viewportRef, api] = useEmblaCarousel({ watchDrag: true });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!api) return;
    const pilih = () => setBagian(api.selectedScrollSnap());
    api.on('select', pilih);
    return () => { api.off('select', pilih); };
  }, [api]);

  const keBagian = (i: number) => { setBagian(i); api?.scrollTo(i); };

  // Galat dari server → tampilkan bagian yang bermasalah.
  useEffect(() => {
    const b = bagianUntukGalat(f.fieldErrors, f.donaturFieldErrors, f.nomorUsulan !== null);
    if (b === null) return;
    setBagian(b);
    api?.scrollTo(b);
    setSnap(SNAP_PANEL[1]);
  }, [f.fieldErrors, f.donaturFieldErrors, f.nomorUsulan, api]);

  const fokusMasuk = (e: React.FocusEvent) => {
    if ((e.target as HTMLElement).matches('input, select, textarea')) setSnap(SNAP_PANEL[2]);
  };
  const fokusKeluar = (e: React.FocusEvent) => {
    const ke = e.relatedTarget as Node | null;
    if (!ke || !panelRef.current?.contains(ke)) setSnap(SNAP_PANEL[1]);
  };

  const isi = [<BagianDonatur key="0" f={f} />, <BagianDonasi key="1" f={f} />, <BagianSurat key="2" f={f} />];

  return (
    <>
      <div className="h-[62dvh] overflow-y-auto overscroll-contain rounded-kartu">
        <PratinjauSurat data={f.pratinjau} />
      </div>
      <PanelTetap snap={snap} onSnap={setSnap} judul="Isian surat">
        <div ref={panelRef} onFocus={fokusMasuk} onBlur={fokusKeluar} className="flex min-h-0 flex-1 flex-col px-4 pt-3">
          <ChipPilihan<NilaiBagian> label="Bagian isian" className="self-center"
            opsi={[...LABEL_BAGIAN]} nilai={String(bagian) as NilaiBagian} onPilih={v => keBagian(Number(v))} />
          <div className="pt-2"><KotakGalat f={f} /></div>
          <div ref={viewportRef} data-vaul-no-drag className="mt-2 min-h-0 flex-1 overflow-hidden">
            <div className="flex h-full">
              {isi.map((el, i) => (
                <div key={i} role="group" aria-roledescription="slide" aria-label={`${LABEL_BAGIAN[i].label}, bagian ${i + 1} dari 3`}
                  className="h-full min-w-0 shrink-0 grow-0 basis-full overflow-y-auto overscroll-contain px-0.5 pb-28">
                  {el}
                </div>
              ))}
            </div>
          </div>
        </div>
      </PanelTetap>
      <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-bq-garis bg-bq-surface/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <TombolSimpan busy={f.busy} onClick={f.simpan} label={f.modeEdit ? 'Simpan perubahan' : undefined} />
      </div>
    </>
  );
}

export function FormSurat({ awal }: { awal?: SuratWithRelasi } = {}) {
  const f = useFormSurat(awal);
  const desktop = useMedia('(min-width: 1024px)');
  return desktop ? <TataLetakDesktop f={f} /> : <TataLetakHp f={f} />;
}
