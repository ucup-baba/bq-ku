import { describe, it, expect } from 'vitest';
import { saringSantri, hitungGender } from '@/lib/santri/filter';

const list = [
  { id: '1', namaLengkap: 'Ahmad Faiz', nik: '3404000000000001', sekolahSekarang: 'SMP IT BQ', asalSekolahSebelumnya: 'SD N 1 Tempel', jenisKelamin: 'IKHWAN', jenjang: 'SMP' },
  { id: '2', namaLengkap: 'Fatimah Zahra', namaPanggilan: 'Imah', nik: '3404000000000002', sekolahSekarang: 'SMA IT BQ', jenisKelamin: 'AKHWAT', jenjang: 'SMA' },
  { id: '3', namaLengkap: 'Umar', nik: '3404000000000003', sekolahSekarang: 'Kuliah', jenisKelamin: 'IKHWAN', jenjang: 'ALUMNI' },
];

describe('saringSantri', () => {
  it('menggabungkan gender, jenjang, dan kata kunci', () => {
    expect(saringSantri(list, { q: '', gender: 'IKHWAN', jenjang: 'SEMUA' }).map(s => s.id)).toEqual(['1', '3']);
    expect(saringSantri(list, { q: '', gender: 'IKHWAN', jenjang: 'ALUMNI' }).map(s => s.id)).toEqual(['3']);
    expect(saringSantri(list, { q: 'imah', gender: 'SEMUA', jenjang: 'SEMUA' }).map(s => s.id)).toEqual(['2']);
    expect(saringSantri(list, { q: 'tempel', gender: 'SEMUA', jenjang: 'SEMUA' }).map(s => s.id)).toEqual(['1']);
    expect(saringSantri(list, { q: '0003', gender: 'SEMUA', jenjang: 'SEMUA' }).map(s => s.id)).toEqual(['3']);
  });
});

describe('hitungGender', () => {
  it('mengikuti kata kunci & jenjang aktif', () => {
    expect(hitungGender(list, '', 'SEMUA')).toEqual({ SEMUA: 3, IKHWAN: 2, AKHWAT: 1 });
    expect(hitungGender(list, 'bq', 'SMP')).toEqual({ SEMUA: 1, IKHWAN: 1, AKHWAT: 0 });
  });
});
