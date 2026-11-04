import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { FormDaftar } from '@/components/perpus-publik/FormDaftar';
import { adaBahasa } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';
import { metaHalaman } from '@/lib/perpus/meta';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  return adaBahasa(lang) ? { ...metaHalaman(lang, '/daftar', t(lang, 'daftar.judul')), robots: { index: false } } : {};
}

export default async function Daftar({ params }: Props) {
  const { lang } = await params;
  if (!adaBahasa(lang)) notFound();
  return <Suspense><FormDaftar lang={lang} /></Suspense>;
}
