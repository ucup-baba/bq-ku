import { describe, it, expect } from 'vitest';
import { invitePenggunaSchema, updatePenggunaSchema } from '@/lib/validation/pengguna';
describe('pengguna schemas', () => {
  it('menormalisasi email', () => {
    const r = invitePenggunaSchema.safeParse({ nama: 'Ani', email: ' Ani@X.ID ', role: 'ADMIN_SANTRI' });
    expect(r.success && r.data.email).toBe('ani@x.id');
  });
  it('menolak role tidak dikenal', () => expect(invitePenggunaSchema.safeParse({ nama: 'A', email: 'a@b.c', role: 'BOS' }).success).toBe(false));
  it('update kosong ditolak', () => expect(updatePenggunaSchema.safeParse({}).success).toBe(false));
});
