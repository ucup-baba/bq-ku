import { describe, it, expect } from 'vitest';
import { canDeleteSantri, canEditSantri, canVerifyDocuments, canManageUsers } from '@/lib/auth/roles';

describe('Role Permission Matrix', () => {
  it('should grant full privileges to SUPERADMIN', () => {
    expect(canDeleteSantri('SUPERADMIN')).toBe(true);
    expect(canEditSantri('SUPERADMIN')).toBe(true);
    expect(canVerifyDocuments('SUPERADMIN')).toBe(true);
    expect(canManageUsers('SUPERADMIN')).toBe(true);
  });

  it('should allow PANITIA to edit and verify but NOT delete santri', () => {
    expect(canDeleteSantri('PANITIA')).toBe(false);
    expect(canEditSantri('PANITIA')).toBe(true);
    expect(canVerifyDocuments('PANITIA')).toBe(true);
    expect(canManageUsers('PANITIA')).toBe(false);
  });

  it('should restrict VIEWER to read-only access', () => {
    expect(canDeleteSantri('VIEWER')).toBe(false);
    expect(canEditSantri('VIEWER')).toBe(false);
    expect(canVerifyDocuments('VIEWER')).toBe(false);
    expect(canManageUsers('VIEWER')).toBe(false);
  });
});
