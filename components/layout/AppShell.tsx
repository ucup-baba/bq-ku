'use client';
import React from 'react';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { AuthProvider } from '@/components/auth/AuthProvider';
import type { SessionUser } from '@/lib/auth/session';

export function AppShell({ user, children }: { user: SessionUser | null; children: React.ReactNode }) {
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
