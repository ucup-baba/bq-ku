'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  House, 
  Users, 
  UserPlus, 
  Scan, 
  Sparkle, 
  BookOpen, 
  ShieldCheck,
  FolderOpen
} from '@phosphor-icons/react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { UserMenu } from '@/components/auth/UserMenu';
import { useAuth } from '@/components/auth/AuthProvider';
import { DoodleSparkle } from '@/components/ui/DoodleStickers';
import { RoomSwitchButton } from './RoomSwitchButton';

export function DesktopSidebar() {
  const pathname = usePathname();
  const { canManageUsers } = useAuth();

  const navItems = [
    { href: '/', label: 'Beranda / Ringkasan', icon: House },
    { href: '/santri', label: 'Direktori Santri', icon: Users },
    { href: '/tambah', label: 'Input Berkas & OCR', icon: UserPlus },
    ...(canManageUsers ? [{ href: '/pengguna', label: 'Akun & Pengguna', icon: ShieldCheck }] : []),
  ];

  return (
    <aside className="hidden md:flex flex-col justify-between w-64 h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-5 z-20">
      <div className="space-y-6">
        {/* Brand Header */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <BookOpen size={22} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 tracking-tight">
                Baitul Qowwam
              </span>
              <DoodleSparkle size={14} className="text-lime-500" />
            </div>
            <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold block">
              Arsip Berkas & CV Santri
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
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border border-teal-200/60 dark:border-teal-800/40 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={18} weight={isActive ? 'duotone' : 'regular'} className={isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Area: Role Switcher & Theme Toggle */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <RoomSwitchButton variant="sidebar" />
        <UserMenu />

        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Mode Tampilan:
          </span>
          <ThemeToggle />
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Sistem Aktif
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
            Supabase Cloud • Smart OCR Engine Siap
          </p>
        </div>
      </div>
    </aside>
  );
}
