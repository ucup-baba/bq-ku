'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PencilSimple } from '@phosphor-icons/react';
import type { Santri } from '@/lib/db/santri-repo';
import { statusBerkas } from '@/lib/santri/ringkasan';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { ChipPilihan } from '@/components/ui/ChipPilihan';
import { TautanUtama } from '@/components/ui/Tombol';
import { SantriPosterCv } from './SantriPosterCv';
import { TabBerkas } from './TabBerkas';
import { MenuSantri } from './MenuSantri';

type Tab = 'cv' | 'berkas';

export function DetailSantri({ santri }: { santri: Santri }) {
  const router = useRouter();
  const pathname = usePathname();
  const tab: Tab = useSearchParams().get('tab') === 'berkas' ? 'berkas' : 'cv';
  const st = statusBerkas(santri.documents);
  const pilih = (t: Tab) => router.replace(pathname + (t === 'berkas' ? '?tab=berkas' : ''), { scroll: false });

  return (
    <div className="space-y-4">
      <div className="print:hidden space-y-3">
        <KepalaHalaman judul={santri.namaLengkap} kembali={{ href: '/santri', label: 'Kembali ke direktori' }}
          aksi={<>
            <TautanUtama href={`/santri/${santri.id}/edit`} ikon={PencilSimple}>Edit</TautanUtama>
            <MenuSantri nama={santri.namaLengkap} />
          </>} />
        <ChipPilihan<Tab> label="Bagian profil" nilai={tab} onPilih={pilih}
          opsi={[{ value: 'cv', label: 'CV' }, { value: 'berkas', label: `Berkas ${st.ada}/${st.total}` }]} />
      </div>
      <div key={tab} className="animate-halaman">
        {tab === 'cv' ? <SantriPosterCv santri={santri as never} /> : <TabBerkas santri={santri} />}
      </div>
    </div>
  );
}
