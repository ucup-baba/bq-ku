'use client';
import React, { createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { canDeleteSantri, canEditSantri, canManageDonatur, canManageUsers, type UserRole } from '@/lib/auth/roles';
import { roomsFor, type Room } from '@/lib/auth/rooms';
import type { SessionUser } from '@/lib/auth/session';
import { createBrowserSupabase } from '@/lib/supabase/client';

type AuthContextType = {
  user: SessionUser | null; roles: UserRole[];
  canEdit: boolean; canDelete: boolean; canManageUsers: boolean; canManageDonatur: boolean;
  rooms: Room[];
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextType>({
  user: null, roles: [], canEdit: false, canDelete: false, canManageUsers: false, canManageDonatur: false, rooms: [], logout: async () => {},
});

export function AuthProvider({ user, children }: { user: SessionUser | null; children: React.ReactNode }) {
  const router = useRouter();
  const roles: UserRole[] = user?.roles ?? [];
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
    <AuthContext.Provider value={{
      user, roles,
      canEdit: canEditSantri(roles), canDelete: canDeleteSantri(roles), canManageUsers: canManageUsers(roles), canManageDonatur: canManageDonatur(roles),
      rooms: roomsFor(roles), logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
