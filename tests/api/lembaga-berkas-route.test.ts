// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('server-only', () => ({}));

const hak = vi.hoisted(() => ({ nilai: { lihat: true, kelola: true, rahasia: true, hapus: true, aturSaklar: true } }));
const periksa = vi.fn();
const createSignedUploadUrl = vi.fn();
const repo = vi.hoisted(() => ({
  listBerkas: vi.fn(), buatBerkas: vi.fn(), tambahVersi: vi.fn(), catatAkses: vi.fn(), segarkanSuratBelumTerkirim: vi.fn(),
  buatTautan: vi.fn(), listTautan: vi.fn(), versiTerbaru: (b: { versi: unknown[] }) => b.versi[0] ?? null,
}));
const supabase = { storage: { from: () => ({ createSignedUploadUrl: (...a: unknown[]) => createSignedUploadUrl(...a) }) } };

vi.mock('@/lib/lembaga/konteks-berkas', () => ({
  konteksBerkas: async () => ({ user: { id: 'u1', roles: ['SUPERADMIN'] }, supabase, hak: hak.nilai }),
  bucketBerkas: () => 'berkas',
  periksaObjekUnggahan: (...a: unknown[]) => periksa(...a),
  tolak: (pesan: string) => Response.json({ error: pesan }, { status: 403 }),
  PESAN_KELOLA_MATI: 'Pengelolaan berkas sedang dinonaktifkan Superadmin',
}));
vi.mock('@/lib/db/berkas-lembaga-repo', () => repo);
vi.mock('@/lib/surat/pengesahan', () => ({ lupakanAsetPengesahan: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ authErrorResponse: () => null, requireUser: vi.fn() }));

import { POST as UNGGAH_URL } from '@/app/api/lembaga/berkas/unggah-url/route';
import { POST as BUAT } from '@/app/api/lembaga/berkas/route';
import { POST as TAUTAN } from '@/app/api/lembaga/tautan/route';

const req = (body: unknown, url = 'http://x/api') => ({ url, json: async () => body }) as never;
const uuid = '3f2b8c1e-9d4a-4b6f-8e2a-1c5d7f9a0b12';

beforeEach(() => {
  hak.nilai = { lihat: true, kelola: true, rahasia: true, hapus: true, aturSaklar: true };
  periksa.mockReset().mockResolvedValue(null);
  createSignedUploadUrl.mockReset().mockResolvedValue({ data: { token: 'tok' }, error: null });
  Object.values(repo).forEach(f => typeof f === 'function' && 'mockReset' in f && (f as ReturnType<typeof vi.fn>).mockReset());
  repo.buatBerkas.mockResolvedValue({ id: 'b1', jenis: 'NPWP' });
  repo.tambahVersi.mockResolvedValue({ id: 'v1', versi: 1 });
});

describe('unggah-url', () => {
  it('saklar mati (Pengurus) → 403 dengan pesan jelas', async () => {
    hak.nilai = { ...hak.nilai, kelola: false, rahasia: false };
    const res = await UNGGAH_URL(req({ jenis: 'NPWP', namaFile: 'n.pdf', mime: 'application/pdf', ukuran: 100 }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/dinonaktifkan/);
  });
  it('Pengurus tidak bisa unggah cap walau saklar nyala', async () => {
    hak.nilai = { ...hak.nilai, rahasia: false };
    expect((await UNGGAH_URL(req({ jenis: 'CAP', namaFile: 'c.png', mime: 'image/png', ukuran: 100 }))).status).toBe(403);
  });
  it('format tidak didukung → 400; valid → path lembaga/ bernama UUID', async () => {
    expect((await UNGGAH_URL(req({ jenis: 'NPWP', namaFile: 'n.zip', mime: 'application/zip', ukuran: 100 }))).status).toBe(400);
    const res = await UNGGAH_URL(req({ jenis: 'TANDA_TANGAN', namaFile: 't.png', mime: 'image/png', ukuran: 100 }));
    const { data } = await res.json();
    expect(data.path).toMatch(/^lembaga\/rahasia\/[0-9a-f-]{36}\.png$/);
    expect(data.token).toBe('tok');
  });
});

describe('buat berkas', () => {
  const body = (path: string) => ({ data: { jenis: 'NPWP', nomorDokumen: '01.234' }, file: { path, namaFile: 'n.pdf', mime: 'application/pdf', ukuran: 100 } });
  it('berkas biasa tidak boleh memakai folder rahasia', async () => {
    expect((await BUAT(req(body(`lembaga/rahasia/${uuid}.pdf`)))).status).toBe(400);
  });
  it('objek belum ada di storage → 400', async () => {
    periksa.mockResolvedValue('Berkas belum terunggah. Coba unggah ulang.');
    expect((await BUAT(req(body(`lembaga/${uuid}.pdf`)))).status).toBe(400);
    expect(repo.buatBerkas).not.toHaveBeenCalled();
  });
  it('berhasil: buat berkas + versi 1 + catat UNGGAH', async () => {
    const res = await BUAT(req(body(`lembaga/${uuid}.pdf`)));
    expect(res.status).toBe(201);
    expect(repo.tambahVersi).toHaveBeenCalledWith(supabase, 'b1', expect.objectContaining({ storagePath: `lembaga/${uuid}.pdf` }), 'u1');
    expect(repo.catatAkses).toHaveBeenCalledWith(supabase, 'UNGGAH', { berkasId: 'b1', versiId: 'v1' });
    expect(repo.segarkanSuratBelumTerkirim).not.toHaveBeenCalled();
  });
});

describe('buat tautan', () => {
  const dasar = { penerima: 'CSR Bank X', hari: 7, tandaAir: true, pakaiPin: true, berkasIds: ['b1'] };
  it('cap/tanda tangan ditolak', async () => {
    repo.listBerkas.mockResolvedValue([{ id: 'b1', jenis: 'CAP', versi: [{}] }]);
    const res = await TAUTAN(req(dasar));
    expect(res.status).toBe(400);
    expect(repo.buatTautan).not.toHaveBeenCalled();
  });
  it('berkas belum diunggah ditolak', async () => {
    repo.listBerkas.mockResolvedValue([{ id: 'b1', jenis: 'NPWP', versi: [] }]);
    expect((await TAUTAN(req(dasar))).status).toBe(400);
  });
  it('berhasil: tautan & PIN hanya di respons, tidak di-cache', async () => {
    repo.listBerkas.mockResolvedValue([{ id: 'b1', jenis: 'NPWP', versi: [{}] }]);
    repo.buatTautan.mockResolvedValue({ id: 't1', token: 'TOKENRAHASIA', pin: '123456', kedaluwarsaAt: 'x' });
    const res = await TAUTAN(req(dasar, 'https://bq-ku.vercel.app/api/lembaga/tautan'));
    expect(res.status).toBe(201);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const { data } = await res.json();
    expect(data).toMatchObject({ url: 'https://bq-ku.vercel.app/bagikan/TOKENRAHASIA', pin: '123456' });
    expect(repo.catatAkses).toHaveBeenCalledWith(supabase, 'BUAT_TAUTAN', expect.objectContaining({ tautanId: 't1' }));
  });
});
