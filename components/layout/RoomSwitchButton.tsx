'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowsLeftRight, HandHeart, Users } from '@phosphor-icons/react';
import { useAuth } from '@/components/auth/AuthProvider';
import { ROOM_HOME, ROOM_LABEL, roomOfPath, type Room } from '@/lib/auth/rooms';

export function RoomSwitchButton({ variant }: { variant: 'nav' | 'sidebar' }) {
  const { rooms } = useAuth();
  const pathname = usePathname();
  if (rooms.length < 2) return null;

  const current: Room = roomOfPath(pathname);
  const target: Room = current === 'santri' ? 'donatur' : 'santri';
  const Icon = target === 'donatur' ? HandHeart : Users;
  const label = ROOM_LABEL[target];

  if (variant === 'nav') {
    return (
      <Link
        href={ROOM_HOME[target]}
        aria-label={`Pindah ke ${label}`}
        className="flex flex-col items-center gap-1 p-1.5 min-w-[44px] text-slate-500 dark:text-slate-400 hover:text-teal-600"
      >
        <Icon size={22} weight="duotone" />
        <span className="text-[10px] font-bold">Pindah</span>
      </Link>
    );
  }
  return (
    <Link
      href={ROOM_HOME[target]}
      aria-label={`Pindah ke ${label}`}
      className="flex items-center gap-2 h-11 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <ArrowsLeftRight size={18} weight="bold" /> {label}
    </Link>
  );
}
