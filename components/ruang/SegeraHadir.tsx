import { Hourglass } from '@phosphor-icons/react/dist/ssr';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { IkonUbin } from '@/components/ui/IkonUbin';

export function SegeraHadir({ judul, sub }: { judul: string; sub: string }) {
  return (
    <div className="space-y-4">
      <KepalaHalaman judul={judul} sub={sub} subTampilDiHp />
      <Kartu className="flex flex-col items-center gap-3 p-8 text-center">
        <IkonUbin ikon={Hourglass} warna="ungu" ukuran="lg" doodle="lingkaran" />
        <p className="text-sm font-bold text-bq-tinta">Segera hadir</p>
        <p className="max-w-sm text-xs text-bq-redup">Bagian ini sedang disiapkan dan akan tersedia di pembaruan berikutnya.</p>
      </Kartu>
    </div>
  );
}
