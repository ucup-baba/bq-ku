import { describe, it, expect, vi } from 'vitest';
import { listBerkas, tambahVersi, buatTautan, cabutTautan, catatAkses, getPengaturanKelola, versiTerbaru } from '@/lib/db/berkas-lembaga-repo';
import { hashToken } from '@/lib/bagikan/keamanan';

function rantai(hasil: unknown, catat: unknown[][] = []) {
  const r: any = new Proxy({}, {
    get: (_t, k) => (k === 'then' ? (ok: (v: unknown) => void) => ok(hasil) : (...a: unknown[]) => { catat.push([k, ...a]); return r; }),
  });
  return r;
}
function klien(antrean: Record<string, unknown[]>, catat: Record<string, unknown[][]> = {}) {
  return {
    from: vi.fn((t: string) => rantai(antrean[t]?.shift(), (catat[t] ??= []))),
    rpc: vi.fn(async () => ({ error: null })),
  } as any;
}

describe('versiTerbaru', () => {
  it('memilih nomor versi tertinggi', () => {
    expect(versiTerbaru({ versi: [{ versi: 1 }, { versi: 3 }, { versi: 2 }] } as never)?.versi).toBe(3);
    expect(versiTerbaru({ versi: [] } as never)).toBeNull();
  });
});

describe('listBerkas', () => {
  it('menyertakan versi dan mengurutkan versi terbaru di depan', async () => {
    const c = klien({ berkas_lembaga: [{ data: [{ id: 'b1', jenis: 'NPWP', versi: [{ versi: 1 }, { versi: 2 }] }], error: null }] });
    const [b] = await listBerkas(c);
    expect(b.versi.map(v => v.versi)).toEqual([2, 1]);
  });
});

describe('tambahVersi', () => {
  it('nomor versi = tertinggi + 1', async () => {
    const catat: Record<string, unknown[][]> = {};
    const c = klien({ berkas_lembaga_versi: [{ data: { versi: 2 }, error: null }, { data: { id: 'v3', versi: 3 }, error: null }] }, catat);
    const v = await tambahVersi(c, 'b1', { storagePath: 'lembaga/b1/x.pdf', namaFile: 'x.pdf', mime: 'application/pdf', ukuran: 10 }, 'u1');
    expect(v.versi).toBe(3);
    expect(catat.berkas_lembaga_versi.find(x => x[0] === 'insert')?.[1]).toMatchObject({ berkasId: 'b1', versi: 3, createdBy: 'u1' });
  });
});

describe('buatTautan', () => {
  it('menyimpan hash token & PIN (bukan aslinya), relasi berkas, masa berlaku', async () => {
    const catat: Record<string, unknown[][]> = {};
    const c = klien({ tautan_bagikan: [{ data: { id: 't1' }, error: null }], tautan_bagikan_berkas: [{ error: null }] }, catat);
    const h = await buatTautan(c, { penerima: 'CSR Bank X', hari: 7, tandaAir: true, pakaiPin: true, batasBuka: 5 }, ['b1', 'b2'], 'u1', new Date('2026-09-25T00:00:00Z'));
    const baris = catat.tautan_bagikan.find(x => x[0] === 'insert')?.[1] as Record<string, unknown>;
    expect(baris.tokenHash).toBe(hashToken(h.token));
    expect(JSON.stringify(baris)).not.toContain(h.token);
    expect(h.pin).toMatch(/^\d{6}$/);
    expect(String(baris.pinHash)).not.toContain(h.pin!);
    expect(baris.kedaluwarsaAt).toBe('2026-10-02T00:00:00.000Z');
    expect(baris).toMatchObject({ batasBuka: 5, tandaAir: true, penerima: 'CSR Bank X' });
    expect(catat.tautan_bagikan_berkas.find(x => x[0] === 'insert')?.[1]).toEqual([{ tautanId: 't1', berkasId: 'b1' }, { tautanId: 't1', berkasId: 'b2' }]);
  });
  it('relasi ditolak DB (berkas rahasia) → tautan langsung dicabut dan galat dilempar', async () => {
    const catat: Record<string, unknown[][]> = {};
    const c = klien({ tautan_bagikan: [{ data: { id: 't1' }, error: null }, { error: null }], tautan_bagikan_berkas: [{ error: { message: 'Cap dan tanda tangan tidak boleh dibagikan' } }] }, catat);
    await expect(buatTautan(c, { penerima: 'X', hari: 1, tandaAir: true, pakaiPin: false }, ['cap'], 'u1')).rejects.toThrow(/tidak boleh dibagikan/);
    expect(catat.tautan_bagikan.some(x => x[0] === 'update')).toBe(true);
  });
});

describe('lainnya', () => {
  it('cabut hanya tautan yang belum dicabut', async () => {
    const catat: Record<string, unknown[][]> = {};
    await cabutTautan(klien({ tautan_bagikan: [{ data: [{ id: 't1' }], error: null }] }, catat), 't1');
    expect(catat.tautan_bagikan).toContainEqual(['is', 'dicabutAt', null]);
  });
  it('catat akses lewat RPC; pengaturan kelola dibaca sebagai boolean', async () => {
    const c = klien({ pengaturan: [{ data: { nilai: true }, error: null }] });
    await catatAkses(c, 'UNDUH', { berkasId: 'b1', versiId: 'v1' });
    expect(c.rpc).toHaveBeenCalledWith('catat_akses_berkas', { p_aksi: 'UNDUH', p_berkas: 'b1', p_versi: 'v1', p_tautan: null, p_rincian: null });
    expect(await getPengaturanKelola(c)).toBe(true);
  });
});
