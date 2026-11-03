import Link from 'next/link';
import { genreDari, LABEL_GENRE, type Bahasa } from '@/lib/perpus/ddc';
import type { BukuPublik } from '@/lib/perpus/tipe';
import { SampulBuku } from './SampulBuku';

export function KartuBuku({ lang, buku }: { lang: Bahasa; buku: BukuPublik }) {
  return (
    <Link href={`/${lang}/buku/${buku.idPendek}`} className="p-kartu p-kartu-tautan flex gap-3 p-3">
      <SampulBuku buku={buku} />
      <div className="min-w-0 space-y-1">
        <p className="font-extrabold leading-snug line-clamp-2">{buku.judul}</p>
        <p className="text-sm text-perpus-tinta-lembut truncate">{buku.penulis}</p>
        <p className="text-xs font-bold text-perpus-teal">{LABEL_GENRE[genreDari(buku.kelasDdc)][lang]}</p>
        <p className="font-mono text-xs">{buku.nomorPanggil ?? '—'}</p>
      </div>
    </Link>
  );
}
