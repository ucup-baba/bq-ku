import { describe, it, expect } from 'vitest';
import { bukuSchema, donasiPerpusSchema, auditTerapkanSchema, klasifikasiSchema } from '@/lib/validation/perpus';

describe('validasi perpus', () => {
  it('buku: kelas harus terdaftar; nilai bawaan terisi', () => {
    expect(bukuSchema.safeParse({ judul: 'Rasa', penulis: 'Tere Liye', kelasDdc: '999' }).success).toBe(false);
    expect(bukuSchema.parse({ judul: ' Rasa ', penulis: 'Tere Liye', kelasDdc: '899.221' })).toEqual({
      judul: 'Rasa', penulis: 'Tere Liye', kelasDdc: '899.221', seri: null, eksemplar: 1, asal: 'koleksi_awal', donasiId: null, pengadaanId: null,
    });
  });
  it('buku: kode pengarang manual 2–4 huruf kapital; seri 1 huruf', () => {
    expect(bukuSchema.safeParse({ judul: 'x', kelasDdc: '297', kodePengarang: 'sia' }).success).toBe(false);
    expect(bukuSchema.safeParse({ judul: 'x', kelasDdc: '297', seri: { kode: 'gh', nomor: 1 } }).success).toBe(false);
    expect(bukuSchema.parse({ judul: 'Ghazi 2', kelasDdc: '297.9', seri: { kode: 'g', nomor: 2 } }).seri).toEqual({ kode: 'g', nomor: 2 });
  });
  it('donasi: uang wajib jumlah, buku wajib jumlahBuku', () => {
    expect(donasiPerpusSchema.safeParse({ nama: 'Raihan', jenis: 'uang', tanggal: '2025-03-14' }).success).toBe(false);
    expect(donasiPerpusSchema.safeParse({ nama: 'Bu Siti', jenis: 'buku', jumlahBuku: 19, tanggal: '2025-04-06' }).success).toBe(true);
  });
  it('klasifikasi maksimal 10 buku; audit butuh kelas sah', () => {
    expect(klasifikasiSchema.safeParse({ buku: Array(11).fill({ judul: 'a', penulis: '' }) }).success).toBe(false);
    expect(auditTerapkanSchema.safeParse({ items: [{ id: '2f9a2b4e-3c1d-4e5f-8a9b-0c1d2e3f4a5b', kelasDdc: '999' }] }).success).toBe(false);
  });
});
