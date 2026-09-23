import { describe, it, expect, vi, beforeEach } from 'vitest';

const getClaims = vi.fn();
const maybeSingle = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: async () => ({
    auth: { getClaims },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));

import { getSessionUser, requireUser, AuthError } from '@/lib/auth/session';

beforeEach(() => { getClaims.mockReset(); maybeSingle.mockReset(); });

describe('getSessionUser', () => {
  it('null jika tidak login', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    expect(await getSessionUser()).toBeNull();
  });
  it('null jika profil nonaktif', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u1', email: 'a@b.c' } }, error: null });
    maybeSingle.mockResolvedValue({ data: { nama: 'A', roles: ['ADMIN_SANTRI'], aktif: false } });
    expect(await getSessionUser()).toBeNull();
  });
  it('mengembalikan user + roles', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u1', email: 'a@b.c' } }, error: null });
    maybeSingle.mockResolvedValue({ data: { nama: 'A', roles: ['ADMIN_SANTRI'], aktif: true } });
    expect(await getSessionUser()).toEqual({ id: 'u1', email: 'a@b.c', nama: 'A', roles: ['ADMIN_SANTRI'] });
  });
});

describe('requireUser', () => {
  it('401 jika tidak login', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    await expect(requireUser()).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
  });
  it('403 jika tidak punya peran yang diizinkan', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u1', email: 'a@b.c' } }, error: null });
    maybeSingle.mockResolvedValue({ data: { nama: 'A', roles: ['VIEWER'], aktif: true } });
    await expect(requireUser(['SUPERADMIN'])).rejects.toBeInstanceOf(AuthError);
  });
  it('lolos jika salah satu peran cocok', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u1', email: 'a@b.c' } }, error: null });
    maybeSingle.mockResolvedValue({ data: { nama: 'A', roles: ['SUPERADMIN'], aktif: true } });
    const { user } = await requireUser(['SUPERADMIN', 'ADMIN_SANTRI']);
    expect(user.roles).toEqual(['SUPERADMIN']);
  });
  it('lolos bila peran ganda mencakup salah satu yang diizinkan', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u1', email: 'a@b.c' } }, error: null });
    maybeSingle.mockResolvedValue({ data: { nama: 'A', roles: ['ADMIN_DONATUR', 'ADMIN_SANTRI'], aktif: true } });
    const { user } = await requireUser(['ADMIN_SANTRI']);
    expect(user.roles).toContain('ADMIN_SANTRI');
  });
});
