import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { FormMasuk } from '@/components/perpus-publik/FormMasuk';
import { adaBahasa } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';
import { metaHalaman } from '@/lib/perpus/meta';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  return adaBahasa(lang) ? { ...metaHalaman(lang, '/masuk', t(lang, 'masuk.judul')), robots: { index: false } } : {};
}

export default async function Masuk({ params }: Props) {
  const { lang } = await params;
  if (!adaBahasa(lang)) notFound();
  return <Suspense><FormMasuk lang={lang} /></Suspense>;
}
