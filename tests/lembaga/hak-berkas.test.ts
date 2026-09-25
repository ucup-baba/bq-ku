import { describe, it, expect } from 'vitest';
import { hakBerkas } from '@/lib/lembaga/hak-berkas';
import { dataBerkasSchema, tautanSchema, fileUnggahSchema } from '@/lib/validation/berkas-lembaga';

describe('hakBerkas', () => {
  it('Superadmin: semua', () => {
    expect(hakBerkas(['SUPERADMIN'], false)).toEqual({ lihat: true, kelola: true, rahasia: true, hapus: true, aturSaklar: true });
  });
  it('Pengurus: kelola mengikuti saklar; tidak pernah rahasia/hapus', () => {
    expect(hakBerkas(['PENGURUS'], false)).toEqual({ lihat: true, kelola: false, rahasia: false, hapus: false, aturSaklar: false });
    expect(hakBerkas(['PENGURUS'], true)).toMatchObject({ kelola: true, rahasia: false, hapus: false });
  });
  it('peran lain: tidak ada akses', () => {
    expect(hakBerkas(['ADMIN_DONATUR'], true).lihat).toBe(false);
  });
});

describe('skema', () => {
  it('Lainnya wajib nama; jenis tetap tanpa nama; tanggal valid', () => {
    expect(dataBerkasSchema.safeParse({ jenis: 'LAINNYA', namaLainnya: '' }).success).toBe(false);
    expect(dataBerkasSchema.safeParse({ jenis: 'LAINNYA', namaLainnya: 'MoU sekolah' }).success).toBe(true);
    const r = dataBerkasSchema.safeParse({ jenis: 'NPWP', namaLainnya: 'x', berlakuSampai: '' });
    expect(r.success && r.data.namaLainnya).toBeNull();
    expect(r.success && r.data.berlakuSampai).toBeNull();
    expect(dataBerkasSchema.safeParse({ jenis: 'NPWP', berlakuSampai: '2026-02-30' }).success).toBe(false);
  });
  it('tautan: penerima wajib, hari 1/7/30, minimal satu berkas, batas buka ≥ 1', () => {
    const dasar = { penerima: 'CSR Bank X', hari: 7, tandaAir: true, pakaiPin: false, berkasIds: ['b1'] };
    expect(tautanSchema.safeParse(dasar).success).toBe(true);
    expect(tautanSchema.safeParse({ ...dasar, penerima: ' ' }).success).toBe(false);
    expect(tautanSchema.safeParse({ ...dasar, hari: 3 }).success).toBe(false);
    expect(tautanSchema.safeParse({ ...dasar, berkasIds: [] }).success).toBe(false);
    expect(tautanSchema.safeParse({ ...dasar, batasBuka: 0 }).success).toBe(false);
  });
  it('file unggah: path hanya di folder lembaga/', () => {
    const f = { path: 'lembaga/3f2b8c1e-9d4a-4b6f-8e2a-1c5d7f9a0b12.pdf', namaFile: 'npwp.pdf', mime: 'application/pdf', ukuran: 10 };
    expect(fileUnggahSchema.safeParse(f).success).toBe(true);
    expect(fileUnggahSchema.safeParse({ ...f, path: 'santri/x.pdf' }).success).toBe(false);
    expect(fileUnggahSchema.safeParse({ ...f, path: 'lembaga/../x.pdf' }).success).toBe(false);
  });
});
