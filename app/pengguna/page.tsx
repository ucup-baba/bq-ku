import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { canManageUsers } from '@/lib/auth/roles';
import { PenggunaTable } from '@/components/pengguna/PenggunaTable';

export const metadata = { title: 'Akun & Pengguna — BQ-ku' };
export default async function PenggunaPage() {
  const user = await getSessionUser();
  if (!user || !canManageUsers(user.role)) redirect('/');
  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-extrabold">Akun &amp; Pengguna</h1>
        <p className="text-sm text-slate-500">Undang panitia, atur peran, blokir, atau hapus akun.</p></header>
      <PenggunaTable currentUserId={user.id} />
    </div>
  );
}
