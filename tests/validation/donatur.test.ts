import { describe, it, expect } from 'vitest';
import { donaturSchema, donasiSchema, suratSchema } from '@/lib/validation/donatur';

const donaturValid = { nama: 'H. Pradana', sapaan: 'BAPAK', noWa: '0812-3456-7890' };

describe('donaturSchema', () => {
  it('menormalisasi nomor WA', () => {
    const r = donaturSchema.safeParse(donaturValid);
    expect(r.success && r.data.noWa).toBe('6281234567890');
  });
  it('menerima donatur tanpa WA', () => {
    expect(donaturSchema.safeParse({ nama: 'Hamba Allah', sapaan: 'BAPAK' }).success).toBe(true);
  });
  it('menolak nama terlalu pendek', () => {
    expect(donaturSchema.safeParse({ ...donaturValid, nama: 'A' }).success).toBe(false);
  });
});

describe('donasiSchema', () => {
  const dasar = { donaturId: 'd1', tanggal: '2026-09-21', jenis: 'INFAQ' as const };
  it('uang wajib punya nominal > 0', () => {
    expect(donasiSchema.safeParse({ ...dasar, bentuk: 'UANG', nominal: 2500000 }).success).toBe(true);
    expect(donasiSchema.safeParse({ ...dasar, bentuk: 'UANG', nominal: 0 }).success).toBe(false);
    expect(donasiSchema.safeParse({ ...dasar, bentuk: 'UANG' }).success).toBe(false);
  });
  it('barang wajib punya deskripsi dan tanpa nominal', () => {
    expect(donasiSchema.safeParse({ ...dasar, bentuk: 'BARANG', deskripsiBarang: '50 kg beras' }).success).toBe(true);
    expect(donasiSchema.safeParse({ ...dasar, bentuk: 'BARANG' }).success).toBe(false);
  });
  it('menolak tanggal di masa depan', () => {
    expect(donasiSchema.safeParse({ ...dasar, tanggal: '2999-01-01', bentuk: 'UANG', nominal: 1000 }).success).toBe(false);
  });
});

describe('suratSchema', () => {
  it('menerima nomor surat berformat benar', () => {
    expect(suratSchema.safeParse({ donasiId: 'x', nomorSurat: '271/PBQ/IX/2026', tanggalSurat: '2026-09-22' }).success).toBe(true);
  });
  it('menolak nomor surat asal-asalan', () => {
    expect(suratSchema.safeParse({ donasiId: 'x', nomorSurat: '271', tanggalSurat: '2026-09-22' }).success).toBe(false);
  });
});
