import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const baca = vi.hoisted(() => vi.fn());
vi.mock('@/lib/ai/baca', () => ({ bacaDokumenAi: (...a: unknown[]) => baca(...a) }));

import { promptKlasifikasi, uraiJawaban, usulkanKelas, MODEL_KLASIFIKASI, MODEL_KLASIFIKASI_CADANGAN } from '@/lib/perpus/klasifikasi';

describe('klasifikasi buku', () => {
  it('prompt memuat daftar kelas & buku bernomor', () => {
    const p = promptKlasifikasi([{ judul: 'Laskar Pelangi', penulis: 'Andrea Hirata' }]);
    expect(p).toContain('899.221');
    expect(p).toContain('0. "Laskar Pelangi" — Andrea Hirata');
    expect(p).toContain('JSON');
  });
  it('jawaban: kelas tak terdaftar & indeks hilang → null; yakin dibatasi', () => {
    const teks = JSON.stringify({ hasil: [
      { i: 0, kelasDdc: '899.221', alasan: 'Novel Indonesia', yakin: 0.95 },
      { i: 1, kelasDdc: '899.2', alasan: 'x', yakin: 0.4 },
      { i: 3, kelasDdc: '332', alasan: 'keuangan', yakin: 7 },
    ] });
    expect(uraiJawaban(teks, 3)).toEqual([{ kelasDdc: '899.221', alasan: 'Novel Indonesia', yakin: 0.95 }, null, null]);
    expect(uraiJawaban('bukan json', 2)).toEqual([null, null]);
  });
  it('usulkanKelas memaksa model Gemini & fitur klasifikasi_buku', async () => {
    baca.mockResolvedValue({ teks: '{"hasil":[{"i":0,"kelasDdc":"332","alasan":"Keuangan pribadi","yakin":0.9}]}' });
    const h = await usulkanKelas([{ judul: 'Rich Dad Poor Dad', penulis: 'Robert Kiyosaki' }], 'u1');
    expect(h).toEqual([{ kelasDdc: '332', alasan: 'Keuangan pribadi', yakin: 0.9 }]);
    expect(baca.mock.calls[0][0]).toMatchObject({
      berkas: null, modelPaksa: MODEL_KLASIFIKASI, konteks: { fitur: 'klasifikasi_buku', penggunaId: 'u1' },
    });
  });
  it('Gemini utama gagal (mis. 503) → coba model Gemini cadangan', async () => {
    baca.mockReset()
      .mockRejectedValueOnce(new Error('Semua penyedia AI gagal: gemini HTTP 503'))
      .mockResolvedValueOnce({ teks: '{"hasil":[{"i":0,"kelasDdc":"823","alasan":"Fiksi Inggris","yakin":0.9}]}' });
    const h = await usulkanKelas([{ judul: 'Animal Farm', penulis: 'George Orwell' }], 'u1');
    expect(h[0]?.kelasDdc).toBe('823');
    expect(baca.mock.calls.map(c => (c[0] as { modelPaksa: unknown }).modelPaksa)).toEqual([MODEL_KLASIFIKASI, MODEL_KLASIFIKASI_CADANGAN]);
    expect(MODEL_KLASIFIKASI_CADANGAN.penyedia).toBe('gemini');
  });
  it('batas AI habis tidak dicoba ulang', async () => {
    const { AiBatasError } = await import('@/lib/ai/batas');
    baca.mockReset().mockRejectedValueOnce(new AiBatasError('harian'));
    await expect(usulkanKelas([{ judul: 'x', penulis: '' }], 'u1')).rejects.toBeInstanceOf(AiBatasError);
    expect(baca).toHaveBeenCalledTimes(1);
  });
});
