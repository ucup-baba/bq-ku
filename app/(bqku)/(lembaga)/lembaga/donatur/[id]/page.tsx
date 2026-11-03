import { notFound } from 'next/navigation';
import { requireRoom } from '@/lib/auth/session';
import { getDonatur } from '@/lib/db/donatur-repo';
import { DetailDonatur } from '@/components/donatur/DetailDonatur';

export const metadata = { title: 'Detail Donatur — Ruang Lembaga' };

export default async function DetailDonaturLembagaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRoom('lembaga');
  const donatur = await getDonatur(supabase, id);
  if (!donatur) notFound();
  return <DetailDonatur donatur={donatur} mode="lembaga" />;
}
