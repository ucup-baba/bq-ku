import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { cariTautan, masihBerlaku, batasHabis, terkunciPin, sesiValid, namaCookie } from '@/lib/bagikan/tautan-publik';
import { KerangkaBagikan, TautanTidakBerlaku, DaftarBerkasPublik } from '@/components/bagikan/TampilanBagikan';
import { BukaOtomatis, FormPin } from '@/components/bagikan/GerbangBagikan';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Berkas dari Baitul Qowwam',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

/** Halaman publik penerima tautan bagikan (tanpa login). */
export default async function HalamanBagikan({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await cariTautan(token);
  if (!t || !masihBerlaku(t)) return <TautanTidakBerlaku />;
  if (sesiValid(t, (await cookies()).get(namaCookie(t.id))?.value)) return <DaftarBerkasPublik token={token} t={t} />;
  if (batasHabis(t)) return <TautanTidakBerlaku />;
  return (
    <KerangkaBagikan>
      {t.pinHash ? <FormPin token={token} terkunciSampai={terkunciPin(t) ? t.pinTerkunciSampai : null} /> : <BukaOtomatis token={token} />}
    </KerangkaBagikan>
  );
}
