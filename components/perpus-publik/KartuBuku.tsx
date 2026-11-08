import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import type { Bahasa } from '@/lib/perpus/ddc';
import { t } from '@/lib/perpus/i18n';
import { urlSampul } from '@/lib/perpus/sampul';
import { desainSampul, judulPanel } from '@/lib/perpus/sampul-motif';
import type { BukuPublik } from '@/lib/perpus/tipe';
import { MotifSampul } from './MotifSampul';

export function KartuBuku({ lang, buku, className = '' }: { lang: Bahasa; buku: BukuPublik; className?: string }) {
  const desain = desainSampul(buku.judul, buku.kelasDdc);
  const tersedia = buku.tersedia > 0;
  return (
    <Link href={`/${lang}/buku/${buku.idPendek}`} className={`p-buku ${className}`}>
      <div className="p-buku-panel" style={{ color: desain.teks }}>
        <MotifSampul desain={desain} />
        {buku.sampulPath
          ? <img src={urlSampul(buku.sampulPath)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain" />
          : <div aria-hidden className="p-buku-alas" style={{ background: desain.latar }}><p className="p-buku-judul">{judulPanel(buku.judul)}</p></div>}
        {buku.nomorPanggil && <span className="p-buku-nomor">{buku.nomorPanggil}</span>}
      </div>
      <div className="p-buku-isi flex flex-1 flex-col gap-0.5 p-3">
        <p className="p-buku-nama line-clamp-2 font-extrabold leading-snug">{buku.judul}</p>
        <p className="p-buku-penulis truncate text-sm text-perpus-tinta-lembut">{buku.penulis}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="flex items-center gap-1.5 text-xs font-bold">
            <span className={`p-titik ${tersedia ? 'bg-perpus-lime' : 'bg-[#d97757]'}`} />
            {t(lang, tersedia ? 'kartu.tersedia' : 'kartu.dipinjam')}
          </span>
          <span className="p-buku-panah"><ArrowRight size={14} weight="bold" aria-hidden /></span>
        </div>
      </div>
    </Link>
  );
}
