import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const s = vi.hoisted(() => ({ path: '/lembaga/santri/s1', rooms: ['santri', 'lembaga'] as string[] }));
vi.mock('next/navigation', () => ({ usePathname: () => s.path }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));
vi.mock('@/components/auth/AuthProvider', () => ({ useAuth: () => ({ rooms: s.rooms }) }));

import { BilahModeBaca } from '@/components/ruang/BilahModeBaca';

describe('BilahModeBaca', () => {
  it('menampilkan Mode baca + tautan ubah bila berhak atas ruangan kerja', () => {
    const h = renderToStaticMarkup(<BilahModeBaca />);
    expect(h).toContain('Mode baca');
    expect(h).toContain('href="/santri/s1"');
    expect(h).toContain('Ubah di Ruang Santri');
  });
  it('tanpa tautan bila tidak punya ruangan kerja padanannya', () => {
    s.rooms = ['lembaga'];
    const h = renderToStaticMarkup(<BilahModeBaca />);
    expect(h).toContain('Mode baca');
    expect(h).not.toContain('Ubah di');
  });
});
