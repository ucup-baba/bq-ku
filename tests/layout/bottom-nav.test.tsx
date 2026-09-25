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

const notif = vi.hoisted(() => ({ total: 0 }));
vi.mock('@/components/notifikasi/NotifikasiProvider', () => ({ useNotifikasi: () => ({ daftar: [], total: notif.total, muatUlang: () => {} }) }));

import { BottomNav } from '@/components/layout/BottomNav';

describe('BottomNav', () => {
  beforeEach(() => { s.path = '/donatur'; s.rooms = ['santri', 'donatur']; });

  it('5 item tanpa label teks: Beranda aktif, tombol tengah Buat Surat, takik di posisi Beranda', () => {
    const h = renderToStaticMarkup(<BottomNav room="donatur" />);
    expect(h.match(/<li/g)).toHaveLength(5);
    expect(h).toMatch(/href="\/donatur" aria-label="Beranda"[^>]*aria-current="page"/);
    expect(h).toContain('aria-label="Buat Surat"');
    expect(h).toContain('href="/donatur/surat" aria-label="Daftar Surat"');
    expect(h).toContain('href="/donatur/akun" aria-label="Akun"');
    expect(h).not.toContain('Pindah ke');
    expect(h).toContain('--takik-x:10%');
    expect(h).toContain('--fab-x:50%');
    expect(h).not.toMatch(/>\s*\+/);
    expect(h).not.toMatch(/>(Beranda|Donatur|Surat|Pindah|Akun)</);
    expect(h).not.toContain('rounded-full bg-rose-500');
  });

  it('halaman di luar menu utama: lingkaran aktif disembunyikan (jari-jari takik 0)', () => {
    s.path = '/donatur/rekap';
    const h = renderToStaticMarkup(<BottomNav room="donatur" />);
    expect(h).toContain('--takik-r:0px');
    expect(h).not.toContain('aria-current="page"');
  });

  it('ruang santri tanpa hak kelola pengguna: slot ke-4 tombol mode gelap/terang, tetap 5 item', () => {
    s.path = '/'; s.rooms = ['santri'];
    const h = renderToStaticMarkup(<BottomNav room="santri" />);
    expect(h.match(/<li/g)).toHaveLength(5);
    expect(h).toContain('aria-label="Ganti ke mode gelap"');
    expect(h).toContain('href="/akun"');
  });

  it('di halaman Akun: slot Akun yang aktif', () => {
    s.path = '/donatur/akun';
    const h = renderToStaticMarkup(<BottomNav room="donatur" />);
    expect(h).toMatch(/href="\/donatur\/akun"[^>]*aria-current="page"/);
    expect(h).toContain('--takik-x:90%');
  });

  it('ada notifikasi: lencana angka & label akun menyebut jumlahnya', () => {
    notif.total = 12;
    const h = renderToStaticMarkup(<BottomNav room="donatur" />);
    expect(h).toContain('aria-label="Akun, 12 notifikasi"');
    expect(h).toContain('9+');
    notif.total = 0;
  });

  it('ruang lembaga: tombol tengah Berkas lembaga, akun ke /lembaga/akun', () => {
    s.path = '/lembaga'; s.rooms = ['lembaga'];
    const h = renderToStaticMarkup(<BottomNav room="lembaga" />);
    expect(h.match(/<li/g)).toHaveLength(5);
    expect(h).toContain('aria-label="Berkas lembaga"');
    expect(h).toContain('href="/lembaga/akun"');
  });

  it('disembunyikan di halaman Buat Surat', () => {
    s.path = '/donatur/surat/baru';
    expect(renderToStaticMarkup(<BottomNav room="donatur" />)).toBe('');
  });
});
