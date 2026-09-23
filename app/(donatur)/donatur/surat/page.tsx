import { DaftarSurat } from '@/components/donatur/DaftarSurat';

export const metadata = { title: 'Daftar Surat — BQ-ku' };

export default function DaftarSuratPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Daftar Surat</h1>
        <p className="text-sm text-slate-500">Riwayat surat ucapan terima kasih yang sudah dibuat.</p>
      </header>
      <DaftarSurat />
    </div>
  );
}
