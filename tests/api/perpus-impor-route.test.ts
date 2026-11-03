// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = vi.hoisted(() => ({ simpanRencana: vi.fn(), kosongkanPerpus: vi.fn(), ambilRingkasan: vi.fn() }));
const ambil = vi.hoisted(() => vi.fn());
const requireRoom = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/perpus-repo', () => repo);
vi.mock('@/lib/perpus/sumber', () => ({ ambilRencanaDariSheets: () => ambil() }));
vi.mock('@/lib/auth/session', () => ({ requireRoom: (...a: unknown[]) => requireRoom(...a), authErrorResponse: () => null }));

import { GET, POST } from '@/app/api/perpus/impor/route';

const rencana = {
  buku: [{ catatanAudit: 'Belum berkode' }, { catatanAudit: null }], donasi: [{}], pengadaan: [], tidakCocok: [{ sumber: 'wakaf', judul: 'X' }],
};
const post = (body: unknown) => ({ json: async () => body }) as never;

beforeEach(() => {
  Object.values(repo).forEach(f => f.mockReset());
  ambil.mockReset().mockResolvedValue(rencana);
  requireRoom.mockReset().mockResolvedValue({ user: { id: 'u1', roles: ['PUSTAKAWAN'] }, supabase: {} });
  repo.ambilRingkasan.mockResolvedValue({ judul: 0 });
  repo.simpanRencana.mockResolvedValue({ buku: 2, donasi: 1, pengadaan: 0 });
});

describe('impor perpus', () => {
  it('GET = pratinjau tanpa menulis', async () => {
    const res = await GET();
    expect((await res.json()).data).toEqual({ buku: 2, donasi: 1, pengadaan: 0, perluAudit: 1, tidakCocok: rencana.tidakCocok, sudahAda: 0 });
    expect(repo.simpanRencana).not.toHaveBeenCalled();
  });
  it('POST saat katalog kosong → simpan', async () => {
    const res = await POST(post({}));
    expect(res.status).toBe(201);
    expect(repo.simpanRencana).toHaveBeenCalledWith({}, rencana, 'u1');
    expect(repo.kosongkanPerpus).not.toHaveBeenCalled();
  });
  it('POST saat katalog berisi tanpa ulang → 409', async () => {
    repo.ambilRingkasan.mockResolvedValue({ judul: 5 });
    expect((await POST(post({}))).status).toBe(409);
  });
  it('ulang hanya untuk SUPERADMIN', async () => {
    repo.ambilRingkasan.mockResolvedValue({ judul: 5 });
    expect((await POST(post({ ulang: true }))).status).toBe(403);
    requireRoom.mockResolvedValue({ user: { id: 'u1', roles: ['SUPERADMIN'] }, supabase: {} });
    expect((await POST(post({ ulang: true }))).status).toBe(201);
    expect(repo.kosongkanPerpus).toHaveBeenCalled();
  });
});
