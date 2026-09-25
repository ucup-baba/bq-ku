// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const listDonatur = vi.fn();
const listSurat = vi.fn();
const getSurat = vi.fn();
const requireRoom = vi.fn();
const download = vi.fn();
const upload = vi.fn();
const renderPngSurat = vi.fn();

vi.mock('@/lib/db/donatur-repo', () => ({
  listDonatur: (...a: unknown[]) => listDonatur(...a),
  listSurat: (...a: unknown[]) => listSurat(...a),
  getSurat: (...a: unknown[]) => getSurat(...a),
}));
vi.mock('@/lib/surat/render-png', async () => {
  const { NextResponse } = await import('next/server');
  return {
    renderPngSurat: (...a: unknown[]) => renderPngSurat(...a),
    responsPng: (png: Uint8Array) => new NextResponse(png as BodyInit, { headers: { 'Content-Type': 'image/png' } }),
  };
});
const fakeSupabase = { storage: { from: () => ({ download, upload }) } };
vi.mock('@/lib/auth/session', () => ({
  requireRoom: (...a: unknown[]) => requireRoom(...a),
  authErrorResponse: () => null,
}));

import { GET as DONATUR } from '@/app/api/lembaga/donatur/route';
import { GET as SURAT } from '@/app/api/lembaga/surat/route';
import { GET as PNG } from '@/app/api/lembaga/surat/[id]/png/route';

const req = (url: string) => ({ url }) as never;

beforeEach(() => {
  requireRoom.mockReset().mockResolvedValue({ user: { id: 'u1' }, supabase: fakeSupabase });
  listDonatur.mockReset().mockResolvedValue([{ id: 'p1' }]);
  listSurat.mockReset().mockResolvedValue([]);
  getSurat.mockReset().mockResolvedValue({ id: 's1', nomorSurat: '5/PBQ/IX/2026', tanggalSurat: '2026-09-10', storagePath: null });
  download.mockReset();
  upload.mockReset();
  renderPngSurat.mockReset().mockResolvedValue(new Uint8Array([1, 2]));
});

describe('/api/lembaga/*', () => {
  it('donatur: memakai ruangan lembaga', async () => {
    const res = await DONATUR(req('http://x/api/lembaga/donatur?q=ar'));
    expect(res.status).toBe(200);
    expect(requireRoom).toHaveBeenCalledWith('lembaga');
    expect(listDonatur).toHaveBeenCalledWith(fakeSupabase, 'ar');
  });
  it('surat: menolak tanggal tidak valid', async () => {
    expect((await SURAT(req('http://x/api/lembaga/surat?dari=2026/01/01'))).status).toBe(400);
  });
  it('surat: meneruskan filter', async () => {
    await SURAT(req('http://x/api/lembaga/surat?dari=2026-09-01&sampai=2026-09-30&terkirim=false&limit=5'));
    expect(listSurat).toHaveBeenCalledWith(fakeSupabase, { dari: '2026-09-01', sampai: '2026-09-30', terkirim: false, limit: 5 });
  });
  it('PNG belum tersimpan: dirender tetapi TIDAK diunggah', async () => {
    const res = await PNG({} as never, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(200);
    expect(renderPngSurat).toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });
  it('PNG 404 bila surat tidak ada', async () => {
    getSurat.mockResolvedValue(null);
    expect((await PNG({} as never, { params: Promise.resolve({ id: 'x' }) })).status).toBe(404);
  });
});
