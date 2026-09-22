'use client';
import { SignOut, UserCircle } from '@phosphor-icons/react';
import { useAuth } from './AuthProvider';
import { getRoleLabel } from '@/lib/auth/roles';

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { user, role, logout } = useAuth();
  if (!user) return null;
  return (
    <div className={`flex items-center gap-3 ${compact ? '' : 'p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800'}`}>
      <UserCircle size={compact ? 22 : 32} weight="duotone" className="text-teal-600 shrink-0" />
      {!compact && (
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate">{user.nama}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{getRoleLabel(role)}</p>
        </div>
      )}
      <button type="button" onClick={logout} aria-label="Keluar"
        className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-500 hover:text-rose-600 transition-colors">
        <SignOut size={20} weight="bold" />
      </button>
    </div>
  );
}
