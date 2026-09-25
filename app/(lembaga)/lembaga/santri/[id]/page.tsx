import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { requireRoom } from '@/lib/auth/session';
import { getSantriLembaga } from '@/lib/db/lembaga-repo';
import { DetailSantri } from '@/components/profile/DetailSantri';

export const metadata = { title: 'Detail Santri — Ruang Lembaga' };

export default async function DetailSantriLembagaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRoom('lembaga');
  const santri = await getSantriLembaga(supabase, id);
  if (!santri) notFound();
  return <Suspense><DetailSantri santri={santri} /></Suspense>;
}
