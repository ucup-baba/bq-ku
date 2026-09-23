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

  it('5 item tanpa label teks: Beranda aktif, tombol tengah Buat Surat, takik di posisi Beranda', () => {
    const h = renderToStaticMarkup(<BottomNav room="donatur" />);
    expect(h.match(/<li/g)).toHaveLength(5);
    expect(h).toMatch(/href="\/donatur" aria-label="Beranda"[^>]*aria-current="page"/);
    expect(h).toContain('aria-label="Buat Surat"');
    expect(h).toContain('aria-label="Pindah ke Ruang Santri"');
    expect(h).toContain('--takik-x:10%');
    expect(h).toContain('--fab-x:50%');
    expect(h).not.toMatch(/>\s*\+/);
    expect(h).not.toMatch(/>(Beranda|Donatur|Surat|Pindah|Akun)</);
  });

  it('halaman di luar menu utama: lingkaran aktif disembunyikan (jari-jari takik 0)', () => {
    s.path = '/donatur/surat/abc';
    const h = renderToStaticMarkup(<BottomNav room="donatur" />);
    expect(h).toContain('--takik-r:0px');
    expect(h).not.toContain('aria-current="page"');
  });

  it('satu ruangan: Pindah diganti tombol mode gelap/terang, tetap 5 item', () => {
    s.rooms = ['donatur'];
    const h = renderToStaticMarkup(<BottomNav room="donatur" />);
    expect(h.match(/<li/g)).toHaveLength(5);
    expect(h).toContain('aria-label="Ganti ke mode gelap"');
    expect(h).not.toContain('Pindah');
  });

  it('disembunyikan di halaman Buat Surat', () => {
    s.path = '/donatur/surat/baru';
    expect(renderToStaticMarkup(<BottomNav room="donatur" />)).toBe('');
  });
});
