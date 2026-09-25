import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { TautanTidakBerlaku, DaftarBerkasPublik } from '@/components/bagikan/TampilanBagikan';
import { FormPin } from '@/components/bagikan/GerbangBagikan';

const v = (mime: 'application/pdf' | 'image/png', ukuran: number) => ({ id: 'v', versi: 1, storagePath: 'x', namaFile: 'x', mime, ukuran });
const t = {
  id: 't1', penerima: 'CSR Bank X', kedaluwarsaAt: '2026-10-02T00:00:00Z', dicabutAt: null, pinHash: null, pinTerkunciSampai: null,
  batasBuka: null, jumlahBuka: 1, tandaAir: true,
  berkas: [
    { id: 'b1', jenis: 'NPWP' as const, namaLainnya: null, nomorDokumen: '01.234', versi: v('application/pdf', 2_500_000) },
    { id: 'b2', jenis: 'LAINNYA' as const, namaLainnya: 'MoU sekolah', nomorDokumen: null, versi: v('image/png', 40_000) },
  ],
};

describe('halaman bagikan publik', () => {
  it('tidak berlaku: satu pesan umum', () => {
    expect(renderToStaticMarkup(<TautanTidakBerlaku />)).toContain('Tautan ini sudah tidak berlaku. Silakan hubungi pengirimnya.');
  });
  it('daftar berkas: penerima, buka/unduh per berkas, unduh semua, catatan tanda air', () => {
    const h = renderToStaticMarkup(<DaftarBerkasPublik token="TOK" t={t} />);
    expect(h).toContain('CSR Bank X');
    expect(h).toContain('Berlaku sampai 2 Oktober 2026');
    expect(h).toContain('href="/api/bagikan/TOK/unduh/b1?tampil=1"');
    expect(h).toContain('href="/api/bagikan/TOK/unduh/b2"');
    expect(h).toContain('rel="noopener noreferrer"');
    expect(h).toContain('href="/api/bagikan/TOK/unduh-semua"');
    expect(h).toContain('MoU sekolah');
    expect(h).toContain('2,4 MB');
    expect(h).toContain('diberi tanda air untuk CSR Bank X');
  });
  it('form PIN: isian angka berlabel', () => {
    const h = renderToStaticMarkup(<FormPin token="TOK" terkunciSampai={null} />);
    expect(h).toContain('aria-label="PIN 6 angka"');
    expect(h).toContain('inputMode="numeric"');
  });
});
