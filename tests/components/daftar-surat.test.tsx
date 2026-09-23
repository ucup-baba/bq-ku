import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('status=BELUM') }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

import { DaftarSurat } from '@/components/donatur/DaftarSurat';

describe('DaftarSurat', () => {
  const h = renderToStaticMarkup(<DaftarSurat />);
  it('status awal dari ?status=BELUM', () => {
    expect(h).toMatch(/aria-pressed="true"[^>]*>.*Belum/);
  });
  it('Buat Surat hanya tampil di desktop, tanpa teks "+"', () => {
    expect(h).toContain('hidden md:inline-flex');
    expect(h).not.toContain('+ Surat');
  });
});
