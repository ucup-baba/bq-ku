'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, getRoleLabel, canDeleteSantri, canEditSantri } from '@/lib/auth/roles';
import { ShieldCheck, UserCheck, Eye, CaretDown } from '@phosphor-icons/react';

interface AuthContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  canEdit: boolean;
  canDelete: boolean;
}

const AuthContext = createContext<AuthContextType>({
  role: 'SUPERADMIN',
  setRole: () => {},
  canEdit: true,
  canDelete: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('SUPERADMIN');

  useEffect(() => {
    const saved = localStorage.getItem('bq_user_role') as UserRole | null;
    if (saved && ['SUPERADMIN', 'PANITIA', 'VIEWER'].includes(saved)) {
      setRoleState(saved);
    }
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('bq_user_role', newRole);
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        setRole,
        canEdit: canEditSantri(role),
        canDelete: canDeleteSantri(role),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function DemoRoleSwitcher() {
  const { role, setRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const roles: Array<{ id: UserRole; label: string; desc: string; icon: any }> = [
    { id: 'SUPERADMIN', label: 'Superadmin', desc: 'Akses penuh termasuk hapus santri', icon: ShieldCheck },
    { id: 'PANITIA', label: 'Panitia Berkas', desc: 'Input, upload OCR, dan verifikasi', icon: UserCheck },
    { id: 'VIEWER', label: 'Viewer / Santri', desc: 'Hanya melihat profil & arsip berkas', icon: Eye },
  ];

  const current = roles.find(r => r.id === role) || roles[0];
  const CurrentIcon = current.icon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"
      >
        <CurrentIcon size={16} weight="duotone" className="text-teal-600 dark:text-teal-400" />
        <span>{current.label}</span>
        <CaretDown size={12} />
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-2 z-50 space-y-1">
          <div className="px-2 py-1 text-[10px] uppercase font-extrabold text-slate-400">
            Simulasi Role (Tahap 2 Ready)
          </div>
          {roles.map(r => {
            const Icon = r.icon;
            const isSelected = r.id === role;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRole(r.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-start gap-2 transition-colors ${
                  isSelected 
                    ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 font-bold' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={16} weight="duotone" className="mt-0.5 text-teal-600 flex-shrink-0" />
                <div>
                  <div className="font-bold">{r.label}</div>
                  <div className="text-[10px] text-slate-400 leading-tight">{r.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
