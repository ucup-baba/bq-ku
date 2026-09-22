'use client';
import { useState } from 'react';
import { SignOut, UserCircle, WarningCircle } from '@phosphor-icons/react';
import { useAuth } from './AuthProvider';
import { getRoleLabel } from '@/lib/auth/roles';

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { user, role, logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className={`relative flex items-center gap-3 ${compact ? '' : 'p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800'}`}>
      <UserCircle size={compact ? 22 : 32} weight="duotone" className="text-teal-600 shrink-0" />
      {!compact && (
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate text-slate-800 dark:text-slate-100">{user.nama}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{getRoleLabel(role)}</p>
        </div>
      )}

      {/* Logout button with safe confirmation */}
      <div className="relative">
        <button 
          type="button" 
          onClick={() => setShowConfirm(prev => !prev)} 
          aria-label="Keluar"
          title="Keluar dari akun"
          className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
        >
          <SignOut size={20} weight="bold" />
        </button>

        {showConfirm && (
          <div className="absolute bottom-full right-0 mb-2 w-56 p-3 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-rose-200 dark:border-rose-900 z-50 text-left animate-in fade-in zoom-in-95 duration-150">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1 text-rose-600 dark:text-rose-400">
              <WarningCircle size={15} weight="fill" />
              Keluar Akun?
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5 leading-tight">
              Yakin ingin keluar dari akun BQ-Ku?
            </p>
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isLoggingOut}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isLoggingOut ? '...' : 'Keluar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
