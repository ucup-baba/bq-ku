import { describe, it, expect, vi, beforeEach } from 'vitest';
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
