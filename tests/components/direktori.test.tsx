import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

import { SantriDirectory } from '@/components/directory/SantriDirectory';

const santri = [
  { id: '1', namaLengkap: 'Ahmad Faiz', nik: '1', jenisKelamin: 'IKHWAN', jenjang: 'SMP', kelas: '7', sekolahSekarang: 'SMP IT BQ', tempatLahir: '', tanggalLahir: '', documents: [] },
  { id: '2', namaLengkap: 'Fatimah', nik: '2', jenisKelamin: 'AKHWAT', jenjang: 'SMA', kelas: '10', sekolahSekarang: 'SMA IT BQ', tempatLahir: '', tanggalLahir: '', documents: [] },
] as never;

describe('SantriDirectory', () => {
  const h = renderToStaticMarkup(<SantriDirectory initialSantriList={santri} />);
  it('tanpa tautan tambah santri (sudah ada di navigasi)', () => {
    expect(h).not.toContain('href="/tambah"');
  });
  it('pencarian berlabel, chip gender berjumlah, baris santri', () => {
    expect(h).toContain('aria-label="Cari santri"');
    expect(h).toMatch(/Ikhwan<span[^>]*>1</);
    expect(h).toContain('href="/santri/2"');
  });
});
