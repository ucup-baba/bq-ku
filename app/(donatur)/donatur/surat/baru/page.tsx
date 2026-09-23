import { Suspense } from 'react';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { FormSurat } from '@/components/donatur/FormSurat';

export const metadata = { title: 'Buat Surat — BQ-ku' };

export default function BuatSuratPage() {
  return (
    <div className="space-y-3 md:space-y-6">
      <KepalaHalaman judul="Buat Surat" sub="Isi data donatur dan donasi; surat dibuat otomatis."
        kembali={{ href: '/donatur', label: 'Kembali ke beranda' }} />
      <Suspense>
        <FormSurat />
      </Suspense>
    </div>
  );
}
