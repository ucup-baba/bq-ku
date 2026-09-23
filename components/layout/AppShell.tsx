'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import { RailSidebar } from './RailSidebar';
import { BottomNav } from './BottomNav';
import { useAuth } from '@/components/auth/AuthProvider';
import type { Room } from '@/lib/auth/rooms';

export function AppShell({ room, children }: { room: Room; children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  if (!user) return <div className="min-h-screen bg-bq-bg">{children}</div>;
  return (
    <div className="flex min-h-screen bg-bq-bg text-bq-tinta transition-colors">
      <RailSidebar room={room} />
      <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 pb-28 pt-4 sm:px-8 md:pb-12 md:pt-8">
        {/* key per path → animasi masuk setiap navigasi (template.tsx di route group tidak di-mount ulang) */}
        <div key={pathname} className="animate-halaman">{children}</div>
      </main>
      <BottomNav room={room} />
    </div>
  );
}
