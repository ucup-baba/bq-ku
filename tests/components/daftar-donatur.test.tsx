import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

import { DaftarDonatur } from '@/components/donatur/DaftarDonatur';
import { ModeRuangProvider } from '@/components/ruang/ModeRuang';

describe('DaftarDonatur', () => {
  const h = renderToStaticMarkup(<DaftarDonatur />);
  it('tombol tambah donatur hanya ikon berlabel (tanpa "+ Donatur Baru")', () => {
    expect(h).toContain('aria-label="Tambah donatur"');
    expect(h).not.toContain('+ Donatur');
  });
  it('pencarian berlabel dan menempel', () => {
    expect(h).toContain('aria-label="Cari donatur"');
    expect(h).toContain('sticky top-0');
  });
});

describe('DaftarDonatur mode baca', () => {
  const h = renderToStaticMarkup(<ModeRuangProvider mode="lembaga"><DaftarDonatur /></ModeRuangProvider>);
  it('tanpa tombol tambah donatur', () => {
    expect(h).not.toContain('aria-label="Tambah donatur"');
    expect(h).toContain('aria-label="Cari donatur"');
  });
});
