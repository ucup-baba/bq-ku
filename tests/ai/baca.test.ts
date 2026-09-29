import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('server-only', () => ({}));

const setelan = vi.hoisted(() => ({ nilai: null as any }));
const catatan = vi.hoisted(() => [] as any[]);
const pemakaian = vi.hoisted(() => ({ pindaiHariIni: 0, biayaBulanIni: 0 }));
const panggil = vi.hoisted(() => ({ openai: vi.fn(), gemini: vi.fn() }));

vi.mock('@/lib/ai/setelan', () => ({ bacaSetelanAi: async () => setelan.nilai }));
vi.mock('@/lib/ai/pemakaian', () => ({
  ambilRingkasanPemakaian: async () => ({ ...pemakaian, gagalHariIni: 0, tokenBulanIni: 0, cadanganBulanIni: 0, terakhir: [] }),
  catatPemakaian: async (b: any) => { catatan.push(b); },
}));
vi.mock('@/lib/ai/penyedia/openai', () => ({ panggilOpenai: panggil.openai }));
vi.mock('@/lib/ai/penyedia/gemini', () => ({ panggilGemini: panggil.gemini }));

import { bacaDokumenAi } from '@/lib/ai/baca';
import { AiBatasError } from '@/lib/ai/batas';
import { SETELAN_AI_BAWAAN } from '@/lib/ai/model';

const p = { prompt: 'JSON', berkas: { base64: 'x', mimeType: 'image/png' }, konteks: { fitur: 'ocr_tunggal' as const, penggunaId: 'u1' } };

beforeEach(() => {
  setelan.nilai = { ...SETELAN_AI_BAWAAN, harga: { 'gpt-5.4-mini': { masukPerJuta: 1000, keluarPerJuta: 1000 } } };
  catatan.length = 0; pemakaian.pindaiHariIni = 0; pemakaian.biayaBulanIni = 0;
  panggil.openai.mockReset(); panggil.gemini.mockReset();
});

describe('bacaDokumenAi', () => {
  it('utama berhasil: tidak memanggil cadangan, mencatat 1 baris dengan biaya', async () => {
    panggil.openai.mockResolvedValue({ teks: '```json\n{"a":1}\n```', tokenMasuk: 1_000_000, tokenKeluar: 0 });
    const h = await bacaDokumenAi(p);
    expect(h).toEqual({ teks: '{"a":1}', penyedia: 'openai', model: 'gpt-5.4-mini' });
    expect(panggil.gemini).not.toHaveBeenCalled();
    expect(catatan).toHaveLength(1);
    expect(catatan[0]).toMatchObject({ peran: 'utama', berhasil: true, biayaRp: 1000, fitur: 'ocr_tunggal', penggunaId: 'u1' });
  });
  it('utama gagal → cadangan; keduanya dicatat dengan idPermintaan sama', async () => {
    panggil.openai.mockRejectedValue(new Error('OpenAI HTTP 429: quota'));
    panggil.gemini.mockResolvedValue({ teks: '{"b":2}', tokenMasuk: 10, tokenKeluar: 5 });
    const h = await bacaDokumenAi(p);
    expect(h.penyedia).toBe('gemini');
    expect(catatan.map(c => [c.peran, c.berhasil])).toEqual([['utama', false], ['cadangan', true]]);
    expect(catatan[0].idPermintaan).toBe(catatan[1].idPermintaan);
    expect(catatan[0].galat).toContain('429');
    expect(catatan[1].biayaRp).toBeNull(); // harga Gemini belum diisi
  });
  it('jawaban bukan JSON dianggap gagal → cadangan', async () => {
    panggil.openai.mockResolvedValue({ teks: 'maaf tidak bisa', tokenMasuk: 5, tokenKeluar: 5 });
    panggil.gemini.mockResolvedValue({ teks: '{}', tokenMasuk: 1, tokenKeluar: 1 });
    expect((await bacaDokumenAi(p)).penyedia).toBe('gemini');
    expect(catatan[0]).toMatchObject({ berhasil: false, tokenMasuk: 5 });
  });
  it('tanpa cadangan & utama gagal → melempar', async () => {
    setelan.nilai = { ...setelan.nilai, cadangan: null };
    panggil.openai.mockRejectedValue(new Error('timeout'));
    await expect(bacaDokumenAi(p)).rejects.toThrow(/Semua penyedia AI gagal/);
  });
  it('batas harian tercapai → AiBatasError, tidak memanggil AI & tidak mencatat', async () => {
    pemakaian.pindaiHariIni = 200;
    await expect(bacaDokumenAi(p)).rejects.toBeInstanceOf(AiBatasError);
    expect(panggil.openai).not.toHaveBeenCalled();
    expect(catatan).toHaveLength(0);
  });
  it('sisa waktu < 5 dtk → cadangan tidak dicoba', async () => {
    panggil.openai.mockImplementation(async () => { await new Promise(r => setTimeout(r, 30)); throw new Error('lambat'); });
    await expect(bacaDokumenAi({ ...p, batasTotalMs: 5_020 })).rejects.toThrow(/Semua penyedia AI gagal/);
    expect(panggil.gemini).not.toHaveBeenCalled();
  });
});
