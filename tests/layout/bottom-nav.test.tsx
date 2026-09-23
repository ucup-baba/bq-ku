import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const s = vi.hoisted(() => ({ path: '/donatur', rooms: ['santri', 'donatur'] as string[] }));
vi.mock('next/navigation', () => ({ usePathname: () => s.path, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));
vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { nama: 'Ucup' }, roles: [], rooms: s.rooms, canManageUsers: false, logout: async () => {} }),
}));
vi.mock('@/components/theme/ThemeProvider', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: () => {} }) }));

import { BottomNav } from '@/components/layout/BottomNav';

describe('BottomNav', () => {
  beforeEach(() => { s.path = '/donatur'; s.rooms = ['santri', 'donatur']; });

  it('5 item: Beranda aktif, tombol tengah Buat Surat tanpa teks "+"', () => {
    const h = renderToStaticMarkup(<BottomNav room="donatur" />);
    expect(h.match(/<li/g)).toHaveLength(5);
    expect(h).toMatch(/href="\/donatur" aria-current="page"/);
    expect(h).toContain('aria-label="Buat Surat"');
    expect(h).not.toMatch(/>\s*\+/);
    expect(h).toContain('Pindah');
    expect(h).not.toMatch(/text-\[1[01]px\]/);
  });

  it('satu ruangan: Pindah diganti Daftar Surat', () => {
    s.rooms = ['donatur'];
    const h = renderToStaticMarkup(<BottomNav room="donatur" />);
    expect(h).toContain('href="/donatur/surat"');
    expect(h).not.toContain('Pindah');
  });

  it('disembunyikan di halaman Buat Surat', () => {
    s.path = '/donatur/surat/baru';
    expect(renderToStaticMarkup(<BottomNav room="donatur" />)).toBe('');
  });
});
