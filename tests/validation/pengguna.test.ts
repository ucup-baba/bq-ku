import { describe, it, expect } from 'vitest';
import { invitePenggunaSchema, updatePenggunaSchema } from '@/lib/validation/pengguna';

describe('skema pengguna', () => {
  it('menormalisasi email dan menerima banyak peran', () => {
    const r = invitePenggunaSchema.safeParse({ nama: 'Ani', email: ' Ani@X.ID ', roles: ['ADMIN_SANTRI', 'ADMIN_DONATUR'] });
    expect(r.success).toBe(true);
    if (r.success) { expect(r.data.email).toBe('ani@x.id'); expect(r.data.roles).toHaveLength(2); }
  });
  it('menolak peran tidak dikenal', () => {
    expect(invitePenggunaSchema.safeParse({ nama: 'A', email: 'a@b.c', roles: ['BOS'] }).success).toBe(false);
  });
  it('menolak daftar peran kosong', () => {
    expect(invitePenggunaSchema.safeParse({ nama: 'A', email: 'a@b.c', roles: [] }).success).toBe(false);
  });
  it('membuang peran ganda', () => {
    const r = invitePenggunaSchema.safeParse({ nama: 'Ani', email: 'a@b.co', roles: ['VIEWER', 'VIEWER'] });
    expect(r.success && r.data.roles).toEqual(['VIEWER']);
  });
  it('update kosong ditolak', () => {
    expect(updatePenggunaSchema.safeParse({}).success).toBe(false);
  });
});
