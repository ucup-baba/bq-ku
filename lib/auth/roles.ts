export type UserRole = 'SUPERADMIN' | 'ADMIN_SANTRI' | 'ADMIN_DONATUR' | 'VIEWER';

export interface UserSession {
  id: string;
  username: string;
  nama: string;
  roles: UserRole[];
}

const has = (roles: UserRole[], ...wanted: UserRole[]) => roles.some(r => wanted.includes(r));

export function canEditSantri(roles: UserRole[]): boolean { return has(roles, 'SUPERADMIN', 'ADMIN_SANTRI'); }
export function canDeleteSantri(roles: UserRole[]): boolean { return has(roles, 'SUPERADMIN'); }
export function canVerifyDocuments(roles: UserRole[]): boolean { return has(roles, 'SUPERADMIN', 'ADMIN_SANTRI'); }
export function canManageUsers(roles: UserRole[]): boolean { return has(roles, 'SUPERADMIN'); }
export function canManageDonatur(roles: UserRole[]): boolean { return has(roles, 'SUPERADMIN', 'ADMIN_DONATUR'); }

export const ALL_ROLES: UserRole[] = ['SUPERADMIN', 'ADMIN_SANTRI', 'ADMIN_DONATUR', 'VIEWER'];

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'SUPERADMIN': return 'Superadmin (Penuh)';
    case 'ADMIN_SANTRI': return 'Admin Santri';
    case 'ADMIN_DONATUR': return 'Admin Donatur';
    case 'VIEWER': return 'Viewer / Wali Santri';
    default: return role;
  }
}
