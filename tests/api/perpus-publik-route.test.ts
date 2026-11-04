// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PinjamanError } from '@/lib/perpus/pinjaman';

const repo = vi.hoisted(() => ({
  ambilStatusPinjam: vi.fn(), daftarAnggota: vi.fn(), ajukanPinjaman: vi.fn(), aksiAnggota: vi.fn(), listPinjamanku: vi.fn(),
}));
const requireMasuk = vi.hoisted(() => vi.fn());
const identitasDari = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/perpus-pinjaman-repo', () => repo);
vi.mock('@/lib/perpus/sesi-anggota', () => ({ requireMasuk: (...a: unknown[]) => requireMasuk(...a) }));
vi.mock('@/lib/auth/identitas', () => ({ identitasDari: (...a: unknown[]) => identitasDari(...a) }));
vi.mock('@/lib/supabase/server', () => ({ createServerSupabase: async () => ({}) }));

import { AuthError } from '@/lib/auth/session';
import { GET as STATUS } from '@/app/api/perpus-publik/status/route';
import { POST as DAFTAR } from '@/app/api/perpus-publik/daftar/route';
import { GET as LIST, POST as AJUKAN } from '@/app/api/perpus-publik/pinjaman/route';
import { PATCH as AKSI } from '@/app/api/perpus-publik/pinjaman/[id]/route';

const UUID = '11111111-1111-4111-8111-111111111111';
const json = (body: unknown) => ({ url: 'http://x/api', json: async () => body }) as never;
const ctx = { params: Promise.resolve({ id: UUID }) };

beforeEach(() => {
  Object.values(repo).forEach(f => f.mockReset());
  requireMasuk.mockReset().mockResolvedValue({ userId: 'u1', supabase: {} });
  identitasDari.mockReset().mockResolvedValue(null);
});

describe('API perpus-publik', () => {
  it('status tanpa sesi tetap 200', async () => {
    repo.ambilStatusPinjam.mockResolvedValue({ masuk: false });
    const res = await STATUS({ url: `http://x/api?buku=${UUID}` } as never);
    expect(res.status).toBe(200);
    expect(repo.ambilStatusPinjam).toHaveBeenCalledWith({}, null, UUID);
  });
  it('status tanpa buku valid → 400', async () => {
    expect((await STATUS({ url: 'http://x/api?buku=abc' } as never)).status).toBe(400);
  });
  it('daftar menormalkan nomor', async () => {
    repo.daftarAnggota.mockResolvedValue({ userId: 'u1' });
    const res = await DAFTAR(json({ nama: 'Aisyah', noWa: '081234567890' }));
    expect(res.status).toBe(201);
    expect(repo.daftarAnggota).toHaveBeenCalledWith({}, { nama: 'Aisyah', noWa: '6281234567890' });
  });
  it('daftar tanpa sesi → 401', async () => {
    requireMasuk.mockRejectedValue(new AuthError(401, 'UNAUTHENTICATED', 'Silakan masuk terlebih dahulu'));
    expect((await DAFTAR(json({ nama: 'Aisyah', noWa: '081234567890' }))).status).toBe(401);
  });
  it('ajukan stok habis → 409 dengan kode', async () => {
    repo.ajukanPinjaman.mockRejectedValue(new PinjamanError('stok_habis'));
    const res = await AJUKAN(json({ bukuId: UUID }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ kode: 'stok_habis', error: 'Semua eksemplar sedang dipinjam' });
  });
  it('ajukan diblokir → 403', async () => {
    repo.ajukanPinjaman.mockRejectedValue(new PinjamanError('diblokir'));
    expect((await AJUKAN(json({ bukuId: UUID }))).status).toBe(403);
  });
  it('list memakai klien sesi', async () => {
    repo.listPinjamanku.mockResolvedValue([{ id: 'p1' }]);
    expect((await (await LIST()).json()).data).toEqual([{ id: 'p1' }]);
  });
  it('aksi tidak dikenal → 400', async () => {
    expect((await AKSI(json({ aksi: 'acc' }), ctx)).status).toBe(400);
    expect(repo.aksiAnggota).not.toHaveBeenCalled();
  });
  it('transisi tidak sah → 409 dengan status saat ini', async () => {
    repo.aksiAnggota.mockRejectedValue(new PinjamanError('status_tidak_sah', 'dipinjam'));
    const res = await AKSI(json({ aksi: 'batal' }), ctx);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ status: 'dipinjam' });
  });
});
