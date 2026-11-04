// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PinjamanError } from '@/lib/perpus/pinjaman';

const repo = vi.hoisted(() => ({ listPinjaman: vi.fn(), terapkanAksi: vi.fn(), listAnggota: vi.fn(), ubahStatusAnggota: vi.fn() }));
const requireRoom = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/perpus-pinjaman-repo', () => repo);
vi.mock('@/lib/auth/session', () => ({ requireRoom: (...a: unknown[]) => requireRoom(...a), authErrorResponse: () => null }));

import { GET as LIST } from '@/app/api/perpus/pinjaman/route';
import { PATCH as AKSI } from '@/app/api/perpus/pinjaman/[id]/route';
import { GET as ANGGOTA } from '@/app/api/perpus/anggota/route';
import { PATCH as BLOKIR } from '@/app/api/perpus/anggota/[id]/route';

const json = (body: unknown) => ({ json: async () => body }) as never;
const ctx = { params: Promise.resolve({ id: 'p1' }) };

beforeEach(() => {
  Object.values(repo).forEach(f => f.mockReset());
  requireRoom.mockReset().mockResolvedValue({ user: { id: 'u9' }, supabase: {} });
});

describe('API pinjaman pustakawan', () => {
  it('list memakai ruangan perpus', async () => {
    repo.listPinjaman.mockResolvedValue([{ id: 'p1' }]);
    expect((await (await LIST()).json()).data).toEqual([{ id: 'p1' }]);
    expect(requireRoom).toHaveBeenCalledWith('perpus');
  });
  it('ACC meneruskan id pustakawan', async () => {
    repo.terapkanAksi.mockResolvedValue({ id: 'p1' });
    expect((await AKSI(json({ aksi: 'acc' }), ctx)).status).toBe(200);
    expect(repo.terapkanAksi).toHaveBeenCalledWith({}, 'p1', { aksi: 'acc', jatuhTempo: null }, 'u9');
  });
  it('stok habis → 409 dengan pesan spec', async () => {
    repo.terapkanAksi.mockRejectedValue(new PinjamanError('stok_habis'));
    const res = await AKSI(json({ aksi: 'acc' }), ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('Semua eksemplar sedang dipinjam');
  });
  it('transisi tidak sah → 409 dengan status saat ini', async () => {
    repo.terapkanAksi.mockRejectedValue(new PinjamanError('status_tidak_sah', 'dikembalikan'));
    const res = await AKSI(json({ aksi: 'verifikasi' }), ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).status).toBe('dikembalikan');
  });
  it('aksi anggota tidak diterima di sini', async () => {
    expect((await AKSI(json({ aksi: 'klaim' }), ctx)).status).toBe(400);
  });
  it('daftar anggota', async () => {
    repo.listAnggota.mockResolvedValue([]);
    expect((await ANGGOTA()).status).toBe(200);
  });
  it('blokir anggota', async () => {
    repo.ubahStatusAnggota.mockResolvedValue({ userId: 'p1', status: 'diblokir' });
    expect((await BLOKIR(json({ status: 'diblokir' }), ctx)).status).toBe(200);
    expect(repo.ubahStatusAnggota).toHaveBeenCalledWith({}, 'p1', 'diblokir');
  });
  it('status anggota tak dikenal → 400', async () => {
    expect((await BLOKIR(json({ status: 'hapus' }), ctx)).status).toBe(400);
  });
});
