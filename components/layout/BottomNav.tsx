'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { slotHp, itemAktif, sembunyikanNavHp, type SlotHp } from '@/lib/nav/menu';
import type { Room } from '@/lib/auth/rooms';
import { IKON_MENU } from './ikon-menu';
import { RoomSwitchButton } from './RoomSwitchButton';
import { AccountDrawer } from './AccountDrawer';

export function BottomNav({ room }: { room: Room }) {
  const pathname = usePathname();
  const { user, rooms, canManageUsers } = useAuth();
  const [akunBuka, setAkunBuka] = useState(false);
  if (sembunyikanNavHp(pathname)) return null;

  const slot = slotHp(room, { canManageUsers, jumlahRuang: rooms.length });
  const inisial = user?.nama?.trim().charAt(0).toUpperCase() || 'A';

  const render = (s: SlotHp) => {
    if (s.jenis === 'pindah') return <RoomSwitchButton variant="nav" />;
    if (s.jenis === 'akun') {
      return (
        <button type="button" onClick={() => setAkunBuka(true)} aria-label="Menu akun" aria-expanded={akunBuka}
          className="tekan flex min-w-[56px] flex-col items-center gap-1 py-1.5 text-bq-redup hover:text-bq-tinta">
          <span aria-hidden="true" className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gradient-to-br from-[#0E9F54] to-[#0B5FA5] text-xs font-extrabold text-white">{inisial}</span>
          <span className="text-xs font-bold">Akun</span>
        </button>
      );
    }
    const Ikon = IKON_MENU[s.item.ikon];
    if (s.utama) {
      return (
        <Link href={s.item.href} aria-label={s.item.label} className="tekan -mt-6 flex flex-col items-center gap-1">
          <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0E9F54] to-[#0B5FA5] text-white shadow-[0_10px_20px_-8px_rgb(14_159_84/0.7)] ring-4 ring-bq-bg">
            <Ikon size={26} weight="bold" />
          </span>
          <span aria-hidden="true" className="text-xs font-extrabold text-bq-hijau">{s.item.labelPendek}</span>
        </Link>
      );
    }
    const aktif = itemAktif(pathname, s.item.href);
    return (
      <Link href={s.item.href} aria-current={aktif ? 'page' : undefined}
        className={`tekan relative flex min-w-[56px] flex-col items-center gap-1 py-1.5 transition-colors ${aktif ? 'text-bq-biru' : 'text-bq-redup hover:text-bq-tinta'}`}>
        <span aria-hidden="true" className={`absolute top-0 h-1 rounded-full bg-bq-biru transition-all duration-300 ${aktif ? 'w-5 opacity-100' : 'w-0 opacity-0'}`} />
        <Ikon size={22} weight={aktif ? 'fill' : 'regular'} aria-hidden="true" />
        <span className="text-xs font-bold">{s.item.labelPendek}</span>
      </Link>
    );
  };

  return (
    <>
      <nav aria-label="Navigasi bawah"
        className="fixed inset-x-3 bottom-3 z-40 rounded-3xl border border-bq-garis bg-bq-surface/95 pb-[env(safe-area-inset-bottom)] shadow-angkat backdrop-blur md:hidden">
        <ul className="flex items-end justify-around px-1 pb-1 pt-1.5">
          {slot.map((s, i) => <li key={i} className="flex flex-1 justify-center">{render(s)}</li>)}
        </ul>
      </nav>
      <AccountDrawer isOpen={akunBuka} onClose={() => setAkunBuka(false)} />
    </>
  );
}
