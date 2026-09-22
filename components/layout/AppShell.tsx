'use client';
import React from 'react';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { DonaturSidebar } from './DonaturSidebar';
import { DonaturBottomNav } from './DonaturBottomNav';
import { useAuth } from '@/components/auth/AuthProvider';
import type { Room } from '@/lib/auth/rooms';

export function AppShell({ room, children }: { room: Room; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950">{children}</div>;
  const Sidebar = room === 'donatur' ? DonaturSidebar : DesktopSidebar;
  const BottomNav = room === 'donatur' ? DonaturBottomNav : MobileBottomNav;
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-28 md:pb-12 pt-4 md:pt-8 px-4 sm:px-8 max-w-7xl mx-auto w-full">{children}</main>
      <BottomNav />
    </div>
  );
}
