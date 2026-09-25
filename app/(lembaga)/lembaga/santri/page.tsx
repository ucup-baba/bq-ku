import { requireRoom } from '@/lib/auth/session';
import { listSantriLembaga } from '@/lib/db/lembaga-repo';
import { SantriDirectory } from '@/components/directory/SantriDirectory';

export const metadata = { title: 'Santri — Ruang Lembaga' };
export const revalidate = 0;

export default async function SantriLembagaPage() {
  const { supabase } = await requireRoom('lembaga');
  return <SantriDirectory initialSantriList={await listSantriLembaga(supabase)} />;
}
