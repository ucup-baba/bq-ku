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
    it('should create a new santri with all fields', async () => {
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

      const santri = await createSantri(input);
      expect(santri).toBeDefined();
      expect(santri.id).toBeDefined();
      expect(santri.namaLengkap).toBe(input.namaLengkap);
      expect(santri.keahlian).toEqual(input.keahlian);

      const found = await getSantriById(santri.id);
      expect(found).toBeDefined();
      expect(found?.namaLengkap).toBe(input.namaLengkap);
    });

    it('should filter by gender (Ikhwan vs Akhwat)', async () => {
      await createSantri({
        namaLengkap: 'Ahmad', nik: '1', tempatLahir: 'Jakarta', tanggalLahir: '2005-01-01',
        jenisKelamin: 'IKHWAN', jenjang: 'SMA', kelas: '10', sekolahSekarang: 'SMA'
      });
      await createSantri({
        namaLengkap: 'Siti', nik: '2', tempatLahir: 'Jakarta', tanggalLahir: '2005-01-01',
        jenisKelamin: 'AKHWAT', jenjang: 'SMA', kelas: '10', sekolahSekarang: 'SMA'
      });

      const ikhwan = await listSantri({ jenisKelamin: 'IKHWAN' });
      expect(ikhwan.length).toBe(1);
      expect(ikhwan[0].namaLengkap).toBe('Ahmad');

      const akhwat = await listSantri({ jenisKelamin: 'AKHWAT' });
      expect(akhwat.length).toBe(1);
      expect(akhwat[0].namaLengkap).toBe('Siti');
    });

    it('should filter by level', async () => {
      await createSantri({
        namaLengkap: 'Ahmad', nik: '1', tempatLahir: 'Jakarta', tanggalLahir: '2005-01-01',
        jenisKelamin: 'IKHWAN', jenjang: 'SMP', kelas: '7', sekolahSekarang: 'SMP'
      });
      await createSantri({
        namaLengkap: 'Budi', nik: '2', tempatLahir: 'Jakarta', tanggalLahir: '2005-01-01',
        jenisKelamin: 'IKHWAN', jenjang: 'SMA', kelas: '10', sekolahSekarang: 'SMA'
      });

      const smp = await listSantri({ jenjang: 'SMP' });
      expect(smp.length).toBe(1);
      expect(smp[0].namaLengkap).toBe('Ahmad');
    });

    it('should search by name/NIK', async () => {
      await createSantri({
        namaLengkap: 'Ahmad Fulan', nik: '123456', tempatLahir: 'Jakarta', tanggalLahir: '2005-01-01',
        jenisKelamin: 'IKHWAN', jenjang: 'SMP', kelas: '7', sekolahSekarang: 'SMP'
      });

      let results = await listSantri({ query: 'Ahmad' });
      expect(results.length).toBe(1);

      results = await listSantri({ query: '123456' });
      expect(results.length).toBe(1);

      results = await listSantri({ query: 'Budi' });
      expect(results.length).toBe(0);
    });

    it('should update santri', async () => {
      const santri = await createSantri({
        namaLengkap: 'Ahmad', nik: '1', tempatLahir: 'Jakarta', tanggalLahir: '2005-01-01',
        jenisKelamin: 'IKHWAN', jenjang: 'SMA', kelas: '10', sekolahSekarang: 'SMA'
      });

      const updated = await updateSantri(santri.id, { kelas: '11' });
      expect(updated.kelas).toBe('11');

      const found = await getSantriById(santri.id);
      expect(found?.kelas).toBe('11');
    });

    it('should delete santri', async () => {
      const santri = await createSantri({
        namaLengkap: 'Ahmad', nik: '1', tempatLahir: 'Jakarta', tanggalLahir: '2005-01-01',
        jenisKelamin: 'IKHWAN', jenjang: 'SMA', kelas: '10', sekolahSekarang: 'SMA'
      });

      const success = await deleteSantri(santri.id);
      expect(success).toBe(true);

      const found = await getSantriById(santri.id);
      expect(found).toBeNull();
    });
  });

  describe('Document Repository', () => {
    it('should save and list documents, update status, and cascade delete', async () => {
      const santri = await createSantri({
        namaLengkap: 'Ahmad', nik: '1', tempatLahir: 'Jakarta', tanggalLahir: '2005-01-01',
        jenisKelamin: 'IKHWAN', jenjang: 'SMA', kelas: '10', sekolahSekarang: 'SMA'
      });

      const doc = await saveDocument({
        santriId: santri.id,
        kategori: 'KARTU_KELUARGA',
        fileUrl: 'http://example.com/kk.pdf'
      });

      expect(doc.id).toBeDefined();
      expect(doc.statusVerifikasi).toBe('PENDING');

      const docs = await listDocumentsBySantri(santri.id);
      expect(docs.length).toBe(1);

      const santriWithDocs = await getSantriById(santri.id);
      expect(santriWithDocs?.documents.length).toBe(1);

      await updateDocumentStatus(doc.id, 'VERIFIED', 'Oke');
      const updatedDocs = await listDocumentsBySantri(santri.id);
      expect(updatedDocs[0].statusVerifikasi).toBe('VERIFIED');
      expect(updatedDocs[0].catatanVerifikasi).toBe('Oke');

      await deleteDocument(doc.id);
      expect((await listDocumentsBySantri(santri.id)).length).toBe(0);
    });
    
    it('should cascade delete documents when santri is deleted', async () => {
      const santri = await createSantri({
        namaLengkap: 'Ahmad', nik: '1', tempatLahir: 'Jakarta', tanggalLahir: '2005-01-01',
        jenisKelamin: 'IKHWAN', jenjang: 'SMA', kelas: '10', sekolahSekarang: 'SMA'
      });

      await saveDocument({
        santriId: santri.id,
        kategori: 'KARTU_KELUARGA',
        fileUrl: 'http://example.com/kk.pdf'
      });

      expect((await listDocumentsBySantri(santri.id)).length).toBe(1);
      
      await deleteSantri(santri.id);
      
      const docs = db.prepare('SELECT * FROM documents WHERE santriId = ?').all(santri.id);
      expect(docs.length).toBe(0);
    });
  });
});
