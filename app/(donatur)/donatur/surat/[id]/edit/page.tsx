import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSurat } from '@/lib/db/donatur-repo';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { FormSurat } from '@/components/donatur/FormSurat';

export const metadata = { title: 'Edit Surat — BQ-ku' };

export default async function EditSuratPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const surat = await getSurat(await createServerSupabase(), id);
  if (!surat) notFound();
  // Surat yang sudah terkirim terkunci: donatur sudah memegang versi itu.
  if (surat.terkirimWa) redirect(`/donatur/surat/${id}`);

  return (
    <div className="space-y-3 md:space-y-6">
      <KepalaHalaman judul={`Edit surat ${surat.nomorSurat}`} sub="Perbaiki isian lalu simpan; gambar surat dibuat ulang otomatis."
        kembali={{ href: `/donatur/surat/${id}`, label: 'Kembali ke detail surat' }} />
      <Suspense>
        <FormSurat awal={surat} />
      </Suspense>
    </div>
  );
}
