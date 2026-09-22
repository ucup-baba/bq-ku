import { DaftarDonatur } from '@/components/donatur/DaftarDonatur';

export const metadata = { title: 'Daftar Donatur — BQ-ku' };

export default function DaftarDonaturPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Daftar Donatur</h1>
        <p className="text-sm text-slate-500">Cari donatur, lihat riwayat donasi, atau tambahkan donatur baru.</p>
      </header>
      <DaftarDonatur />
    </div>
  );
}
