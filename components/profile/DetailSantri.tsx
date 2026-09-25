'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PencilSimple } from '@phosphor-icons/react';
import type { Santri } from '@/lib/db/santri-repo';
import { statusBerkas } from '@/lib/santri/ringkasan';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { ChipPilihan } from '@/components/ui/ChipPilihan';
import { TautanUtama } from '@/components/ui/Tombol';
import { useMedia } from '@/components/ui/useMedia';
import { SantriPosterCv } from './SantriPosterCv';
import { TabBerkas } from './TabBerkas';
import { MenuSantri } from './MenuSantri';
import { useModeRuang } from '@/components/ruang/ModeRuang';

type Tab = 'cv' | 'berkas';

export function DetailSantri({ santri }: { santri: Santri }) {
  const router = useRouter();
  const mode = useModeRuang();
  const pathname = usePathname();
  const tab: Tab = useSearchParams().get('tab') === 'berkas' ? 'berkas' : 'cv';
  const st = statusBerkas(santri.documents);
  // Desktop: CV & Berkas berdampingan tanpa tab. HP: bertab.
  const desktop = useMedia('(min-width: 1024px)');
  const pilih = (t: Tab) => router.replace(pathname + (t === 'berkas' ? '?tab=berkas' : ''), { scroll: false });

  return (
    <div className="space-y-4">
      <div className="print:hidden space-y-3">
        <KepalaHalaman judul={santri.namaLengkap} kembali={{ href: mode.rute.santriDaftar, label: 'Kembali ke direktori' }}
          aksi={<>
            {!mode.bacaSaja && <TautanUtama href={`/santri/${santri.id}/edit`} ikon={PencilSimple}>Edit</TautanUtama>}
            <MenuSantri nama={santri.namaLengkap} />
          </>} />
        {!desktop && (
          <ChipPilihan<Tab> label="Bagian profil" nilai={tab} onPilih={pilih}
            opsi={[{ value: 'cv', label: 'CV' }, { value: 'berkas', label: `Berkas ${st.ada}/${st.total}` }]} />
        )}
      </div>
      {desktop ? (
        <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-6">
          <SantriPosterCv santri={santri as never} />
          <aside className="sticky top-6 space-y-3 print:hidden" aria-label="Kelengkapan berkas">
            <TabBerkas santri={santri} />
          </aside>
        </div>
      ) : (
        <div key={tab} className="animate-halaman">
          {tab === 'cv' ? <SantriPosterCv santri={santri as never} /> : <TabBerkas santri={santri} />}
        </div>
      )}
    </div>
  );
}
