import { describe, it, expect, vi, beforeEach } from 'vitest';

const getUser = vi.fn();
const maybeSingle = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: async () => ({
    auth: { getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));

import { getSessionUser, requireUser, AuthError } from '@/lib/auth/session';

beforeEach(() => { getUser.mockReset(); maybeSingle.mockReset(); });

describe('getSessionUser', () => {
  it('null jika tidak login', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await getSessionUser()).toBeNull();
  });
  it('null jika profil nonaktif', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.c' } } });
    maybeSingle.mockResolvedValue({ data: { nama: 'A', roles: ['ADMIN_SANTRI'], aktif: false } });
    expect(await getSessionUser()).toBeNull();
  });
  it('mengembalikan user + roles', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.c' } } });
    maybeSingle.mockResolvedValue({ data: { nama: 'A', roles: ['ADMIN_SANTRI'], aktif: true } });
    expect(await getSessionUser()).toEqual({ id: 'u1', email: 'a@b.c', nama: 'A', roles: ['ADMIN_SANTRI'] });
  });
});

describe('requireUser', () => {
  it('401 jika tidak login', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(requireUser()).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
  });
  it('403 jika tidak punya peran yang diizinkan', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.c' } } });
    maybeSingle.mockResolvedValue({ data: { nama: 'A', roles: ['VIEWER'], aktif: true } });
    await expect(requireUser(['SUPERADMIN'])).rejects.toBeInstanceOf(AuthError);
  });
  it('lolos jika salah satu peran cocok', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.c' } } });
    maybeSingle.mockResolvedValue({ data: { nama: 'A', roles: ['SUPERADMIN'], aktif: true } });
    const { user } = await requireUser(['SUPERADMIN', 'ADMIN_SANTRI']);
    expect(user.roles).toEqual(['SUPERADMIN']);
  });
  it('lolos bila peran ganda mencakup salah satu yang diizinkan', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.c' } } });
    maybeSingle.mockResolvedValue({ data: { nama: 'A', roles: ['ADMIN_DONATUR', 'ADMIN_SANTRI'], aktif: true } });
    const { user } = await requireUser(['ADMIN_SANTRI']);
    expect(user.roles).toContain('ADMIN_SANTRI');
  });
});
