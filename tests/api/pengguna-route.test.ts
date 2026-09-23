import { describe, it, expect, vi, beforeEach } from 'vitest';

// Kolom lama `role` kini diturunkan oleh trigger DB `sinkron_role_roles`
// (migrasi 0005) dari `roles`. Rute pengguna TIDAK boleh lagi menulis
// `role: roles[0]` — nilai itu ('ADMIN_SANTRI'/'ADMIN_DONATUR') tidak dikenal
// build produksi lama dan bergantung pada urutan array.

type Call = { table: string; op: string; payload?: any };
const calls: Call[] = [];

function builder(table: string) {
  const chain: any = {
    upsert: (payload: any) => { calls.push({ table, op: 'upsert', payload }); return Promise.resolve({ error: null }); },
    update: (payload: any) => {
      calls.push({ table, op: 'update', payload });
      const res = {
        data: { id: 'p-2', email: 'x@y.z', nama: 'X', roles: payload.roles ?? ['VIEWER'], aktif: true },
        error: null,
      };
      const after: any = {
        eq: () => after,
        select: () => after,
        single: () => Promise.resolve(res),
        then: (ok: any, fail: any) => Promise.resolve({ error: null }).then(ok, fail),
      };
      return after;
    },
    delete: () => { calls.push({ table, op: 'delete' }); return { eq: () => Promise.resolve({ error: null }) }; },
  };
  return chain;
}

const admin = {
  from: (table: string) => builder(table),
  auth: { admin: { updateUserById: vi.fn(async () => ({})) } },
};

vi.mock('@/lib/supabase/admin', () => ({ createAdminSupabase: () => admin }));
vi.mock('@/lib/auth/session', () => ({
  requireUser: vi.fn(async () => ({ user: { id: 'p-1', roles: ['SUPERADMIN'] } })),
  authErrorResponse: () => null,
}));

import { POST } from '@/app/api/pengguna/route';
import { PATCH } from '@/app/api/pengguna/[id]/route';

const req = (body: any) => ({ json: async () => body }) as any;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => { calls.length = 0; });

describe('rute pengguna hanya menulis roles (bukan kolom lama role)', () => {
  it('POST undang: upsert allowed_emails tanpa kolom role', async () => {
    const res = await POST(req({ nama: 'Budi', email: 'budi@x.id', roles: ['ADMIN_DONATUR', 'ADMIN_SANTRI'] }));
    expect(res.status).toBe(201);
    expect(calls).toEqual([
      { table: 'allowed_emails', op: 'upsert', payload: { email: 'budi@x.id', nama: 'Budi', roles: ['ADMIN_DONATUR', 'ADMIN_SANTRI'] } },
    ]);
  });

  it('PATCH profil: update profiles & allowed_emails tanpa kolom role', async () => {
    const res = await PATCH(req({ roles: ['ADMIN_DONATUR'], aktif: true }), ctx('p-2'));
    expect(res.status).toBe(200);
    const writes = calls.filter(c => c.op !== 'delete');
    expect(writes.map(c => `${c.table}:${c.op}`)).toEqual([
      'profiles:update', 'allowed_emails:update', 'allowed_emails:upsert',
    ]);
    for (const c of writes) expect(c.payload).not.toHaveProperty('role');
    expect(writes[0].payload.roles).toEqual(['ADMIN_DONATUR']);
  });

  it('PATCH entri menunggu (allowed:<email>): update tanpa kolom role', async () => {
    const res = await PATCH(req({ roles: ['VIEWER'] }), ctx('allowed:budi%40x.id'));
    expect(res.status).toBe(200);
    expect(calls).toEqual([{ table: 'allowed_emails', op: 'update', payload: { roles: ['VIEWER'] } }]);
  });
});
