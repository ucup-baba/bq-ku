import { getSessionUser } from '@/lib/auth/session';
import { BerandaLembaga } from '@/components/lembaga/BerandaLembaga';

export const metadata = { title: 'Ruang Lembaga — BQ-ku' };

export default async function LembagaHomePage() {
  const user = await getSessionUser();
  return <BerandaLembaga namaDepan={user?.nama?.trim().split(/\s+/)[0]} />;
}
