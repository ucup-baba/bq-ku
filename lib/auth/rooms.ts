import type { UserRole } from './roles';

export type Room = 'santri' | 'donatur';

export const ROOM_COOKIE = 'bq_room';
export const ROOM_HOME: Record<Room, string> = { santri: '/', donatur: '/donatur' };
export const ROOM_LABEL: Record<Room, string> = { santri: 'Ruang Santri', donatur: 'Ruang Donatur' };

export function roomsFor(roles: UserRole[]): Room[] {
  const out: Room[] = [];
  if (roles.some(r => r === 'SUPERADMIN' || r === 'ADMIN_SANTRI' || r === 'VIEWER')) out.push('santri');
  if (roles.some(r => r === 'SUPERADMIN' || r === 'ADMIN_DONATUR')) out.push('donatur');
  return out;
}

/** Ruangan yang dituju sebuah path. Default: santri. */
export function roomOfPath(pathname: string): Room {
  return pathname === '/donatur' || pathname.startsWith('/donatur/') || pathname.startsWith('/api/donatur')
    ? 'donatur'
    : 'santri';
}
