// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PinjamanError } from '@/lib/perpus/pinjaman';

const repo = vi.hoisted(() => ({
  ambilCatatanBuku: vi.fn(), simpanCatatan: vi.fn(), hapusCatatan: vi.fn(), tutupPemberitahuan: vi.fn(),
  listCatatanku: vi.fn(), listCatatanModerasi: vi.fn(), moderasiCatatan: vi.fn(),
}));
const penulis = vi.hoisted(() => ({ listPenulisAdmin: vi.fn(), simpanPenulis: vi.fn() }));
const requireMasuk = vi.hoisted(() => vi.fn());
const requireUser = vi.hoisted(() => vi.fn());
const requireRoom = vi.hoisted(() => vi.fn());
const identitasDari = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/perpus-catatan-repo', () => repo);
vi.mock('@/lib/db/perpus-penulis-repo', () => penulis);
vi.mock('@/lib/perpus/sesi-anggota', () => ({ requireMasuk: (...a: unknown[]) => requireMasuk(...a) }));
vi.mock('@/lib/auth/identitas', () => ({ identitasDari: (...a: unknown[]) => identitasDari(...a) }));
vi.mock('@/lib/supabase/server', () => ({ createServerSupabase: async () => ({}) }));
vi.mock('@/lib/auth/session', () => ({
  requireUser: (...a: unknown[]) => requireUser(...a), requireRoom: (...a: unknown[]) => requireRoom(...a), authErrorResponse: () => null,
}));

import { GET as CATATAN_BUKU, POST as SIMPAN } from '@/app/api/perpus-publik/catatan/route';
import { DELETE as HAPUS, PATCH as TUTUP } from '@/app/api/perpus-publik/catatan/[id]/route';
import { GET as CATATANKU } from '@/app/api/perpus-publik/catatan/saya/route';
import { GET as MODERASI_LIST } from '@/app/api/perpus/catatan/route';
import { DELETE as MODERASI } from '@/app/api/perpus/catatan/[id]/route';
import { GET as PENULIS_LIST, PUT as PENULIS_SIMPAN } from '@/app/api/perpus/penulis/route';

const UUID = '11111111-1111-4111-8111-111111111111';
const json = (body: unknown) => ({ json: async () => body }) as never;
const ctx = { params: Promise.resolve({ id: UUID }) };

beforeEach(() => {
  Object.values(repo).forEach(f => f.mockReset());
  Object.values(penulis).forEach(f => f.mockReset());
  requireMasuk.mockReset().mockResolvedValue({ userId: 'u1', email: 'a@x', supabase: {} });
  requireUser.mockReset().mockResolvedValue({ user: { id: 'adm' }, supabase: {} });
  requireRoom.mockReset().mockResolvedValue({ user: { id: 'pus' }, supabase: {} });
  identitasDari.mockReset().mockResolvedValue(null);
});

describe('catatan anggota', () => {
  it('tamu bisa membaca catatan publik', async () => {
    repo.ambilCatatanBuku.mockResolvedValue({ publik: [], milikku: null, bolehTulis: false });
    const res = await CATATAN_BUKU({ url: `http://x/api?buku=${UUID}` } as never);
    expect(res.status).toBe(200);
    expect(repo.ambilCatatanBuku).toHaveBeenCalledWith({}, null, UUID);
  });
  it('buku tidak valid → 400', async () => {
    expect((await CATATAN_BUKU({ url: 'http://x/api?buku=abc' } as never)).status).toBe(400);
  });
  it('simpan: bawaan publik', async () => {
    repo.simpanCatatan.mockResolvedValue({ id: 'c1' });
    expect((await SIMPAN(json({ bukuId: UUID, isi: ' Bagus ' }))).status).toBe(201);
    expect(repo.simpanCatatan).toHaveBeenCalledWith({}, { bukuId: UUID, isi: 'Bagus', publik: true });
  });
  it('simpan privat & isi kosong', async () => {
    repo.simpanCatatan.mockResolvedValue({ id: 'c1' });
    await SIMPAN(json({ bukuId: UUID, isi: 'x', publik: false }));
    expect(repo.simpanCatatan.mock.calls[0][1].publik).toBe(false);
    expect((await SIMPAN(json({ bukuId: UUID, isi: '   ' }))).status).toBe(400);
    expect((await SIMPAN(json({ bukuId: UUID, isi: 'a'.repeat(1001) }))).status).toBe(400);
  });
  it('belum pernah pinjam → 403 dengan kode', async () => {
    repo.simpanCatatan.mockRejectedValue(new PinjamanError('belum_pernah_pinjam'));
    const res = await SIMPAN(json({ bukuId: UUID, isi: 'x' }));
    expect(res.status).toBe(403);
    expect((await res.json()).kode).toBe('belum_pernah_pinjam');
  });
  it('hapus & tutup pemberitahuan', async () => {
    expect((await HAPUS({} as never, ctx)).status).toBe(200);
    expect(repo.hapusCatatan).toHaveBeenCalledWith({}, UUID);
    expect((await TUTUP({} as never, ctx)).status).toBe(200);
    expect(repo.tutupPemberitahuan).toHaveBeenCalledWith({}, UUID);
  });
  it('catatan milik sendiri wajib sesi', async () => {
    repo.listCatatanku.mockResolvedValue([{ id: 'c1' }]);
    expect((await (await CATATANKU()).json()).data).toEqual([{ id: 'c1' }]);
    expect(requireMasuk).toHaveBeenCalled();
  });
});

describe('moderasi', () => {
  it('hanya SUPERADMIN', async () => {
    repo.listCatatanModerasi.mockResolvedValue([]);
    await MODERASI_LIST();
    expect(requireUser).toHaveBeenCalledWith(['SUPERADMIN']);
    await MODERASI(json({ alasan: 'Tidak pantas' }), ctx);
    expect(requireUser).toHaveBeenLastCalledWith(['SUPERADMIN']);
    expect(repo.moderasiCatatan).toHaveBeenCalledWith({}, UUID, 'Tidak pantas');
  });
  it('tanpa alasan tetap boleh', async () => {
    await MODERASI(json({}), ctx);
    expect(repo.moderasiCatatan).toHaveBeenCalledWith({}, UUID, null);
  });
});

describe('penulis', () => {
  it('list memakai ruangan perpus', async () => {
    penulis.listPenulisAdmin.mockResolvedValue([]);
    await PENULIS_LIST();
    expect(requireRoom).toHaveBeenCalledWith('perpus');
  });
  it('instagram dibersihkan dari @ dan URL', async () => {
    penulis.simpanPenulis.mockResolvedValue({ nama: 'Tere Liye' });
    await PENULIS_SIMPAN(json({ nama: 'Tere Liye', instagram: 'https://www.instagram.com/tereliyewriter/' }));
    expect(penulis.simpanPenulis.mock.calls[0][1].instagram).toBe('tereliyewriter');
    await PENULIS_SIMPAN(json({ nama: 'Tere Liye', instagram: '@tereliyewriter' }));
    expect(penulis.simpanPenulis.mock.calls[1][1].instagram).toBe('tereliyewriter');
  });
  it('instagram tidak valid → 400', async () => {
    expect((await PENULIS_SIMPAN(json({ nama: 'X', instagram: 'bukan akun!' }))).status).toBe(400);
  });
});
