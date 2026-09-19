export type UserRole = 'SUPERADMIN' | 'PANITIA' | 'VIEWER';

export interface UserSession {
  id: string;
  username: string;
  nama: string;
  role: UserRole;
}

export function canEditSantri(role: UserRole): boolean {
  return role === 'SUPERADMIN' || role === 'PANITIA';
}

export function canDeleteSantri(role: UserRole): boolean {
  return role === 'SUPERADMIN';
}

export function canVerifyDocuments(role: UserRole): boolean {
  return role === 'SUPERADMIN' || role === 'PANITIA';
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'SUPERADMIN';
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'SUPERADMIN':
      return 'Superadmin (Penuh)';
    case 'PANITIA':
      return 'Panitia Administrasi';
    case 'VIEWER':
      return 'Viewer / Wali Santri';
    default:
      return role;
  }
}
