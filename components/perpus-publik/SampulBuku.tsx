import { urlSampul } from '@/lib/perpus/sampul';
import { desainSampul, judulPanel } from '@/lib/perpus/sampul-motif';
import type { BukuPublik } from '@/lib/perpus/tipe';
import { MotifSampul } from './MotifSampul';

type Buku = Pick<BukuPublik, 'judul' | 'penulis' | 'sampulPath' | 'kelasDdc'>;

/** Sampul tegak di detail buku. Foto didahulukan; tanpa foto, motif yang dihitung dari judul. */
export function SampulBuku({ buku }: { buku: Buku }) {
  if (buku.sampulPath) {
    return <img src={urlSampul(buku.sampulPath)} alt="" loading="lazy" className="w-40 aspect-[2/3] shrink-0 object-cover rounded-xl border-2 border-perpus-tinta" />;
  }
  const desain = desainSampul(buku.judul, buku.kelasDdc);
  return (
    <div aria-hidden className="relative w-40 aspect-[2/3] shrink-0 overflow-hidden rounded-xl border-2 border-perpus-tinta" style={{ color: desain.teks }}>
      <MotifSampul desain={desain} />
      <div className="absolute inset-x-0 bottom-0 space-y-1 p-3" style={{ background: desain.latar }}>
        <p className="line-clamp-5 font-extrabold leading-tight [overflow-wrap:anywhere]">{judulPanel(buku.judul)}</p>
        {buku.penulis && <p className="line-clamp-2 text-xs font-semibold">{buku.penulis}</p>}
      </div>
    </div>
  );
}
