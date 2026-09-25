import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('status=BELUM'),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

import { DaftarSurat } from '@/components/donatur/DaftarSurat';
import { ModeRuangProvider } from '@/components/ruang/ModeRuang';

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

describe('DaftarSurat mode baca', () => {
  const h = renderToStaticMarkup(<ModeRuangProvider mode="lembaga"><DaftarSurat /></ModeRuangProvider>);
  it('tanpa Buat Surat & saklar otomatis tandai', () => {
    expect(h).not.toContain('Buat Surat');
    expect(h).not.toContain('Otomatis tandai WA');
  });
});
