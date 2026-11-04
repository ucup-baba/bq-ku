import { notFound } from 'next/navigation';
import { AkunKlien } from '@/components/perpus-publik/AkunKlien';
import { adaBahasa } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';
import { metaHalaman } from '@/lib/perpus/meta';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  return adaBahasa(lang) ? { ...metaHalaman(lang, '/akun', t(lang, 'akun.judul')), robots: { index: false } } : {};
}

/** Cangkang statis: sesi dijaga proxy, data diambil klien (lihat sesiPerpus di proxy.ts). */
export default async function Akun({ params }: Props) {
  const { lang } = await params;
  if (!adaBahasa(lang)) notFound();
  return <AkunKlien lang={lang} />;
}
