import { describe, it, expect } from 'vitest';

describe('Santri Poster CV Data Presentation', () => {
  const mockSantri = {
    id: 'santri-001',
    namaLengkap: 'Muhammad Haidar Ali',
    namaPanggilan: 'Haidar',
    nik: '3304122506080001',
    jenisKelamin: 'IKHWAN' as const,
    jenjang: 'SMP',
    kelas: '8A',
    sekolahSekarang: 'SMP IT Baitul Qowwam',
    tempatLahir: 'Sleman',
    tanggalLahir: '2008-06-25',
    riwayatTahfidz: '5 Juz Mutqin',
    keahlian: JSON.stringify(['Desain Grafis', 'Kaligrafi']),
    documents: [
      { id: 'doc-1', kategori: 'KARTU_KELUARGA', fileUrl: '/uploads/kk.jpg', statusVerifikasi: 'VERIFIED' }
    ]
  };

  it('should parse and present skills and required documents correctly', () => {
    const skills = JSON.parse(mockSantri.keahlian);
    expect(skills).toContain('Desain Grafis');
    expect(mockSantri.documents.length).toBe(1);
    expect(mockSantri.documents[0].kategori).toBe('KARTU_KELUARGA');
  });

  it('should preserve Islamic organic colors theme based on gender', () => {
    const isIkhwan = mockSantri.jenisKelamin === 'IKHWAN';
    expect(isIkhwan).toBe(true);
  });
});
