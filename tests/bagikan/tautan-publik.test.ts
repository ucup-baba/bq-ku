// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminSupabase: () => ({}) }));
import { masihBerlaku, batasHabis, terkunciPin, namaUnduhan, type TautanPublik } from '@/lib/bagikan/tautan-publik';

const t = (p: Partial<TautanPublik>): TautanPublik => ({
  id: 't1', penerima: 'X', kedaluwarsaAt: '2026-10-01T00:00:00Z', dicabutAt: null, pinHash: null, pinTerkunciSampai: null,
  batasBuka: null, jumlahBuka: 0, tandaAir: true, berkas: [], ...p,
});
const kini = Date.parse('2026-09-25T00:00:00Z');

describe('status tautan', () => {
  it('berlaku, kedaluwarsa, dicabut', () => {
    expect(masihBerlaku(t({}), kini)).toBe(true);
    expect(masihBerlaku(t({ kedaluwarsaAt: '2026-09-24T00:00:00Z' }), kini)).toBe(false);
    expect(masihBerlaku(t({ dicabutAt: '2026-09-24T00:00:00Z' }), kini)).toBe(false);
  });
  it('batas buka & kunci PIN', () => {
    expect(batasHabis(t({ batasBuka: 5, jumlahBuka: 5 }))).toBe(true);
    expect(batasHabis(t({ batasBuka: 5, jumlahBuka: 4 }))).toBe(false);
    expect(batasHabis(t({}))).toBe(false);
    expect(terkunciPin(t({ pinTerkunciSampai: '2026-09-25T00:10:00Z' }), kini)).toBe(true);
    expect(terkunciPin(t({ pinTerkunciSampai: '2026-09-24T23:50:00Z' }), kini)).toBe(false);
  });
});

describe('namaUnduhan', () => {
  it('jenis + nomor, karakter aman, ekstensi dari mime', () => {
    const v = { id: 'v', versi: 1, storagePath: 'x', namaFile: 'x', ukuran: 1, mime: 'application/pdf' as const };
    expect(namaUnduhan({ id: 'b', jenis: 'NPWP', namaLainnya: null, nomorDokumen: '01.234.567', versi: v })).toBe('NPWP - 01.234.567.pdf');
    expect(namaUnduhan({ id: 'b', jenis: 'LAINNYA', namaLainnya: 'MoU "Sekolah"/2026', nomorDokumen: null, versi: { ...v, mime: 'image/png' } })).toBe('MoU _Sekolah__2026.png');
  });
});
