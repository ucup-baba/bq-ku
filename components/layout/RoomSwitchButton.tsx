'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowsLeftRight } from '@phosphor-icons/react';
import { useAuth } from '@/components/auth/AuthProvider';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { ROOM_HOME, ROOM_LABEL, roomOfPath, type Room } from '@/lib/auth/rooms';

export function RoomSwitchButton({ variant, labelClassName }: { variant: 'nav' | 'rail'; labelClassName?: string }) {
  const { rooms } = useAuth();
  const pathname = usePathname();
  if (rooms.length < 2) return null;

  const current: Room = roomOfPath(pathname);
  const target: Room = current === 'santri' ? 'donatur' : 'santri';
  const label = ROOM_LABEL[target];

  if (variant === 'nav') {
    return (
      <Link href={ROOM_HOME[target]} aria-label={`Pindah ke ${label}`}
        className="tekan flex min-w-[56px] flex-col items-center gap-1 py-1.5 text-bq-redup hover:text-bq-tinta">
        <ArrowsLeftRight size={22} weight="bold" aria-hidden="true" />
        <span className="text-xs font-bold">Pindah</span>
      </Link>
    );
  }
  return (
    <Link href={ROOM_HOME[target]}
      className="goyang-saat-hover flex h-12 items-center gap-3 rounded-2xl px-1.5 text-bq-redup hover:bg-slate-100 hover:text-bq-tinta dark:hover:bg-slate-800/60">
      <IkonUbin ikon={ArrowsLeftRight} warna="ungu" />
      <span className={labelClassName}>Pindah ke {label}</span>
    </Link>
  );
}
