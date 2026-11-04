import type { BukuPublik } from '@/lib/perpus/tipe';
import { urlSampul } from '@/lib/perpus/sampul';
import { gayaWarna, warnaKelas } from '@/lib/perpus/warna';

type Props = { buku: Pick<BukuPublik, 'judul' | 'penulis' | 'sampulPath' | 'kelasDdc'>; besar?: boolean };

/** Sebagian besar buku belum bersampul: tampilkan judul & penulis di atas blok berwarna genre. */
export function SampulBuku({ buku, besar = false }: Props) {
  const ukuran = besar ? 'w-40' : 'w-20';
  if (buku.sampulPath) {
    return <img src={urlSampul(buku.sampulPath)} alt="" loading="lazy" className={`${ukuran} aspect-[2/3] shrink-0 object-cover rounded-xl border-2 border-perpus-tinta`} />;
  }
  return (
    <div aria-hidden style={gayaWarna(warnaKelas(buku.kelasDdc))}
      className={`${ukuran} aspect-[2/3] shrink-0 overflow-hidden rounded-xl border-2 border-perpus-tinta flex flex-col justify-between gap-1 ${besar ? 'p-3 text-base' : 'p-2 text-[10px]'} font-extrabold leading-tight`}>
      <span className={besar ? 'line-clamp-6' : 'line-clamp-5'}>{buku.judul}</span>
      {buku.penulis && <span className={`font-semibold line-clamp-2 ${besar ? 'text-xs' : 'text-[9px]'}`}>{buku.penulis}</span>}
    </div>
  );
}
