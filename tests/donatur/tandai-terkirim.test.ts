import { describe, it, expect, vi } from 'vitest';
import { tandaiTerkirim } from '@/lib/donatur/tandai-terkirim';

const respons = (ok: boolean, body: unknown) => ({ ok, json: async () => body }) as Response;

describe('tandaiTerkirim', () => {
  it('berhasil → null, memakai PATCH terkirimWa:true', async () => {
    const f = vi.fn().mockResolvedValue(respons(true, { data: {} }));
    expect(await tandaiTerkirim('abc', f)).toBeNull();
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('/api/donatur/surat/abc');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ terkirimWa: true });
  });
  it('galat server → pesan dari server', async () => {
    const f = vi.fn().mockResolvedValue(respons(false, { error: 'Tidak berhak' }));
    expect(await tandaiTerkirim('abc', f)).toBe('Tidak berhak');
  });
  it('jaringan putus → pesan koneksi', async () => {
    const f = vi.fn().mockRejectedValue(new Error('offline'));
    expect(await tandaiTerkirim('abc', f)).toBe('Tidak dapat terhubung ke server.');
  });
});
