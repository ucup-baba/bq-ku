import { describe, it, expect, vi, beforeEach } from 'vitest';

const sesi = vi.hoisted(() => ({ roles: ['SUPERADMIN'] as string[] }));
const disimpan = vi.hoisted(() => [] as any[]);

vi.mock('@/lib/auth/session', () => ({
  requireUser: vi.fn(async (roles?: string[]) => {
    if (roles && !roles.some(r => sesi.roles.includes(r))) { const e: any = new Error('FORBIDDEN'); e.status = 403; throw e; }
    return { user: { id: 'p-1', roles: sesi.roles }, supabase: {} };
  }),
  authErrorResponse: (e: any) => (e?.status ? new Response(JSON.stringify({ error: e.message }), { status: e.status }) : null),
}));
vi.mock('@/lib/ai/setelan', async () => {
  const { SETELAN_AI_BAWAAN } = await import('@/lib/ai/model');
  return {
    bacaSetelanAi: async () => SETELAN_AI_BAWAAN,
    simpanSetelanAi: async (_c: unknown, s: unknown) => { disimpan.push(s); },
    statusKunci: () => ({ openai: true, gemini: false }),
  };
});
vi.mock('@/lib/ai/pemakaian', () => ({
  ambilRingkasanPemakaian: async () => ({ pindaiHariIni: 3, gagalHariIni: 0, biayaBulanIni: 0, tokenBulanIni: 0, cadanganBulanIni: 0, terakhir: [] }),
}));

import { GET, PUT } from '@/app/api/ai/route';
import { SETELAN_AI_BAWAAN } from '@/lib/ai/model';

const req = (body: unknown) => ({ json: async () => body }) as any;
beforeEach(() => { sesi.roles = ['SUPERADMIN']; disimpan.length = 0; });

describe('/api/ai', () => {
  it('GET: setelan, status kunci & ringkasan untuk Superadmin', async () => {
    const res = await GET();
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.data.kunci).toEqual({ openai: true, gemini: false });
    expect(j.data.ringkasan.pindaiHariIni).toBe(3);
  });
  it('GET & PUT ditolak selain Superadmin', async () => {
    sesi.roles = ['ADMIN_SANTRI'];
    expect((await GET()).status).toBe(403);
    expect((await PUT(req(SETELAN_AI_BAWAAN))).status).toBe(403);
    expect(disimpan).toHaveLength(0);
  });
  it('PUT menyimpan setelan valid', async () => {
    const baru = { ...SETELAN_AI_BAWAAN, batasHarian: 50 };
    const res = await PUT(req(baru));
    expect(res.status).toBe(200);
    expect(disimpan[0].batasHarian).toBe(50);
  });
  it('PUT menolak model di luar daftar', async () => {
    const res = await PUT(req({ ...SETELAN_AI_BAWAAN, utama: { penyedia: 'openai', model: 'gpt-9' } }));
    expect(res.status).toBe(400);
    expect(disimpan).toHaveLength(0);
  });
});
