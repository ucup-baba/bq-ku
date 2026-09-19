import React from 'react';
import { notFound } from 'next/navigation';
import { getSantriById } from '@/lib/db/santri-repo';
import { SantriForm } from '@/components/forms/SantriForm';

export default async function SantriEditPage({ params }: { params: { id: string } }) {
  const santri = getSantriById(params.id);

  if (!santri) {
    notFound();
  }

  return (
    <div className="py-6 px-4 sm:px-6">
      <SantriForm initialData={santri} isEditing={true} />
    </div>
  );
}
