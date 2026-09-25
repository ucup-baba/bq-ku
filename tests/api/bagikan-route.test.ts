// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('server-only', () => ({}));

const pub = vi.hoisted(() => ({
  tautan: null as any, sesi: false, buka: true, sisa: 4,
  catat: vi.fn(), pasang: vi.fn(), siapkan: vi.fn(),
}));
vi.mock('@/lib/bagikan/tautan-publik', () => ({
  cariTautan: async () => pub.tautan,
  masihBerlaku: (t: any) => !t.dicabutAt && Date.parse(t.kedaluwarsaAt) > Date.now(),
  batasHabis: (t: any) => t.batasBuka !== null && t.jumlahBuka >= t.batasBuka,
  terkunciPin: (t: any) => !!t.pinTerkunciSampai && Date.parse(t.pinTerkunciSampai) > Date.now(),
  sesiValid: () => pub.sesi,
  namaCookie: (id: string) => `bq_bagikan_${id}`,
  bukaTautan: async () => pub.buka,
  pasangSesi: (...a: unknown[]) => pub.pasang(...a),
  catatPublik: (...a: unknown[]) => pub.catat(...a),
  catatPinGagal: async () => pub.sisa,
  resetPinGagal: async () => {},
  namaUnduhan: () => 'NPWP.pdf',
}));
vi.mock('@/lib/bagikan/siapkan', () => ({ siapkanBerkas: (...a: unknown[]) => pub.siapkan(...a) }));
const cocok = vi.hoisted(() => ({ nilai: false }));
vi.mock('@/lib/bagikan/keamanan', () => ({ cocokPin: async () => cocok.nilai }));

import { POST as BUKA } from '@/app/api/bagikan/[token]/buka/route';
import { POST as PIN } from '@/app/api/bagikan/[token]/pin/route';
import { GET as UNDUH } from '@/app/api/bagikan/[token]/unduh/[berkasId]/route';

const ctx = { params: Promise.resolve({ token: 'x'.repeat(43), berkasId: 'b1' }) };
const post = (body?: unknown) => new NextRequest('https://bq.test/api/bagikan/x', { method: 'POST', body: body ? JSON.stringify(body) : undefined });
const get = (q = '') => new NextRequest(`https://bq.test/api/bagikan/x/unduh/b1${q}`);
const dasar = () => ({
  id: 't1', penerima: 'CSR Bank X', kedaluwarsaAt: new Date(Date.now() + 86_400_000).toISOString(), dicabutAt: null,
  pinHash: null, pinTerkunciSampai: null, batasBuka: null, jumlahBuka: 0, tandaAir: true,
  berkas: [{ id: 'b1', jenis: 'NPWP', namaLainnya: null, nomorDokumen: '01', versi: { id: 'v2', versi: 2, storagePath: 'lembaga/a.pdf', namaFile: 'a.pdf', mime: 'application/pdf', ukuran: 10 } }],
});

beforeEach(() => {
  pub.tautan = dasar(); pub.sesi = false; pub.buka = true; pub.sisa = 4; cocok.nilai = false;
  pub.catat.mockReset(); pub.pasang.mockReset(); pub.siapkan.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]));
});

describe('buka', () => {
  it('tidak ditemukan, dicabut, kedaluwarsa → 410 dengan pesan yang sama', async () => {
    const pesan: string[] = [];
    for (const t of [null, { ...dasar(), dicabutAt: 'x' }, { ...dasar(), kedaluwarsaAt: '2020-01-01T00:00:00Z' }]) {
      pub.tautan = t;
      const res = await BUKA(post(), ctx);
      expect(res.status).toBe(410);
      pesan.push((await res.json()).error);
    }
    expect(new Set(pesan).size).toBe(1);
  });
  it('batas buka habis (atomik di DB) → 410, tanpa sesi', async () => {
    pub.buka = false;
    expect((await BUKA(post(), ctx)).status).toBe(410);
    expect(pub.pasang).not.toHaveBeenCalled();
  });
  it('berhasil: sesi dipasang, dicatat, tidak di-cache', async () => {
    const res = await BUKA(post(), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(pub.pasang).toHaveBeenCalled();
    expect(pub.catat).toHaveBeenCalledWith(expect.anything(), 'BUKA_TAUTAN', { tautanId: 't1' });
  });
  it('tautan ber-PIN tidak bisa dibuka tanpa PIN', async () => {
    pub.tautan = { ...dasar(), pinHash: 'h' };
    expect((await BUKA(post(), ctx)).status).toBe(401);
  });
});

describe('PIN', () => {
  beforeEach(() => { pub.tautan = { ...dasar(), pinHash: 'h' }; });
  it('salah → 401 + sisa + dicatat', async () => {
    const res = await PIN(post({ pin: '000000' }), ctx);
    expect(res.status).toBe(401);
    expect((await res.json()).sisa).toBe(4);
    expect(pub.catat).toHaveBeenCalledWith(expect.anything(), 'PIN_SALAH', expect.objectContaining({ tautanId: 't1' }));
  });
  it('percobaan ke-5 → terkunci (429); saat terkunci tidak diperiksa', async () => {
    pub.sisa = 0;
    expect((await PIN(post({ pin: '000000' }), ctx)).status).toBe(429);
    pub.tautan = { ...dasar(), pinHash: 'h', pinTerkunciSampai: new Date(Date.now() + 60_000).toISOString() };
    cocok.nilai = true;
    expect((await PIN(post({ pin: '123456' }), ctx)).status).toBe(429);
    expect(pub.pasang).not.toHaveBeenCalled();
  });
  it('benar → sesi dipasang', async () => {
    cocok.nilai = true;
    expect((await PIN(post({ pin: '123456' }), ctx)).status).toBe(200);
    expect(pub.pasang).toHaveBeenCalled();
  });
});

describe('unduh', () => {
  it('tanpa sesi → 401, berkas tidak disiapkan', async () => {
    expect((await UNDUH(get(), ctx)).status).toBe(401);
    expect(pub.siapkan).not.toHaveBeenCalled();
  });
  it('dengan sesi → berkas bertanda air, lampiran, dicatat', async () => {
    pub.sesi = true;
    const res = await UNDUH(get(), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="NPWP.pdf"');
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(pub.catat).toHaveBeenCalledWith(expect.anything(), 'UNDUH_TAUTAN', expect.objectContaining({ berkasId: 'b1', versiId: 'v2' }));
  });
  it('?tampil=1 → inline; tanda air gagal → 422 (tidak dikirim tanpa tanda air)', async () => {
    pub.sesi = true;
    expect((await UNDUH(get('?tampil=1'), ctx)).headers.get('Content-Disposition')).toMatch(/^inline;/);
    pub.siapkan.mockRejectedValue(new Error('PDF terenkripsi'));
    expect((await UNDUH(get(), ctx)).status).toBe(422);
  });
  it('tautan dicabut → 410 walau sesi masih ada', async () => {
    pub.sesi = true; pub.tautan = { ...dasar(), dicabutAt: 'x' };
    expect((await UNDUH(get(), ctx)).status).toBe(410);
  });
});
