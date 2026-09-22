import { Rekap } from '@/components/donatur/Rekap';

export const metadata = { title: 'Rekap Donasi — BQ-ku' };

export default function RekapPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Rekap Donasi</h1>
        <p className="text-sm text-slate-500">Total donasi uang per periode dan daftar donasi barang.</p>
      </header>
      <Rekap />
    </div>
  );
}
