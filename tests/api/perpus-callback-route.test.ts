// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const exchangeCodeForSession = vi.fn();
const getUser = vi.fn();
const maybeSingle = vi.fn();
const tabel: string[] = [];

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: async () => ({
    auth: { exchangeCodeForSession, getUser },
    from: (t: string) => { tabel.push(t); return { select: () => ({ eq: () => ({ maybeSingle }) }) }; },
  }),
}));

import { GET } from '@/app/auth/callback/route';

const req = (path: string, host: string, next?: string) => new NextRequest(new URL(path, `http://${host}`), {
  headers: { host, ...(next ? { cookie: `bq_next=${encodeURIComponent(next)}` } : {}) },
});

beforeEach(() => {
  vi.stubEnv('PERPUS_HOST', 'perpus.localhost');
  tabel.length = 0;
  exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } } });
  maybeSingle.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('callback di host perpus', () => {
  it('anggota menuju next dari cookie, tanpa membaca profiles', async () => {
    maybeSingle.mockResolvedValue({ data: { status: 'aktif' } });
    const res = await GET(req('/auth/callback?code=x', 'perpus.localhost', '/en/buku/abcd1234'));
    expect(res.headers.get('location')).toBe('http://perpus.localhost/en/buku/abcd1234');
    expect(tabel).toEqual(['perpus_anggota']);
  });
  it('belum anggota menuju daftar', async () => {
    maybeSingle.mockResolvedValue({ data: null });
    const res = await GET(req('/auth/callback?code=x', 'perpus.localhost', '/id/pinjamanku'));
    expect(res.headers.get('location')).toBe('http://perpus.localhost/id/daftar?next=%2Fid%2Fpinjamanku');
  });
  it('kode gagal kembali ke halaman masuk perpus', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: new Error('x') });
    const res = await GET(req('/auth/callback?code=x', 'perpus.localhost', '/en/pinjamanku'));
    expect(res.headers.get('location')).toBe('http://perpus.localhost/en/masuk?error=tautan-tidak-valid');
  });
});

describe('callback di host bq-ku', () => {
  it('tetap memakai /login saat gagal', async () => {
    const res = await GET(req('/auth/callback', 'bq-ku.localhost'));
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login');
  });
});
