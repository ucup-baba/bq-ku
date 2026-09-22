'use client';
import React, { createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { canDeleteSantri, canEditSantri, canManageUsers, type UserRole } from '@/lib/auth/roles';
import type { SessionUser } from '@/lib/auth/session';
import { createBrowserSupabase } from '@/lib/supabase/client';

type AuthContextType = {
  user: SessionUser | null; role: UserRole;
  canEdit: boolean; canDelete: boolean; canManageUsers: boolean;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextType>({
  user: null, role: 'VIEWER', canEdit: false, canDelete: false, canManageUsers: false, logout: async () => {},
});

export function AuthProvider({ user, children }: { user: SessionUser | null; children: React.ReactNode }) {
  const router = useRouter();
  const role: UserRole = user?.role ?? 'VIEWER';
  // Session kedaluwarsa/keluar di tab lain → kembali ke login (spec §7)
  React.useEffect(() => {
    if (!user) return;
    const { data: sub } = createBrowserSupabase().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { router.push('/login'); router.refresh(); }
    });
    return () => sub.subscription.unsubscribe();
  }, [user, router]);
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login'); router.refresh();
  };
  return (
    <AuthContext.Provider value={{ user, role, canEdit: canEditSantri(role), canDelete: canDeleteSantri(role), canManageUsers: canManageUsers(role), logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
