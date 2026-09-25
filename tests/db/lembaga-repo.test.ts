import { describe, it, expect, vi } from 'vitest';
import { listSantriLembaga, getSantriLembaga, ambilStatusBerkas } from '@/lib/db/lembaga-repo';

function rantai(hasil: unknown, catat: unknown[][] = []) {
  const r: any = new Proxy({}, {
    get: (_t, k) => (k === 'then' ? (ok: (v: unknown) => void) => ok(hasil) : (...a: unknown[]) => { catat.push([k, ...a]); return r; }),
  });
  return r;
}

const baris = [{ id: 's1', namaLengkap: 'Faiz', fotoProfilPath: 'santri/s1/foto.jpg', fotoFormalPath: null }];
const status = [{ santriId: 's1', kategori: 'KARTU_KELUARGA', statusVerifikasi: 'VERIFIED' }];

function klien(catatSantri: unknown[][] = []) {
  const signed = vi.fn(async (paths: string[]) => ({ data: paths.map(p => ({ path: p, signedUrl: `https://tt/${p}` })), error: null }));
  return {
    client: {
      from: vi.fn(() => rantai({ data: baris, error: null }, catatSantri)),
      rpc: vi.fn(async () => ({ data: status, error: null })),
      storage: { from: () => ({ createSignedUrls: signed }) },
    } as never,
    signed,
  };
}

describe('lembaga-repo', () => {
  it('daftar santri tanpa documents(*), status dari RPC, hanya foto yang ditandatangani', async () => {
    const catat: unknown[][] = [];
    const { client, signed } = klien(catat);
    const [s] = await listSantriLembaga(client);
    expect(catat).toContainEqual(['select', '*']);
    expect(s.documents).toEqual([{ kategori: 'KARTU_KELUARGA', statusVerifikasi: 'VERIFIED', fileUrl: '', catatanVerifikasi: null }]);
    expect(s.fotoProfilUrl).toBe('https://tt/santri/s1/foto.jpg');
    expect(signed).toHaveBeenCalledWith(['santri/s1/foto.jpg'], expect.any(Number));
  });
  it('RPC gagal → status null, santri tetap dimuat dengan documents kosong', async () => {
    const { client } = klien();
    (client as any).rpc = vi.fn(async () => ({ data: null, error: { message: 'x' } }));
    expect(await ambilStatusBerkas(client)).toBeNull();
    const [s] = await listSantriLembaga(client);
    expect(s.documents).toEqual([]);
  });
  it('detail satu santri', async () => {
    const { client } = klien();
    (client as any).from = vi.fn(() => rantai({ data: baris[0], error: null }));
    const s = await getSantriLembaga(client, 's1');
    expect(s?.id).toBe('s1');
  });
});
