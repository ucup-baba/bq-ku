import { describe, it, expect } from 'vitest';
import { santriInputSchema, santriUpdateSchema, normalizeWa, zodFieldErrors } from '@/lib/validation/santri';

const valid = {
  namaLengkap: 'Ahmad Fulan', nik: '3201010101010001', tempatLahir: 'Bogor', tanggalLahir: '2011-01-01',
  jenisKelamin: 'IKHWAN', jenjang: 'SMP', kelas: '7A', sekolahSekarang: 'SMP IT BQ',
};

describe('santriInputSchema', () => {
  it('menerima data valid & menormalisasi WA', () => {
    const r = santriInputSchema.safeParse({ ...valid, kontakWali: '0812-3456-789' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.kontakWali).toBe('628123456789');
  });
  it('menolak NIK bukan 16 digit', () => {
    const r = santriInputSchema.safeParse({ ...valid, nik: '123' });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error).nik).toMatch(/16 digit/);
  });
  it('menolak NISN bukan 10 digit tapi menerima kosong', () => {
    expect(santriInputSchema.safeParse({ ...valid, nisn: '12' }).success).toBe(false);
    expect(santriInputSchema.safeParse({ ...valid, nisn: '' }).success).toBe(true);
  });
  it('menolak tanggal lahir di masa depan', () => {
    expect(santriInputSchema.safeParse({ ...valid, tanggalLahir: '2999-01-01' }).success).toBe(false);
  });
  it('menolak kelas 10 untuk jenjang SMP', () => {
    const r = santriInputSchema.safeParse({ ...valid, jenjang: 'SMP', kelas: '10 IPA' });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error).kelas).toBeTruthy();
  });
  it('menerima kelas bebas untuk ALUMNI', () => {
    expect(santriInputSchema.safeParse({ ...valid, jenjang: 'ALUMNI', kelas: 'Lulus 2025' }).success).toBe(true);
  });
  it('membuang field tak dikenal (fotoFormalUrl) dan memetakan ke path', () => {
    const r = santriInputSchema.safeParse({ ...valid, fotoFormalUrl: 'https://x/storage/v1/object/sign/berkas/a.webp?token=1', xyz: 1 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect((r.data as any).xyz).toBeUndefined();
      expect(r.data.fotoFormalPath).toBe('https://x/storage/v1/object/sign/berkas/a.webp?token=1');
    }
  });
  it('update parsial hanya memvalidasi yang dikirim', () => {
    expect(santriUpdateSchema.safeParse({ kelas: '8' }).success).toBe(true);
  });
});

describe('normalizeWa', () => {
  it('0812… → 62812…', () => expect(normalizeWa('0812 3456 789')).toBe('628123456789'));
  it('+62 → 62', () => expect(normalizeWa('+62 812')).toBe('62812'));
});
