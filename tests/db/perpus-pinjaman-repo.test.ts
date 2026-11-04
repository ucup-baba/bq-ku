import { describe, it, expect } from 'vitest';
import { aksiAnggota, ajukanPinjaman, ambilStatusPinjam, daftarAnggota, listPinjamanku } from '@/lib/db/perpus-pinjaman-repo';
import { PinjamanError } from '@/lib/perpus/pinjaman';

/** Rantai kueri palsu: setiap metode mengembalikan dirinya; await menghasilkan hasil tabel itu. */
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

describe('repo pinjaman anggota', () => {
  it('ajukan memanggil RPC', async () => {
    const catat: unknown[][] = [];
    expect(await ajukanPinjaman(klien({}, { data: { id: 'p1' }, error: null }, catat), 'b1')).toEqual({ id: 'p1' });
    expect(catat).toContainEqual(['rpc', 'perpus_ajukan_pinjaman', { p_buku: 'b1' }]);
  });
  it('galat RPC menjadi PinjamanError', async () => {
    const c = klien({}, { data: null, error: { message: 'perpus:stok_habis' } });
    await expect(ajukanPinjaman(c, 'b1')).rejects.toBeInstanceOf(PinjamanError);
  });
  it('aksi anggota memilih RPC yang tepat', async () => {
    const catat: unknown[][] = [];
    await aksiAnggota(klien({}, { data: {}, error: null }, catat), 'p1', 'klaim');
    await aksiAnggota(klien({}, { data: {}, error: null }, catat), 'p1', 'batal');
    expect(catat).toContainEqual(['rpc', 'perpus_klaim_kembali', { p_id: 'p1' }]);
    expect(catat).toContainEqual(['rpc', 'perpus_batal_pinjaman', { p_id: 'p1' }]);
  });
  it('daftar meneruskan nama & nomor', async () => {
    const catat: unknown[][] = [];
    await daftarAnggota(klien({}, { data: {}, error: null }, catat), { nama: 'A', noWa: '628123' });
    expect(catat).toContainEqual(['rpc', 'perpus_daftar_anggota', { p_nama: 'A', p_no_wa: '628123' }]);
  });
  it('pinjamanku membaca view, terbaru dulu', async () => {
    const catat: unknown[][] = [];
    await listPinjamanku(klien({ perpus_pinjamanku: { data: [], error: null } }, undefined, catat));
    expect(catat).toContainEqual(['from', 'perpus_pinjamanku']);
    expect(catat).toContainEqual(['order', 'diajukanAt', { ascending: false }]);
  });
  it('status tamu hanya membaca stok', async () => {
    const catat: unknown[][] = [];
    const c = klien({ perpus_katalog_publik: { data: { tersedia: 2 }, error: null } }, undefined, catat);
    expect(await ambilStatusPinjam(c, null, 'b1')).toEqual({ masuk: false, anggota: null, pinjamanAktif: null, tersedia: 2 });
    expect(catat).not.toContainEqual(['from', 'perpus_anggota']);
  });
  it('status anggota menyertakan pinjaman aktif', async () => {
    const c = klien({
      perpus_katalog_publik: { data: { tersedia: 0 }, error: null },
      perpus_anggota: { data: { status: 'aktif' }, error: null },
      perpus_pinjaman: { data: { status: 'dipinjam' }, error: null },
    });
    expect(await ambilStatusPinjam(c, 'u1', 'b1')).toEqual({ masuk: true, anggota: 'aktif', pinjamanAktif: 'dipinjam', tersedia: 0 });
  });
});
