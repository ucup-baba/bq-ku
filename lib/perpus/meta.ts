import type { Metadata } from 'next';
import type { Bahasa } from '@/lib/perpus/ddc';

/** `path` tanpa awalan bahasa: '' untuk beranda, '/katalog', dst. */
export function metaHalaman(lang: Bahasa, path: string, judul: string, deskripsi?: string): Metadata {
  return {
    title: judul,
    ...(deskripsi ? { description: deskripsi } : {}),
    alternates: {
      canonical: `/${lang}${path}`,
      languages: { id: `/id${path}`, en: `/en${path}` },
    },
  };
}
