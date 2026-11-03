import type { BukuPublik } from '@/lib/perpus/tipe';
import { urlSampul } from '@/lib/perpus/sampul';

/** Sebagian besar buku belum bersampul: tampilkan judul di atas blok berwarna. */
export function SampulBuku({ buku, besar = false }: { buku: Pick<BukuPublik, 'judul' | 'sampulPath'>; besar?: boolean }) {
  const ukuran = besar ? 'w-40' : 'w-20';
  if (buku.sampulPath) {
    return <img src={urlSampul(buku.sampulPath)} alt="" loading="lazy" className={`${ukuran} aspect-[2/3] shrink-0 object-cover rounded-xl border-2 border-perpus-tinta`} />;
  }
  return (
    <div aria-hidden className={`${ukuran} aspect-[2/3] shrink-0 overflow-hidden rounded-xl border-2 border-perpus-tinta bg-perpus-lime-tint p-2 ${besar ? 'text-base' : 'text-[10px]'} font-extrabold leading-tight`}>
      {buku.judul}
    </div>
  );
}
