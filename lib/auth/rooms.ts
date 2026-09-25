import type { UserRole } from './roles';

export type Room = 'santri' | 'donatur' | 'lembaga';

export const ROOM_COOKIE = 'bq_room';
export const ROOM_HOME: Record<Room, string> = { santri: '/', donatur: '/donatur', lembaga: '/lembaga' };
export const ROOM_LABEL: Record<Room, string> = { santri: 'Ruang Santri', donatur: 'Ruang Donatur', lembaga: 'Ruang Lembaga' };

export function roomsFor(roles: UserRole[]): Room[] {
  const out: Room[] = [];
  if (roles.some(r => r === 'SUPERADMIN' || r === 'ADMIN_SANTRI' || r === 'VIEWER')) out.push('santri');
  if (roles.some(r => r === 'SUPERADMIN' || r === 'ADMIN_DONATUR')) out.push('donatur');
  if (roles.some(r => r === 'SUPERADMIN' || r === 'PENGURUS')) out.push('lembaga');
  return out;
}

/** Path milik semua ruangan (mis. notifikasi akun): tidak dicek/diarahkan per ruangan. */
export function pathNetral(pathname: string): boolean {
  return pathname === '/api/notifikasi';
}

/** Halaman Akun di dalam ruangan aktif (nav & rail tetap milik ruangan itu). */
export const ROOM_AKUN: Record<Room, string> = { santri: '/akun', donatur: '/donatur/akun', lembaga: '/lembaga/akun' };

/** Ruangan yang dituju sebuah path. Default: santri. */
export function roomOfPath(pathname: string): Room {
  const di = (awal: string) => pathname === awal || pathname.startsWith(awal + '/');
  if (di('/lembaga') || di('/api/lembaga')) return 'lembaga';
  if (di('/donatur') || di('/api/donatur')) return 'donatur';
  return 'santri';
}

/** Tentukan tujuan setelah login: ruangan terakhir bila masih berhak, jika tidak ruangan pertama yang dimiliki. */
export function resolveLandingPath(roles: UserRole[], lastRoom: string | null): string | null {
  const rooms = roomsFor(roles);
  if (rooms.length === 0) return null;
  const last = lastRoom as Room | null;
  if (last && rooms.includes(last)) return ROOM_HOME[last];
  return ROOM_HOME[rooms[0]];
}
