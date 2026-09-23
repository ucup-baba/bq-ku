// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

const requireRoom = vi.fn(async () => ({ user: { id: 'u1' }, supabase: {} }));
vi.mock('@/lib/auth/session', () => ({
  requireRoom: (...a: unknown[]) => requireRoom(...(a as [])),
  authErrorResponse: (e: unknown) => ((e as Error)?.message === 'tolak' ? new Response(null, { status: 403 }) : null),
}));

import { GET } from '@/app/api/donatur/surat/aset/[nama]/route';

const panggil = (nama: string) => GET({} as never, { params: Promise.resolve({ nama }) });

describe('GET /api/donatur/surat/aset/[nama]', () => {
  it('menyajikan aset dalam daftar putih dengan tipe MIME yang benar', async () => {
    const res = await panggil('kop.png');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    const font = await panggil('Kalam-Regular.ttf');
    expect(font.headers.get('Content-Type')).toBe('font/ttf');
  });
  it('menolak nama di luar daftar putih, termasuk path traversal', async () => {
    for (const nama of ['../../.env.local', 'fonts/Kalam-Regular.ttf', 'rahasia.png', 'constructor']) {
      expect((await panggil(nama)).status).toBe(404);
    }
  });
  it('tanpa akses ruang donatur → ditolak', async () => {
    requireRoom.mockRejectedValueOnce(new Error('tolak'));
    expect((await panggil('ttd-rotasi.png')).status).toBe(403);
  });
});
