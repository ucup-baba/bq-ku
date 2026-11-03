import { Plus } from '@phosphor-icons/react/dist/ssr';
import { getSessionUser } from '@/lib/auth/session';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { TautanUtama } from '@/components/ui/Tombol';
import { RingkasanDonatur } from '@/components/donatur/RingkasanDonatur';

export const metadata = { title: 'Ruang Donatur — BQ-ku' };

export default async function DonaturHomePage() {
  const user = await getSessionUser();
  const namaDepan = user?.nama?.trim().split(/\s+/)[0];
  return (
    <div className="space-y-4 md:space-y-6">
      <KepalaHalaman
        judul="Ruang Donatur"
        sub={namaDepan ? `Assalamu'alaikum, ${namaDepan}` : "Assalamu'alaikum"}
        subTampilDiHp
        aksi={<TautanUtama href="/donatur/surat/baru" ikon={Plus} className="hidden md:inline-flex">Buat Surat</TautanUtama>}
      />
      <RingkasanDonatur />
    </div>
  );
}
