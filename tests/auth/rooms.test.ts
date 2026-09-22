import { describe, it, expect } from 'vitest';
import { roomsFor, roomOfPath, ROOM_HOME } from '@/lib/auth/rooms';

describe('ruangan', () => {
  it('memetakan peran ke ruangan', () => {
    expect(roomsFor(['ADMIN_SANTRI'])).toEqual(['santri']);
    expect(roomsFor(['ADMIN_DONATUR'])).toEqual(['donatur']);
    expect(roomsFor(['SUPERADMIN'])).toEqual(['santri', 'donatur']);
    expect(roomsFor(['ADMIN_SANTRI', 'ADMIN_DONATUR'])).toEqual(['santri', 'donatur']);
    expect(roomsFor(['VIEWER'])).toEqual(['santri']);
  });
  it('menentukan ruangan dari path', () => {
    expect(roomOfPath('/donatur')).toBe('donatur');
    expect(roomOfPath('/donatur/surat/baru')).toBe('donatur');
    expect(roomOfPath('/api/donatur/surat')).toBe('donatur');
    expect(roomOfPath('/santri')).toBe('santri');
    expect(roomOfPath('/')).toBe('santri');
  });
  it('punya beranda tiap ruangan', () => {
    expect(ROOM_HOME.santri).toBe('/');
    expect(ROOM_HOME.donatur).toBe('/donatur');
  });
});
