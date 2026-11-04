import { describe, it, expect } from 'vitest';
import { ambilCatatanBuku, hapusCatatan, moderasiCatatan, simpanCatatan } from '@/lib/db/perpus-catatan-repo';
import { PinjamanError } from '@/lib/perpus/pinjaman';

function rantai(hasil: unknown, catat: unknown[][]) {
  const r: any = new Proxy({}, {
    get: (_t, k) => (k === 'then' ? (ok: (v: unknown) => void) => ok(hasil) : (...a: unknown[]) => { catat.push([k, ...a]); return r; }),
  });
  return r;
}
const klien = (tabel: Record<string, unknown>, rpc: unknown = { data: null, error: null }, catat: unknown[][] = []) => ({
  from: (t: string) => { catat.push(['from', t]); return rantai(tabel[t], catat); },
  rpc: async (...a: unknown[]) => { catat.push(['rpc', ...a]); return rpc; },
}) as never;

describe('repo catatan', () => {
  it('simpan lewat RPC', async () => {
    const catat: unknown[][] = [];
    await simpanCatatan(klien({}, { data: {}, error: null }, catat), { bukuId: 'b', isi: 'x', publik: false });
    expect(catat).toContainEqual(['rpc', 'perpus_simpan_catatan', { p_buku: 'b', p_isi: 'x', p_publik: false }]);
  });
  it('galat RPC menjadi PinjamanError', async () => {
    await expect(hapusCatatan(klien({}, { data: null, error: { message: 'perpus:catatan_tidak_ada' } }), 'c')).rejects.toBeInstanceOf(PinjamanError);
  });
  it('moderasi meneruskan alasan', async () => {
    const catat: unknown[][] = [];
    await moderasiCatatan(klien({}, { data: {}, error: null }, catat), 'c', 'Spam');
    expect(catat).toContainEqual(['rpc', 'perpus_moderasi_catatan', { p_id: 'c', p_alasan: 'Spam' }]);
  });
  it('tamu hanya membaca publik', async () => {
    const catat: unknown[][] = [];
    const r = await ambilCatatanBuku(klien({ perpus_catatan_publik: { data: [{ id: '1' }], error: null } }, undefined, catat), null, 'b');
    expect(r).toEqual({ publik: [{ id: '1' }], milikku: null, bolehTulis: false });
    expect(catat).not.toContainEqual(['from', 'perpus_catatanku']);
  });
  it('anggota yang pernah meminjam boleh menulis', async () => {
    const r = await ambilCatatanBuku(klien({
      perpus_catatan_publik: { data: [], error: null },
      perpus_catatanku: { data: { id: 'c' }, error: null },
      perpus_pinjaman: { count: 1, error: null },
    }), 'u', 'b');
    expect(r).toMatchObject({ milikku: { id: 'c' }, bolehTulis: true });
  });
  it('belum pernah meminjam tidak boleh', async () => {
    const r = await ambilCatatanBuku(klien({
      perpus_catatan_publik: { data: [], error: null },
      perpus_catatanku: { data: null, error: null },
      perpus_pinjaman: { count: 0, error: null },
    }), 'u', 'b');
    expect(r.bolehTulis).toBe(false);
  });
});
