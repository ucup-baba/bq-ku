import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db } from '../../lib/db';
import {
  createSantri,
  getSantriById,
  listSantri,
  updateSantri,
  deleteSantri,
  saveDocument,
  listDocumentsBySantri,
  updateDocumentStatus,
  deleteDocument
} from '../../lib/db/santri-repo';

describe('Santri Repository', () => {
  beforeEach(() => {
    // Clear tables before each test
    db.exec('DELETE FROM documents');
    db.exec('DELETE FROM santri');
  });

  afterAll(() => {
    db.close();
  });

  describe('CRUD Santri', () => {
    it('should create a new santri with all fields', () => {
      const input = {
        namaLengkap: 'Ahmad Fulan',
        namaPanggilan: 'Ahmad',
        nik: '1234567890123456',
        noKk: '1234567890123456',
        nisn: '1234567890',
        tempatLahir: 'Jakarta',
        tanggalLahir: '2005-01-01',
        jenisKelamin: 'IKHWAN' as const,
        jenjang: 'SMA' as const,
        kelas: 'X IPA 1',
        sekolahSekarang: 'SMA IT Fulan',
        asalSekolahSebelumnya: 'SMP IT Fulan',
        namaAyah: 'Bapak Fulan',
        namaIbu: 'Ibu Fulan',
        kontakWali: '081234567890',
        pekerjaanOrtu: 'Wiraswasta',
        alamat: 'Jl. Kebon Jeruk',
        ringkasanTentang: 'Santri yang rajin',
        riwayatTahfidz: '5 Juz',
        keahlian: JSON.stringify(['Futsal', 'Silat']),
      };

      const santri = createSantri(input);
      expect(santri).toBeDefined();
      expect(santri.id).toBeDefined();
      expect(santri.namaLengkap).toBe(input.namaLengkap);
      expect(santri.keahlian).toEqual(input.keahlian);

      const found = getSantriById(santri.id);
      expect(found).toBeDefined();
      expect(found?.namaLengkap).toBe(input.namaLengkap);
    });

    it('should filter by gender (Ikhwan vs Akhwat)', () => {
      createSantri({
        namaLengkap: 'Ahmad', nik: '1', tempatLahir: 'Jakarta', tanggalLahir: '2005-01-01',
        jenisKelamin: 'IKHWAN', jenjang: 'SMA', kelas: '10', sekolahSekarang: 'SMA'
      });
      createSantri({
        namaLengkap: 'Siti', nik: '2', tempatLahir: 'Jakarta', tanggalLahir: '2005-01-01',
        jenisKelamin: 'AKHWAT', jenjang: 'SMA', kelas: '10', sekolahSekarang: 'SMA'
      });

      const ikhwan = listSantri({ jenisKelamin: 'IKHWAN' });
      expect(ikhwan.length).toBe(1);
      expect(ikhwan[0].namaLengkap).toBe('Ahmad');

      const akhwat = listSantri({ jenisKelamin: 'AKHWAT' });
      expect(akhwat.length).toBe(1);
      expect(akhwat[0].namaLengkap).toBe('Siti');
    });

    it('should filter by level', () => {
      createSantri({
        namaLengkap: 'Ahmad', nik: '1', tempatLahir: 'Jakarta', tanggalLahir: '2005-01-01',
        jenisKelamin: 'IKHWAN', jenjang: 'SMP', kelas: '7', sekolahSekarang: 'SMP'
      });
      createSantri({
        namaLengkap: 'Budi', nik: '2', tempatLahir: 'Jakarta', tanggalLahir: '2005-01-01',
        jenisKelamin: 'IKHWAN', jenjang: 'SMA', kelas: '10', sekolahSekarang: 'SMA'
      });

      const smp = listSantri({ jenjang: 'SMP' });
      expect(smp.length).toBe(1);
      expect(smp[0].namaLengkap).toBe('Ahmad');
    });

    it('should search by name/NIK', () => {
      createSantri({
        namaLengkap: 'Ahmad Fulan', nik: '123456', tempatLahir: 'Jakarta', tanggalLahir: '2005-01-01',
        jenisKelamin: 'IKHWAN', jenjang: 'SMP', kelas: '7', sekolahSekarang: 'SMP'
      });

      let results = listSantri({ query: 'Ahmad' });
      expect(results.length).toBe(1);

      results = listSantri({ query: '123456' });
      expect(results.length).toBe(1);

      results = listSantri({ query: 'Budi' });
      expect(results.length).toBe(0);
    });

    it('should update santri', () => {
      const santri = createSantri({
        namaLengkap: 'Ahmad', nik: '1', tempatLahir: 'Jakarta', tanggalLahir: '2005-01-01',
        jenisKelamin: 'IKHWAN', jenjang: 'SMA', kelas: '10', sekolahSekarang: 'SMA'
      });

      const updated = updateSantri(santri.id, { kelas: '11' });
      expect(updated.kelas).toBe('11');

      const found = getSantriById(santri.id);
      expect(found?.kelas).toBe('11');
    });

    it('should delete santri', () => {
      const santri = createSantri({
        namaLengkap: 'Ahmad', nik: '1', tempatLahir: 'Jakarta', tanggalLahir: '2005-01-01',
        jenisKelamin: 'IKHWAN', jenjang: 'SMA', kelas: '10', sekolahSekarang: 'SMA'
      });

      const success = deleteSantri(santri.id);
      expect(success).toBe(true);

      const found = getSantriById(santri.id);
      expect(found).toBeNull();
    });
  });

  describe('Document Repository', () => {
    it('should save and list documents, update status, and cascade delete', () => {
      const santri = createSantri({
        namaLengkap: 'Ahmad', nik: '1', tempatLahir: 'Jakarta', tanggalLahir: '2005-01-01',
        jenisKelamin: 'IKHWAN', jenjang: 'SMA', kelas: '10', sekolahSekarang: 'SMA'
      });

      const doc = saveDocument({
        santriId: santri.id,
        kategori: 'KARTU_KELUARGA',
        fileUrl: 'http://example.com/kk.pdf'
      });

      expect(doc.id).toBeDefined();
      expect(doc.statusVerifikasi).toBe('PENDING');

      const docs = listDocumentsBySantri(santri.id);
      expect(docs.length).toBe(1);

      const santriWithDocs = getSantriById(santri.id);
      expect(santriWithDocs?.documents.length).toBe(1);

      updateDocumentStatus(doc.id, 'VERIFIED', 'Oke');
      const updatedDocs = listDocumentsBySantri(santri.id);
      expect(updatedDocs[0].statusVerifikasi).toBe('VERIFIED');
      expect(updatedDocs[0].catatanVerifikasi).toBe('Oke');

      deleteDocument(doc.id);
      expect(listDocumentsBySantri(santri.id).length).toBe(0);
    });
    
    it('should cascade delete documents when santri is deleted', () => {
      const santri = createSantri({
        namaLengkap: 'Ahmad', nik: '1', tempatLahir: 'Jakarta', tanggalLahir: '2005-01-01',
        jenisKelamin: 'IKHWAN', jenjang: 'SMA', kelas: '10', sekolahSekarang: 'SMA'
      });

      saveDocument({
        santriId: santri.id,
        kategori: 'KARTU_KELUARGA',
        fileUrl: 'http://example.com/kk.pdf'
      });

      expect(listDocumentsBySantri(santri.id).length).toBe(1);
      
      deleteSantri(santri.id);
      
      const docs = db.prepare('SELECT * FROM documents WHERE santriId = ?').all(santri.id);
      expect(docs.length).toBe(0);
    });
  });
});
