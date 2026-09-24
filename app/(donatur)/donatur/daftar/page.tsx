import { Suspense } from 'react';
import { DaftarDonatur } from '@/components/donatur/DaftarDonatur';

export const metadata = { title: 'Daftar Donatur — BQ-ku' };

export default function DaftarDonaturPage() {
  return (
    <Suspense>
      <DaftarDonatur />
    </Suspense>
  );
}
