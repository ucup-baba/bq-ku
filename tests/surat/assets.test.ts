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
    // Arimo (reguler, tebal, miring), Bebas, Kalam, Patrick.
    expect(fonts).toHaveLength(6);
    expect(fonts.map((f) => f.name)).toEqual(['Arimo', 'Arimo', 'Arimo', 'Bebas', 'Kalam', 'Patrick']);
  });
});

describe('loadSuratAssets — aset surat dibaca dari folder non-publik', () => {
  beforeEach(() => {
    vi.resetModules();
    shouldFail = false;
  });

  it('semua aset (TTD, stempel, logo, kop, doa) dibaca dari assets/surat, bukan public/', async () => {
    vi.doMock('sharp', () => ({
      default: () => ({ png: () => ({ toBuffer: async () => Buffer.from('png') }) }),
    }));
    const fsMod = (await import('fs/promises')).default as any;
    fsMod.readFile.mockClear();
    const { loadSuratAssets } = await import('@/lib/surat/assets');
    const path = await import('path');

    const assets = await loadSuratAssets();
    expect(Object.keys(assets).sort()).toEqual(['doaCdr', 'kop', 'logo', 'stempel', 'ttd']);

    const dibaca = fsMod.readFile.mock.calls.map((c: any[]) => String(c[0]));
    const dir = path.join(process.cwd(), 'assets', 'surat') + path.sep;
    expect(dibaca.sort()).toEqual(
      ['doa-cdr.png', 'kop.png', 'logo.webp', 'stempel.webp', 'ttd-rotasi.png'].map((f) => dir + f),
    );
    vi.doUnmock('sharp');
  });
});
