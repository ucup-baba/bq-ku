import { describe, it, expect, vi, beforeEach } from 'vitest';

const hasil = vi.hoisted(() => ({ tabel: {} as Record<string, unknown>, dihapus: [] as string[] }));
const deleteUser = vi.hoisted(() => vi.fn(async () => ({ error: null })));

function rantai(t: string) {
  const r: any = new Proxy({}, {
    get: (_x, k) => {
      if (k === 'then') return (ok: (v: unknown) => void) => ok(hasil.tabel[t] ?? { data: [], error: null, count: 0 });
      if (k === 'delete') return () => { hasil.dihapus.push(t); return r; };
      return () => r;
    },
  });
  return r;
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabase: () => ({
    from: (t: string) => rantai(t),
    auth: { admin: { deleteUser, listUsers: async () => ({ data: { users: [] } }) } },
  }),
}));
vi.mock('@/lib/auth/session', () => ({
  requireUser: vi.fn(async () => ({ user: { id: 'admin', roles: ['SUPERADMIN'] } })),
  authErrorResponse: () => null,
}));

import { GET } from '@/app/api/pengguna/route';
import { DELETE } from '@/app/api/pengguna/[id]/route';

const ctx = { params: Promise.resolve({ id: 'u1' }) };

beforeEach(() => { hasil.tabel = {}; hasil.dihapus = []; deleteUser.mockClear(); });

describe('akun peminjam di /pengguna', () => {
  it('akun nonaktif milik anggota perpus disembunyikan', async () => {
    hasil.tabel = {
      profiles: { data: [
        { id: 'a', email: 'a@x', aktif: false }, { id: 'b', email: 'b@x', aktif: false }, { id: 'c', email: 'c@x', aktif: true },
      ], error: null },
      perpus_anggota: { data: [{ userId: 'a' }, { userId: 'c' }], error: null },
    };
    const { data } = await (await GET()).json();
    expect(data.map((r: { id: string }) => r.id)).toEqual(['b', 'c']);
  });
  it('tabel anggota belum ada → semua tampil', async () => {
    hasil.tabel = {
      profiles: { data: [{ id: 'a', email: 'a@x', aktif: false }], error: null },
      perpus_anggota: { data: null, error: { message: 'relation does not exist' } },
    };
    expect((await (await GET()).json()).data).toHaveLength(1);
  });
  it('akun dengan riwayat pinjaman tidak dihapus', async () => {
    hasil.tabel = { perpus_pinjaman: { count: 2, error: null } };
    const res = await DELETE({} as never, ctx);
    expect(res.status).toBe(409);
    expect(hasil.dihapus).toEqual([]);
    expect(deleteUser).not.toHaveBeenCalled();
  });
  it('tanpa riwayat tetap terhapus', async () => {
    hasil.tabel = { perpus_pinjaman: { count: 0, error: null }, profiles: { data: { email: 'a@x' }, error: null } };
    expect((await DELETE({} as never, ctx)).status).toBe(200);
    expect(deleteUser).toHaveBeenCalledWith('u1');
  });
});
