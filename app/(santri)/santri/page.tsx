import React from 'react';
import { listSantri } from '@/lib/db/santri-repo';
import { createServerSupabase } from '@/lib/supabase/server';
import { SantriDirectory } from '@/components/directory/SantriDirectory';

export const revalidate = 0;

export default async function SantriPage() {
  const santriList = await listSantri(await createServerSupabase());

  return <SantriDirectory initialSantriList={santriList} />;
}
