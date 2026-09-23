import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getSantriById } from '@/lib/db/santri-repo';
import { createServerSupabase } from '@/lib/supabase/server';
import { DetailSantri } from '@/components/profile/DetailSantri';

export default async function SantriDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const santri = await getSantriById(await createServerSupabase(), id);
  if (!santri) notFound();

  return (
    <Suspense>
      <DetailSantri santri={santri} />
    </Suspense>
  );
}
