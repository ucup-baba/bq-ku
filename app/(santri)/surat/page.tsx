import { Scroll } from '@phosphor-icons/react/dist/ssr';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { IkonUbin } from '@/components/ui/IkonUbin';

export const metadata = { title: 'Surat Santri — BQ-ku' };

const RENCANA = [
  'Surat pernyataan anak asuh',
  'Undangan pertemuan wali',
  'Surat kedisiplinan',
  'Surat pelepasan santri',
  'Laporan tiap semester',
];

/** Sementara: penanda tempat fitur Surat Santri yang sedang dirancang. */
export default function SuratSantriPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <KepalaHalaman judul="Surat Santri" sub="Buat surat untuk satu santri atau satu jenjang sekaligus." subTampilDiHp />
      <Kartu className="flex flex-col items-center gap-4 px-6 py-10 text-center">
        <IkonUbin ikon={Scroll} warna="ungu" ukuran="lg" doodle="bintang" />
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold text-bq-tinta">Segera hadir</h2>
          <p className="mx-auto max-w-sm text-sm text-bq-redup">Fitur ini sedang disiapkan. Nanti surat bisa dibuat per santri atau per jenjang, lalu diunduh atau dicetak.</p>
        </div>
        <ul className="flex flex-wrap justify-center gap-2">
          {RENCANA.map(r => (
            <li key={r} className="rounded-full border border-bq-garis px-3 py-1 text-xs font-bold text-bq-redup">{r}</li>
          ))}
        </ul>
      </Kartu>
    </div>
  );
}
