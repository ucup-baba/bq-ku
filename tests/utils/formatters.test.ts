import { describe, it, expect } from 'vitest';
import { toTitleCase, matchBestFamilyMember, formatJam, deriveEducationFromPreviousSchool, deriveEducationFromDocument, samarkanNik, rapikanAlamat, rapikanNamaTempat, rapikanNamaOrang } from '@/lib/utils/formatters';
import { FamilyMemberCandidate } from '@/lib/ocr/parser';

describe('formatters utility', () => {
  describe('toTitleCase', () => {
    it('converts lowercase text to title case', () => {
      expect(toTitleCase('muhammad hanif')).toBe('Muhammad Hanif');
    });

    it('converts uppercase text to title case', () => {
      expect(toTitleCase('MUHAMMAD HAMID AMIRUDIN')).toBe('Muhammad Hamid Amirudin');
    });

    it('handles mixed case and extra spaces', () => {
      expect(toTitleCase('  aLi   fAtiH  ')).toBe('Ali Fatih');
    });

    it('handles empty input gracefully', () => {
      expect(toTitleCase('')).toBe('');
    });
  });

  describe('matchBestFamilyMember', () => {
    const members: FamilyMemberCandidate[] = [
      {
        nama: 'ARIFIN, S.PD',
        nik: '3401051508700002',
        tempatLahir: 'KEBUMEN',
        tanggalLahir: '1970-08-15',
        gender: 'IKHWAN',
        hubungan: 'KEPALA KELUARGA'
      },
      {
        nama: 'SURATMI, S.PD',
        nik: '3401056501740001',
        tempatLahir: 'KULON PROGO',
        tanggalLahir: '1974-01-25',
        gender: 'AKHWAT',
        hubungan: 'ISTRI'
      },
      {
        nama: 'MUHAMMAD IKHSAN SYAIFULLOH',
        nik: '3401051203000001',
        tempatLahir: 'SLEMAN',
        tanggalLahir: '2000-03-12',
        gender: 'IKHWAN',
        hubungan: 'ANAK'
      },
      {
        nama: 'MUHAMMAD HANIF',
        nik: '3401052301070001',
        tempatLahir: 'KULON PROGO',
        tanggalLahir: '2007-01-23',
        gender: 'IKHWAN',
        hubungan: 'ANAK'
      },
      {
        nama: 'MUHAMMAD HAMID AMIRUDIN',
        nik: '3401053004090002',
        tempatLahir: 'KULON PROGO',
        tanggalLahir: '2009-04-30',
        gender: 'IKHWAN',
        hubungan: 'ANAK'
      },
      {
        nama: 'MUHAMMAD RIZQI RIDWAN',
        nik: '3401050502130001',
        tempatLahir: 'KULON PROGO',
        tanggalLahir: '2013-02-05',
        gender: 'IKHWAN',
        hubungan: 'ANAK'
      }
    ];

    it('matches "hanif" to MUHAMMAD HANIF', () => {
      const match = matchBestFamilyMember('hanif', members);
      expect(match).not.toBeNull();
      expect(match?.nama).toBe('MUHAMMAD HANIF');
      expect(match?.nik).toBe('3401052301070001');
    });

    it('matches full lowercase "muhammad hanif" accurately', () => {
      const match = matchBestFamilyMember('muhammad hanif', members);
      expect(match).not.toBeNull();
      expect(match?.nama).toBe('MUHAMMAD HANIF');
      expect(match?.nik).toBe('3401052301070001');
    });

    it('matches "hamid" to MUHAMMAD HAMID AMIRUDIN', () => {
      const match = matchBestFamilyMember('hamid', members);
      expect(match).not.toBeNull();
      expect(match?.nama).toBe('MUHAMMAD HAMID AMIRUDIN');
      expect(match?.nik).toBe('3401053004090002');
    });

    it('returns null if no matching name found', () => {
      const match = matchBestFamilyMember('zulkarnain', members);
      expect(match).toBeNull();
    });
  });

  describe('formatJam', () => {
    it('mengembalikan string kosong jika null atau undefined', () => {
      expect(formatJam(null)).toBe('');
      expect(formatJam(undefined)).toBe('');
    });

    it('memformat timestamp ISO ke format HH:mm', () => {
      // Buat date lokal untuk pengujian deterministik
      const date = new Date(2026, 8, 23, 14, 25);
      expect(formatJam(date.toISOString())).toBe('14:25');
    });
  });
});

describe('deriveEducationFromPreviousSchool', () => {
  it('lulusan SMP/MTs → SMA kelas 10', () => {
    expect(deriveEducationFromPreviousSchool('SMP N 1 Tempel')).toMatchObject({ jenjang: 'SMA', kelas: '10' });
    expect(deriveEducationFromPreviousSchool('MTsN 3 Sleman')).toMatchObject({ jenjang: 'SMA', kelas: '10' });
  });
  it('lulusan SD/MI → SMP kelas 7', () => {
    expect(deriveEducationFromPreviousSchool('SDN Tempel 2')).toMatchObject({ jenjang: 'SMP', kelas: '7' });
    expect(deriveEducationFromPreviousSchool('MI Maarif Tempel')).toMatchObject({ jenjang: 'SMP', kelas: '7' });
  });
  it('tidak salah cocok potongan kata (mis. "MI" di tengah nama)', () => {
    expect(deriveEducationFromPreviousSchool('Pondok Kamil')).toBeNull();
  });
});

describe('deriveEducationFromDocument', () => {
  it('KK tidak menentukan jenjang meski memuat "TAMAT SD/SEDERAJAT"', () => {
    expect(deriveEducationFromDocument({ kategori: 'KARTU_KELUARGA', asalSekolahSebelumnya: 'TAMAT SD/SEDERAJAT', jenjangTerdeteksi: 'SMP' })).toBeNull();
  });
  it('nama asal sekolah diutamakan di atas jenjangTerdeteksi', () => {
    expect(deriveEducationFromDocument({ kategori: 'SKL_IJAZAH', asalSekolahSebelumnya: 'SMP N 1 Tempel', jenjangTerdeteksi: 'SMP' }))
      .toMatchObject({ jenjang: 'SMA', kelas: '10' });
  });
  it('tanpa nama sekolah memakai jenjangTerdeteksi; ALUMNI memakai tahun lulus', () => {
    expect(deriveEducationFromDocument({ jenjangTerdeteksi: 'ALUMNI', tahunLulus: '2025' })).toMatchObject({ jenjang: 'ALUMNI', kelas: 'Lulus 2025' });
    expect(deriveEducationFromDocument({})).toBeNull();
  });
});

describe('samarkanNik', () => {
  it('hanya menampilkan 4 digit awal & akhir', () => {
    expect(samarkanNik('3404145501100001')).toBe('3404 •••• •••• 0001');
    expect(samarkanNik('3404 1455 0110 0001')).toBe('3404 •••• •••• 0001');
  });
  it('kosong/pendek tidak membocorkan digit', () => {
    expect(samarkanNik(null)).toBe('');
    expect(samarkanNik('12345')).toBe('•••••');
  });
});

describe('rapikanAlamat', () => {
  it('membuang label KK, duplikasi, dan huruf kapital semua', () => {
    expect(rapikanAlamat('DOMBAN DUSUN. DOMBAN, RT/RW 004/006, DESA/KELURAHAN MOROREJO, KECAMATAN TEMPEL, KABUPATEN/KOTA SLEMAN, PROVINSI DAERAH ISTIMEWA YOGYAKARTA'))
      .toBe('Domban, RT/RW 004/006, Mororejo, Tempel, Sleman, Daerah Istimewa Yogyakarta');
  });
  it('singkatan & angka Romawi tetap kapital; "Kota" dipertahankan', () => {
    expect(rapikanAlamat('JL. KALIURANG KM 5 GG. MAWAR III, DUSUN KRAJAN, RT 01 RW 02, KEL. CATURTUNGGAL, KOTA YOGYAKARTA, DIY'))
      .toBe('Jl. Kaliurang Km 5 Gg. Mawar III, Krajan, RT 01 RW 02, Caturtunggal, Kota Yogyakarta, DIY');
  });
  it('alamat yang sudah ditulis rapi tidak diubah hurufnya', () => {
    expect(rapikanAlamat('Perum Griya Asri No. 12, Tempel, Sleman')).toBe('Perum Griya Asri No. 12, Tempel, Sleman');
  });
  it('kosong tetap kosong', () => {
    expect(rapikanAlamat(null)).toBe('');
  });
});

describe('rapikanNamaTempat', () => {
  it('nama sekolah: kapital awal kata, singkatan jenjang tetap', () => {
    expect(rapikanNamaTempat('SMK MUHAMMADIYYAH 2 TEMPEL')).toBe('SMK Muhammadiyyah 2 Tempel');
    expect(rapikanNamaTempat('smp n 1 tempel')).toBe('SMP N 1 Tempel');
    expect(rapikanNamaTempat('MTSN 3 SLEMAN')).toBe('MTsN 3 Sleman');
    expect(rapikanNamaTempat("MI MA'ARIF TEMPEL")).toBe("MI Ma'arif Tempel");
    expect(rapikanNamaTempat('SMA IT ABU BAKAR')).toBe('SMA IT Abu Bakar');
  });
  it('tempat lahir & kosong', () => {
    expect(rapikanNamaTempat('SLEMAN')).toBe('Sleman');
    expect(rapikanNamaTempat('KULON PROGO')).toBe('Kulon Progo');
    expect(rapikanNamaTempat('')).toBe('');
  });
  it('tulisan campuran dianggap disengaja', () => {
    expect(rapikanNamaTempat('Mahasiswa UNY')).toBe('Mahasiswa UNY');
    expect(rapikanNamaTempat('  SMA  Negeri 1 ')).toBe('SMA Negeri 1');
  });
});

describe('rapikanNamaOrang', () => {
  it('kapital awal kata; akhiran (Alm.)/(Almh.) dijaga', () => {
    expect(rapikanNamaOrang('LILIK AGUS PURWANTO')).toBe('Lilik Agus Purwanto');
    expect(rapikanNamaOrang('DWI SRIYANA (Alm.)')).toBe('Dwi Sriyana (Alm.)');
    expect(rapikanNamaOrang('siti aminah (almh)')).toBe('Siti Aminah (Almh.)');
  });
  it('gelar tetap benar; tulisan campuran & kosong dibiarkan', () => {
    expect(rapikanNamaOrang('SURATMI, S.PD')).toBe('Suratmi, S.Pd');
    expect(rapikanNamaOrang('Muhammad al-Fatih')).toBe('Muhammad al-Fatih');
    expect(rapikanNamaOrang('')).toBe('');
  });
});
