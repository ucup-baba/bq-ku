'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  House,
  HandHeart,
  Envelope,
  Scroll,
  ChartBar,
  HandCoins,
} from '@phosphor-icons/react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { UserMenu } from '@/components/auth/UserMenu';
import { RoomSwitchButton } from './RoomSwitchButton';

export function DonaturSidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/donatur', label: 'Beranda', icon: House },
    { href: '/donatur/daftar', label: 'Daftar Donatur', icon: HandHeart },
    { href: '/donatur/surat/baru', label: 'Buat Surat', icon: Envelope },
    { href: '/donatur/surat', label: 'Daftar Surat', icon: Scroll },
    { href: '/donatur/rekap', label: 'Rekap', icon: ChartBar },
  ];

  return (
    <aside className="hidden md:flex flex-col justify-between w-64 h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-5 z-20">
      <div className="space-y-6">
        {/* Brand Header */}
        <Link href="/donatur" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0B5FA5] to-[#0E9F54] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <HandCoins size={22} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 tracking-tight">
                Ruang Donatur
              </span>
            </div>
            <span className="text-[11px] text-[#0B5FA5] dark:text-sky-400 font-semibold block">
              Baitul Qowwam
            </span>
          </div>
        </Link>

        {/* Navigation List */}
        <nav className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 block mb-2">
            Menu Utama
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/donatur' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-[#0B5FA5] dark:text-sky-200 border border-sky-200/60 dark:border-sky-800/40 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={18} weight={isActive ? 'duotone' : 'regular'} className={isActive ? 'text-[#0E9F54]' : 'text-slate-400'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Area: Room Switch, User Menu & Theme Toggle */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <RoomSwitchButton variant="sidebar" />
        <UserMenu />

        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Mode Tampilan:
          </span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
