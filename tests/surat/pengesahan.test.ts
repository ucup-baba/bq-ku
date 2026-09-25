// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import sharp from 'sharp';
vi.mock('server-only', () => ({}));

const berkasRows = vi.fn();
const download = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabase: () => ({
    from: () => ({ select: () => ({ in: async () => berkasRows() }) }),
    storage: { from: () => ({ download: (...a: unknown[]) => download(...a) }) },
  }),
}));

import { ambilAsetPengesahan, lupakanAsetPengesahan, gabungPengesahan } from '@/lib/surat/pengesahan';

const png = () => sharp({ create: { width: 40, height: 20, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
  .extend({ top: 10, bottom: 10, left: 10, right: 10, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

beforeEach(() => { lupakanAsetPengesahan(); berkasRows.mockReset(); download.mockReset(); });

describe('ambilAsetPengesahan', () => {
  it('versi terbaru cap & tanda tangan jadi data URI; tanda tangan dipangkas; nama penandatangan ikut', async () => {
    berkasRows.mockResolvedValue({ data: [
      { jenis: 'TANDA_TANGAN', namaPenandatangan: 'H. Fulan, S.Pd', versi: [{ versi: 1, storagePath: 'lembaga/rahasia/a.png' }, { versi: 2, storagePath: 'lembaga/rahasia/b.png' }] },
      { jenis: 'CAP', namaPenandatangan: null, versi: [{ versi: 1, storagePath: 'lembaga/rahasia/c.png' }] },
    ], error: null });
    download.mockImplementation(async () => ({ data: new Blob([await png()]), error: null }));
    const a = await ambilAsetPengesahan();
    expect(download).toHaveBeenCalledWith('lembaga/rahasia/b.png');
    expect(a.namaPenandatangan).toBe('H. Fulan, S.Pd');
    expect(a.ttd).toMatch(/^data:image\/png;base64,/);
    const ttd = await sharp(Buffer.from(a.ttd!.split(',')[1], 'base64')).metadata();
    expect([ttd.width, ttd.height]).toEqual([40, 20]);
    expect(a.stempel).toMatch(/^data:image\/png;base64,/);
  });
  it('tanpa berkas / galat → semua null (surat memakai aset bawaan)', async () => {
    berkasRows.mockResolvedValue({ data: null, error: { message: 'x' } });
    expect(await ambilAsetPengesahan()).toEqual({ stempel: null, ttd: null, namaPenandatangan: null });
  });
});

describe('gabungPengesahan', () => {
  it('hanya menimpa yang tersedia', () => {
    const bawaan = { logo: 'L', kop: 'K', doaCdr: 'D', stempel: 'S0', ttd: 'T0', namaPenandatangan: 'Aris' };
    expect(gabungPengesahan(bawaan, { stempel: null, ttd: 'T1', namaPenandatangan: null }))
      .toEqual({ ...bawaan, ttd: 'T1' });
  });
});
