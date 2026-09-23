import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { canManageUsers } from '@/lib/auth/roles';
import { PenggunaTable } from '@/components/pengguna/PenggunaTable';

export const metadata = { title: 'Akun & Pengguna — BQ-ku' };
export default async function PenggunaPage() {
  const user = await getSessionUser();
  if (!user || !canManageUsers(user.roles)) redirect('/');
  return <PenggunaTable currentUserId={user.id} />;
}
