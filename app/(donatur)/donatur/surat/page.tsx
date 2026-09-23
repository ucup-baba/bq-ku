import { Suspense } from 'react';
import { DaftarSurat } from '@/components/donatur/DaftarSurat';

export const metadata = { title: 'Daftar Surat — BQ-ku' };

export default function DaftarSuratPage() {
  return (
    <Suspense>
      <DaftarSurat />
    </Suspense>
  );
}
