import React from 'react';
import { notFound } from 'next/navigation';
import { getSantriById } from '@/lib/db/santri-repo';
import { SantriPosterCv } from '@/components/profile/SantriPosterCv';

export default async function SantriDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const santri = getSantriById(id);

  if (!santri) {
    notFound();
  }

  return (
    <div className="py-6 px-4 sm:px-6">
      <SantriPosterCv santri={santri} />
    </div>
  );
}
