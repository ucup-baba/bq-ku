import { notFound } from 'next/navigation';
import { PinjamankuKlien } from '@/components/perpus-publik/PinjamankuKlien';
import { adaBahasa } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';
import { metaHalaman } from '@/lib/perpus/meta';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  return adaBahasa(lang) ? { ...metaHalaman(lang, '/pinjamanku', t(lang, 'pinjamanku.judul')), robots: { index: false } } : {};
}

/** Cangkang statis: sesi dijaga proxy, data diambil klien (lihat sesiPerpus di proxy.ts). */
export default async function Pinjamanku({ params }: Props) {
  const { lang } = await params;
  if (!adaBahasa(lang)) notFound();
  return <PinjamankuKlien lang={lang} />;
}
