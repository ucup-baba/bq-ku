import { describe, it, expect } from 'vitest';

describe('Santri Directory Filtering', () => {
  const mockSantriList = [
    { id: '1', namaLengkap: 'Ahmad Faiz', jenisKelamin: 'IKHWAN', jenjang: 'SMP', sekolahSekarang: 'SMP IT BQ' },
    { id: '2', namaLengkap: 'Fatimah Zahra', jenisKelamin: 'AKHWAT', jenjang: 'SMA', sekolahSekarang: 'SMA IT BQ' },
    { id: '3', namaLengkap: 'Umar bin Khattab', jenisKelamin: 'IKHWAN', jenjang: 'ALUMNI', sekolahSekarang: 'Alumni 2023' },
  ];

  it('should correctly filter by Ikhwan and Akhwat', () => {
    const ikhwanOnly = mockSantriList.filter(s => s.jenisKelamin === 'IKHWAN');
    const akhwatOnly = mockSantriList.filter(s => s.jenisKelamin === 'AKHWAT');

    expect(ikhwanOnly.length).toBe(2);
    expect(akhwatOnly.length).toBe(1);
    expect(akhwatOnly[0].namaLengkap).toBe('Fatimah Zahra');
  });

  it('should correctly filter by Jenjang', () => {
    const smpOnly = mockSantriList.filter(s => s.jenjang === 'SMP');
    const alumniOnly = mockSantriList.filter(s => s.jenjang === 'ALUMNI');

    expect(smpOnly.length).toBe(1);
    expect(alumniOnly.length).toBe(1);
  });
});
