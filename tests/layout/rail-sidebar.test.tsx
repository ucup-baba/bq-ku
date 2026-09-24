import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ usePathname: () => '/donatur/daftar/abc', useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));
vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { nama: 'Ucup Baba', email: 'u@x' }, roles: ['SUPERADMIN'], rooms: ['santri', 'donatur'], canManageUsers: true, logout: async () => {} }),
}));
vi.mock('@/components/theme/ThemeProvider', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: () => {} }) }));

import { RailSidebar } from '@/components/layout/RailSidebar';

describe('RailSidebar', () => {
  const h = renderToStaticMarkup(<RailSidebar room="donatur" />);
  it('menandai Daftar Donatur aktif', () => {
    expect(h).toMatch(/href="\/donatur\/daftar" aria-current="page"/);
  });
  it('tidak memuat Buat Surat maupun toggle tema (tema ada di panel Akun)', () => {
    expect(h).not.toContain('href="/donatur/surat/baru"');
    expect(h).not.toContain('Toggle theme');
  });
  it('punya tombol pindah ruang, tautan ke halaman Akun ruangan ini, dan pin', () => {
    expect(h).toContain('Pindah ke Ruang Santri');
    expect(h).toMatch(/href="\/donatur\/akun" aria-label="Akun"/);
    expect(h).toContain('aria-pressed="false"');
  });
});
