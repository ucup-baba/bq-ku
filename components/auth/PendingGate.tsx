'use client';
import { useRouter } from 'next/navigation';
import { AkunBelumAktif } from './AkunBelumAktif';

export function PendingGate({ email }: { email: string }) {
  const router = useRouter();
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };
  return <AkunBelumAktif email={email} onLogout={logout} />;
}
