import { Suspense } from 'react';
import { DaftarSurat } from '@/components/donatur/DaftarSurat';

export const metadata = { title: 'Surat — Ruang Lembaga' };

export default function SuratLembagaPage() {
  return <Suspense><DaftarSurat /></Suspense>;
}
