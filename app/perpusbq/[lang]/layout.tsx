import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google';
import '../perpus.css';
import { NavPerpus } from '@/components/perpus-publik/NavPerpus';
import { PengalihBahasa } from '@/components/perpus-publik/PengalihBahasa';
import { adaBahasa, BAHASA } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';

const judul = Bricolage_Grotesque({ variable: '--font-judul', subsets: ['latin'] });
const teks = Plus_Jakarta_Sans({ variable: '--font-teks', subsets: ['latin'] });

export const generateStaticParams = () => BAHASA.map(lang => ({ lang }));
export const viewport: Viewport = { themeColor: '#f7f7f2' };

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!adaBahasa(lang)) return {};
  const host = process.env.PERPUS_HOST?.split(',')[0].trim();
  return {
    ...(host ? { metadataBase: new URL(`https://${host}`) } : {}),
    title: { default: t(lang, 'situs.nama'), template: `%s · ${t(lang, 'situs.nama')}` },
    description: t(lang, 'situs.deskripsi'),
  };
}

export default async function LayoutPerpus({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!adaBahasa(lang)) notFound();
  return (
    <html lang={lang}>
      <body className={`${judul.variable} ${teks.variable} tema-perpus antialiased`}>
        <NavPerpus lang={lang} />
        <div className="p-hanya-hp p-bahasa-hp"><PengalihBahasa lang={lang} label={t(lang, 'nav.bahasa')} /></div>
        <main className="p-wadah">{children}</main>
      </body>
    </html>
  );
}
