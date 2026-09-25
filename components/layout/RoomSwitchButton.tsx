'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { ROOM_HOME, ROOM_LABEL, roomOfPath } from '@/lib/auth/rooms';
import { RUANG_TAMPILAN } from './ikon-ruang';

/** Rail: satu tombol "Pindah ke …" untuk setiap ruangan lain yang dimiliki pengguna. */
export function RoomSwitchButton({ labelClassName }: { variant: 'rail'; labelClassName?: string }) {
  const { rooms } = useAuth();
  const pathname = usePathname();
  const current = roomOfPath(pathname);
  const lain = rooms.filter(r => r !== current);
  if (lain.length === 0) return null;
  return (
    <>
      {lain.map(r => (
        <Link key={r} href={ROOM_HOME[r]}
          className="goyang-saat-hover flex h-12 items-center gap-3 rounded-2xl px-1.5 text-bq-redup hover:bg-slate-100 hover:text-bq-tinta dark:hover:bg-slate-800/60">
          <IkonUbin ikon={RUANG_TAMPILAN[r].ikon} warna={RUANG_TAMPILAN[r].warna} />
          <span className={labelClassName}>Pindah ke {ROOM_LABEL[r]}</span>
        </Link>
      ))}
    </>
  );
}
