import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { getDonatur } from '@/lib/db/donatur-repo';
import { DetailDonatur } from '@/components/donatur/DetailDonatur';

export const metadata = { title: 'Detail Donatur — BQ-ku' };

export default async function DetailDonaturPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const donatur = await getDonatur(supabase, id);

  if (!donatur) {
    notFound();
  }

  return <DetailDonatur donatur={donatur} />;
}
