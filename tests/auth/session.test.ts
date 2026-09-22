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
    maybeSingle.mockResolvedValue({ data: { nama: 'A', role: 'PANITIA', aktif: false } });
    expect(await getSessionUser()).toBeNull();
  });
  it('mengembalikan user + role', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.c' } } });
    maybeSingle.mockResolvedValue({ data: { nama: 'A', role: 'PANITIA', aktif: true } });
    expect(await getSessionUser()).toEqual({ id: 'u1', email: 'a@b.c', nama: 'A', role: 'PANITIA' });
  });
});

describe('requireUser', () => {
  it('401 jika tidak login', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(requireUser()).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
  });
  it('403 jika role tidak diizinkan', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.c' } } });
    maybeSingle.mockResolvedValue({ data: { nama: 'A', role: 'VIEWER', aktif: true } });
    await expect(requireUser(['SUPERADMIN'])).rejects.toBeInstanceOf(AuthError);
  });
  it('lolos jika role cocok', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.c' } } });
    maybeSingle.mockResolvedValue({ data: { nama: 'A', role: 'SUPERADMIN', aktif: true } });
    const { user } = await requireUser(['SUPERADMIN', 'PANITIA']);
    expect(user.role).toBe('SUPERADMIN');
  });
});
