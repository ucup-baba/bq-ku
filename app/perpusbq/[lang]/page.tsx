import Link from 'next/link';
import { notFound } from 'next/navigation';
import { KartuBuku } from '@/components/perpus-publik/KartuBuku';
import { KotakCari } from '@/components/perpus-publik/KotakCari';
import { ambilRingkasanPublik, listKatalogPublik } from '@/lib/db/perpus-publik-repo';
import { adaBahasa } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';
import { bukuTerbaru } from '@/lib/perpus/katalog';
import { metaHalaman } from '@/lib/perpus/meta';
import { klienAnon } from '@/lib/supabase/anon';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return adaBahasa(lang) ? metaHalaman(lang, '', t(lang, 'situs.nama')) : {};
}

export default async function Beranda({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!adaBahasa(lang)) notFound();
  const c = klienAnon();
  const [ringkasan, buku] = await Promise.all([ambilRingkasanPublik(c), listKatalogPublik(c)]);
  const statistik = [
    ['statistik.judul', ringkasan.judul],
    ['statistik.eksemplar', ringkasan.eksemplar],
    ['statistik.donatur', ringkasan.donatur],
  ] as const;
  return (
    <>
      <header className="space-y-3">
        <span className="p-chip">{t(lang, 'beranda.chip')}</span>
        <h1 className="p-h1">{t(lang, 'beranda.sapa')} <span className="p-sorot">{t(lang, 'beranda.sorot')}</span>?</h1>
        <p className="text-perpus-tinta-lembut">{t(lang, 'beranda.sub')}</p>
      </header>
      <KotakCari lang={lang} />
      <dl className="grid grid-cols-3 gap-3">
        {statistik.map(([kunci, n]) => (
          <div key={kunci} className="p-kartu p-3 text-center">
            <dd className="p-h2">{n}</dd>
            <dt className="text-xs font-bold text-perpus-tinta-lembut">{t(lang, kunci)}</dt>
          </div>
        ))}
      </dl>
      <section className="space-y-3">
        <h2 className="p-h2">{t(lang, 'beranda.terbaru')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bukuTerbaru(buku, 6).map(b => <KartuBuku key={b.id} lang={lang} buku={b} />)}
        </div>
        <Link href={`/${lang}/katalog`} className="p-tombol">{t(lang, 'beranda.semua')}</Link>
      </section>
    </>
  );
}
