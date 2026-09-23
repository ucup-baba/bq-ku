import Link from 'next/link';
import { kelasKartu } from '@/components/ui/Kartu';
import { InisialUbin } from '@/components/ui/InisialUbin';
import type { Santri } from '@/lib/db/santri-repo';
import { BadgeBerkas } from './BadgeBerkas';

export type SantriBaris = Pick<Santri, 'id' | 'namaLengkap' | 'jenjang' | 'kelas' | 'fotoProfilUrl' | 'fotoFormalUrl' | 'documents'>;

export function keteranganJenjang(s: Pick<Santri, 'jenjang' | 'kelas'>): string {
  return s.jenjang === 'ALUMNI' ? `Alumni · ${s.kelas}` : `${s.jenjang} · Kelas ${s.kelas}`;
}

/** Kartu satu baris santri; seluruh kartu menuju halaman detail. */
export function BarisSantri({ santri, indeks = 0 }: { santri: SantriBaris; indeks?: number }) {
  const foto = santri.fotoProfilUrl || santri.fotoFormalUrl;
  return (
    <Link href={`/santri/${santri.id}`} className={kelasKartu('biasa', 'goyang-saat-hover flex items-center gap-3 p-3 transition-transform duration-200 hover:-translate-y-0.5')}>
      {foto
        ? <img src={foto} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
        : <InisialUbin nama={santri.namaLengkap} indeks={indeks} />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-bq-tinta">{santri.namaLengkap}</span>
        <span className="block truncate text-xs text-bq-redup">{keteranganJenjang(santri)}</span>
      </span>
      <BadgeBerkas docs={santri.documents} />
    </Link>
  );
}
