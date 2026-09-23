import { listSantri } from '@/lib/db/santri-repo';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/session';
import { ringkasanSantri, perluDilengkapi } from '@/lib/santri/ringkasan';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { HeroSantri } from '@/components/santri/beranda/HeroSantri';
import { CarouselAngkaSantri } from '@/components/santri/beranda/CarouselAngkaSantri';
import { PerluDilengkapi } from '@/components/santri/beranda/PerluDilengkapi';
import { SantriTerbaru } from '@/components/santri/beranda/SantriTerbaru';

export const revalidate = 0;

/**
 * Beranda Ruang Santri. Urutan HP: hero → angka → perlu dilengkapi → terbaru.
 * Desktop: hero | perlu dilengkapi; angka; terbaru.
 */
export default async function HomePage() {
  const [santriList, user] = await Promise.all([listSantri(await createServerSupabase()), getSessionUser()]);
  const ringkasan = ringkasanSantri(santriList);
  const namaDepan = user?.nama?.trim().split(/\s+/)[0];

  return (
    <div className="space-y-4 md:space-y-6">
      <KepalaHalaman
        judul="Ruang Santri"
        sub={namaDepan ? `Assalamu'alaikum, ${namaDepan}` : "Assalamu'alaikum"}
        subTampilDiHp
      />
      <div className="bergilir grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
        <HeroSantri className="order-1 md:col-span-7" ringkasan={ringkasan} />
        <CarouselAngkaSantri className="order-2 md:order-3 md:col-span-12" ringkasan={ringkasan} />
        <PerluDilengkapi className="order-3 md:order-2 md:col-span-5" santri={perluDilengkapi(santriList)} />
        <SantriTerbaru className="order-4 md:col-span-12" santri={santriList} />
      </div>
    </div>
  );
}
