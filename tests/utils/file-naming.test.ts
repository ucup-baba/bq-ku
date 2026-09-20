import { describe, it, expect } from 'vitest';
import { slugify, getKategoriShorthand, generateStandardizedFileName } from '../../lib/utils/file-naming';

describe('file-naming utilities', () => {
  describe('slugify', () => {
    it('properly converts names to clean slugs', () => {
      expect(slugify('Rahmat Kurniawan')).toBe('rahmat-kurniawan');
      expect(slugify('  Siti Komariyah, S.Pd.  ')).toBe('siti-komariyah-spd');
      expect(slugify('Ahmad-Dwi__Sriyana')).toBe('ahmad-dwi-sriyana');
    });
  });

  describe('getKategoriShorthand', () => {
    it('maps categories to short descriptions', () => {
      expect(getKategoriShorthand('KARTU_KELUARGA')).toBe('kk');
      expect(getKategoriShorthand('KTP_ORTU')).toBe('ktp-ortu');
      expect(getKategoriShorthand('AKTA_KELAHIRAN')).toBe('akta');
      expect(getKategoriShorthand('SKL_IJAZAH')).toBe('ijazah');
      expect(getKategoriShorthand('FOTO_FORMAL')).toBe('foto-formal');
      expect(getKategoriShorthand('FOTO_PROFIL')).toBe('foto-profil');
    });
  });

  describe('generateStandardizedFileName', () => {
    it('generates filename with format: tahunmasuk_gender_nama_ketfile.ext', () => {
      const fileName = generateStandardizedFileName({
        tahunMasuk: 2026,
        jenisKelamin: 'IKHWAN',
        namaSantri: 'Rahmat Kurniawan',
        kategori: 'KARTU_KELUARGA',
        ext: '.pdf',
      });
      expect(fileName).toBe('2026_ikhwan_rahmat-kurniawan_kk.pdf');
    });

    it('handles akhwat and photo upload', () => {
      const fileName = generateStandardizedFileName({
        tahunMasuk: 2025,
        jenisKelamin: 'AKHWAT',
        namaSantri: 'Aisyah Putri',
        kategori: 'FOTO_FORMAL',
        ext: '.webp',
      });
      expect(fileName).toBe('2025_akhwat_aisyah-putri_foto-formal.webp');
    });

    it('falls back gracefully when fields are missing', () => {
      const currentYear = new Date().getFullYear();
      const fileName = generateStandardizedFileName({
        originalFileName: 'scan_dokumen.jpg',
      });
      expect(fileName).toBe(`${currentYear}_ikhwan_santri_berkas.jpg`);
    });
  });
});
