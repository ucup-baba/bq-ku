'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PushPin, PushPinSlash } from '@phosphor-icons/react';
import { useAuth } from '@/components/auth/AuthProvider';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { menuRail, itemAktif } from '@/lib/nav/menu';
import { bacaPin, simpanPin, storageAman } from '@/lib/ui/pin-rail';
import { ROOM_HOME, ROOM_AKUN, ROOM_LABEL, type Room } from '@/lib/auth/rooms';
import { RUANG_TAMPILAN } from './ikon-ruang';
import { useNotifikasi } from '@/components/notifikasi/NotifikasiProvider';
import { IKON_MENU } from './ikon-menu';
import { RoomSwitchButton } from './RoomSwitchButton';
import { labelLencana } from '@/lib/notifikasi/jenis';

/**
 * Rail 76px yang melebar ke 240px saat hover/fokus (melayang di atas konten).
 * Pin menahan lebar 240px dan (mulai lg) menggeser konten; status pin diingat di perangkat.
 */
export function RailSidebar({ room }: { room: Room }) {
  const pathname = usePathname();
  const { user, rooms, canManageUsers } = useAuth();
  const [pin, setPin] = useState(false);
  const { total } = useNotifikasi();

  useEffect(() => { setPin(bacaPin(storageAman())); }, []);
  const ubahPin = () => {
    setPin(p => { const baru = !p; simpanPin(storageAman(), baru); return baru; });
  };

  const items = menuRail(room, { canManageUsers, jumlahRuang: rooms.length });
  const tampilLabel = pin ? 'opacity-100' : 'opacity-0 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100';
  const kelasLabel = `min-w-0 truncate text-sm font-semibold transition-opacity duration-150 ${tampilLabel}`;
  const inisial = user?.nama?.trim().charAt(0).toUpperCase() || 'A';
  const kelasBaris = 'goyang-saat-hover flex h-12 items-center gap-3 rounded-2xl px-1.5 transition-colors';

  return (
    <>
      <div aria-hidden="true" className={`hidden shrink-0 transition-[width] duration-200 ease-out md:block ${pin ? 'w-[76px] lg:w-60' : 'w-[76px]'}`} />
      <nav aria-label="Navigasi utama"
        className={`group/rail fixed inset-y-0 left-0 z-30 hidden flex-col gap-1 overflow-hidden border-r border-bq-garis bg-bq-surface px-3 py-4 transition-[width,box-shadow] duration-200 ease-out md:flex ${
          pin ? 'w-60' : 'w-[76px] hover:w-60 hover:shadow-angkat focus-within:w-60 focus-within:shadow-angkat'}`}>
        <Link href={ROOM_HOME[room]} className={`${kelasBaris} mb-3`}>
          <IkonUbin ikon={RUANG_TAMPILAN[room].ikon} warna={RUANG_TAMPILAN[room].warna} doodle="bintang" />
          <span className={`${kelasLabel} font-extrabold text-bq-tinta`}>{ROOM_LABEL[room]}</span>
        </Link>

        {items.map(item => {
          const aktif = itemAktif(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} aria-current={aktif ? 'page' : undefined}
              className={`${kelasBaris} ${aktif ? 'bg-emerald-50 text-bq-tinta dark:bg-emerald-950/40' : 'text-bq-redup hover:bg-slate-100 hover:text-bq-tinta dark:hover:bg-slate-800/60'}`}>
              <IkonUbin ikon={IKON_MENU[item.ikon]} warna={item.warna} />
              <span className={kelasLabel}>{item.label}</span>
            </Link>
          );
        })}

        <div className="mt-auto flex flex-col gap-1 border-t border-bq-garis pt-3">
          <RoomSwitchButton variant="rail" labelClassName={kelasLabel} />
          <Link href={ROOM_AKUN[room]} aria-label={total > 0 ? `Akun, ${total} notifikasi` : 'Akun'}
            aria-current={pathname === ROOM_AKUN[room] ? 'page' : undefined}
            className={`${kelasBaris} ${pathname === ROOM_AKUN[room] ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'}`}>
            <span aria-hidden="true" className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0E9F54] to-[#0B5FA5] font-extrabold text-white">
              {inisial}
              {total > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold leading-none text-white ring-2 ring-bq-surface">
                  {labelLencana(total)}
                </span>
              )}
            </span>
            <span className={`${kelasLabel} flex flex-col`}>
              <span className="truncate text-bq-tinta">{user?.nama}</span>
              <span className="truncate text-xs font-normal text-bq-redup">{total > 0 ? `${total} notifikasi` : 'Akun & pengaturan'}</span>
            </span>
          </Link>
          <button type="button" onClick={ubahPin} aria-pressed={pin} aria-label={pin ? 'Lepas sematan menu' : 'Sematkan menu'}
            className={`${kelasBaris} h-11 text-bq-redup hover:bg-slate-100 hover:text-bq-tinta dark:hover:bg-slate-800/60`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center">
              {pin ? <PushPinSlash size={20} weight="bold" aria-hidden="true" /> : <PushPin size={20} weight="bold" aria-hidden="true" />}
            </span>
            <span className={kelasLabel}>{pin ? 'Lepas sematan' : 'Sematkan menu'}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
