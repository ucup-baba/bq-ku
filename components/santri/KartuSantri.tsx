import Link from 'next/link';
import { kelasKartu } from '@/components/ui/Kartu';
import { InisialUbin } from '@/components/ui/InisialUbin';
import { BadgeBerkas } from './BadgeBerkas';
import { keteranganJenjang, type SantriBaris } from './BarisSantri';

/** Kartu galeri santri: foto tegak 3:4 (atau inisial), nama, jenjang, badge berkas. Seluruh kartu menuju detail. */
export function KartuSantri({ santri, indeks = 0, href }: { santri: SantriBaris; indeks?: number; href?: string }) {
  const foto = santri.fotoProfilUrl || santri.fotoFormalUrl;
  return (
    <Link href={href ?? `/santri/${santri.id}`}
      className={kelasKartu('biasa', 'group flex h-full flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-0.5')}>
      <span className="relative block aspect-[3/4] overflow-hidden bg-bq-garis/40">
        {foto
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={foto} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          : <InisialUbin nama={santri.namaLengkap} indeks={indeks} className="h-full w-full rounded-none text-3xl" />}
        <BadgeBerkas docs={santri.documents} className="absolute right-2 top-2 shadow-sm" />
      </span>
      <span className="block min-w-0 p-2.5 md:p-3">
        <span className="line-clamp-2 text-sm font-bold leading-snug text-bq-tinta">{santri.namaLengkap}</span>
        <span className="mt-0.5 block truncate text-xs text-bq-redup">{keteranganJenjang(santri)}</span>
      </span>
    </Link>
  );
}
