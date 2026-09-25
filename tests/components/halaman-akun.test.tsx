import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));
vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { nama: 'Ucup', email: 'u@x' }, roles: ['SUPERADMIN'], rooms: ['santri', 'donatur', 'lembaga'], canManageUsers: true, logout: async () => {} }),
}));
vi.mock('@/components/theme/ThemeProvider', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: () => {} }) }));
vi.mock('@/components/notifikasi/NotifikasiProvider', () => ({ useNotifikasi: () => ({ daftar: [], total: 0, muatUlang: () => {} }) }));

import { HalamanAkun } from '@/components/akun/HalamanAkun';

describe('HalamanAkun dengan 3 ruangan', () => {
  it('satu baris pindah untuk setiap ruangan lain', () => {
    const h = renderToStaticMarkup(<HalamanAkun room="lembaga" />);
    expect(h).toContain('Pindah ke Ruang Santri');
    expect(h).toContain('Pindah ke Ruang Donatur');
    expect(h).not.toContain('Pindah ke Ruang Lembaga');
    expect(h).toContain('href="/donatur"');
  });
});
