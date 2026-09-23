import { describe, it, expect } from 'vitest';
import { deleteDocument } from '@/lib/db/santri-repo';

// Lapisan kedua (defense-in-depth) dari celah keamanan surat donatur:
// walau storagePathFromUrl seharusnya sudah menolak path 'surat/...' saat
// ditulis, deleteDocument TIDAK BOLEH memanggil storage.remove() dengan
// path itu meski data storagePath di DB sudah rusak/lama — PNG surat
// ucapan donatur hanya boleh dihapus oleh ruang donatur sendiri.

function makeClient(doc: { id: string; storagePath: string } | null) {
  const removeCalls: string[][] = [];
  const client: any = {
    from: (table: string) => {
      if (table !== 'documents') throw new Error('unexpected table ' + table);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: doc, error: null }),
          }),
        }),
        delete: () => ({
          eq: async () => ({ error: null }),
        }),
      };
    },
    storage: {
      from: (bucket: string) => ({
        remove: (paths: string[]) => {
          removeCalls.push(paths);
          return Promise.resolve({ error: null });
        },
      }),
    },
  };
  return { client, removeCalls };
}

describe('deleteDocument — tidak menghapus berkas surat donatur', () => {
  it('TIDAK memanggil storage.remove untuk path berawalan "surat/"', async () => {
    const { client, removeCalls } = makeClient({ id: 'd1', storagePath: 'surat/2026/1-PBQ-IX-2026.png' });
    const ok = await deleteDocument(client, 'd1');
    expect(ok).toBe(true);
    expect(removeCalls).toEqual([]);
  });

  it('tetap menghapus berkas dokumen santri biasa (bukan surat/)', async () => {
    const { client, removeCalls } = makeClient({ id: 'd2', storagePath: '2026_ikhwan_ahmad_kk.pdf' });
    const ok = await deleteDocument(client, 'd2');
    expect(ok).toBe(true);
    expect(removeCalls).toEqual([['2026_ikhwan_ahmad_kk.pdf']]);
  });
});
