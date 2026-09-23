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

/** Titik tengah slot ke-i dari n slot, dalam persen lebar bar. */
export function posisiSlot(i: number, n: number): number {
  return ((i + 0.5) / n) * 100;
}

/** Indeks slot tautan (bukan tombol utama) yang aktif untuk path ini, atau -1. */
export function slotAktif(slot: SlotHp[], pathname: string): number {
  return slot.findIndex(s => s.jenis === 'tautan' && !s.utama && itemAktif(pathname, s.item.href));
}

const kelasIkon = 'tekan flex h-12 w-12 items-center justify-center rounded-full text-white/65 transition-[color,opacity] duration-200 hover:text-white';

/**
 * Bottom nav HP bergaya takik: bar gelap tanpa label; item aktif naik ke lingkaran limau
 * dengan takik di bar yang bergeser mulus; tombol utama (+) lingkaran tersendiri di tengah.
 */
export function BottomNav({ room }: { room: Room }) {
  const pathname = usePathname();
  const { user, rooms, canManageUsers } = useAuth();
  const [akunBuka, setAkunBuka] = useState(false);
  if (sembunyikanNavHp(pathname)) return null;

  const slot = slotHp(room, { canManageUsers, jumlahRuang: rooms.length });
  const n = slot.length;
  const aktif = slotAktif(slot, pathname);
  const iUtama = slot.findIndex(s => s.jenis === 'tautan' && s.utama);
  const inisial = user?.nama?.trim().charAt(0).toUpperCase() || 'A';
  const itemAktifSekarang = aktif >= 0 ? slot[aktif] : null;
  const IkonAktif = itemAktifSekarang?.jenis === 'tautan' ? IKON_MENU[itemAktifSekarang.item.ikon] : null;

  const gaya = {
    '--takik-x': `${posisiSlot(aktif >= 0 ? aktif : 0, n)}%`,
    '--takik-r': aktif >= 0 ? '31px' : '0px',
    '--fab-x': `${posisiSlot(iUtama, n)}%`,
  } as React.CSSProperties;

  const render = (s: SlotHp, i: number) => {
    if (s.jenis === 'pindah') return <RoomSwitchButton variant="ikon" className={kelasIkon} />;
    if (s.jenis === 'akun') {
      return (
        <button type="button" onClick={() => setAkunBuka(true)} aria-label="Menu akun" aria-expanded={akunBuka} className={kelasIkon}>
          <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-xs font-extrabold text-white">{inisial}</span>
        </button>
      );
    }
    const Ikon = IKON_MENU[s.item.ikon];
    if (s.utama) {
      return (
        <Link href={s.item.href} aria-label={s.item.label} title={s.item.label}
          className="tekan absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-[#0E9F54] to-[#0B5FA5] text-white shadow-[0_10px_20px_-8px_rgb(14_159_84/0.8)]">
          <Ikon size={28} weight="bold" aria-hidden="true" />
        </Link>
      );
    }
    const aktifIni = i === aktif;
    return (
      <Link href={s.item.href} aria-label={s.item.label} title={s.item.label} aria-current={aktifIni ? 'page' : undefined}
        className={`${kelasIkon} ${aktifIni ? 'opacity-0' : ''}`}>
        <Ikon size={24} weight="regular" aria-hidden="true" />
      </Link>
    );
  };

  return (
    <>
      <nav aria-label="Navigasi bawah" style={gaya}
        className="nav-takik fixed inset-x-3 bottom-3 z-40 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="relative h-16">
          <div aria-hidden="true" className="bar-takik absolute inset-0 rounded-[26px] bg-[#152A26] shadow-angkat dark:bg-[#0B1513] dark:ring-1 dark:ring-white/10" />
          {/* Lingkaran item aktif (mengikuti --takik-x) */}
          <span aria-hidden="true"
            className={`gelembung-takik absolute top-0 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#A3E635] text-[#152A26] shadow-[0_8px_18px_-6px_rgb(163_230_53/0.8)] ${aktif >= 0 ? 'opacity-100' : 'scale-50 opacity-0'}`}>
            {IkonAktif && <IkonAktif size={24} weight="fill" />}
          </span>
          <ul className="relative grid h-full items-center" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {slot.map((s, i) => <li key={i} className="relative flex h-full items-center justify-center">{render(s, i)}</li>)}
          </ul>
        </div>
      </nav>
      <AccountDrawer isOpen={akunBuka} onClose={() => setAkunBuka(false)} />
    </>
  );
}
