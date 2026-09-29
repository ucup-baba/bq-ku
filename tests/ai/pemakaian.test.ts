import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { ringkasPemakaian, type RiwayatAi } from '@/lib/ai/pemakaian';

const b = (p: Partial<RiwayatAi>): RiwayatAi => ({
  idPermintaan: 'r1', waktu: '2026-09-29T03:00:00Z', penggunaId: 'u1', fitur: 'ocr_tunggal', peran: 'utama',
  penyedia: 'openai', model: 'gpt-5.4-mini', tokenMasuk: 1000, tokenKeluar: 100, biayaRp: 10, berhasil: true, galat: null,
  namaPengguna: 'Ucup', ...p,
});
const sekarang = new Date('2026-09-29T10:00:00Z'); // 17.00 WIB

describe('ringkasPemakaian', () => {
  it('pindai = idPermintaan berbeda hari ini; percobaan cadangan tidak dihitung dua kali', () => {
    const r = ringkasPemakaian([
      b({ idPermintaan: 'r2', peran: 'cadangan', penyedia: 'gemini', model: 'gemini-flash-lite-latest', biayaRp: 2 }),
      b({ idPermintaan: 'r2', berhasil: false, galat: '503', biayaRp: null, tokenMasuk: 0, tokenKeluar: 0 }),
      b({ idPermintaan: 'r1' }),
      b({ idPermintaan: 'r0', waktu: '2026-09-28T10:00:00Z' }), // kemarin (WIB)
    ], sekarang);
    expect(r.pindaiHariIni).toBe(2);
    expect(r.gagalHariIni).toBe(0);
    expect(r.cadanganBulanIni).toBe(1);
    expect(r.biayaBulanIni).toBe(22);
    expect(r.tokenBulanIni).toBe(1100 * 3);
    expect(r.terakhir).toHaveLength(4);
  });
  it('pindai gagal = semua percobaannya gagal', () => {
    const r = ringkasPemakaian([
      b({ idPermintaan: 'r3', peran: 'cadangan', berhasil: false }),
      b({ idPermintaan: 'r3', berhasil: false }),
    ], sekarang);
    expect(r.pindaiHariIni).toBe(1);
    expect(r.gagalHariIni).toBe(1);
  });
  it('riwayat dibatasi 20 baris', () => {
    const banyak = Array.from({ length: 25 }, (_, i) => b({ idPermintaan: `x${i}` }));
    expect(ringkasPemakaian(banyak, sekarang).terakhir).toHaveLength(20);
  });
});
