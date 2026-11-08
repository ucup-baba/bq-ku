// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MigrasiBelumError } from '@/lib/db/perpus-cek-repo';

const repo = vi.hoisted(() => ({
  ambilSesi: vi.fn(), mulaiSesi: vi.fn(), muatDaftar: vi.fn(), simpanItem: vi.fn(), hapusItem: vi.fn(),
  selesaikanSesi: vi.fn(), muatRiwayat: vi.fn(), listBukuStiker: vi.fn(),
}));
const requireRoom = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/perpus-cek-repo', async (asli) => ({ ...(await asli<object>()), ...repo }));
vi.mock('@/lib/auth/session', () => ({ requireRoom: (...a: unknown[]) => requireRoom(...a), authErrorResponse: () => null }));

import { GET as DAFTAR, POST as MULAI } from '@/app/api/perpus/cek/route';
import { PUT as SIMPAN, DELETE as HAPUS } from '@/app/api/perpus/cek/[id]/item/route';
import { POST as SELESAI } from '@/app/api/perpus/cek/[id]/selesai/route';
import { GET as STIKER } from '@/app/api/perpus/stiker/route';

const UUID = '11111111-1111-4111-8111-111111111111';
const json = (body: unknown, url = 'http://x/api') => ({ url, json: async () => body }) as never;
const ctx = { params: Promise.resolve({ id: UUID }) };

beforeEach(() => {
  Object.values(repo).forEach(f => f.mockReset());
  requireRoom.mockReset().mockResolvedValue({ user: { id: 'p1' }, supabase: {} });
  vi.stubEnv('PERPUS_HOST', 'perpusbq.vercel.app');
});

describe('API cek bulanan', () => {
  it('daftar bulan berjalan memakai ruangan perpus', async () => {
    repo.ambilSesi.mockResolvedValue(null);
    const res = await DAFTAR(json(null, 'http://x/api/perpus/cek'));
    expect(requireRoom).toHaveBeenCalledWith('perpus');
    expect((await res.json()).data).toMatchObject({ sesi: null, baris: [] });
  });
  it('migrasi belum dijalankan → 503 dengan pesan jelas', async () => {
    repo.ambilSesi.mockRejectedValue(new MigrasiBelumError());
    const res = await DAFTAR(json(null, 'http://x/api/perpus/cek'));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain('0019');
  });
  it('mulai sesi bulan ini', async () => {
    repo.mulaiSesi.mockResolvedValue({ id: UUID });
    expect((await MULAI()).status).toBe(201);
    expect(repo.mulaiSesi.mock.calls[0][1]).toMatch(/^\d{4}-\d{2}$/);
  });
  it('simpan hasil tervalidasi', async () => {
    repo.simpanItem.mockResolvedValue({});
    expect((await SIMPAN(json({ bukuId: UUID, hasil: 'ada', jumlahAda: 1 }), ctx)).status).toBe(200);
    expect(repo.simpanItem).toHaveBeenCalledWith({}, UUID, { bukuId: UUID, hasil: 'ada', jumlahAda: 1, catatan: null }, 'p1');
    expect((await SIMPAN(json({ bukuId: UUID, hasil: 'dipinjam' }), ctx)).status).toBe(400);
  });
  it('batalkan hasil satu buku', async () => {
    await HAPUS(json(null, `http://x/api?buku=${UUID}`), ctx);
    expect(repo.hapusItem).toHaveBeenCalledWith({}, UUID, UUID);
  });
  it('selesaikan sesi', async () => {
    repo.selesaikanSesi.mockResolvedValue({ id: UUID });
    expect((await SELESAI(json({}), ctx)).status).toBe(200);
    expect(repo.selesaikanSesi).toHaveBeenCalledWith({}, UUID, 'p1');
  });
  it('stiker: PDF, satu stiker per eksemplar, tanpa nomor sementara', async () => {
    repo.listBukuStiker.mockResolvedValue([
      { id: '82595bcf-0000-4000-8000-000000000000', nomorPanggil: '813 LIY a', eksemplar: 2 },
      { id: 'abcd1234-0000-4000-8000-000000000000', nomorPanggil: 'TMP-3', eksemplar: 1 },
    ]);
    const res = await STIKER(json(null, 'http://x/api/perpus/stiker'));
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('X-Jumlah-Stiker')).toBe('2');
  });
});
