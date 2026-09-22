'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  X, 
  SignOut, 
  ShieldCheck, 
  Sun, 
  Moon, 
  CaretRight, 
  UserCircle, 
  CheckCircle,
  Sparkle,
  WarningCircle,
  EnvelopeSimple,
  IdentificationBadge
} from '@phosphor-icons/react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTheme } from '@/components/theme/ThemeProvider';
import { getRoleLabel } from '@/lib/auth/roles';

export interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountDrawer({ isOpen, onClose }: AccountDrawerProps) {
  const { user, role, canManageUsers, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!isOpen) return null;

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoggingOut(false);
    }
  };

  // Ambil inisial nama pengguna
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop overlay dengan blur halus */}
      <div 
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Content (Slide Up dari Bawah) */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl border-t border-slate-200/80 dark:border-slate-800/80 z-50 p-6 space-y-5 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        
        {/* Drag handle & close header */}
        <div className="flex items-center justify-between">
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto -mr-2" />
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* User Identity Card */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-50 to-teal-50/40 dark:from-slate-800/80 dark:to-teal-950/20 border border-teal-100 dark:border-teal-900/40 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
            {getInitials(user?.nama)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 truncate">
                {user?.nama || 'Pengguna BQ-Ku'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
              <EnvelopeSimple size={13} />
              <span>{user?.email || 'email@baitulqowwam.sch.id'}</span>
            </p>
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase shadow-xs ${
                role === 'SUPERADMIN'
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                  : role === 'PANITIA'
                  ? 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
              }`}>
                <ShieldCheck size={12} weight="fill" />
                <span>{getRoleLabel(role)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Menu Navigasi & Pintasan Akun */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 block">
            Akses & Pengaturan
          </span>

          {/* Khusus Super Admin: Akses Kelola Pengguna */}
          {canManageUsers && (
            <Link
              href="/pengguna"
              onClick={onClose}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-600 shadow-sm transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                  <IdentificationBadge size={22} weight="duotone" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    Kelola Akun & Pengguna
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Undang email panitia & kelola izin akses
                  </p>
                </div>
              </div>
              <CaretRight size={16} weight="bold" className="text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
            </Link>
          )}

          {/* Pengaturan Tema Tampilan */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
                {theme === 'dark' ? (
                  <Moon size={22} weight="duotone" className="text-amber-400" />
                ) : (
                  <Sun size={22} weight="duotone" className="text-amber-500" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  Tema Tampilan
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {theme === 'dark' ? 'Mode Gelap Aktif' : 'Mode Terang Aktif'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-extrabold border border-slate-200 dark:border-slate-600 shadow-xs transition-all cursor-pointer"
            >
              Ganti {theme === 'dark' ? 'Terang' : 'Gelap'}
            </button>
          </div>

          {/* Status Koneksi Sistem */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                Server & AI OCR Siap
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              BQ-Ku v1.0
            </span>
          </div>
        </div>

        {/* Section Keluar Akun dengan Konfirmasi Aman */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          {!showLogoutConfirm ? (
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 font-extrabold text-xs border border-rose-200 dark:border-rose-900/60 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
            >
              <SignOut size={18} weight="bold" />
              <span>Keluar dari Akun</span>
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-center space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
                <WarningCircle size={18} weight="fill" className="text-rose-500" />
                <span>Yakin ingin keluar dari akun BQ-Ku?</span>
              </div>
              <p className="text-[11px] text-rose-600/90 dark:text-rose-400 leading-tight">
                Anda harus login kembali dengan akun Google terdaftar untuk mengakses aplikasi.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  disabled={isLoggingOut}
                  className="py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoggingOut ? 'Mengeluarkan...' : 'Ya, Keluar'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
