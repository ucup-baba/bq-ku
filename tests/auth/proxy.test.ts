import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const getClaims = vi.fn();
const maybeSingle = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getClaims },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));

import { proxy } from '@/proxy';

beforeEach(() => {
  getClaims.mockReset();
  maybeSingle.mockReset();
});

function req(path: string) {
  return new NextRequest(new URL(path, 'http://localhost'));
}

function loggedIn(roles: string[], aktif = true) {
  getClaims.mockResolvedValue({ data: { claims: { sub: 'u1', email: 'a@b.c' } }, error: null });
  maybeSingle.mockResolvedValue({ data: { roles, aktif } });
}

describe('proxy: penjaga ruangan', () => {
  it('ADMIN_SANTRI membuka /donatur → redirect ke /', async () => {
    loggedIn(['ADMIN_SANTRI']);
    const res = await proxy(req('/donatur'));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/');
  });

  it('ADMIN_SANTRI memanggil /api/donatur/surat → 403 FORBIDDEN', async () => {
    loggedIn(['ADMIN_SANTRI']);
    const res = await proxy(req('/api/donatur/surat'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('FORBIDDEN');
  });

  it('ADMIN_DONATUR membuka /santri → redirect ke /donatur', async () => {
    loggedIn(['ADMIN_DONATUR']);
    const res = await proxy(req('/santri'));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/donatur');
  });

  it('ADMIN_DONATUR memanggil /api/notifikasi (path netral) → diteruskan, bukan 403', async () => {
    loggedIn(['ADMIN_DONATUR']);
    const res = await proxy(req('/api/notifikasi'));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('ADMIN_DONATUR membuka /donatur/akun → diteruskan', async () => {
    loggedIn(['ADMIN_DONATUR']);
    const res = await proxy(req('/donatur/akun'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('PENGURUS membuka /santri → redirect ke /lembaga', async () => {
    loggedIn(['PENGURUS']);
    const res = await proxy(req('/santri'));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/lembaga');
  });

  it('PENGURUS memanggil /api/donatur → 403', async () => {
    loggedIn(['PENGURUS']);
    expect((await proxy(req('/api/donatur'))).status).toBe(403);
  });

  it('PENGURUS membuka /lembaga → diteruskan, cookie bq_room=lembaga', async () => {
    loggedIn(['PENGURUS']);
    const res = await proxy(req('/lembaga'));
    expect(res.headers.get('location')).toBeNull();
    expect(res.cookies.get('bq_room')?.value).toBe('lembaga');
  });

  it('ADMIN_SANTRI membuka /lembaga → redirect ke /', async () => {
    loggedIn(['ADMIN_SANTRI']);
    const res = await proxy(req('/lembaga'));
    expect(new URL(res.headers.get('location')!).pathname).toBe('/');
  });

  it('tanpa peran membuka /lembaga → redirect ke /', async () => {
    loggedIn([], false);
    const res = await proxy(req('/lembaga'));
    expect(new URL(res.headers.get('location')!).pathname).toBe('/');
  });

  it('SUPERADMIN membuka /donatur → diteruskan, cookie bq_room=donatur diset', async () => {
    loggedIn(['SUPERADMIN']);
    const res = await proxy(req('/donatur'));
    expect(res.headers.get('location')).toBeNull();
    expect(res.cookies.get('bq_room')?.value).toBe('donatur');
  });

  it('pengguna tanpa peran membuka /donatur → redirect ke /, lalu / diteruskan tanpa loop', async () => {
    loggedIn(['ADMIN_SANTRI'], false); // profil nonaktif → roles efektif kosong
    const resDonatur = await proxy(req('/donatur'));
    expect(resDonatur.status).toBe(307);
    expect(new URL(resDonatur.headers.get('location')!).pathname).toBe('/');

    const resHome = await proxy(req('/'));
    expect(resHome.headers.get('location')).toBeNull();
  });
});

describe('proxy: host perpus', () => {
  beforeEach(() => { vi.stubEnv('PERPUS_HOST', 'perpus.localhost'); });
  afterEach(() => { vi.unstubAllEnvs(); });

  const reqHost = (path: string, host: string, accept?: string) => new NextRequest(new URL(path, `http://${host}`), {
    headers: { host, ...(accept ? { 'accept-language': accept } : {}) },
  });

  it('/ → redirect sesuai Accept-Language, tanpa memeriksa sesi', async () => {
    const res = await proxy(reqHost('/', 'perpus.localhost', 'en-US,en'));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/en');
    expect(getClaims).not.toHaveBeenCalled();
  });
  it('redirect mempertahankan host publik, bukan host internal server', async () => {
    const r = new NextRequest(new URL('/katalog?q=a', 'http://localhost:3000'), { headers: { host: 'perpus.localhost:3000' } });
    const tujuan = new URL((await proxy(r)).headers.get('location')!);
    expect(tujuan.host).toBe('perpus.localhost:3000');
    expect(tujuan.pathname + tujuan.search).toBe('/id/katalog?q=a');
  });
  it('/id/katalog?q=a di-rewrite dengan query utuh', async () => {
    const res = await proxy(reqHost('/id/katalog?q=a', 'perpus.localhost'));
    const tujuan = new URL(res.headers.get('x-middleware-rewrite')!);
    expect(tujuan.pathname).toBe('/perpusbq/id/katalog');
    expect(tujuan.search).toBe('?q=a');
  });
  it('API bq-ku → 404 di host perpus', async () => {
    const res = await proxy(reqHost('/api/santri', 'perpus.localhost'));
    expect(res.status).toBe(404);
  });
  it('/perpusbq di host bq-ku → 404', async () => {
    const res = await proxy(reqHost('/perpusbq/id', 'bq-ku.vercel.app'));
    expect(res.status).toBe(404);
  });
  it('host bq-ku tetap memakai penjaga ruangan', async () => {
    getClaims.mockResolvedValue({ data: { claims: null }, error: null });
    const res = await proxy(reqHost('/donatur', 'bq-ku.vercel.app'));
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login');
  });
});
