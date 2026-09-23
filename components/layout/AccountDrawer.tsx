'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { X, SignOut, Sun, Moon, CaretRight, WarningCircle, EnvelopeSimple, IdentificationBadge } from '@phosphor-icons/react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTheme } from '@/components/theme/ThemeProvider';
import { getRoleLabel } from '@/lib/auth/roles';
import { Kartu } from '@/components/ui/Kartu';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { InisialUbin } from '@/components/ui/InisialUbin';
import { TombolIkon } from '@/components/ui/Tombol';

export interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountDrawer({ isOpen, onClose }: AccountDrawerProps) {
  const { user, roles, canManageUsers, logout } = useAuth();
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

  const superadmin = roles.includes('SUPERADMIN');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label="Menu akun">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm dark:bg-black/70" onClick={onClose} aria-hidden="true" />

      <div className="animate-halaman relative z-50 max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-t-[32px] border-t border-bq-garis bg-bq-surface p-6 pt-3 shadow-2xl md:max-w-md md:rounded-[32px] md:border">
        {/* Pegangan tarik di tengah, tombol tutup di pojok */}
        <div aria-hidden="true" className="mx-auto h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600" />
        <TombolIkon ikon={X} label="Tutup" ukuran="sm" varian="polos" onClick={onClose} className="absolute right-4 top-3" />

        <Kartu className="flex items-center gap-4 p-4">
          <InisialUbin nama={user?.nama || 'Pengguna'} indeks={1} className="h-14 w-14 rounded-2xl text-lg" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-extrabold text-bq-tinta">{user?.nama || 'Pengguna BQ-ku'}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-bq-redup">
              <EnvelopeSimple size={13} aria-hidden="true" />
              <span className="truncate">{user?.email}</span>
            </p>
            <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${superadmin ? 'bg-emerald-50 text-[#0E9F54] dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-sky-50 text-[#0B5FA5] dark:bg-sky-950/40 dark:text-sky-300'}`}>
              {roles.map(getRoleLabel).join(' · ')}
            </span>
          </div>
        </Kartu>

        <div className="space-y-2.5">
          <span className="block px-1 text-xs font-extrabold uppercase tracking-wider text-bq-redup">Akses &amp; pengaturan</span>

          {canManageUsers && (
            <Link href="/pengguna" onClick={onClose} className="goyang-saat-hover flex items-center justify-between rounded-2xl border border-bq-garis p-3.5 transition-colors hover:border-bq-biru">
              <span className="flex items-center gap-3">
                <IkonUbin ikon={IdentificationBadge} warna="ungu" />
                <span>
                  <span className="block text-sm font-bold text-bq-tinta">Kelola akun &amp; pengguna</span>
                  <span className="block text-xs text-bq-redup">Izinkan email panitia &amp; atur peran</span>
                </span>
              </span>
              <CaretRight size={16} weight="bold" className="text-bq-redup" aria-hidden="true" />
            </Link>
          )}

          <div className="flex items-center justify-between rounded-2xl border border-bq-garis p-3.5">
            <span className="flex items-center gap-3">
              <IkonUbin ikon={theme === 'dark' ? Moon : Sun} warna="jingga" />
              <span>
                <span className="block text-sm font-bold text-bq-tinta">Tema tampilan</span>
                <span className="block text-xs text-bq-redup">{theme === 'dark' ? 'Mode gelap aktif' : 'Mode terang aktif'}</span>
              </span>
            </span>
            <button type="button" onClick={toggleTheme}
              className="tekan rounded-xl border border-bq-garis px-3.5 py-2 text-xs font-bold text-bq-tinta hover:bg-slate-100 dark:hover:bg-slate-800">
              Ganti {theme === 'dark' ? 'terang' : 'gelap'}
            </button>
          </div>
        </div>

        <div className="border-t border-bq-garis pt-2">
          {!showLogoutConfirm ? (
            <button type="button" onClick={() => setShowLogoutConfirm(true)}
              className="tekan flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              <SignOut size={18} weight="bold" aria-hidden="true" /> Keluar dari akun
            </button>
          ) : (
            <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center dark:border-rose-800 dark:bg-rose-950/60">
              <p className="flex items-center justify-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-300">
                <WarningCircle size={18} weight="fill" aria-hidden="true" /> Yakin ingin keluar?
              </p>
              <p className="text-xs text-rose-600/90 dark:text-rose-400">Anda perlu masuk lagi dengan akun Google yang terdaftar.</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setShowLogoutConfirm(false)} disabled={isLoggingOut}
                  className="rounded-xl border border-bq-garis bg-bq-surface px-3 py-2.5 text-xs font-bold text-bq-tinta">
                  Batal
                </button>
                <button type="button" onClick={handleLogout} disabled={isLoggingOut}
                  className="rounded-xl bg-rose-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50">
                  {isLoggingOut ? 'Mengeluarkan…' : 'Ya, keluar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
