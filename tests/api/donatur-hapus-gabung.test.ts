// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const hapusDonatur = vi.fn();
const gabungDonatur = vi.fn();
const getDonatur = vi.fn();
const requireUser = vi.fn();

vi.mock('@/lib/db/donatur-repo', () => {
  class DonaturPunyaDonasiError extends Error { constructor(public jumlah: number) { super('punya donasi'); } }
  class HapusDonaturDitolakError extends Error {}
  return {
    getDonatur: (...a: unknown[]) => getDonatur(...a),
    updateDonatur: vi.fn(),
    hapusDonatur: (...a: unknown[]) => hapusDonatur(...a),
    gabungDonatur: (...a: unknown[]) => gabungDonatur(...a),
    DonaturPunyaDonasiError, HapusDonaturDitolakError,
  };
});
vi.mock('@/lib/auth/session', () => ({
  requireUser: (...a: unknown[]) => requireUser(...a),
  requireRoom: vi.fn(),
  authErrorResponse: () => null,
}));

import { DELETE } from '@/app/api/donatur/[id]/route';
import { POST as GABUNG } from '@/app/api/donatur/[id]/gabung/route';
import { DonaturPunyaDonasiError } from '@/lib/db/donatur-repo';

const ctx = { params: Promise.resolve({ id: 'p1' }) };
const req = (b: unknown) => ({ json: async () => b }) as never;

beforeEach(() => {
  requireUser.mockReset().mockResolvedValue({ user: { id: 'u1' }, supabase: {} });
  hapusDonatur.mockReset().mockResolvedValue(undefined);
  gabungDonatur.mockReset().mockResolvedValue(3);
  getDonatur.mockReset().mockImplementation(async (_c: unknown, id: string) => ({ id }));
});

describe('DELETE /api/donatur/[id]', () => {
  it('Admin Donatur & Superadmin boleh menghapus', async () => {
    expect((await DELETE({} as never, ctx)).status).toBe(200);
    expect(requireUser).toHaveBeenCalledWith(['SUPERADMIN', 'ADMIN_DONATUR']);
  });
  it('409 PUNYA_DONASI bila donatur masih punya donasi', async () => {
    hapusDonatur.mockRejectedValue(new DonaturPunyaDonasiError(2));
    const res = await DELETE({} as never, ctx);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'PUNYA_DONASI', jumlahDonasi: 2 });
  });
});

describe('POST /api/donatur/[id]/gabung', () => {
  it('menggabungkan ke donatur tujuan', async () => {
    const res = await GABUNG(req({ keId: 'p2' }), ctx);
    expect(res.status).toBe(200);
    expect(gabungDonatur).toHaveBeenCalledWith({}, 'p1', 'p2');
    expect(await res.json()).toMatchObject({ data: { keId: 'p2', dipindah: 3 } });
  });
  it('400 bila tujuan = dirinya sendiri atau kosong', async () => {
    expect((await GABUNG(req({ keId: 'p1' }), ctx)).status).toBe(400);
    expect((await GABUNG(req({}), ctx)).status).toBe(400);
    expect(gabungDonatur).not.toHaveBeenCalled();
  });
  it('404 bila salah satu donatur tidak ada', async () => {
    getDonatur.mockImplementation(async (_c: unknown, id: string) => (id === 'p2' ? null : { id }));
    expect((await GABUNG(req({ keId: 'p2' }), ctx)).status).toBe(404);
  });
});
