import { describe, it, expect } from 'vitest';
import { canEditSantri, canDeleteSantri, canManageUsers, canManageDonatur, getRoleLabel, ALL_ROLES } from '@/lib/auth/roles';

describe('izin berbasis banyak peran', () => {
  it('ADMIN_SANTRI boleh mengubah santri, tidak boleh menghapus', () => {
    expect(canEditSantri(['ADMIN_SANTRI'])).toBe(true);
    expect(canDeleteSantri(['ADMIN_SANTRI'])).toBe(false);
  });
  it('ADMIN_DONATUR tidak menyentuh santri', () => {
    expect(canEditSantri(['ADMIN_DONATUR'])).toBe(false);
    expect(canManageDonatur(['ADMIN_DONATUR'])).toBe(true);
  });
  it('SUPERADMIN boleh semuanya', () => {
    expect(canDeleteSantri(['SUPERADMIN'])).toBe(true);
    expect(canManageUsers(['SUPERADMIN'])).toBe(true);
    expect(canManageDonatur(['SUPERADMIN'])).toBe(true);
  });
  it('peran ganda menggabungkan izin', () => {
    expect(canEditSantri(['ADMIN_SANTRI', 'ADMIN_DONATUR'])).toBe(true);
    expect(canManageDonatur(['ADMIN_SANTRI', 'ADMIN_DONATUR'])).toBe(true);
  });
  it('label peran berbahasa Indonesia', () => {
    expect(getRoleLabel('ADMIN_DONATUR')).toMatch(/Donatur/i);
  });
  it('peran Pengurus Yayasan terdaftar', () => {
    expect(getRoleLabel('PENGURUS')).toBe('Pengurus Yayasan');
    expect(ALL_ROLES).toContain('PENGURUS');
  });
});
