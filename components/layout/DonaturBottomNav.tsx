'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, HandHeart, Plus, ChartBar, UserCircle } from '@phosphor-icons/react';
import { useAuth } from '@/components/auth/AuthProvider';
import { AccountDrawer } from './AccountDrawer';
import { RoomSwitchButton } from './RoomSwitchButton';

export function DonaturBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-4 py-2 z-40 shadow-lg">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* Beranda */}
          <Link
            href="/donatur"
            className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${
              pathname === '/donatur' ? 'text-[#0B5FA5] dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <House size={22} weight={pathname === '/donatur' ? 'duotone' : 'regular'} />
            <span className="text-[10px] font-bold">Beranda</span>
          </Link>

          {/* Donatur */}
          <Link
            href="/donatur/daftar"
            className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${
              pathname.startsWith('/donatur/daftar') ? 'text-[#0B5FA5] dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <HandHeart size={22} weight={pathname.startsWith('/donatur/daftar') ? 'duotone' : 'regular'} />
            <span className="text-[10px] font-bold">Donatur</span>
          </Link>

          {/* Floating Add Button (Highlighted) */}
          <Link href="/donatur/surat/baru" className="flex flex-col items-center -mt-5">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#0B5FA5] to-[#0E9F54] text-white flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-900 hover:scale-105 transition-transform">
              <Plus size={22} weight="bold" />
            </div>
            <span className="text-[10px] font-extrabold text-[#0B5FA5] dark:text-sky-300 mt-0.5">
              + Surat
            </span>
          </Link>

          {/* Rekap */}
          <Link
            href="/donatur/rekap"
            className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${
              pathname.startsWith('/donatur/rekap') ? 'text-[#0B5FA5] dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <ChartBar size={22} weight={pathname.startsWith('/donatur/rekap') ? 'duotone' : 'regular'} />
            <span className="text-[10px] font-bold">Rekap</span>
          </Link>

          {/* Pindah Ruangan */}
          <RoomSwitchButton variant="nav" />

          {/* Akun */}
          <button
            type="button"
            onClick={() => setIsAccountOpen(true)}
            className={`flex flex-col items-center gap-1 p-1.5 transition-colors cursor-pointer ${
              isAccountOpen ? 'text-[#0B5FA5] dark:text-sky-400' : 'text-slate-500 dark:text-slate-400 hover:text-[#0B5FA5]'
            }`}
            aria-label="Menu Akun"
          >
            <div className="w-[22px] h-[22px] rounded-full bg-gradient-to-br from-[#0B5FA5] to-[#0E9F54] text-white font-extrabold text-[10px] flex items-center justify-center shadow-xs">
              {user?.nama ? user.nama.trim().charAt(0).toUpperCase() : <UserCircle size={22} />}
            </div>
            <span className="text-[10px] font-bold">Akun</span>
          </button>
        </div>
      </nav>

      {/* Interactive Account Drawer */}
      <AccountDrawer isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />
    </>
  );
}
