import { Suspense } from 'react';
import { DaftarDonatur } from '@/components/donatur/DaftarDonatur';

export const metadata = { title: 'Donatur — Ruang Lembaga' };

export default function DonaturLembagaPage() {
  return <Suspense><DaftarDonatur /></Suspense>;
}
