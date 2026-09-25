import { describe, it, expect } from 'vitest';
import { roomsFor, roomOfPath, ROOM_HOME, resolveLandingPath } from '@/lib/auth/rooms';

describe('ruangan', () => {
  it('memetakan peran ke ruangan', () => {
    expect(roomsFor(['ADMIN_SANTRI'])).toEqual(['santri']);
    expect(roomsFor(['ADMIN_DONATUR'])).toEqual(['donatur']);
    expect(roomsFor(['SUPERADMIN'])).toEqual(['santri', 'donatur', 'lembaga']);
    expect(roomsFor(['PENGURUS'])).toEqual(['lembaga']);
    expect(roomsFor(['PENGURUS', 'ADMIN_SANTRI'])).toEqual(['santri', 'lembaga']);
    expect(roomsFor(['ADMIN_SANTRI', 'ADMIN_DONATUR'])).toEqual(['santri', 'donatur']);
    expect(roomsFor(['VIEWER'])).toEqual(['santri']);
  });
  it('menentukan ruangan dari path', () => {
    expect(roomOfPath('/donatur')).toBe('donatur');
    expect(roomOfPath('/donatur/surat/baru')).toBe('donatur');
    expect(roomOfPath('/api/donatur/surat')).toBe('donatur');
    expect(roomOfPath('/santri')).toBe('santri');
    expect(roomOfPath('/')).toBe('santri');
    expect(roomOfPath('/lembaga')).toBe('lembaga');
    expect(roomOfPath('/lembaga/santri/abc')).toBe('lembaga');
    expect(roomOfPath('/api/lembaga/ringkasan')).toBe('lembaga');
    expect(roomOfPath('/lembagaku')).toBe('santri');
  });
  it('punya beranda tiap ruangan', () => {
    expect(ROOM_HOME.santri).toBe('/');
    expect(ROOM_HOME.donatur).toBe('/donatur');
    expect(ROOM_HOME.lembaga).toBe('/lembaga');
  });
});

describe('resolveLandingPath', () => {
  it('mengarahkan ke satu-satunya ruangan yang dimiliki', () => {
    expect(resolveLandingPath(['ADMIN_DONATUR'], null)).toBe('/donatur');
    expect(resolveLandingPath(['ADMIN_SANTRI'], null)).toBe('/');
  });
  it('menghormati ruangan terakhir bila punya dua', () => {
    expect(resolveLandingPath(['SUPERADMIN'], 'donatur')).toBe('/donatur');
    expect(resolveLandingPath(['SUPERADMIN'], null)).toBe('/');
  });
  it('mengabaikan cookie yang tidak berhak', () => {
    expect(resolveLandingPath(['ADMIN_SANTRI'], 'donatur')).toBe('/');
  });
  it('pengguna yang hanya Pengurus masuk ke Ruang Lembaga', () => {
    expect(resolveLandingPath(['PENGURUS'], null)).toBe('/lembaga');
    expect(resolveLandingPath(['SUPERADMIN'], 'lembaga')).toBe('/lembaga');
  });
  it('null bila tidak punya ruangan', () => {
    expect(resolveLandingPath([], null)).toBeNull();
  });
});
