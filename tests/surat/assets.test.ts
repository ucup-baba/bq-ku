// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

// Dikendalikan oleh test: saat true, mock fs/promises.readFile melempar galat
// (mensimulasikan kegagalan I/O sementara, mis. saat cold start).
let shouldFail = true;

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(async () => {
      if (shouldFail) throw new Error('EIO sementara');
      return Buffer.from('isi-font-palsu');
    }),
  },
}));

describe('loadSuratFonts — pemulihan setelah kegagalan sementara', () => {
  beforeEach(() => {
    vi.resetModules();
    shouldFail = true;
  });

  it('membuang promise yang gagal dari cache sehingga percobaan berikutnya bisa berhasil', async () => {
    const { loadSuratFonts } = await import('@/lib/surat/assets');

    // Panggilan pertama: pembacaan berkas gagal → promise harus reject.
    await expect(loadSuratFonts()).rejects.toThrow('EIO sementara');

    // Simulasikan kondisi sudah pulih (mis. berkas kini terbaca normal).
    shouldFail = false;

    // Bila promise yang gagal masih tersimpan di cache modul, pemanggilan ini
    // akan ikut reject dengan galat yang sama meski kondisi sudah pulih. Jika
    // perbaikan (membuang promise dari cache saat reject) diterapkan dengan
    // benar, pemanggilan kedua ini harus berhasil membaca ulang berkas.
    await expect(loadSuratFonts()).resolves.toBeDefined();
  });

  it('tidak melempar galat lama berulang-ulang setelah pulih (memastikan bukan promise gagal yang sama)', async () => {
    const { loadSuratFonts } = await import('@/lib/surat/assets');

    await expect(loadSuratFonts()).rejects.toThrow('EIO sementara');
    shouldFail = false;
    const fonts = await loadSuratFonts();
    expect(fonts).toHaveLength(3);
    expect(fonts.map((f) => f.name)).toEqual(['Jakarta', 'Jakarta', 'Naskh']);
  });
});
