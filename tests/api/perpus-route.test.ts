// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NomorBentrokError } from '@/lib/perpus/nomor-panggil';

const repo = vi.hoisted(() => ({
  listBuku: vi.fn(), tambahBuku: vi.fn(), ubahBuku: vi.fn(), listDonasi: vi.fn(), tambahDonasi: vi.fn(),
  listPengadaan: vi.fn(), tambahPengadaan: vi.fn(), ambilRingkasan: vi.fn(),
}));
const requireRoom = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/perpus-repo', () => repo);
vi.mock('@/lib/auth/session', () => ({ requireRoom: (...a: unknown[]) => requireRoom(...a), authErrorResponse: () => null }));

import { GET as LIST_BUKU, POST as TAMBAH_BUKU } from '@/app/api/perpus/buku/route';
import { PATCH as UBAH_BUKU } from '@/app/api/perpus/buku/[id]/route';
import { POST as TAMBAH_DONASI } from '@/app/api/perpus/donasi/route';

const json = (body: unknown) => ({ url: 'http://x/api', json: async () => body }) as never;

beforeEach(() => {
  Object.values(repo).forEach(f => f.mockReset());
  requireRoom.mockReset().mockResolvedValue({ user: { id: 'u1' }, supabase: {} });
});

describe('API perpus', () => {
  it('GET buku meneruskan q & status, memakai ruangan perpus', async () => {
    repo.listBuku.mockResolvedValue([{ id: 'b1' }]);
    const res = await LIST_BUKU({ url: 'http://x/api/perpus/buku?q=liye&status=perlu_audit' } as never);
    expect(requireRoom).toHaveBeenCalledWith('perpus');
    expect(repo.listBuku).toHaveBeenCalledWith({}, { q: 'liye', statusKode: 'perlu_audit' });
    expect((await res.json()).data).toEqual([{ id: 'b1' }]);
  });
  it('POST buku: validasi gagal → 400', async () => {
    const res = await TAMBAH_BUKU(json({ judul: '', kelasDdc: '899.221' }));
    expect(res.status).toBe(400);
    expect(repo.tambahBuku).not.toHaveBeenCalled();
  });
  it('POST buku: bentrok → 409', async () => {
    repo.tambahBuku.mockRejectedValue(new NomorBentrokError('823 DOY s.03'));
    const res = await TAMBAH_BUKU(json({ judul: 'Sherlock 3', kelasDdc: '823', seri: { kode: 's', nomor: 3 } }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ nomor: '823 DOY s.03' });
  });
  it('POST buku: sukses → 201 dengan id pembuat', async () => {
    repo.tambahBuku.mockResolvedValue({ id: 'b1' });
    const res = await TAMBAH_BUKU(json({ judul: 'Rasa', penulis: 'Tere Liye', kelasDdc: '899.221' }));
    expect(res.status).toBe(201);
    expect(repo.tambahBuku.mock.calls[0][2]).toBe('u1');
  });
  it('PATCH buku meneruskan id', async () => {
    repo.ubahBuku.mockResolvedValue({ id: 'b1', aktif: false });
    const res = await UBAH_BUKU(json({ aktif: false }), { params: Promise.resolve({ id: 'b1' }) });
    expect(res.status).toBe(200);
    expect(repo.ubahBuku).toHaveBeenCalledWith({}, 'b1', { aktif: false });
  });
  it('POST donasi buku tanpa jumlahBuku → 400', async () => {
    const res = await TAMBAH_DONASI(json({ nama: 'Bu Siti', jenis: 'buku' }));
    expect(res.status).toBe(400);
  });
});
