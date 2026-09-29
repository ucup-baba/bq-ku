'use client';
import { AngkaNaik } from '@/components/ui/AngkaNaik';
import { DoodleCoretan } from '@/components/ui/DoodleStickers';
import { DoodleGambar } from '@/components/ui/DoodleGambar';
import { kelasKartu } from '@/components/ui/Kartu';
import { DindingFoto } from '@/components/ui/DindingFoto';
import type { RingkasanSantri } from '@/lib/santri/ringkasan';

/** Kartu total santri. `foto` (dari fotoDinding) → dinding foto berjalan di belakang angka; kosong → hero polos. */
export function HeroSantri({ ringkasan, foto = [], className }: { ringkasan: RingkasanSantri; foto?: string[]; className?: string }) {
  const { total, ikhwan, akhwat } = ringkasan;
  const persen = (n: number) => (total === 0 ? 0 : Math.max((n / total) * 100, n > 0 ? 4 : 0));
  return (
    <section aria-labelledby="judul-hero-santri" className={kelasKartu('hero', `relative isolate overflow-hidden p-4 md:p-6 ${className ?? ''}`)}>
      {foto.length > 0 && (
        <>
          <DindingFoto foto={foto} className="-z-20" />
          {/* Warna hero di atas foto: kiri pekat agar angka terbaca, kanan lebih tembus. */}
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0E9F54]/90 via-[#0E9F54]/60 to-[#0B5FA5]/30" />
        </>
      )}
      <DoodleGambar className="pointer-events-none absolute -right-1 -top-1 text-white/35">
        <DoodleCoretan className="h-8 w-20" />
      </DoodleGambar>
      <h2 id="judul-hero-santri" className="relative text-xs font-bold uppercase tracking-wider text-white/90">Total santri</h2>
      <p className="relative mt-2 text-4xl font-black tracking-tight"><AngkaNaik nilai={total} /></p>
      <div className="relative mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
        <span className="bg-white" style={{ width: `${persen(ikhwan)}%` }} />
        <span className="bg-rose-200" style={{ width: `${persen(akhwat)}%` }} />
      </div>
      <p className="relative mt-2 flex items-center gap-3 text-xs text-white/90">
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-white" />Ikhwan {ikhwan}</span>
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-rose-200" />Akhwat {akhwat}</span>
      </p>
    </section>
  );
}
