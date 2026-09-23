import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

import { BadgeBerkas } from '@/components/santri/BadgeBerkas';
import { BarisSantri } from '@/components/santri/BarisSantri';
import { TombolPengingatWa } from '@/components/santri/TombolPengingatWa';

const lengkap = ['KARTU_KELUARGA', 'AKTA_KELAHIRAN', 'KTP_ORTU', 'SKL_IJAZAH'].map(k => ({ kategori: k, statusVerifikasi: 'VERIFIED' }));

describe('BadgeBerkas', () => {
  it('lengkap vs belum', () => {
    expect(renderToStaticMarkup(<BadgeBerkas docs={lengkap} />)).toContain('Lengkap');
    expect(renderToStaticMarkup(<BadgeBerkas docs={lengkap.slice(0, 2)} />)).toContain('>2/4<');
  });
});

describe('BarisSantri', () => {
  it('menuju detail & menampilkan jenjang', () => {
    const h = renderToStaticMarkup(<BarisSantri santri={{ id: 'a1', namaLengkap: 'Ahmad Faiz', jenjang: 'SMA', kelas: '10', documents: [] } as never} />);
    expect(h).toContain('href="/santri/a1"');
    expect(h).toContain('SMA · Kelas 10');
    const alumni = renderToStaticMarkup(<BarisSantri santri={{ id: 'a2', namaLengkap: 'Umar', jenjang: 'ALUMNI', kelas: 'Lulus 2024' } as never} />);
    expect(alumni).toContain('Alumni · Lulus 2024');
  });
});

describe('TombolPengingatWa', () => {
  it('tidak tampil tanpa nomor wali', () => {
    expect(renderToStaticMarkup(<TombolPengingatWa santriId="a" nama="X" kontakWali="" />)).toBe('');
  });
  it('tampil berlabel bila ada nomor', () => {
    expect(renderToStaticMarkup(<TombolPengingatWa santriId="a" nama="X" kontakWali="0812" />)).toContain('aria-label="Ingatkan wali lewat WhatsApp"');
  });
});
