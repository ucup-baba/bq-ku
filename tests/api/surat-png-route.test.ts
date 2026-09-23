// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const getSurat = vi.fn();
const setSuratStoragePath = vi.fn();
const upload = vi.fn();
const loadSuratAssets = vi.fn();

vi.mock('@/lib/db/donatur-repo', () => ({
  getSurat: (...a: any[]) => getSurat(...a),
  setSuratStoragePath: (...a: any[]) => setSuratStoragePath(...a),
}));
vi.mock('@/lib/surat/assets', () => ({
  loadSuratAssets: (...a: any[]) => loadSuratAssets(...a),
  loadSuratFonts: async () => [],
}));
vi.mock('@/lib/surat/data', () => ({ buildSuratData: (s: any) => s }));
vi.mock('@/components/donatur/SuratTemplate', () => ({ SuratTemplate: () => null }));
vi.mock('next/og', () => ({
  ImageResponse: class { arrayBuffer() { return Promise.resolve(new Uint8Array([137, 80, 78, 71]).buffer); } },
}));

const fakeSupabase = { storage: { from: () => ({ upload: (...a: any[]) => upload(...a) }) } };
vi.mock('@/lib/auth/session', () => ({
  requireRoom: vi.fn(async () => ({ user: { id: 'u1' }, supabase: fakeSupabase })),
  authErrorResponse: () => null,
}));

import { GET } from '@/app/api/donatur/surat/[id]/png/route';

const ctx = { params: Promise.resolve({ id: 'surat-1' }) };
const surat = { id: 'surat-1', nomorSurat: '5/PBQ/IX/2026', tanggalSurat: '2026-09-01', storagePath: null };
let errSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  getSurat.mockReset().mockResolvedValue(surat);
  setSuratStoragePath.mockReset().mockResolvedValue(undefined);
  upload.mockReset();
  loadSuratAssets.mockReset().mockResolvedValue({});
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errSpy.mockRestore());

describe('GET /api/donatur/surat/[id]/png', () => {
  it('unggah berhasil -> storagePath disimpan, tanpa log galat', async () => {
    upload.mockResolvedValue({ error: null });
    const res = await GET({} as any, ctx);
    expect(res.status).toBe(200);
    expect(upload.mock.calls[0][0]).toBe('surat/2026/5-PBQ-IX-2026.png');
    expect(setSuratStoragePath).toHaveBeenCalledWith(fakeSupabase, 'surat-1', 'surat/2026/5-PBQ-IX-2026.png');
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('unggah ditolak storage -> PNG tetap dikirim, galat dicatat, storagePath tidak diubah', async () => {
    upload.mockResolvedValue({ error: { message: 'new row violates row-level security policy' } });
    const res = await GET({} as any, ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(setSuratStoragePath).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(errSpy.mock.calls[0])).toContain('row-level security');
  });

  it('galat tak terduga -> 500 dengan pesan generik (tanpa e.message), galat dicatat', async () => {
    loadSuratAssets.mockRejectedValue(new Error('ENOENT: /var/task/assets/surat/ttd.png'));
    const res = await GET({} as any, ctx);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Gagal membuat gambar surat' });
    expect(JSON.stringify(body)).not.toContain('ENOENT');
    expect(errSpy).toHaveBeenCalled();
  });
});
