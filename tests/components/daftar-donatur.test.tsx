import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

import { DaftarDonatur } from '@/components/donatur/DaftarDonatur';

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
