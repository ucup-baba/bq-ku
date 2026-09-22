import { FormSurat } from '@/components/donatur/FormSurat';

export const metadata = { title: 'Buat Surat — BQ-ku' };

export default function BuatSuratPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Buat Surat Ucapan Terima Kasih</h1>
        <p className="text-sm text-slate-500">Isi data donatur dan donasi, surat akan dibuat otomatis.</p>
      </header>
      <FormSurat />
    </div>
  );
}
