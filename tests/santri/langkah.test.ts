import { describe, it, expect } from 'vitest';
import { validasiLangkah, langkahUntukGalat, bolehBuka } from '@/lib/santri/langkah';

const form = {
  namaLengkap: 'Ahmad Faiz', nik: '3404000000000001', noKk: '', nisn: '', tempatLahir: 'Sleman',
  tanggalLahir: '2010-05-01', jenisKelamin: 'IKHWAN', kontakWali: '', jenjang: 'SMP', kelas: '7', sekolahSekarang: 'SMP IT BQ',
};

describe('validasiLangkah', () => {
  it('form valid → tanpa galat di semua langkah', () => {
    for (const id of [1, 2, 3, 4] as const) expect(validasiLangkah(id, form)).toEqual({});
  });
  it('langkah 1: nama kosong', () => {
    expect(Object.keys(validasiLangkah(1, { ...form, namaLengkap: '' }))).toEqual(['namaLengkap']);
  });
  it('langkah 2: hanya galat milik langkah 2', () => {
    const g = validasiLangkah(2, { ...form, nik: '123', namaLengkap: '' });
    expect(Object.keys(g)).toEqual(['nik']);
  });
  it('langkah 3: WA tidak valid bila diisi', () => {
    expect(validasiLangkah(3, { ...form, kontakWali: '12' })).toHaveProperty('kontakWali');
  });
  it('langkah 4: kelas harus sesuai jenjang', () => {
    expect(validasiLangkah(4, { ...form, jenjang: 'SMP', kelas: '10' })).toHaveProperty('kelas');
  });
});

describe('langkahUntukGalat & bolehBuka', () => {
  it('memilih langkah paling awal', () => {
    expect(langkahUntukGalat({ kelas: 'x', nik: 'y' })).toBe(2);
    expect(langkahUntukGalat({ lain: 'x' })).toBeNull();
  });
  it('urut kecuali mode edit', () => {
    expect(bolehBuka(3, 2, false)).toBe(false);
    expect(bolehBuka(2, 2, false)).toBe(true);
    expect(bolehBuka(4, 1, true)).toBe(true);
  });
});
