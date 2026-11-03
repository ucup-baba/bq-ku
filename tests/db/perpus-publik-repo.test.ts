import { describe, it, expect } from 'vitest';
import { ambilBukuPublik, ambilRingkasanPublik, listDonasiPublik, listKatalogPublik } from '@/lib/db/perpus-publik-repo';

/** Rantai kueri palsu: setiap metode mengembalikan dirinya; await menghasilkan `hasil`. */
function rantai(hasil: unknown, catat: unknown[][] = []) {
  const r: any = new Proxy({}, {
    get: (_t, k) => (k === 'then' ? (ok: (v: unknown) => void) => ok(hasil) : (...a: unknown[]) => { catat.push([k, ...a]); return r; }),
  });
  return r;
}
const klien = (hasil: unknown, catat: unknown[][] = []) => ({ from: (t: string) => { catat.push(['from', t]); return rantai(hasil, catat); } }) as never;

describe('repo publik', () => {
  it('katalog membaca view, nomor kosong di akhir', async () => {
    const catat: unknown[][] = [];
    expect(await listKatalogPublik(klien({ data: [{ id: 'a' }], error: null }, catat))).toEqual([{ id: 'a' }]);
    expect(catat).toContainEqual(['from', 'perpus_katalog_publik']);
    expect(catat).toContainEqual(['order', 'nomorPanggil', { nullsFirst: false }]);
  });
  it('buku dicari lewat idPendek; tidak ada → null', async () => {
    const catat: unknown[][] = [];
    expect(await ambilBukuPublik(klien({ data: null, error: null }, catat), 'abcd1234')).toBeNull();
    expect(catat).toContainEqual(['eq', 'idPendek', 'abcd1234']);
  });
  it('donasi terbaru dulu', async () => {
    const catat: unknown[][] = [];
    await listDonasiPublik(klien({ data: [], error: null }, catat));
    expect(catat).toContainEqual(['from', 'perpus_donasi_publik']);
    expect(catat).toContainEqual(['order', 'tanggal', { ascending: false, nullsFirst: false }]);
  });
  it('ringkasan satu baris; galat dilempar', async () => {
    await expect(ambilRingkasanPublik(klien({ data: null, error: { message: 'x' } }))).rejects.toThrow('Gagal memuat ringkasan');
  });
});
