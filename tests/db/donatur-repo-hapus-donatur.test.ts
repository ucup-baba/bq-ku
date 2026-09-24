import { describe, it, expect, vi } from 'vitest';
import { hapusDonatur, gabungDonatur, DonaturPunyaDonasiError, HapusDonaturDitolakError } from '@/lib/db/donatur-repo';

/** Rantai kueri palsu: setiap metode mengembalikan dirinya; await menghasilkan `hasil`. */
function rantai(hasil: unknown, catat: unknown[][] = []) {
  const r: any = new Proxy({}, {
    get: (_t, k) => (k === 'then' ? (ok: (v: unknown) => void) => ok(hasil) : (...a: unknown[]) => { catat.push([k, ...a]); return r; }),
  });
  return r;
}

/** Klien palsu: hasil per tabel diambil berurutan dari antrean. */
function klien(antrean: Record<string, unknown[]>, catat: Record<string, unknown[][]> = {}) {
  return { from: vi.fn((t: string) => rantai(antrean[t].shift(), (catat[t] ??= []))) } as never;
}

describe('hapusDonatur', () => {
  it('donatur tanpa donasi dihapus', async () => {
    const catat: Record<string, unknown[][]> = {};
    await hapusDonatur(klien({ donasi: [{ count: 0, error: null }], donatur: [{ data: [{ id: 'p1' }], error: null }] }, catat), 'p1');
    expect(catat.donatur).toContainEqual(['delete']);
  });
  it('masih punya donasi → DonaturPunyaDonasiError, tidak ada penghapusan', async () => {
    const catat: Record<string, unknown[][]> = {};
    const p = hapusDonatur(klien({ donasi: [{ count: 2, error: null }], donatur: [] }, catat), 'p1');
    await expect(p).rejects.toBeInstanceOf(DonaturPunyaDonasiError);
    expect(catat.donatur).toBeUndefined();
  });
  it('FK RESTRICT (donasi masuk di sela pemeriksaan) → DonaturPunyaDonasiError', async () => {
    const c = klien({
      donasi: [{ count: 0, error: null }, { count: 1, error: null }],
      donatur: [{ data: null, error: { code: '23503', message: 'fk' } }],
    });
    await expect(hapusDonatur(c, 'p1')).rejects.toBeInstanceOf(DonaturPunyaDonasiError);
  });
  it('0 baris terhapus (ditolak RLS) → HapusDonaturDitolakError', async () => {
    const c = klien({ donasi: [{ count: 0, error: null }], donatur: [{ data: [], error: null }] });
    await expect(hapusDonatur(c, 'p1')).rejects.toBeInstanceOf(HapusDonaturDitolakError);
  });
});

describe('gabungDonatur', () => {
  it('memindah donasi ke tujuan, menghapus asal, dan menyegarkan PNG surat yang belum terkirim', async () => {
    const catat: Record<string, unknown[][]> = {};
    const c = klien({
      donasi: [{ data: [{ id: 'd1' }, { id: 'd2' }], error: null }, { data: [{ id: 'd1' }, { id: 'd2' }, { id: 'd9' }], error: null }],
      donatur: [{ data: [{ id: 'p1' }], error: null }],
      surat: [{ error: null }],
    }, catat);
    expect(await gabungDonatur(c, 'p1', 'p2')).toBe(2);
    expect(catat.donasi).toContainEqual(['update', { donaturId: 'p2' }]);
    expect(catat.donasi).toContainEqual(['eq', 'donaturId', 'p1']);
    expect(catat.donatur).toContainEqual(['eq', 'id', 'p1']);
    expect(catat.surat).toContainEqual(['update', { storagePath: null }]);
    expect(catat.surat).toContainEqual(['eq', 'terkirimWa', false]);
  });
  it('menolak menggabungkan ke dirinya sendiri', async () => {
    await expect(gabungDonatur(klien({}), 'p1', 'p1')).rejects.toThrow('Pilih donatur lain');
  });
});
