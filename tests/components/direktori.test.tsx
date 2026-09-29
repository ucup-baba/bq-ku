import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

import { SantriDirectory } from '@/components/directory/SantriDirectory';
import { ModeRuangProvider } from '@/components/ruang/ModeRuang';

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
  it('bawaan tampilan galeri: kartu foto tegak, dengan tombol ganti ke daftar', () => {
    expect(h).toContain('data-tampilan="galeri"');
    expect(h).toContain('aspect-[3/4]');
    expect(h).toContain('aria-label="Tampilkan sebagai daftar"');
  });
  it('mode lembaga: kartu santri menuju /lembaga/santri/[id]', () => {
    const t = renderToStaticMarkup(<ModeRuangProvider mode="lembaga"><SantriDirectory initialSantriList={santri} /></ModeRuangProvider>);
    expect(t).toContain('href="/lembaga/santri/1"');
  });
});

import { KartuSantri } from '@/components/santri/KartuSantri';

describe('KartuSantri', () => {
  const dasar = { id: '9', namaLengkap: 'Alifah Qotrun Nada', jenjang: 'SMA', kelas: '10', documents: [] } as never as Parameters<typeof KartuSantri>[0]['santri'];
  it('memakai foto profil bila ada', () => {
    const k = renderToStaticMarkup(<KartuSantri santri={{ ...dasar, fotoProfilUrl: 'https://x/p.jpg', fotoFormalUrl: 'https://x/f.jpg' }} />);
    expect(k).toContain('src="https://x/p.jpg"');
    expect(k).toContain('href="/santri/9"');
    expect(k).toContain('SMA · Kelas 10');
  });
  it('tanpa foto: ubin inisial memenuhi area foto', () => {
    const k = renderToStaticMarkup(<KartuSantri santri={dasar} />);
    expect(k).not.toContain('<img');
    expect(k).toContain('>AN<');
  });
});
