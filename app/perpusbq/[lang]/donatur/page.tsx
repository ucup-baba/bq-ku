import { notFound } from 'next/navigation';
import { PanelDonatur } from '@/components/perpus-publik/PanelDonatur';
import { ambilRingkasanPublik, listDonasiPublik } from '@/lib/db/perpus-publik-repo';
import { adaBahasa } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';
import { metaHalaman } from '@/lib/perpus/meta';
import { klienAnon } from '@/lib/supabase/anon';

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ tab?: string | string[] }> };

export async function generateMetadata({ params }: Pick<Props, 'params'>) {
  const { lang } = await params;
  return adaBahasa(lang) ? metaHalaman(lang, '/donatur', t(lang, 'donatur.judul')) : {};
}

export default async function Donatur({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!adaBahasa(lang)) notFound();
  const { tab } = await searchParams;
  const c = klienAnon();
  const [donasi, ringkasan] = await Promise.all([listDonasiPublik(c), ambilRingkasanPublik(c)]);
  return (
    <>
      <header className="space-y-1">
        <h1 className="p-h1">{t(lang, 'donatur.judul')}</h1>
        <p className="text-perpus-tinta-lembut">{t(lang, 'donatur.sub')}</p>
      </header>
      <PanelDonatur lang={lang} tab={tab === 'wakaf' ? 'wakaf' : 'infaq'} donasi={donasi} ringkasan={ringkasan} />
    </>
  );
}
