import { notFound } from 'next/navigation';
import { BarisBuku } from '@/components/perpus-publik/BarisBuku';
import { PemutarVideo } from '@/components/perpus-publik/PemutarVideo';
import { adaBahasa } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';
import { metaHalaman } from '@/lib/perpus/meta';
import { ambilVideoKanal, KANAL } from '@/lib/youtube/api';
import { pisahVideo, type Video } from '@/lib/youtube/video';

export const revalidate = 1800;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  return adaBahasa(lang) ? metaHalaman(lang, '/video', t(lang, 'video.judul')) : {};
}

/** Saat revalidasi, galat dibiarkan lolos agar Next tetap menyajikan halaman terakhir. Saat build tidak ada halaman lama. */
async function muatVideo(): Promise<Video[] | null> {
  try {
    return await ambilVideoKanal();
  } catch (e) {
    if (process.env.NEXT_PHASE !== 'phase-production-build') throw e;
    console.error('Gagal memuat video saat build:', e);
    return null;
  }
}

export default async function HalamanVideo({ params }: Props) {
  const { lang } = await params;
  if (!adaBahasa(lang)) notFound();
  const video = await muatVideo();
  const { kajian, cuplikan } = pisahVideo(video ?? []);
  const keKanal = <a href={KANAL} target="_blank" rel="noopener noreferrer" className="p-pil">{t(lang, 'video.semua')}</a>;
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="p-h1">{t(lang, 'video.judul')}</h1>
          <p className="text-perpus-tinta-lembut">{t(lang, 'video.sub')}</p>
        </div>
        {keKanal}
      </header>
      {!video?.length && <p className="p-kartu p-6 text-center">{t(lang, 'video.kosong')}</p>}
      {cuplikan.length > 0 && (
        <BarisBuku lang={lang} judul={<h2 className="p-h2">{t(lang, 'video.cuplikan')}</h2>}>
          {cuplikan.map(v => <PemutarVideo key={v.id} lang={lang} video={v} className="w-64 shrink-0 snap-start" />)}
        </BarisBuku>
      )}
      {kajian.length > 0 && (
        <section className="space-y-3">
          <h2 className="p-h2">{t(lang, 'video.kajian')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kajian.map(v => <PemutarVideo key={v.id} lang={lang} video={v} />)}
          </div>
        </section>
      )}
    </>
  );
}
