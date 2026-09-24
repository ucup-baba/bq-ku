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

/** Path milik semua ruangan (mis. notifikasi akun): tidak dicek/diarahkan per ruangan. */
export function pathNetral(pathname: string): boolean {
  return pathname === '/api/notifikasi';
}

/** Halaman Akun di dalam ruangan aktif (nav & rail tetap milik ruangan itu). */
export const ROOM_AKUN: Record<Room, string> = { santri: '/akun', donatur: '/donatur/akun' };

/** Ruangan yang dituju sebuah path. Default: santri. */
export function roomOfPath(pathname: string): Room {
  return pathname === '/donatur' || pathname.startsWith('/donatur/') || pathname.startsWith('/api/donatur')
    ? 'donatur'
    : 'santri';
}

/** Tentukan tujuan setelah login: ruangan terakhir bila masih berhak, jika tidak ruangan pertama yang dimiliki. */
export function resolveLandingPath(roles: UserRole[], lastRoom: string | null): string | null {
  const rooms = roomsFor(roles);
  if (rooms.length === 0) return null;
  const last = lastRoom as Room | null;
  if (last && rooms.includes(last)) return ROOM_HOME[last];
  return ROOM_HOME[rooms[0]];
}
