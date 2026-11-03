// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = vi.hoisted(() => ({ unggahSampulBuku: vi.fn() }));
const requireRoom = vi.hoisted(() => vi.fn());
const toBuffer = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/perpus-repo', () => repo);
vi.mock('@/lib/auth/session', () => ({ requireRoom: (...a: unknown[]) => requireRoom(...a), authErrorResponse: () => null }));
vi.mock('sharp', () => ({ default: () => { const s: any = { rotate: () => s, resize: () => s, webp: () => s, toBuffer }; return s; } }));

import { POST } from '@/app/api/perpus/buku/[id]/sampul/route';

const permintaan = (berkas?: File) => {
  const fd = new FormData();
  if (berkas) fd.set('berkas', berkas);
  return { formData: async () => fd } as never;
};
const konteks = { params: Promise.resolve({ id: 'b1' }) };
const gambar = (ukuran = 10, tipe = 'image/jpeg') => new File([new Uint8Array(ukuran)], 'a.jpg', { type: tipe });

beforeEach(() => {
  repo.unggahSampulBuku.mockReset();
  toBuffer.mockReset().mockResolvedValue(Buffer.from('webp'));
  requireRoom.mockReset().mockResolvedValue({ user: { id: 'u1' }, supabase: {} });
});

describe('POST sampul', () => {
  it('memakai ruangan perpus & menyimpan hasil konversi', async () => {
    repo.unggahSampulBuku.mockResolvedValue({ id: 'b1', sampulPath: 'b1/1.webp' });
    const res = await POST(permintaan(gambar()), konteks);
    expect(requireRoom).toHaveBeenCalledWith('perpus');
    expect(repo.unggahSampulBuku).toHaveBeenCalledWith({}, 'b1', Buffer.from('webp'));
    expect((await res.json()).data.sampulPath).toBe('b1/1.webp');
  });
  it('tanpa berkas, bukan gambar, atau terlalu besar → 400', async () => {
    for (const r of [permintaan(), permintaan(gambar(10, 'application/pdf')), permintaan(gambar(4 * 1024 * 1024 + 1))]) {
      expect((await POST(r, konteks)).status).toBe(400);
    }
    expect(repo.unggahSampulBuku).not.toHaveBeenCalled();
  });
  it('gambar rusak → 400', async () => {
    toBuffer.mockRejectedValue(new Error('format'));
    expect((await POST(permintaan(gambar()), konteks)).status).toBe(400);
  });
});
