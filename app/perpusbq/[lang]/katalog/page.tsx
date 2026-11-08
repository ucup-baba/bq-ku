import Link from 'next/link';
import { notFound } from 'next/navigation';
import { KartuBuku } from '@/components/perpus-publik/KartuBuku';
import { KotakCari } from '@/components/perpus-publik/KotakCari';
import { listKatalogPublik } from '@/lib/db/perpus-publik-repo';
import { LABEL_GENRE } from '@/lib/perpus/ddc';
import { adaBahasa } from '@/lib/perpus/domain';
import { t } from '@/lib/perpus/i18n';
import { bacaSaringan, daftarGenre, daftarPengarang, saringKatalog, urlKatalog } from '@/lib/perpus/katalog';
import { metaHalaman } from '@/lib/perpus/meta';
import { klienAnon } from '@/lib/supabase/anon';

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, 'params'>) {
  const { lang } = await params;
  return adaBahasa(lang) ? metaHalaman(lang, '/katalog', t(lang, 'katalog.judul')) : {};
}

export default async function Katalog({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!adaBahasa(lang)) notFound();
  const saringan = bacaSaringan(await searchParams);
  const buku = await listKatalogPublik(klienAnon());
  const hasil = saringKatalog(buku, saringan);
  // Ganti genre menghapus pengarang: pengarang lama belum tentu ada di genre baru.
  const keGenre = (genre?: (typeof saringan)['genre']) => urlKatalog(lang, { ...saringan, genre, pengarang: undefined });
  return (
    <>
      <header className="space-y-1">
        <h1 className="p-h1">{t(lang, 'katalog.judul')}</h1>
        <p role="status" className="text-perpus-tinta-lembut">{t(lang, 'katalog.jumlah', { n: hasil.length })}</p>
      </header>
      <KotakCari lang={lang} nilai={saringan.q}>
        {saringan.genre && <input type="hidden" name="genre" value={saringan.genre} />}
        {saringan.pengarang && <input type="hidden" name="pengarang" value={saringan.pengarang} />}
        {saringan.tersedia && <input type="hidden" name="tersedia" value="1" />}
      </KotakCari>
      <nav aria-label={t(lang, 'katalog.genre')} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        <Link href={keGenre()} className={`p-pil ${saringan.genre ? '' : 'p-pil-aktif'}`} aria-current={saringan.genre ? undefined : 'true'}>{t(lang, 'katalog.semuaGenre')}</Link>
        {daftarGenre(buku).map(({ genre, jumlah }) => (
          <Link key={genre} href={keGenre(genre)} className={`p-pil ${saringan.genre === genre ? 'p-pil-aktif' : ''}`} aria-current={saringan.genre === genre ? 'true' : undefined}>
            {LABEL_GENRE[genre][lang]} ({jumlah})
          </Link>
        ))}
      </nav>
      <form action={`/${lang}/katalog`} className="flex flex-wrap items-end gap-3">
        {saringan.q && <input type="hidden" name="q" value={saringan.q} />}
        {saringan.genre && <input type="hidden" name="genre" value={saringan.genre} />}
        <label className="min-w-56 flex-1 space-y-1 text-sm font-bold">
          <span>{t(lang, 'katalog.pengarang')}</span>
          <select name="pengarang" defaultValue={saringan.pengarang ?? ''} className="p-input">
            <option value="">{t(lang, 'katalog.semuaPengarang')}</option>
            {daftarPengarang(buku, saringan.genre).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
          <input type="checkbox" name="tersedia" value="1" defaultChecked={saringan.tersedia} className="size-5" />
          {t(lang, 'katalog.hanyaTersedia')}
        </label>
        <button type="submit" className="p-tombol">{t(lang, 'katalog.terapkan')}</button>
      </form>
      {hasil.length === 0 ? (
        <div className="p-kartu space-y-3 p-6 text-center">
          <p>{t(lang, 'katalog.kosong')}</p>
          <Link href={`/${lang}/katalog`} className="p-tombol">{t(lang, 'katalog.reset')}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {hasil.map(b => <KartuBuku key={b.id} lang={lang} buku={b} />)}
        </div>
      )}
    </>
  );
}
