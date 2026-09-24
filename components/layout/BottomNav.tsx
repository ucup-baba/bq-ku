'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon } from '@phosphor-icons/react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTheme } from '@/components/theme/ThemeProvider';
import { slotHp, itemAktif, sembunyikanNavHp, type SlotHp } from '@/lib/nav/menu';
import type { Room } from '@/lib/auth/rooms';
import { IKON_MENU } from './ikon-menu';
import { useNotifikasi } from '@/components/notifikasi/NotifikasiProvider';
import { ROOM_AKUN } from '@/lib/auth/rooms';
import { labelLencana } from '@/lib/notifikasi/jenis';

/** Titik tengah slot ke-i dari n slot, dalam persen lebar bar. */
export function posisiSlot(i: number, n: number): number {
  return ((i + 0.5) / n) * 100;
}

/** Indeks slot (tautan non-utama, atau Akun di halaman akun) yang aktif untuk path ini, atau -1. */
export function slotAktif(slot: SlotHp[], pathname: string, hrefAkun?: string): number {
  return slot.findIndex(s => (s.jenis === 'tautan' && !s.utama && itemAktif(pathname, s.item.href))
    || (s.jenis === 'akun' && pathname === hrefAkun));
}

const kelasIkon = 'tekan flex h-12 w-12 items-center justify-center rounded-full text-white/65 transition-[color,opacity] duration-200 hover:text-white';

/**
 * Bottom nav HP bergaya takik: bar gelap tanpa label; item aktif naik ke lingkaran limau
 * dengan takik di bar yang bergeser mulus; tombol utama (+) lingkaran tersendiri di tengah.
 */
export function BottomNav({ room }: { room: Room }) {
  const pathname = usePathname();
  const { user, rooms, canManageUsers } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { total } = useNotifikasi();
  if (sembunyikanNavHp(pathname)) return null;

  const hrefAkun = ROOM_AKUN[room];
  const slot = slotHp(room, { canManageUsers, jumlahRuang: rooms.length });
  const n = slot.length;
  const aktif = slotAktif(slot, pathname, hrefAkun);
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
    if (s.jenis === 'tema') {
      const gelap = theme === 'dark';
      return (
        <button type="button" onClick={toggleTheme} aria-label={gelap ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
          title={gelap ? 'Mode terang' : 'Mode gelap'} className={kelasIkon}>
          {gelap ? <Sun size={24} weight="bold" aria-hidden="true" /> : <Moon size={24} weight="bold" aria-hidden="true" />}
        </button>
      );
    }
    if (s.jenis === 'akun') {
      const aktifIni = i === aktif;
      const label = total > 0 ? `Akun, ${total} notifikasi` : 'Akun';
      return (
        <Link href={hrefAkun} aria-label={label} title={label} aria-current={aktifIni ? 'page' : undefined}
          className={`${kelasIkon} relative ${aktifIni ? 'opacity-0' : ''}`}>
          <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-xs font-extrabold text-white">{inisial}</span>
          {total > 0 && (
            <span aria-hidden="true" className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold leading-none text-white ring-2 ring-[#152A26] dark:ring-[#0B1513]">
              {labelLencana(total)}
            </span>
          )}
        </Link>
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
      <nav aria-label="Navigasi bawah" style={gaya}
        className="nav-takik fixed inset-x-3 bottom-3 z-40 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="relative h-16">
          <div aria-hidden="true" className="bar-takik absolute inset-0 rounded-[26px] bg-[#152A26] shadow-angkat dark:bg-[#0B1513] dark:ring-1 dark:ring-white/10" />
          {/* Lingkaran item aktif (mengikuti --takik-x) */}
          <span aria-hidden="true"
            className={`gelembung-takik absolute top-0 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#A3E635] text-[#152A26] shadow-[0_8px_18px_-6px_rgb(163_230_53/0.8)] ${aktif >= 0 ? 'opacity-100' : 'scale-50 opacity-0'}`}>
            {IkonAktif && <IkonAktif size={24} weight="fill" />}
            {itemAktifSekarang?.jenis === 'akun' && <span className="text-sm font-extrabold">{inisial}</span>}
          </span>
          <ul className="relative grid h-full items-center" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {slot.map((s, i) => <li key={i} className="relative flex h-full items-center justify-center">{render(s, i)}</li>)}
          </ul>
        </div>
      </nav>
  );
}
