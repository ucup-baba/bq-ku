// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getSurat = vi.fn();
const hapusSuratBesertaDonasi = vi.fn();
const ubahSurat = vi.fn();
const remove = vi.fn();

vi.mock('@/lib/db/donatur-repo', () => {
  class HapusDitolakError extends Error {}
  class SuratTerkunciError extends Error {}
  return {
    getSurat: (...a: unknown[]) => getSurat(...a),
    markSuratTerkirim: vi.fn(),
    hapusSuratBesertaDonasi: (...a: unknown[]) => hapusSuratBesertaDonasi(...a),
    ubahSurat: (...a: unknown[]) => ubahSurat(...a),
    HapusDitolakError, SuratTerkunciError,
  };
});
const fakeSupabase = { storage: { from: () => ({ remove: (...a: unknown[]) => remove(...a) }) } };
vi.mock('@/lib/auth/session', () => ({
  requireRoom: vi.fn(async () => ({ user: { id: 'u1' }, supabase: fakeSupabase })),
  authErrorResponse: () => null,
}));

import { DELETE, PUT } from '@/app/api/donatur/surat/[id]/route';
import { HapusDitolakError } from '@/lib/db/donatur-repo';

const ctx = { params: Promise.resolve({ id: 's1' }) };
const surat = { id: 's1', donasiId: 'd1', nomorSurat: '5/PBQ/IX/2026', tanggalSurat: '2026-09-10', terkirimWa: false, storagePath: 'surat/2026/5-PBQ-IX-2026-v5.png', donasi: { donaturId: 'p1' } };
const body = { donasi: { donaturId: 'p1', tanggal: '2026-09-10', jenis: 'INFAQ', bentuk: 'UANG', nominal: 50000 }, tanggalSurat: '2026-09-12', gayaTulisan: 'KALAM' };
const req = (b: unknown) => ({ json: async () => b }) as never;

beforeEach(() => {
  getSurat.mockReset().mockResolvedValue(surat);
  hapusSuratBesertaDonasi.mockReset().mockResolvedValue(surat.storagePath);
  ubahSurat.mockReset().mockResolvedValue(undefined);
  remove.mockReset().mockResolvedValue({ error: null });
});

describe('DELETE /api/donatur/surat/[id]', () => {
  it('menghapus surat+donasi lalu PNG-nya di storage', async () => {
    const res = await DELETE({} as never, ctx);
    expect(res.status).toBe(200);
    expect(hapusSuratBesertaDonasi).toHaveBeenCalledWith(fakeSupabase, surat);
    expect(remove).toHaveBeenCalledWith([surat.storagePath]);
  });
  it('404 bila surat tidak ada', async () => {
    getSurat.mockResolvedValue(null);
    expect((await DELETE({} as never, ctx)).status).toBe(404);
  });
  it('403 bila RLS menolak penghapusan', async () => {
    hapusSuratBesertaDonasi.mockRejectedValue(new HapusDitolakError());
    expect((await DELETE({} as never, ctx)).status).toBe(403);
    expect(remove).not.toHaveBeenCalled();
  });
});

describe('PUT /api/donatur/surat/[id]', () => {
  it('mengubah surat yang belum terkirim', async () => {
    const res = await PUT(req(body), ctx);
    expect(res.status).toBe(200);
    expect(ubahSurat).toHaveBeenCalledOnce();
  });
  it('409 bila surat sudah terkirim', async () => {
    getSurat.mockResolvedValue({ ...surat, terkirimWa: true });
    expect((await PUT(req(body), ctx)).status).toBe(409);
    expect(ubahSurat).not.toHaveBeenCalled();
  });
  it('400 bila tanggal surat keluar dari bulan nomor surat', async () => {
    const res = await PUT(req({ ...body, tanggalSurat: '2026-08-20' }), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).fields.tanggalSurat).toContain('IX/2026');
  });
  it('400 bila nominal kosong untuk donasi uang', async () => {
    const res = await PUT(req({ ...body, donasi: { ...body.donasi, nominal: undefined } }), ctx);
    expect(res.status).toBe(400);
  });
});
