import React from 'react';
import { listSantri } from '@/lib/db/santri-repo';
import { SantriDirectory } from '@/components/directory/SantriDirectory';

export const revalidate = 0;

export default async function SantriPage() {
  const santriList = await listSantri();

  return (
    <div className="py-2">
      <SantriDirectory initialSantriList={santriList} />
    </div>
  );
}
