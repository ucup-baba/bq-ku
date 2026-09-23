import { twMerge } from 'tailwind-merge';
import { BarisSantri, type SantriBaris } from '../BarisSantri';

/** 2 baris di HP, 5 di desktop. */
export function SantriTerbaru({ santri, className }: { santri: SantriBaris[]; className?: string }) {
  return (
    <section aria-labelledby="judul-santri-terbaru" className={twMerge('space-y-2', className)}>
      <h2 id="judul-santri-terbaru" className="px-1 text-sm font-extrabold text-bq-tinta">Santri terbaru</h2>
      {santri.length === 0 ? (
        <p className="px-1 text-sm text-bq-redup">Belum ada santri. Tambahkan lewat tombol Santri baru.</p>
      ) : (
        <ul data-audit-daftar className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {santri.slice(0, 5).map((s, i) => (
            <li key={s.id} className={i >= 2 ? 'hidden md:block' : undefined}><BarisSantri santri={s} indeks={i} /></li>
          ))}
        </ul>
      )}
    </section>
  );
}
