'use client';
import { useEffect, useRef, useState } from 'react';
import { Kalam, Patrick_Hand } from 'next/font/google';
import type { SuratData } from '@/lib/surat/data';
import type { GayaTulisan } from '@/lib/db/donatur-repo';
import { ASET_PRATINJAU, FONT_PRATINJAU } from '@/lib/surat/aset-klien';
import { SuratTemplate } from './SuratTemplate';

const kalam = Kalam({ weight: '400', subsets: ['latin'] });
const patrickHand = Patrick_Hand({ weight: '400', subsets: ['latin'] });

/** className font tulisan tangan — dipakai pemilih gaya tulisan di form Buat Surat. */
export const KELAS_FONT_GAYA: Record<GayaTulisan, string> = {
  KALAM: kalam.className,
  PATRICK: patrickHand.className,
};

const LEBAR = 1240;
const TINGGI = 1754;

// Font surat didaftarkan sekali per halaman dengan nama keluarga yang sama
// seperti di Satori (Arimo/Bebas/Kalam/Patrick), agar pratinjau identik dengan PNG.
let fontDimuat: Promise<unknown> | null = null;
function muatFontSurat(): Promise<unknown> {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') return Promise.resolve();
  if (!fontDimuat) {
    fontDimuat = Promise.all(FONT_PRATINJAU.map(async (f) => {
      const ff = new FontFace(f.family, `url(${f.src})`, { weight: f.weight, style: f.style });
      await ff.load();
      document.fonts.add(ff);
    })).catch((e) => {
      fontDimuat = null; // biar dicoba lagi pada pratinjau berikutnya
      throw e;
    });
  }
  return fontDimuat;
}

/**
 * Pratinjau memakai SuratTemplate yang SAMA dengan PNG yang dikirim ke WhatsApp,
 * dirender di browser pada ukuran asli 1240×1754 lalu diperkecil agar pas lebar wadah.
 */
export function PratinjauSurat({ data }: { data: SuratData }) {
  const wadahRef = useRef<HTMLDivElement>(null);
  const [lebar, setLebar] = useState(0);
  const [fontSiap, setFontSiap] = useState(false);

  useEffect(() => {
    let batal = false;
    // Bila font gagal dimuat, surat tetap ditampilkan dengan font cadangan.
    muatFontSurat().catch(() => {}).finally(() => { if (!batal) setFontSiap(true); });
    return () => { batal = true; };
  }, []);

  useEffect(() => {
    const el = wadahRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLebar(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const skala = lebar / LEBAR;
  return (
    <div data-audit-abaikan className="space-y-2">
      <p className="flex items-center gap-1.5 px-1 text-xs font-bold text-bq-hijau">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-bq-hijau" /> Pratinjau surat asli
      </p>
      <div
        ref={wadahRef}
        role="img"
        aria-label={`Pratinjau surat untuk ${data.namaDonatur || 'donatur'}`}
        className="relative overflow-hidden rounded-2xl border border-bq-garis bg-white shadow-kartu"
        style={{ aspectRatio: `${LEBAR} / ${TINGGI}` }}
      >
        {lebar > 0 && (
          <div
            aria-hidden="true"
            // Reset gaya global Tailwind (img max-width, line-height) agar tata letak sama dengan Satori.
            className="absolute left-0 top-0 leading-normal [&_img]:max-w-none"
            style={{ width: LEBAR, height: TINGGI, transform: `scale(${skala})`, transformOrigin: '0 0', opacity: fontSiap ? 1 : 0, transition: 'opacity 200ms' }}
          >
            <SuratTemplate data={data} assets={ASET_PRATINJAU} />
          </div>
        )}
        {!fontSiap && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-slate-100" />}
      </div>
    </div>
  );
}
