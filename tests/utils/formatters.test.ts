import { describe, it, expect } from 'vitest';
import { toTitleCase, matchBestFamilyMember } from '@/lib/utils/formatters';
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
});
