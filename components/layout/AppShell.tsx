'use client';
import React from 'react';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { AuthProvider } from '@/components/auth/AuthProvider';
import type { SessionUser, PendingUser } from '@/lib/auth/session';
import { AkunBelumAktif } from '@/components/auth/AkunBelumAktif';
import { useRouter } from 'next/navigation';

export function AppShell({ user, pending, children }: { user: SessionUser | null; pending: PendingUser | null; children: React.ReactNode }) {
  const router = useRouter();
  if (!user && pending) {
    const logout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); router.refresh(); };
    return <AuthProvider user={null}><AkunBelumAktif email={pending.email} onLogout={logout} /></AuthProvider>;
  }
  if (!user) {
    // Halaman publik (login, reset, upload-mandiri): tanpa navigasi panitia
    return <AuthProvider user={null}><div className="min-h-screen bg-slate-50 dark:bg-slate-950">{children}</div></AuthProvider>;
  }
  return (
    <AuthProvider user={user}>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        <DesktopSidebar />
        <main className="flex-1 min-w-0 pb-28 md:pb-12 pt-4 md:pt-8 px-4 sm:px-8 max-w-7xl mx-auto w-full">{children}</main>
        <MobileBottomNav />
      </div>
    </AuthProvider>
  );
}
