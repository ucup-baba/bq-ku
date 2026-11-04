import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { CatatanBuku } from '@/components/perpus-publik/CatatanBuku';
import { KartuPenulis } from '@/components/perpus-publik/KartuPenulis';
import { SampulBuku } from '@/components/perpus-publik/SampulBuku';
import { TombolPinjam } from '@/components/perpus-publik/TombolPinjam';
import { ambilBukuPublik, listPenulisPublik } from '@/lib/db/perpus-publik-repo';
import { genreDari, LABEL_GENRE, labelKelas, type Bahasa } from '@/lib/perpus/ddc';
import { adaBahasa } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';
import { urlKatalog } from '@/lib/perpus/katalog';
import { metaHalaman } from '@/lib/perpus/meta';
import type { BukuPublik } from '@/lib/perpus/tipe';
import { klienAnon } from '@/lib/supabase/anon';

export const revalidate = 300;

type Props = { params: Promise<{ lang: string; id: string }> };

const ambil = (id: string) => (/^[0-9a-f]{8}$/.test(id) ? ambilBukuPublik(klienAnon(), id) : Promise.resolve(null));

export async function generateMetadata({ params }: Props) {
  const { lang, id } = await params;
  const buku = adaBahasa(lang) ? await ambil(id) : null;
  return adaBahasa(lang) && buku ? metaHalaman(lang, `/buku/${id}`, buku.judul, buku.penulis || undefined) : {};
}

function teksAsal(lang: Bahasa, b: BukuPublik) {
  if (b.asal !== 'wakaf') return t(lang, b.asal === 'pengadaan' ? 'asal.pengadaan' : 'asal.koleksi_awal');
  return b.namaDonatur ? t(lang, 'asal.wakaf', { nama: b.namaDonatur }) : t(lang, 'asal.wakafAnonim');
}

export default async function DetailBuku({ params }: Props) {
  const { lang, id } = await params;
  if (!adaBahasa(lang)) notFound();
  const buku = await ambil(id);
  if (!buku) notFound();
  const genre = genreDari(buku.kelasDdc);
  const penulis = (await listPenulisPublik(klienAnon())).find(p => p.nama === buku.penulis);
  const rincian = [
    ['buku.nomorPanggil', buku.nomorPanggil ?? '—'],
    ['buku.genre', LABEL_GENRE[genre][lang]],
    ['buku.kelas', buku.kelasDdc ? labelKelas(buku.kelasDdc, lang) : '—'],
    ['buku.asal', teksAsal(lang, buku)],
    ['buku.ketersediaan', buku.tersedia > 0 ? t(lang, 'buku.tersedia', { n: buku.tersedia, total: buku.eksemplar }) : t(lang, 'buku.habis')],
  ] as const;
  return (
    <>
      <Link href={`/${lang}/katalog`} className="p-pil w-fit gap-1"><ArrowLeft size={16} aria-hidden /> {t(lang, 'buku.kembali')}</Link>
      <article className="p-kartu flex flex-col gap-6 p-5 sm:flex-row">
        <SampulBuku buku={buku} />
        <div className="min-w-0 flex-1 space-y-4">
          <header className="space-y-1">
            <h1 className="p-h2 text-3xl">{buku.judul}</h1>
            <p className="text-perpus-tinta-lembut">{buku.penulis || t(lang, 'buku.penulisKosong')}</p>
          </header>
          <dl className="grid gap-3 sm:grid-cols-2">
            {rincian.map(([kunci, nilai]) => (
              <div key={kunci}>
                <dt className="text-xs font-bold text-perpus-tinta-lembut">{t(lang, kunci)}</dt>
                <dd className={kunci === 'buku.nomorPanggil' ? 'font-mono font-bold' : 'font-bold'}>{nilai}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-start gap-3">
            <TombolPinjam lang={lang} bukuId={buku.id} idPendek={buku.idPendek} />
            {buku.penulis && <Link href={urlKatalog(lang, { pengarang: buku.penulis })} className="p-pil">{t(lang, 'buku.lainPenulis')}</Link>}
          </div>
        </div>
      </article>
      {buku.penulis && (
        <section className="space-y-3">
          <h2 className="p-h2">{t(lang, 'penulis.judul')}</h2>
          <KartuPenulis lang={lang} nama={buku.penulis} penulis={penulis} />
        </section>
      )}
      <CatatanBuku lang={lang} bukuId={buku.id} />
    </>
  );
}
