'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  House,
  Users,
  Plus,
  UserCircle
} from '@phosphor-icons/react';
import { useAuth } from '@/components/auth/AuthProvider';
import { AccountDrawer } from './AccountDrawer';
import { RoomSwitchButton } from './RoomSwitchButton';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-4 py-2 z-40 shadow-lg">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* Beranda */}
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${
              pathname === '/' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <House size={22} weight={pathname === '/' ? 'duotone' : 'regular'} />
            <span className="text-[10px] font-bold">Beranda</span>
          </Link>

          {/* Direktori */}
          <Link
            href="/santri"
            className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${
              pathname.startsWith('/santri') ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Users size={22} weight={pathname.startsWith('/santri') ? 'duotone' : 'regular'} />
            <span className="text-[10px] font-bold">Direktori</span>
          </Link>

          {/* Floating Add Button (Highlighted) */}
          <Link
            href="/tambah"
            className="flex flex-col items-center -mt-5"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-900 hover:scale-105 transition-transform">
              <Plus size={22} weight="bold" />
            </div>
            <span className="text-[10px] font-extrabold text-teal-700 dark:text-teal-300 mt-0.5">
              + Berkas
            </span>
          </Link>

          {/* Pindah Ruangan */}
          <RoomSwitchButton variant="nav" />

          {/* Akun */}
          <button
            type="button"
            onClick={() => setIsAccountOpen(true)}
            className={`flex flex-col items-center gap-1 p-1.5 transition-colors cursor-pointer ${
              isAccountOpen ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400 hover:text-teal-600'
            }`}
            aria-label="Menu Akun"
          >
            <div className="w-[22px] h-[22px] rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-extrabold text-[10px] flex items-center justify-center shadow-xs">
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
