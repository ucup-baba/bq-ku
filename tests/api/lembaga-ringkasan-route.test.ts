// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireRoom = vi.fn();
const ambilStatusBerkas = vi.fn();

function rantai(hasil: unknown) {
  const r: any = new Proxy({}, { get: (_t, k) => (k === 'then' ? (ok: (v: unknown) => void) => ok(hasil) : () => r) });
  return r;
}
const tabel: Record<string, unknown> = {
  santri: { data: [{ id: 's1', namaLengkap: 'A', jenjang: 'SMP', jenisKelamin: 'IKHWAN', statusSosial: null }], error: null },
  donasi: { data: [{ donaturId: 'p1', tanggal: '2026-09-02', bentuk: 'UANG', nominal: 1000, jenis: 'ZIS' }], error: null },
  donatur: { count: 3, error: null },
  surat: { data: [{ tanggalSurat: '2026-09-02', terkirimWa: false }], error: null },
  berkas_lembaga: { data: [{ id: 'bl1', jenis: 'IZIN_OPERASIONAL', namaLainnya: null, berlakuSampai: '2026-10-16' }], error: null },
};
const fakeSupabase = { from: (t: string) => rantai(tabel[t]) };

vi.mock('@/lib/auth/session', () => ({ requireRoom: (...a: unknown[]) => requireRoom(...a), authErrorResponse: () => null }));
vi.mock('@/lib/db/lembaga-repo', () => ({ ambilStatusBerkas: (...a: unknown[]) => ambilStatusBerkas(...a) }));

import { GET } from '@/app/api/lembaga/ringkasan/route';
const req = (url: string) => ({ url }) as never;

beforeEach(() => {
  requireRoom.mockReset().mockResolvedValue({ supabase: fakeSupabase });
  ambilStatusBerkas.mockReset().mockResolvedValue(new Map());
});

describe('GET /api/lembaga/ringkasan', () => {
  it('menghitung ringkasan untuk periode & hari ini dari klien', async () => {
    const res = await GET(req('http://x/api/lembaga/ringkasan?periode=bulan-ini&hariIni=2026-09-25'));
    expect(res.status).toBe(200);
    expect(requireRoom).toHaveBeenCalledWith('lembaga');
    const { data } = await res.json();
    expect(data.periode).toEqual({ dari: '2026-09-01', sampai: '2026-09-30' });
    expect(data.donasi.totalUang).toBe(1000);
    expect(data.donatur.total).toBe(3);
    expect(data.surat.belumTerkirim).toBe(1);
    expect(data.berkasLembaga).toEqual([{ id: 'bl1', label: 'Izin operasional', status: 'mendesak', sisaHari: 21 }]);
  });
  it('tabel berkas lembaga belum ada (migrasi belum jalan) → ringkasan tetap jalan', async () => {
    tabel.berkas_lembaga = { data: null, error: { message: 'relation does not exist' } };
    const res = await GET(req('http://x/api/lembaga/ringkasan?periode=bulan-ini&hariIni=2026-09-25'));
    expect(res.status).toBe(200);
    expect((await res.json()).data.berkasLembaga).toEqual([]);
  });
  it('periode atau tanggal tidak valid → 400', async () => {
    expect((await GET(req('http://x/api/lembaga/ringkasan?periode=kemarin'))).status).toBe(400);
    expect((await GET(req('http://x/api/lembaga/ringkasan?periode=bulan-ini&hariIni=2026-13-40'))).status).toBe(400);
  });
});
