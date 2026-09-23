import { RingkasanDonatur } from '@/components/donatur/RingkasanDonatur';

export const metadata = { title: 'Ruang Donatur — BQ-ku' };

export default function DonaturHomePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Ruang Donatur</h1>
        <p className="text-sm text-slate-500">Ringkasan donasi dan surat ucapan terima kasih.</p>
      </header>
      <RingkasanDonatur />
    </div>
  );
}
