import { describe, it, expect, vi } from 'vitest';
import { hapusSuratBesertaDonasi, ubahSurat, HapusDitolakError, SuratTerkunciError } from '@/lib/db/donatur-repo';

/** Rantai kueri palsu: setiap metode mengembalikan dirinya; await menghasilkan `hasil`. */
function rantai(hasil: unknown, catat: unknown[][] = []) {
  const r: any = new Proxy({}, {
    get: (_t, k) => (k === 'then' ? (ok: (v: unknown) => void) => ok(hasil) : (...a: unknown[]) => { catat.push([k, ...a]); return r; }),
  });
  return r;
}

const surat = { id: 's1', donasiId: 'd1', nomorSurat: '5/PBQ/IX/2026', storagePath: 'surat/x.png' } as never;

describe('hapusSuratBesertaDonasi', () => {
  it('menghapus donasi dan mengembalikan counter bila nomor terakhir', async () => {
    const catatCounter: unknown[][] = [];
    const client = { from: vi.fn((t: string) => (t === 'donasi' ? rantai({ data: [{ id: 'd1' }], error: null }) : rantai({ error: null }, catatCounter))) } as never;
    expect(await hapusSuratBesertaDonasi(client, surat)).toBe('surat/x.png');
    expect(catatCounter).toContainEqual(['update', { urutanTerakhir: 4 }]);
    expect(catatCounter).toContainEqual(['eq', 'urutanTerakhir', 5]);
  });
  it('0 baris terhapus (ditolak RLS) → HapusDitolakError', async () => {
    const client = { from: vi.fn(() => rantai({ data: [], error: null })) } as never;
    await expect(hapusSuratBesertaDonasi(client, surat)).rejects.toBeInstanceOf(HapusDitolakError);
  });
});

describe('ubahSurat', () => {
  it('surat sudah terkirim (0 baris cocok) → SuratTerkunciError', async () => {
    const client = { from: vi.fn(() => rantai({ data: [], error: null })) } as never;
    await expect(ubahSurat(client, surat, { donasi: { tanggal: '2026-09-01', jenis: 'INFAQ', bentuk: 'UANG', nominal: 1 }, tanggalSurat: '2026-09-01', gayaTulisan: 'KALAM' } as never))
      .rejects.toBeInstanceOf(SuratTerkunciError);
  });
  it('mengosongkan storagePath agar PNG dirender ulang', async () => {
    const catat: unknown[][] = [];
    const client = { from: vi.fn(() => rantai({ data: [{ id: 's1' }], error: null }, catat)) } as never;
    await ubahSurat(client, surat, { donasi: { tanggal: '2026-09-01', jenis: 'INFAQ', bentuk: 'UANG', nominal: 1 }, tanggalSurat: '2026-09-01', gayaTulisan: 'PATRICK' } as never);
    expect(catat).toContainEqual(['update', { tanggalSurat: '2026-09-01', gayaTulisan: 'PATRICK', storagePath: null }]);
    expect(catat).toContainEqual(['eq', 'terkirimWa', false]);
  });
});
